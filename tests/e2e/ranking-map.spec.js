import { expect, test } from '@playwright/test';

const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+Xw7WAAAAAElFTkSuQmCC', 'base64');

async function mockMapApi(page) {
  await page.route('https://*.tile.openstreetmap.org/**', route => route.fulfill({ status:200, contentType:'image/png', body:transparentPng }));
  await page.route('**/api/meta/categories', route => route.fulfill({ json:{ items:['문화시설'] } }));
  await page.route('**/api/meta/districts', route => route.fulfill({ json:{ items:['마포구'] } }));
  await page.route('**/api/rankings**', route => route.fulfill({ json:{
    items:[
      { rank:1, content_id:'a', category:'문화시설', title:'문화비축기지', address:'서울 마포구', district:'마포구', longitude:126.893, latitude:37.571, image_url:null, thumbnail_url:null, phone:null, source_order:1 },
      { rank:2, content_id:'b', category:'문화시설', title:'서울생활문화센터', address:'서울 마포구', district:'마포구', longitude:126.918, latitude:37.555, image_url:null, thumbnail_url:null, phone:null, source_order:2 },
      { rank:3, content_id:'c', category:'문화시설', title:'좌표 없는 장소', address:null, district:'마포구', longitude:null, latitude:null, image_url:null, thumbnail_url:null, phone:null, source_order:3 },
    ],
    district:'마포구', category:'문화시설',
  } }));
}

test.beforeEach(async ({ page }) => { await mockMapApi(page); });

test('전체 마커와 목록 선택을 양방향 동기화한다', async ({ page }) => {
  await page.setViewportSize({ width:1440,height:900 });
  await page.goto('/?district=마포구&category=문화시설');
  await expect(page.locator('.ranking-marker')).toHaveCount(2);
  await expect(page.getByText('OpenStreetMap')).toBeVisible();
  await expect(page.locator('.leaflet-top.leaflet-right .leaflet-control-zoom')).toBeVisible();
  const markersClearPanel = await page.evaluate(() => {
    const panelRight = document.querySelector('.ranking-results-panel').getBoundingClientRect().right;
    return [...document.querySelectorAll('.ranking-marker')].every(marker => marker.getBoundingClientRect().left >= panelRight);
  });
  expect(markersClearPanel).toBe(true);

  const desktopLayout = await page.evaluate(() => {
    const explorer = document.querySelector('.ranking-explorer').getBoundingClientRect();
    const map = document.querySelector('.ranking-map').getBoundingClientRect();
    const topPanel = document.querySelector('.ranking-top-panel').getBoundingClientRect();
    const panel = document.querySelector('.ranking-results-panel').getBoundingClientRect();
    return {
      explorerHeight:explorer.height,
      mapFillsExplorer:Math.abs(map.height - explorer.height) < 2 && Math.abs(map.width - explorer.width) < 2,
      filterInside:topPanel.top >= explorer.top && topPanel.bottom <= explorer.bottom,
      panelInside:panel.top >= explorer.top && panel.bottom <= explorer.bottom,
      filterPosition:getComputedStyle(document.querySelector('.ranking-top-panel')).position,
      panelPosition:getComputedStyle(document.querySelector('.ranking-results-panel')).position,
      footerVisible:getComputedStyle(document.querySelector('footer')).display !== 'none',
    };
  });
  expect(desktopLayout.explorerHeight).toBeGreaterThanOrEqual(800);
  expect(desktopLayout.mapFillsExplorer).toBe(true);
  expect(desktopLayout.filterInside).toBe(true);
  expect(desktopLayout.panelInside).toBe(true);
  expect(desktopLayout.filterPosition).toBe('absolute');
  expect(desktopLayout.panelPosition).toBe('absolute');
  expect(desktopLayout.footerVisible).toBe(false);

  const firstCard = page.locator('[data-content-id="a"]');
  await firstCard.click();
  await expect(firstCard).toHaveAttribute('aria-current','true');
  await expect(page.locator('.ranking-marker--active')).toHaveCount(1);
  await expect(page.locator('.leaflet-popup-content')).toContainText('문화비축기지');

  const markers = page.locator('.ranking-marker');
  expect(await markers.count()).toBe(2);
  await markers.nth(1).click();
  await expect(page.locator('[data-content-id="b"]')).toHaveAttribute('aria-current','true');
  await expect(page.locator('[data-content-id="c"]')).toContainText('지도 위치 없음');
});

test('모바일에서 상단 선택창과 전체 지도 위 하단 바텀시트를 제공한다', async ({ page }) => {
  await page.setViewportSize({ width:360,height:800 });
  await page.goto('/?district=마포구&category=문화시설');
  await expect(page.locator('.ranking-marker')).toHaveCount(2);
  const collapsedLayout = await page.evaluate(() => {
    const explorer = document.querySelector('.ranking-explorer').getBoundingClientRect();
    const map = document.querySelector('.ranking-map').getBoundingClientRect();
    const filter = document.querySelector('.ranking-filter').getBoundingClientRect();
    const panel = document.querySelector('.ranking-results-panel').getBoundingClientRect();
    return {
      explorerHeight:explorer.height,
      mapHeight:map.height,
      filterAtTop:filter.top >= explorer.top && filter.bottom < panel.top,
      panelAtBottom:explorer.bottom - panel.bottom >= 0 && explorer.bottom - panel.bottom <= 10,
      panelHeight:panel.height,
      panelPosition:getComputedStyle(document.querySelector('.ranking-results-panel')).position,
      horizontalOverflow:document.documentElement.scrollWidth <= innerWidth,
      pageScrollLocked:getComputedStyle(document.body).overflow === 'hidden',
    };
  });
  expect(collapsedLayout.explorerHeight).toBeGreaterThanOrEqual(720);
  expect(collapsedLayout.mapHeight).toBe(collapsedLayout.explorerHeight);
  expect(collapsedLayout.filterAtTop).toBe(true);
  expect(collapsedLayout.panelAtBottom).toBe(true);
  expect(collapsedLayout.panelPosition).toBe('absolute');
  expect(collapsedLayout.horizontalOverflow).toBe(true);
  expect(collapsedLayout.pageScrollLocked).toBe(true);

  await page.locator('.ranking-sheet-toggle').click();
  await expect(page.locator('.ranking-results-panel')).toHaveAttribute('data-sheet-state', 'expanded');
  await expect.poll(() => page.locator('.ranking-results-panel').evaluate(element => element.getBoundingClientRect().height))
    .toBeGreaterThan(collapsedLayout.panelHeight + 150);
  await expect(page.locator('.ranking-sheet-content')).toHaveCSS('overflow-y', 'auto');
});
