import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/posts**', route => route.fulfill({ json: {
    items: [{ id: 1, district: '마포구', prefix: '맛집', title: '연남동 새 식당', created_at: '2026-07-15T00:00:00Z', updated_at: '2026-07-15T00:00:00Z' }],
    pagination: { page: 1, size: 20, total_items: 1, total_pages: 1 },
  } }));
});

test('지역 모달과 테마 메뉴로 게시판을 필터링한다', async ({ page }) => {
  await page.goto('/posts');
  await page.getByRole('button', { name: /서울 전체/ }).click();
  await expect(page.getByRole('heading', { name: '지역 필터' })).toBeVisible();
  await page.getByRole('button', { name: '마포구' }).click();
  await page.getByRole('button', { name: '적용' }).click();
  await expect(page).toHaveURL('/posts?district=%EB%A7%88%ED%8F%AC%EA%B5%AC');

  await page.getByRole('button', { name: '맛집', exact: true }).click();
  await expect(page).toHaveURL('/posts?district=%EB%A7%88%ED%8F%AC%EA%B5%AC&prefix=%EB%A7%9B%EC%A7%91');
  await expect(page.getByRole('heading', { name: '서울특별시 마포구 “맛집” 관련 소식' })).toBeVisible();
  await expect(page.getByText('마포구 · 맛집')).toBeVisible();
});

test('모바일에서 지역 모달과 필터가 가로 스크롤을 만들지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/posts');
  await page.getByRole('button', { name: /서울 전체/ }).click();
  await expect(page.getByRole('button', { name: '적용' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
