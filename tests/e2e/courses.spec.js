import { expect, test } from '@playwright/test';

const publicId = '0123456789abcdef0123456789abcdef';
const stops = [
  { position: 1, distance_from_previous_meters: null, location: { content_id: '1', title: '문화비축기지', category: '문화시설', address: '서울 마포구', image_url: null, thumbnail_url: null } },
  { position: 2, distance_from_previous_meters: 900, location: { content_id: '2', title: '하늘공원', category: '관광지', address: '서울 마포구', image_url: null, thumbnail_url: null } },
  { position: 3, distance_from_previous_meters: 1000, location: { content_id: '3', title: '망원시장', category: '쇼핑', address: '서울 마포구', image_url: null, thumbnail_url: null } },
];
const extraLocation = { content_id: '4', title: '서울함공원', category: '관광지', address: '서울 마포구', image_url: null, thumbnail_url: null };

async function mockCourses(page) {
  let title = '마포 하루'; let orderedStops = stops;
  await page.route('**/api/meta/districts', route => route.fulfill({ json: { items: ['마포구'] } }));
  await page.route('**/api/meta/categories', route => route.fulfill({ json: { items: ['관광지', '문화시설', '쇼핑'] } }));
  await page.route('**/api/course-suggestions', route => route.fulfill({ json: { district: '마포구', categories: ['관광지', '문화시설'], stops, total_straight_line_distance_meters: 1900 } }));
  await page.route('**/api/rankings**', route => route.fulfill({ json: { items: [{ rank: 4, ...extraLocation }], pagination: { page: 1, total_pages: 1 } } }));
  await page.route(`**/api/courses/${publicId}`, async route => {
    const method = route.request().method();
    if (method === 'DELETE') return route.fulfill({ status: 204, body: '' });
    if (method === 'PUT') {
      const body = route.request().postDataJSON(); title = body.title;
      if (body.password === '0000') return route.fulfill({ status: 403, json: { code: 'PASSWORD_MISMATCH', message: '불일치' } });
      orderedStops = body.location_content_ids.map((id, index) => ({ position: index + 1, location: [...stops.map(stop => stop.location), extraLocation].find(location => location.content_id === id) }));
    }
    return route.fulfill({ json: { public_id: publicId, title, created_at: '2026-07-15T00:00:00Z', updated_at: method === 'PUT' ? '2026-07-15T01:00:00Z' : '2026-07-15T00:00:00Z', stops: orderedStops, total_straight_line_distance_meters: 1900 } });
  });
  await page.route('**/api/courses', route => {
    const body = route.request().postDataJSON(); title = body.title;
    orderedStops = body.location_content_ids.map((id, index) => ({ position: index + 1, location: [...stops.map(stop => stop.location), extraLocation].find(location => location.content_id === id) }));
    return route.fulfill({ status: 201, json: { public_id: publicId, title, created_at: '2026-07-15T00:00:00Z', updated_at: '2026-07-15T00:00:00Z', stops: orderedStops, total_straight_line_distance_meters: 1900 } });
  });
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
  await page.getByRole('button', { name: '+ 장소 추가' }).click();
  await page.getByLabel('장소를 찾을 구').selectOption('마포구');
  await page.getByLabel('장소 카테고리').selectOption('관광지');
  await page.getByRole('button', { name: '장소 찾기' }).click();
  await page.getByRole('button', { name: '추가', exact: true }).click();
  await page.getByLabel('코스 제목').fill('마포 하루');
  await page.getByLabel('수정·삭제 비밀번호').fill('1234');
  await page.getByRole('button', { name: '코스 저장하기' }).click();
  await expect(page).toHaveURL(`/courses/${publicId}`);
  await expect(page.getByRole('heading', { name: '마포 하루' })).toBeVisible();
  await expect(page.getByText('서울함공원')).toBeVisible();
  await page.getByRole('button', { name: '링크 복사' }).click();
  await expect(page.getByText(/링크.*복사/)).toBeVisible();

  await page.getByRole('button', { name: '수정', exact: true }).click();
  await page.getByRole('button', { name: '하늘공원 위로' }).click();
  await page.getByLabel('코스 제목').fill('수정된 마포 하루');
  await page.getByLabel('수정 비밀번호').fill('0000');
  await page.getByRole('button', { name: '변경 내용 저장' }).click();
  await expect(page.getByText('비밀번호가 일치하지 않습니다.')).toBeVisible();
  await expect(page.locator('[data-course-stop]').first()).toHaveAttribute('data-course-stop', '2');
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
  await page.getByLabel('어느 구에서?').selectOption('마포구');
  await page.getByLabel('관광지').check();
  await page.getByLabel('방문 장소 수').selectOption('3');
  await page.getByRole('button', { name: '코스 초안 만들기' }).click();
  await page.getByRole('button', { name: '+ 장소 추가' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('link', { name: '코스' })).toBeVisible();
  await page.goto(`/courses/${publicId}`);
  await page.getByRole('button', { name: '수정', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('후보 부족과 없는 공유 코스에서 다음 행동을 안내한다', async ({ page }) => {
  await page.unroute('**/api/course-suggestions');
  await page.route('**/api/course-suggestions', route => route.fulfill({ status: 400, json: { code: 'COURSE_NOT_ENOUGH_LOCATIONS', message: '부족' } }));
  await page.goto('/courses');
  await page.getByLabel('어느 구에서?').selectOption('마포구');
  await page.getByLabel('관광지').check();
  await page.getByRole('button', { name: '코스 초안 만들기' }).click();
  await expect(page.getByText(/장소가 부족/)).toBeVisible();

  await page.unroute(`**/api/courses/${publicId}`);
  await page.route(`**/api/courses/${publicId}`, route => route.fulfill({ status: 404, json: { code: 'COURSE_NOT_FOUND', message: '없음' } }));
  await page.goto(`/courses/${publicId}`);
  await expect(page.getByRole('heading', { name: '코스를 찾을 수 없습니다' })).toBeVisible();
  await expect(page.getByRole('link', { name: '새 코스 만들기' })).toBeVisible();
});

test('네트워크 실패 뒤 같은 추천 요청을 다시 시도한다', async ({ page }) => {
  let attempts = 0;
  await page.unroute('**/api/course-suggestions');
  await page.route('**/api/course-suggestions', route => {
    attempts += 1;
    if (attempts === 1) return route.abort('failed');
    return route.fulfill({ json: { district: '마포구', categories: ['관광지'], stops, total_straight_line_distance_meters: 1900 } });
  });
  await page.goto('/courses');
  await page.getByLabel('어느 구에서?').selectOption('마포구');
  await page.getByLabel('관광지').check();
  await page.getByRole('button', { name: '코스 초안 만들기' }).click();
  await expect(page.getByText('요청을 처리할 수 없습니다.')).toBeVisible();
  await page.getByRole('button', { name: '다시 시도' }).click();
  await expect(page.getByText('문화비축기지')).toBeVisible();
  expect(attempts).toBe(2);
});
