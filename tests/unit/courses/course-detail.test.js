import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { startApp } from '../../../src/app/app.js';
import { copyCourseLink } from '../../../src/features/courses/course-detail-page.js';

const publicId = '0123456789abcdef0123456789abcdef';
const course = {
  public_id: publicId, title: '마포 하루 코스', created_at: '2026-07-15T00:00:00Z', updated_at: '2026-07-15T00:00:00Z', total_straight_line_distance_meters: 1900,
  stops: [
    { position: 1, distance_from_previous_meters: null, location: { content_id: '1', title: '문화비축기지', category: '문화시설', address: '서울 마포구' } },
    { position: 2, distance_from_previous_meters: 900, location: { content_id: '2', title: '하늘공원', category: '관광지', address: '서울 마포구' } },
    { position: 3, distance_from_previous_meters: 1000, location: { content_id: '3', title: '망원시장', category: '쇼핑', address: '서울 마포구' } },
  ],
};
const extraLocation = { content_id: '4', title: '서울함공원', category: '관광지', address: '서울 마포구' };

function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } }); }

beforeEach(() => {
  history.replaceState({}, '', `/courses/${publicId}`);
  let updateAttempts = 0;
  vi.stubGlobal('fetch', vi.fn(async (input, options) => {
    const url = new URL(input);
    if (url.pathname === '/api/meta/districts') return json({ items: ['마포구'] });
    if (url.pathname === '/api/meta/categories') return json({ items: ['관광지'] });
    if (url.pathname === '/api/rankings') return json({ items: [{ rank: 4, ...extraLocation }], pagination: { page: 1, total_pages: 1 } });
    if (url.pathname === `/api/courses/${publicId}` && options.method === 'GET') return json(course);
    if (url.pathname === `/api/courses/${publicId}` && options.method === 'PUT') {
      updateAttempts += 1;
      if (updateAttempts === 1) return json({ code: 'PASSWORD_MISMATCH', message: '비밀번호 불일치' }, 403);
      return json({ ...course, title: '수정된 코스', updated_at: '2026-07-15T01:00:00Z', stops: [course.stops[1], course.stops[0], course.stops[2], { position: 4, location: extraLocation }] });
    }
    if (url.pathname === `/api/courses/${publicId}` && options.method === 'DELETE') return new Response(null, { status: 204 });
    return json({ code: 'NOT_FOUND', message: '없음' }, 404);
  }));
});

afterEach(() => vi.restoreAllMocks());

it('전체 공유 링크를 클립보드에 복사한다', async () => {
  const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
  await expect(copyCourseLink(`http://localhost/courses/${publicId}`, clipboard)).resolves.toBe(true);
  expect(clipboard.writeText).toHaveBeenCalledWith(`http://localhost/courses/${publicId}`);
  await expect(copyCourseLink(`http://localhost/courses/${publicId}`, undefined)).resolves.toBe(false);
});

it('거리를 숨기고 비밀번호 오류 뒤에도 편집 초안을 유지해 수정·삭제한다', async () => {
  const root = document.createElement('div'); const app = startApp({ root });
  await vi.waitFor(() => expect(root.textContent).toContain('마포 하루 코스'));
  expect(root.textContent).not.toMatch(/1900|900|1000|거리|시간/);
  root.querySelector('[data-edit-course]').click();
  root.querySelector('[aria-label="하늘공원 위로"]').click();
  root.querySelector('[data-edit-add]').click();
  await vi.waitFor(() => expect(root.querySelector('[name="edit-place-district"]')?.disabled).toBe(false));
  root.querySelector('[name="edit-place-district"]').value = '마포구';
  root.querySelector('[name="edit-place-category"]').value = '관광지';
  root.querySelector('[data-edit-place-search]').click();
  await vi.waitFor(() => expect(root.textContent).toContain('서울함공원'));
  root.querySelector('[data-add-content-id="4"]').click();
  root.querySelector('#course-edit-form [name="title"]').value = '수정된 코스';
  root.querySelector('#course-edit-form [name="password"]').value = '0000';
  root.querySelector('#course-edit-form').requestSubmit();
  await vi.waitFor(() => expect(root.textContent).toContain('비밀번호가 일치하지 않습니다.'));
  expect([...root.querySelectorAll('[data-course-stop]')].map(item => item.dataset.courseStop)).toEqual(['2', '1', '3', '4']);
  root.querySelector('#course-edit-form [name="password"]').value = '1234';
  root.querySelector('#course-edit-form').requestSubmit();
  await vi.waitFor(() => expect(root.textContent).toContain('수정된 코스'));
  expect(root.querySelector('#course-edit-form')).toBeNull();

  root.querySelector('[data-delete-course]').click();
  document.querySelector('[name="delete-password"]').value = '1234';
  [...document.querySelectorAll('dialog button')].find(button => button.textContent === '삭제').click();
  await vi.waitFor(() => expect(location.pathname).toBe('/courses'));
  const putCalls = fetch.mock.calls.filter(([input, options]) => new URL(input).pathname.includes('/api/courses/') && options.method === 'PUT');
  expect(JSON.parse(putCalls[1][1].body).location_content_ids).toEqual(['2', '1', '3', '4']);
  app.stop();
});
