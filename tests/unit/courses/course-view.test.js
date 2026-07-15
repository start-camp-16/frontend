import { expect, it, vi } from 'vitest';
import { renderCourseStops } from '../../../src/features/courses/course-view.js';

const stops = [
  { position: 1, distance_from_previous_meters: null, location: { content_id: '1', title: '문화비축기지', category: '문화시설', address: '서울 마포구' } },
  { position: 2, distance_from_previous_meters: 840, location: { content_id: '2', title: '하늘공원', category: '관광지', address: null } },
];

it('장소 순서를 표시하지만 거리 데이터는 표시하지 않는다', () => {
  renderCourseStops(document.body, stops, { onMove: vi.fn(), onRemove: vi.fn() });
  expect(document.body.textContent).toContain('문화비축기지');
  expect(document.body.textContent).toContain('하늘공원');
  expect(document.body.textContent).not.toContain('840');
  expect(document.body.textContent).not.toContain('거리');
  expect(document.querySelectorAll('[data-course-stop]')).toHaveLength(2);
  expect(document.querySelector('[aria-label="문화비축기지 위로"]').disabled).toBe(true);
  expect(document.querySelector('[aria-label="하늘공원 아래로"]').disabled).toBe(true);
});

it('순서 변경과 삭제 동작을 전달한다', () => {
  const onMove = vi.fn(); const onRemove = vi.fn();
  renderCourseStops(document.body, [...stops,
    { position: 3, location: { content_id: '3', title: '망원시장', category: '쇼핑' } },
    { position: 4, location: { content_id: '4', title: '서울함공원', category: '관광지' } },
  ], { onMove, onRemove });
  document.querySelector('[aria-label="하늘공원 위로"]').click();
  document.querySelector('[aria-label="문화비축기지 삭제"]').click();
  expect(onMove).toHaveBeenCalledWith(1, 0);
  expect(onRemove).toHaveBeenCalledWith(0);
});
