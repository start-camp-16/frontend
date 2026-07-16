import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { startApp } from '../../../src/app/app.js';

const suggestion = {
  district: '마포구', categories: ['관광지', '문화시설'], total_straight_line_distance_meters: 1200,
  stops: [
    { position: 1, distance_from_previous_meters: null, location: { content_id: '1', title: '문화비축기지', category: '문화시설', address: '서울 마포구' } },
    { position: 2, distance_from_previous_meters: 1200, location: { content_id: '2', title: '하늘공원', category: '관광지', address: '서울 마포구' } },
    { position: 3, distance_from_previous_meters: 500, location: { content_id: '3', title: '망원시장', category: '쇼핑', address: '서울 마포구' } },
  ],
};

const rankedCourses = {
  items: Array.from({ length: 5 }, (_, index) => ({
    rank: index + 1,
    district: index === 0 ? '강남구' : '마포구',
    title: `추천 코스 ${index + 1}`,
    stops: [{
      position: 1,
      location: {
        content_id: `ranked-${index + 1}-1`,
        title: index === 0 ? '봉은사' : `장소 ${index + 1}`,
        address: index === 0 ? '서울특별시 강남구 봉은사로 531' : `서울특별시 마포구 ${index + 1}길`,
      },
    }],
  })),
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

beforeEach(() => {
  history.replaceState({}, '', '/courses');
  vi.stubGlobal('fetch', vi.fn(async (input, options) => {
    const url = new URL(input);
    if (url.pathname === '/api/meta/districts') return json({ items: ['마포구', '관악구'] });
    if (url.pathname === '/api/meta/categories') return json({ items: ['관광지', '문화시설', '쇼핑', '숙박'] });
    if (url.pathname === '/api/course-rankings') return json(rankedCourses);
    if (url.pathname === '/api/course-suggestions') return json(suggestion);
    if (url.pathname === '/api/rankings') return json({ district: '마포구', category: '관광지', items: [{ rank: 4, content_id: '4', title: '서울함공원', category: '관광지', address: '서울 마포구' }] });
    if (url.pathname === '/api/courses' && options.method === 'POST') return json({ ...suggestion, public_id: '0123456789abcdef0123456789abcdef', title: '마포 하루' }, 201);
    return json({ code: 'NOT_FOUND', message: '없음' }, 404);
  }));
});

afterEach(() => vi.restoreAllMocks());

it('keeps the recommendation route at a fixed five-stop height', () => {
  const css = fs.readFileSync('src/features/courses/courses.css', 'utf8').replace(/\s+/g, '');
  expect(css).toContain('.course-ranking-stops{position:relative;display:flex;flex-direction:column;justify-content:space-between;height:15.6rem;');
  expect(css).toContain('.course-ranking-stop{position:relative;display:grid;grid-template-columns:2.2remminmax(0,1fr);gap:.65rem;align-items:center;flex:003rem;min-height:3rem;}');
  expect(css).toContain('.course-ranking-stops{height:23.1rem;}');
  expect(css).toContain('.course-ranking-stop{flex-basis:4.5rem;}');
});

it('styles course criteria selects like the homepage dropdown shell', () => {
  const css = fs.readFileSync('src/features/courses/courses.css', 'utf8').replace(/\s+/g, '');
  expect(css).toContain('.course-select-field{position:relative;display:grid;gap:.45rem;font-weight:800;}');
  expect(css).toContain('.course-select-trigger{position:relative;width:100%;min-width:0;padding:.72rem2.8rem.72rem1rem;border:1pxsolid#d4dae6;border-radius:12px;');
  expect(css).toContain('.course-select-menu{position:absolute;top:calc(100%+.45rem);left:0;right:0;z-index:30;');
});

it('uses homepage-style dropdown controls for course criteria selects', async () => {
  const root = document.createElement('div');
  document.body.append(root);
  const app = startApp({ root });

  await vi.waitFor(() => expect(root.querySelector('[name="district"]')?.disabled).toBe(false));
  expect(root.querySelectorAll('.course-select-trigger')).toHaveLength(2);
  expect(root.querySelector('[name="district"]').classList.contains('course-native-select')).toBe(true);
  expect(root.querySelector('[name="stop_count"]').classList.contains('course-native-select')).toBe(true);

  const [districtTrigger] = root.querySelectorAll('.course-select-trigger');
  const districtMenu = root.querySelector('.course-select-menu');
  districtTrigger.click();
  expect(districtTrigger.getAttribute('aria-expanded')).toBe('true');
  expect(districtMenu.hidden).toBe(false);
  expect(districtMenu.querySelectorAll('.course-select-option')).toHaveLength(3);

  const firstDistrictValue = root.querySelector('[name="district"] option:nth-child(2)').value;
  districtMenu.querySelector(`[data-value="${firstDistrictValue}"]`).click();
  expect(root.querySelector('[name="district"]').value).toBe(firstDistrictValue);
  expect(districtTrigger.textContent).toBe(firstDistrictValue);
  expect(districtMenu.hidden).toBe(true);

  app.stop();
});

it('renders a collapsible five-course carousel between the hero and builder', async () => {
  const root = document.createElement('div');
  document.body.append(root);
  const app = startApp({ root });

  await vi.waitFor(() => expect(root.textContent).toContain('강남구 추천 코스'));
  const panel = root.querySelector('[data-course-rankings]');
  expect(panel.classList.contains('panel')).toBe(true);
  expect(panel.previousElementSibling.classList.contains('course-hero')).toBe(true);
  expect(panel.nextElementSibling.classList.contains('course-workspace')).toBe(true);
  expect(panel.textContent).toContain('봉은사');
  expect(panel.textContent).toContain('이번 주 가장 인기 있는 코스 TOP 5');
  expect(panel.textContent).toContain('서울특별시 강남구 봉은사로 531');
  expect(panel.querySelector('.course-ranking-stop__copy').textContent).toBe('봉은사서울특별시 강남구 봉은사로 531');
  expect(panel.querySelector('.course-ranking-content').getAttribute('aria-live')).toBe('polite');
  expect(panel.querySelectorAll('[data-course-ranking-dot]')).toHaveLength(5);
  expect(panel.querySelector('[data-course-ranking-dot]').classList.contains('course-ranking-dot')).toBe(true);
  expect(panel.querySelector('[data-course-ranking-dot][aria-current="true"]').dataset.courseRankingDot).toBe('0');
  expect(panel.textContent).not.toContain('번째 코스');
  expect(panel.textContent).not.toContain('이 코스로 시작하기');

  panel.querySelector('[data-course-ranking-next]').click();
  expect(panel.textContent).toContain('마포구 추천 코스');
  expect(panel.querySelector('[data-course-ranking-dot][aria-current="true"]').dataset.courseRankingDot).toBe('1');

  panel.querySelector('[data-course-ranking-toggle]').click();
  expect(panel.dataset.collapsed).toBe('true');
  expect(panel.querySelector('[data-course-ranking-body]').hidden).toBe(true);

  app.stop();
});

it('추천 초안을 편집하고 익명 코스로 저장한다', async () => {
  const root = document.createElement('div');
  document.body.append(root);
  const app = startApp({ root });
  await vi.waitFor(() => expect(root.querySelector('[name="district"]')?.disabled).toBe(false));
  root.querySelector('[name="district"]').value = '마포구';
  root.querySelector('[name="categories"][value="관광지"]').click();
  root.querySelector('[name="categories"][value="문화시설"]').click();
  root.querySelector('[name="stop_count"]').value = '3';
  root.querySelector('#course-criteria').requestSubmit();

  await vi.waitFor(() => expect(root.textContent).toContain('문화비축기지'));
  expect(document.activeElement.id).toBe('course-draft-title');
  expect(root.textContent).not.toContain('1200');
  expect(root.textContent).not.toContain('거리');
  root.querySelector('[aria-label="하늘공원 위로"]').click();
  root.querySelector('[name="district"]').value = '관악구';
  root.querySelector('[data-open-place-search]').click();
  expect(root.querySelector('[name="place-district"]')).toBeNull();
  expect(root.textContent).toContain('선택한 구: 마포구');
  root.querySelector('[name="place-category"]').value = '관광지';
  root.querySelector('#place-search-form').requestSubmit();
  await vi.waitFor(() => expect(root.textContent).toContain('서울함공원'));
  const rankingCall = fetch.mock.calls.find(([input]) => new URL(input).pathname === '/api/rankings');
  expect(new URL(rankingCall[0]).searchParams.get('district')).toBe('마포구');
  root.querySelector('[data-add-content-id="4"]').click();
  expect(document.activeElement.dataset.courseStop).toBe('4');
  root.querySelector('[name="title"]').value = '마포 하루';
  root.querySelector('[name="password"]').value = '1234';
  root.querySelector('#course-save-form').requestSubmit();

  await vi.waitFor(() => expect(location.pathname).toBe('/courses/0123456789abcdef0123456789abcdef'));
  const createCall = fetch.mock.calls.find(([input, options]) => new URL(input).pathname === '/api/courses' && options.method === 'POST');
  expect(JSON.parse(createCall[1].body)).toEqual({ title: '마포 하루', password: '1234', location_content_ids: ['2', '1', '3', '4'] });
  app.stop();
});

it('선택 즉시 잘못된 카테고리 개수를 안내한다', async () => {
  const root = document.createElement('div'); const app = startApp({ root });
  await vi.waitFor(() => expect(root.querySelector('[name="district"]')?.disabled).toBe(false));
  root.querySelector('[name="district"]').value = '마포구';
  root.querySelectorAll('[name="categories"]').forEach(input => input.click());
  root.querySelector('[name="categories"]').dispatchEvent(new Event('change', { bubbles: true }));
  expect(root.querySelector('[data-criteria-error]').textContent).toContain('장소 수보다 많을 수 없습니다');
  expect(root.querySelector('#course-criteria [type="submit"]').disabled).toBe(true);
  app.stop();
});
