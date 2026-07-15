import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { startApp } from '../../../src/app/app.js';

const suggestion = {
  district: '마포구', categories: ['관광지', '문화시설'], total_straight_line_distance_meters: 1200,
  stops: [
    { position: 1, distance_from_previous_meters: null, location: { content_id: '1', title: '문화비축기지', category: '문화시설', address: '서울 마포구' } },
    { position: 2, distance_from_previous_meters: 1200, location: { content_id: '2', title: '하늘공원', category: '관광지', address: '서울 마포구' } },
    { position: 3, distance_from_previous_meters: 500, location: { content_id: '3', title: '망원시장', category: '쇼핑', address: '서울 마포구' } },
  ],
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

beforeEach(() => {
  history.replaceState({}, '', '/courses');
  vi.stubGlobal('fetch', vi.fn(async (input, options) => {
    const url = new URL(input);
    if (url.pathname === '/api/meta/districts') return json({ items: ['마포구'] });
    if (url.pathname === '/api/meta/categories') return json({ items: ['관광지', '문화시설', '쇼핑', '숙박'] });
    if (url.pathname === '/api/course-suggestions') return json(suggestion);
    if (url.pathname === '/api/rankings') {
      const page = Number(url.searchParams.get('page'));
      const location = page === 2
        ? { rank: 5, content_id: '5', title: '월드컵공원', category: '관광지', address: '서울 마포구' }
        : { rank: 4, content_id: '4', title: '서울함공원', category: '관광지', address: '서울 마포구' };
      return json({ items: [location], pagination: { page, total_pages: 2 } });
    }
    if (url.pathname === '/api/courses' && options.method === 'POST') return json({ ...suggestion, public_id: '0123456789abcdef0123456789abcdef', title: '마포 하루' }, 201);
    return json({ code: 'NOT_FOUND', message: '없음' }, 404);
  }));
});

afterEach(() => vi.restoreAllMocks());

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
  root.querySelector('[data-open-place-search]').click();
  await vi.waitFor(() => expect(root.querySelector('[name="place-district"]')?.disabled).toBe(false));
  root.querySelector('[name="place-district"]').value = '마포구';
  root.querySelector('[name="place-category"]').value = '관광지';
  root.querySelector('#place-search-form').requestSubmit();
  await vi.waitFor(() => expect(root.textContent).toContain('서울함공원'));
  root.querySelector('[data-page="next"]').click();
  await vi.waitFor(() => expect(root.textContent).toContain('월드컵공원'));
  root.querySelector('[data-add-content-id="5"]').click();
  expect(document.activeElement.dataset.courseStop).toBe('5');
  root.querySelector('[name="title"]').value = '마포 하루';
  root.querySelector('[name="password"]').value = '1234';
  root.querySelector('#course-save-form').requestSubmit();

  await vi.waitFor(() => expect(location.pathname).toBe('/courses/0123456789abcdef0123456789abcdef'));
  const createCall = fetch.mock.calls.find(([input, options]) => new URL(input).pathname === '/api/courses' && options.method === 'POST');
  expect(JSON.parse(createCall[1].body)).toEqual({ title: '마포 하루', password: '1234', location_content_ids: ['2', '1', '3', '5'] });
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
