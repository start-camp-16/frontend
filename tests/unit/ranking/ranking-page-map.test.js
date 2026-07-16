import { beforeEach, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  getCategories: vi.fn(), getDistricts: vi.fn(), getRankings: vi.fn(),
}));
vi.mock('../../../src/features/ranking/ranking-api.js', () => api);

import { mountRankingPage } from '../../../src/features/ranking/ranking-page.js';

const items = [
  { content_id:'1', rank:1, title:'지도 장소', address:'서울', phone:null, image_url:null, thumbnail_url:null, latitude:37.5, longitude:127 },
  { content_id:'2', rank:2, title:'좌표 없음', address:null, phone:null, image_url:null, thumbnail_url:null, latitude:null, longitude:null },
];

function dispatchPointer(target, type, clientY) {
  const event = new Event(type, { bubbles:true });
  Object.defineProperty(event, 'clientY', { value:clientY });
  target.dispatchEvent(event);
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getCategories.mockResolvedValue(['문화시설']);
  api.getDistricts.mockResolvedValue(['마포구']);
  api.getRankings.mockResolvedValue({ district:'마포구', category:'문화시설', items });
  Element.prototype.scrollIntoView = vi.fn();
});

it('목록과 마커 선택을 같은 content_id로 동기화한다', async () => {
  const map = { setItems:vi.fn(() => 1), select:vi.fn(id => id === '1'), destroy:vi.fn(), invalidateSize:vi.fn(), retryTiles:vi.fn() };
  let markerSelect;
  const mapFactory = vi.fn(({ onSelect }) => { markerSelect = onSelect; return map; });
  const outlet = document.body.appendChild(document.createElement('main'));
  const cleanup = mountRankingPage({
    outlet,
    query:new URLSearchParams('district=마포구&category=문화시설'),
    signal:new AbortController().signal,
    navigate:vi.fn(),
  }, { mapFactory });

  await vi.waitFor(() => expect(map.setItems).toHaveBeenCalledWith(items));
  expect(outlet.querySelector('#ranking-recommendation').textContent).toBe('AI가 추천한 장소 TOP 2입니다.');
  expect(outlet.querySelector('#ranking-recommendation').hidden).toBe(false);
  const recommendationBox = outlet.querySelector('.ranking-recommendation-box');
  expect(recommendationBox.contains(outlet.querySelector('#ranking-recommendation'))).toBe(true);
  expect(recommendationBox.contains(outlet.querySelector('#ranking-result-count'))).toBe(true);
  expect(recommendationBox.textContent).toContain('2곳');
  expect(api.getRankings).toHaveBeenCalledWith(expect.not.objectContaining({ page:expect.anything(), size:expect.anything() }));
  expect(outlet.querySelector('#ranking-pagination')).toBeNull();
  outlet.querySelector('[data-content-id="1"]').click();
  expect(map.select).toHaveBeenCalledWith('1', { focus:true });
  expect(outlet.querySelector('[data-content-id="1"]').getAttribute('aria-current')).toBe('true');

  markerSelect('1');
  expect(map.select).toHaveBeenLastCalledWith('1', { focus:true });
  expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block:'nearest' });

  outlet.querySelector('[data-content-id="2"]').click();
  expect(outlet.querySelector('#map-status').textContent).toContain('지도 위치 정보가 없습니다');
  cleanup();
  expect(map.destroy).toHaveBeenCalledOnce();
});

it('모바일 장소 목록을 접힌 상태에서 버튼으로 펼치고 다시 접는다', async () => {
  const map = { setItems:vi.fn(() => 1), select:vi.fn(), destroy:vi.fn(), invalidateSize:vi.fn(), retryTiles:vi.fn() };
  const outlet = document.body.appendChild(document.createElement('main'));
  const cleanup = mountRankingPage({
    outlet,
    query:new URLSearchParams('district=마포구&category=문화시설'),
    signal:new AbortController().signal,
    navigate:vi.fn(),
  }, { mapFactory:vi.fn(() => map) });

  await vi.waitFor(() => expect(map.setItems).toHaveBeenCalledWith(items));
  const sheet = outlet.querySelector('.ranking-results-panel');
  const toggle = outlet.querySelector('.ranking-sheet-toggle');
  expect(sheet.dataset.sheetState).toBe('collapsed');
  expect(toggle.getAttribute('aria-controls')).toBe('ranking-sheet-content');
  expect(toggle.getAttribute('aria-expanded')).toBe('false');

  toggle.click();
  expect(sheet.dataset.sheetState).toBe('expanded');
  expect(toggle.getAttribute('aria-expanded')).toBe('true');

  toggle.click();
  expect(sheet.dataset.sheetState).toBe('collapsed');
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  cleanup();
});

it('손잡이를 충분히 올리거나 내리면 장소 목록 상태를 전환한다', async () => {
  const map = { setItems:vi.fn(() => 1), select:vi.fn(), destroy:vi.fn(), invalidateSize:vi.fn(), retryTiles:vi.fn() };
  const outlet = document.body.appendChild(document.createElement('main'));
  const cleanup = mountRankingPage({
    outlet,
    query:new URLSearchParams('district=마포구&category=문화시설'),
    signal:new AbortController().signal,
    navigate:vi.fn(),
  }, { mapFactory:vi.fn(() => map) });

  await vi.waitFor(() => expect(map.setItems).toHaveBeenCalledWith(items));
  const sheet = outlet.querySelector('.ranking-results-panel');
  const handle = outlet.querySelector('.ranking-sheet-toggle');

  dispatchPointer(handle, 'pointerdown', 200);
  dispatchPointer(handle, 'pointerup', 140);
  expect(sheet.dataset.sheetState).toBe('expanded');

  dispatchPointer(handle, 'pointerdown', 140);
  dispatchPointer(handle, 'pointerup', 160);
  expect(sheet.dataset.sheetState).toBe('expanded');

  dispatchPointer(handle, 'pointerdown', 140);
  dispatchPointer(handle, 'pointerup', 200);
  expect(sheet.dataset.sheetState).toBe('collapsed');
  cleanup();
});

it('데스크톱 장소 사이드바를 접고 펼칠 때 지도 크기를 다시 계산한다', async () => {
  const map = { setItems:vi.fn(() => 1), select:vi.fn(), destroy:vi.fn(), invalidateSize:vi.fn(), retryTiles:vi.fn() };
  const outlet = document.body.appendChild(document.createElement('main'));
  const cleanup = mountRankingPage({
    outlet,
    query:new URLSearchParams('district=마포구&category=문화시설'),
    signal:new AbortController().signal,
    navigate:vi.fn(),
  }, { mapFactory:vi.fn(() => map) });

  await vi.waitFor(() => expect(map.setItems).toHaveBeenCalledWith(items));
  const panel = outlet.querySelector('.ranking-results-panel');
  const toggle = outlet.querySelector('.ranking-sidebar-toggle');
  expect(outlet.querySelector('.ranking-sidebar-header h2').textContent).toBe('랭킹');
  expect(toggle.querySelector('span').getAttribute('aria-hidden')).toBe('true');
  expect(panel.dataset.sidebarState).toBe('expanded');
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  map.invalidateSize.mockClear();

  toggle.click();
  expect(panel.dataset.sidebarState).toBe('collapsed');
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  await vi.waitFor(() => expect(map.invalidateSize).toHaveBeenCalled());

  toggle.click();
  expect(panel.dataset.sidebarState).toBe('expanded');
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  cleanup();
});

it('초기 선택값이 없으면 구와 카테고리 선택 안내를 표시한다', async () => {
  const map = { setItems:vi.fn(() => 0), select:vi.fn(), destroy:vi.fn(), invalidateSize:vi.fn(), retryTiles:vi.fn() };
  const outlet = document.body.appendChild(document.createElement('main'));
  const cleanup = mountRankingPage({
    outlet,
    query:new URLSearchParams(),
    signal:new AbortController().signal,
    navigate:vi.fn(),
  }, { mapFactory:vi.fn(() => map) });

  await vi.waitFor(() => expect(outlet.querySelector('#ranking-status').textContent).toContain('구와 카테고리를 모두 선택해 주세요.'));
  expect(api.getRankings).not.toHaveBeenCalled();
  cleanup();
});

it('장소가 없으면 AI 추천 안내를 표시하지 않는다', async () => {
  api.getRankings.mockResolvedValueOnce({ district:'마포구', category:'문화시설', items:[] });
  const map = { setItems:vi.fn(() => 0), select:vi.fn(), destroy:vi.fn(), invalidateSize:vi.fn(), retryTiles:vi.fn() };
  const outlet = document.body.appendChild(document.createElement('main'));
  const cleanup = mountRankingPage({
    outlet,
    query:new URLSearchParams('district=마포구&category=문화시설'),
    signal:new AbortController().signal,
    navigate:vi.fn(),
  }, { mapFactory:vi.fn(() => map) });

  await vi.waitFor(() => expect(outlet.querySelector('#ranking-status').textContent).toContain('선택 조건에 해당하는 장소가 없습니다.'));
  expect(outlet.querySelector('#ranking-recommendation').hidden).toBe(true);
  cleanup();
});
