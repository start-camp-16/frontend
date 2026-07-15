import { beforeEach, expect, it, vi } from 'vitest';
import {
  appendStop,
  moveStop,
  removeStop,
  toLocationIds,
} from '../../../src/features/courses/course-state.js';
import {
  validateCourse,
  validateCriteria,
} from '../../../src/features/courses/course-validation.js';
import {
  createCourse,
  deleteCourse,
  getCourse,
  suggestCourse,
  updateCourse,
} from '../../../src/features/courses/course-api.js';

const stops = ['1', '2', '3'].map((content_id, index) => ({
  position: index + 1,
  location: { content_id, title: `장소 ${content_id}` },
}));

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })));
});

it('초안 장소를 불변 방식으로 이동·추가·삭제·직렬화한다', () => {
  expect(moveStop(stops, 0, 1).map(item => item.location.content_id)).toEqual(['2', '1', '3']);
  expect(appendStop(stops, { content_id: '4', title: '장소 4' })).toHaveLength(4);
  expect(() => appendStop(stops, { content_id: '1' })).toThrow('이미 포함된 장소');
  expect(removeStop(stops, 1).map(item => item.location.content_id)).toEqual(['1', '3']);
  expect(toLocationIds(stops)).toEqual(['1', '2', '3']);
  expect(stops.map(item => item.location.content_id)).toEqual(['1', '2', '3']);
});

it('조건과 최종 코스 경계값을 검증한다', () => {
  expect(validateCriteria({ district: '', categories: [], stop_count: 2 })).toMatchObject({
    district: expect.any(String), categories: expect.any(String), stop_count: expect.any(String),
  });
  expect(validateCriteria({ district: '마포구', categories: ['관광지'], stop_count: 3 })).toEqual({});
  expect(validateCriteria({ district: '마포구', categories: ['관광지', '관광지'], stop_count: 3 })).toHaveProperty('categories');
  expect(validateCourse({ title: '제목', password: '1234', stops })).toEqual({});
  expect(validateCourse({ title: '', password: '123', stops: stops.slice(0, 2) })).toMatchObject({
    title: expect.any(String), password: expect.any(String), stops: expect.any(String),
  });
});

it('코스 API 계약에 맞는 메서드와 본문을 사용한다', async () => {
  const publicId = '0123456789abcdef0123456789abcdef';
  await suggestCourse({ district: '마포구', categories: ['관광지'], stop_count: 3 });
  await createCourse({ title: '제목', password: '1234', location_content_ids: ['1', '2', '3'] });
  await getCourse(publicId);
  await updateCourse(publicId, { title: '수정', password: '1234', location_content_ids: ['3', '2', '1'] });
  await deleteCourse(publicId, { password: '1234' });

  const calls = fetch.mock.calls.map(([url, options]) => ({ url: new URL(url).pathname, method: options.method, body: options.body }));
  expect(calls).toEqual([
    { url: '/api/course-suggestions', method: 'POST', body: JSON.stringify({ district: '마포구', categories: ['관광지'], stop_count: 3 }) },
    { url: '/api/courses', method: 'POST', body: JSON.stringify({ title: '제목', password: '1234', location_content_ids: ['1', '2', '3'] }) },
    { url: `/api/courses/${publicId}`, method: 'GET', body: undefined },
    { url: `/api/courses/${publicId}`, method: 'PUT', body: JSON.stringify({ title: '수정', password: '1234', location_content_ids: ['3', '2', '1'] }) },
    { url: `/api/courses/${publicId}`, method: 'DELETE', body: JSON.stringify({ password: '1234' }) },
  ]);
});
