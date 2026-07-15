import { expect, test } from '@playwright/test';

const publicId = '0123456789abcdef0123456789abcdef';
const stops = [
  { position: 1, distance_from_previous_meters: null, location: { content_id: '1', title: '문화비축기지', category: '문화시설', address: '서울 마포구', image_url: null, thumbnail_url: null } },
  { position: 2, distance_from_previous_meters: 900, location: { content_id: '2', title: '하늘공원', category: '관광지', address: '서울 마포구', image_url: null, thumbnail_url: null } },
  { position: 3, distance_from_previous_meters: 1000, location: { content_id: '3', title: '망원시장', category: '쇼핑', address: '서울 마포구', image_url: null, thumbnail_url: null } },
];

async function mockCourses(page) {
  let title = '마포 하루'; let orderedStops = stops;
  await page.route('**/api/meta/districts', route => route.fulfill({ json: { items: ['마포구'] } }));
  await page.route('**/api/meta/categories', route => route.fulfill({ json: { items: ['관광지', '문화시설', '쇼핑'] } }));
  await page.route('**/api/course-suggestions', route => route.fulfill({ json: { district: '마포구', categories: ['관광지', '문화시설'], stops, total_straight_line_distance_meters: 1900 } }));
  await page.route(`**/api/courses/${publicId}`, async route => {
    const method = route.request().method();
    if (method === 'DELETE') return route.fulfill({ status: 204, body: '' });
    if (method === 'PUT') {
      const body = route.request().postDataJSON(); title = body.title;
      orderedStops = body.location_content_ids.map((id, index) => ({ ...stops.find(stop => stop.location.content_id === id), position: index + 1 }));
    }
    return route.fulfill({ json: { public_id: publicId, title, created_at: '2026-07-15T00:00:00Z', updated_at: method === 'PUT' ? '2026-07-15T01:00:00Z' : '2026-07-15T00:00:00Z', stops: orderedStops, total_straight_line_distance_meters: 1900 } });
  });
  await page.route('**/api/courses', route => route.fulfill({ status: 201, json: { public_id: publicId, title, created_at: '2026-07-15T00:00:00Z', updated_at: '2026-07-15T00:00:00Z', stops, total_straight_line_distance_meters: 1900 } }));
}

test.beforeEach(async ({ page }) => mockCourses(page));

test('코스를 생성하고 공유 페이지에서 수정·삭제한다', async ({ page }) => {
  await page.goto('/courses');
  await page.getByLabel('어느 구에서?').selectOption('마포구');
  await page.getByLabel('관광지').check();
  await page.getByLabel('문화시설').check();
  await page.getByLabel('방문 장소 수').selectOption('3');
  await page.getByRole('button', { name: '코스 초안 만들기' }).click();
  await expect(page.getByText('문화비축기지')).toBeVisible();
  await expect(page.getByText(/거리|시간|1900|1000|900/)).toHaveCount(0);
  await page.getByLabel('코스 제목').fill('마포 하루');
  await page.getByLabel('수정·삭제 비밀번호').fill('1234');
  await page.getByRole('button', { name: '코스 저장하기' }).click();
  await expect(page).toHaveURL(`/courses/${publicId}`);
  await expect(page.getByRole('heading', { name: '마포 하루' })).toBeVisible();

  await page.getByRole('button', { name: '수정', exact: true }).click();
  await page.getByRole('button', { name: '하늘공원 위로' }).click();
  await page.getByLabel('코스 제목').fill('수정된 마포 하루');
  await page.getByLabel('수정 비밀번호').fill('1234');
  await page.getByRole('button', { name: '변경 내용 저장' }).click();
  await expect(page.getByRole('heading', { name: '수정된 마포 하루' })).toBeVisible();
  await expect(page.locator('[data-course-stop]').first()).toHaveAttribute('data-course-stop', '2');

  await page.getByRole('button', { name: '삭제', exact: true }).click();
  await page.getByLabel('삭제 비밀번호').fill('1234');
  await page.locator('dialog').getByRole('button', { name: '삭제' }).click();
  await expect(page).toHaveURL('/courses');
});

test('360px에서도 코스 작업대에 가로 스크롤이 없다', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/courses');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('link', { name: '코스' })).toBeVisible();
});
