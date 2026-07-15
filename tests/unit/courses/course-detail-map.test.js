import { beforeEach, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  getCourse: vi.fn(),
  updateCourse: vi.fn(),
  deleteCourse: vi.fn(),
}));

vi.mock('../../../src/features/courses/course-api.js', () => ({
  createCourse: vi.fn(),
  suggestCourse: vi.fn(),
  ...api,
}));

import { mountCourseDetailPage } from '../../../src/features/courses/course-detail-page.js';

const publicId = '0123456789abcdef0123456789abcdef';
const course = {
  public_id: publicId,
  title: '마포 하루 코스',
  created_at: '2026-07-15T00:00:00Z',
  updated_at: '2026-07-15T00:00:00Z',
  total_straight_line_distance_meters: 1900,
  stops: [
    { position: 1, location: { content_id: '1', title: '문화비축기지', category: '문화시설', address: '서울 마포구', latitude: 37.5705, longitude: 126.8948 } },
    { position: 2, location: { content_id: '2', title: '하늘공원', category: '관광지', address: '서울 마포구', latitude: null, longitude: null } },
    { position: 3, location: { content_id: '3', title: '망원시장', category: '쇼핑', address: '서울 마포구', latitude: 37.556, longitude: 126.906 } },
  ],
};

function mountWithMap(markerCount = 2) {
  const map = {
    setStops: vi.fn(() => markerCount),
    select: vi.fn(id => id !== '2'),
    invalidateSize: vi.fn(),
    retryTiles: vi.fn(),
    destroy: vi.fn(),
  };
  let markerSelect;
  const mapFactory = vi.fn(({ onSelect }) => {
    markerSelect = onSelect;
    return map;
  });
  const outlet = document.body.appendChild(document.createElement('main'));
  const cleanup = mountCourseDetailPage({
    outlet,
    params: { publicId },
    signal: new AbortController().signal,
    navigate: vi.fn(),
  }, { mapFactory, adapterFactory: vi.fn() });
  return { outlet, map, cleanup, selectMarker: id => markerSelect(id) };
}

beforeEach(() => {
  api.getCourse.mockResolvedValue(structuredClone(course));
  Element.prototype.scrollIntoView = vi.fn();
});

it('목록과 지도 마커 선택을 같은 content_id로 동기화한다', async () => {
  const { outlet, map, cleanup, selectMarker } = mountWithMap();
  await vi.waitFor(() => expect(map.setStops).toHaveBeenCalledWith(course.stops));

  outlet.querySelector('[data-course-stop="1"] button').click();
  expect(map.select).toHaveBeenCalledWith('1', { focus: true });
  expect(outlet.querySelector('[data-course-stop="1"] button')?.getAttribute('aria-current')).toBe('true');

  selectMarker('1');
  expect(map.select).toHaveBeenLastCalledWith('1', { focus: false });
  expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });

  outlet.querySelector('[data-course-stop="2"] button').click();
  expect(outlet.querySelector('[data-course-map-status]').textContent).toContain('지도 위치 정보가 없습니다');
  cleanup();
});

it('수정 화면으로 전환할 때 지도를 정리하고 수정 화면에서는 렌더링하지 않는다', async () => {
  const { outlet, map } = mountWithMap();
  await vi.waitFor(() => expect(map.setStops).toHaveBeenCalledOnce());
  outlet.querySelector('[data-edit-course]').click();
  expect(map.destroy).toHaveBeenCalledOnce();
  expect(outlet.querySelector('[data-course-map]')).toBeNull();
  expect(outlet.querySelector('#course-edit-form')).not.toBeNull();
});

it('유효 좌표가 없어도 전체 목록과 기존 작업을 유지한다', async () => {
  const { outlet, map, cleanup } = mountWithMap(0);
  await vi.waitFor(() => expect(map.setStops).toHaveBeenCalledOnce());
  expect(outlet.querySelectorAll('[data-course-stop]')).toHaveLength(3);
  expect(outlet.querySelector('[data-course-map-status]').textContent).toContain('표시할 위치 정보가 없습니다');
  expect(outlet.querySelector('[data-course-map]').hidden).toBe(true);
  expect(outlet.querySelector('[data-edit-course]')).not.toBeNull();
  cleanup();
  expect(map.destroy).toHaveBeenCalledOnce();
});
