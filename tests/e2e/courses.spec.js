import { expect, test } from '@playwright/test';

const publicId = '0123456789abcdef0123456789abcdef';
const stops = [
  { position: 1, distance_from_previous_meters: null, location: { content_id: '1', title: '문화비축기지', category: '문화시설', address: '서울 마포구', latitude: 37.5705, longitude: 126.8948, image_url: null, thumbnail_url: null } },
  { position: 2, distance_from_previous_meters: 900, location: { content_id: '2', title: '하늘공원', category: '관광지', address: '서울 마포구', latitude: 37.5683, longitude: 126.8855, image_url: null, thumbnail_url: null } },
  { position: 3, distance_from_previous_meters: 1000, location: { content_id: '3', title: '망원시장', category: '쇼핑', address: '서울 마포구', latitude: 37.556, longitude: 126.906, image_url: null, thumbnail_url: null } },
];
const extraLocation = { content_id: '4', title: '서울함공원', category: '관광지', address: '서울 마포구', latitude: 37.5517, longitude: 126.9119, image_url: null, thumbnail_url: null };

async function mockCourses(page) {
  let title = '마포 하루'; let orderedStops = stops;
  await page.route('https://*.tile.openstreetmap.org/**', route => route.fulfill({ status: 204, body: '' }));
  await page.route('**/api/meta/districts', route => route.fulfill({ json: { items: ['마포구'] } }));
  await page.route('**/api/meta/categories', route => route.fulfill({ json: { items: ['관광지', '문화시설', '쇼핑'] } }));
  await page.route('**/api/course-rankings', route => route.fulfill({
    json: {
      items: Array.from({ length: 5 }, (_, index) => ({
        rank: index + 1,
        district: '마포구',
        title: `추천 코스 ${index + 1}`,
        description: '마포 추천 코스',
        thumbnail_url: null,
        stops: stops.map((stop, stopIndex) => ({
          ...stop,
          location: { ...stop.location, title: `추천 장소 ${stopIndex + 1}` },
        })),
        total_straight_line_distance_meters: 1900,
      })),
    },
  }));
  await page.route('**/api/course-suggestions', route => route.fulfill({ json: { district: '마포구', categories: ['관광지', '문화시설'], stops, total_straight_line_distance_meters: 1900 } }));
  await page.route('**/api/rankings**', route => route.fulfill({ json: { district: '마포구', category: '관광지', items: [{ rank: 4, ...extraLocation }] } }));
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
  await expect(page.getByText('선택한 구: 마포구')).toBeVisible();
  await expect(page.getByLabel('장소를 찾을 구')).toHaveCount(0);
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
  await expect(page.locator('.course-copy-status')).toBeVisible();

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

test('저장된 코스의 목록과 방문 순서 지도를 양방향으로 선택한다', async ({ page }) => {
  await page.goto(`/courses/${publicId}`);
  await expect(page.getByRole('region', { name: '코스 방문 순서 지도' })).toBeVisible();
  await expect(page.locator('.course-marker')).toHaveCount(3);
  await expect(page.locator('.course-route')).toHaveCount(2);

  await page.getByRole('button', { name: '지도에서 문화비축기지 보기' }).click();
  await expect(page.locator('.course-marker--active')).toHaveCount(1);
  await expect(page.locator('.leaflet-popup')).toContainText('문화비축기지');

  await page.locator('.course-marker').nth(1).click();
  await expect(page.getByRole('button', { name: '지도에서 하늘공원 보기' })).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('[data-course-map-status]')).toContainText('하늘공원');
});

test('동일 좌표의 방문 마커를 펼쳐 각각 선택한다', async ({ page }) => {
  const overlappingStops = stops.map((stop, index) => index === 1
    ? { ...stop, location: { ...stop.location, latitude: stops[0].location.latitude, longitude: stops[0].location.longitude } }
    : stop);
  await page.unroute(`**/api/courses/${publicId}`);
  await page.route(`**/api/courses/${publicId}`, route => route.fulfill({ json: {
    public_id: publicId,
    title: '동일 좌표 코스',
    created_at: '2026-07-15T00:00:00Z',
    updated_at: '2026-07-15T00:00:00Z',
    stops: overlappingStops,
  } }));

  await page.goto(`/courses/${publicId}`);
  const markers = page.locator('.course-marker');
  await expect(markers).toHaveCount(3);
  const firstBox = await markers.nth(0).boundingBox();
  const secondBox = await markers.nth(1).boundingBox();
  const firstCenter = { x: firstBox.x + firstBox.width / 2, y: firstBox.y + firstBox.height / 2 };
  const secondCenter = { x: secondBox.x + secondBox.width / 2, y: secondBox.y + secondBox.height / 2 };
  expect(Math.hypot(firstCenter.x - secondCenter.x, firstCenter.y - secondCenter.y)).toBeGreaterThan(40);

  await page.getByRole('button', { name: '지도에서 문화비축기지 보기' }).click();
  await expect(page.locator('.leaflet-popup').filter({ hasText: '문화비축기지' })).toBeVisible();
  await page.getByRole('button', { name: '지도에서 하늘공원 보기' }).click();
  await expect(page.locator('.leaflet-popup').filter({ hasText: '하늘공원' })).toBeVisible();
});

test('좌표가 없는 장소는 목록에 유지하고 연결선을 해당 지점에서 끊는다', async ({ page }) => {
  const partialStops = stops.map((stop, index) => index === 1
    ? { ...stop, location: { ...stop.location, latitude: null, longitude: null } }
    : stop);
  await page.unroute(`**/api/courses/${publicId}`);
  await page.route(`**/api/courses/${publicId}`, route => route.fulfill({ json: {
    public_id: publicId,
    title: '일부 좌표 코스',
    created_at: '2026-07-15T00:00:00Z',
    updated_at: '2026-07-15T00:00:00Z',
    stops: partialStops,
  } }));

  await page.goto(`/courses/${publicId}`);
  await expect(page.getByRole('button', { name: /^지도에서 .* 보기$/ })).toHaveCount(3);
  await expect(page.locator('.course-marker')).toHaveCount(2);
  await expect(page.locator('.course-route')).toHaveCount(0);
  await page.getByRole('button', { name: '지도에서 하늘공원 보기' }).click();
  await expect(page.locator('[data-course-map-status]')).toContainText('지도 위치 정보가 없습니다');
  await expect(page.getByRole('button', { name: '지도에서 하늘공원 보기' })).toHaveAttribute('aria-current', 'true');
});

test('모든 좌표가 없어도 목록과 수정 동작을 유지한다', async ({ page }) => {
  const coordinateFreeStops = stops.map(stop => ({
    ...stop,
    location: { ...stop.location, latitude: null, longitude: null },
  }));
  await page.unroute(`**/api/courses/${publicId}`);
  await page.route(`**/api/courses/${publicId}`, route => route.fulfill({ json: {
    public_id: publicId,
    title: '좌표 없는 코스',
    created_at: '2026-07-15T00:00:00Z',
    updated_at: '2026-07-15T00:00:00Z',
    stops: coordinateFreeStops,
  } }));

  await page.goto(`/courses/${publicId}`);
  await expect(page.getByRole('button', { name: /^지도에서 .* 보기$/ })).toHaveCount(3);
  await expect(page.getByRole('region', { name: '코스 방문 순서 지도' })).toBeHidden();
  await expect(page.locator('[data-course-map-status]')).toContainText('이 코스에는 표시할 위치 정보가 없습니다');
  await page.getByRole('button', { name: '수정', exact: true }).click();
  await expect(page.getByRole('heading', { name: '코스 수정' })).toBeVisible();
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
  const mapBox = await page.getByRole('region', { name: '코스 방문 순서 지도' }).boundingBox();
  const listBox = await page.locator('.course-detail__list').boundingBox();
  expect(mapBox.height).toBeGreaterThan(200);
  expect(mapBox.y + mapBox.height).toBeLessThanOrEqual(listBox.y + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
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
