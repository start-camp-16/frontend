import { describe, expect, it, vi } from 'vitest';
import {
  createCourseMap,
  toCourseCoordinate,
  toCourseMarkerOffsets,
  toCourseSegments,
} from '../../../src/features/courses/course-map.js';

const stop = (id, latitude, longitude) => ({
  position: Number(id),
  location: { content_id: id, title: `장소 ${id}`, latitude, longitude },
});

function fakeAdapter() {
  return {
    addMarker: vi.fn((item, index, coordinate, onClick, offset) => ({ item, index, coordinate, onClick, offset })),
    addLine: vi.fn(coordinates => ({ coordinates })),
    clearLayers: vi.fn(),
    setView: vi.fn(),
    fitBounds: vi.fn(),
    selectMarker: vi.fn(),
    openPopup: vi.fn(),
    invalidateSize: vi.fn(),
    retryTiles: vi.fn(),
    destroy: vi.fn(),
  };
}

describe('course coordinates and segments', () => {
  it('유효한 숫자 좌표만 Leaflet 순서로 반환한다', () => {
    expect(toCourseCoordinate({ latitude: 37.5, longitude: 127 })).toEqual([37.5, 127]);
    for (const location of [
      { latitude: null, longitude: 127 },
      { latitude: '37.5', longitude: 127 },
      { latitude: 91, longitude: 127 },
      { latitude: 37.5, longitude: 181 },
    ]) expect(toCourseCoordinate(location)).toBeNull();
  });

  it('서로 인접한 유효 좌표만 직선 구간으로 만든다', () => {
    const stops = [
      stop('1', 37.5, 127),
      stop('2', null, null),
      stop('3', 37.6, 127.1),
      stop('4', 37.7, 127.2),
    ];
    expect(toCourseSegments(stops)).toEqual([[[37.6, 127.1], [37.7, 127.2]]]);
  });

  it('동일 좌표 마커만 원형으로 펼칠 결정적 offset을 만든다', () => {
    const stops = [
      stop('1', 37.5, 127),
      stop('2', 37.5, 127),
      stop('3', 37.5, 127),
      stop('4', 37.6, 127.1),
      stop('5', null, null),
    ];
    const offsets = toCourseMarkerOffsets(stops);
    expect(offsets[3]).toEqual({ x: 0, y: 0 });
    expect(offsets[4]).toBeNull();
    expect(new Set(offsets.slice(0, 3).map(offset => `${offset.x.toFixed(4)},${offset.y.toFixed(4)}`)).size).toBe(3);
    offsets.slice(0, 3).forEach(offset => expect(Math.hypot(offset.x, offset.y)).toBeCloseTo(28));
  });
});

describe('createCourseMap', () => {
  it('마커 수에 따라 빈 상태, 단일 중심, 전체 bounds를 선택한다', () => {
    const adapter = fakeAdapter();
    const map = createCourseMap({ container: document.body, adapter });
    expect(map.setStops([stop('1', null, null)])).toBe(0);
    expect(map.setStops([stop('1', 37.5, 127)])).toBe(1);
    expect(adapter.setView).toHaveBeenLastCalledWith([37.5, 127], 14);
    expect(map.setStops([stop('1', 37.5, 127), stop('2', 37.6, 127.1)])).toBe(2);
    expect(adapter.fitBounds).toHaveBeenLastCalledWith([[37.5, 127], [37.6, 127.1]]);
    expect(adapter.addLine).toHaveBeenCalledWith([[37.5, 127], [37.6, 127.1]]);
  });

  it('마커 클릭과 선택을 content_id로 연결하고 안전하게 정리한다', () => {
    const adapter = fakeAdapter();
    const onSelect = vi.fn();
    const map = createCourseMap({ container: document.body, adapter, onSelect });
    map.setStops([stop('7', 37.5, 127)]);
    adapter.addMarker.mock.results[0].value.onClick();
    expect(onSelect).toHaveBeenCalledWith('7');
    expect(map.select('7')).toBe(true);
    expect(map.select('missing')).toBe(false);
    map.retryTiles();
    map.invalidateSize();
    map.destroy();
    map.destroy();
    expect(adapter.retryTiles).toHaveBeenCalledOnce();
    expect(adapter.invalidateSize).toHaveBeenCalledOnce();
    expect(adapter.destroy).toHaveBeenCalledOnce();
  });

  it('동일 좌표 마커를 펼치면서 viewport와 연결선에는 원본 좌표를 사용한다', () => {
    const adapter = fakeAdapter();
    const map = createCourseMap({ container: document.body, adapter });
    const duplicateStops = [stop('1', 37.5, 127), stop('2', 37.5, 127)];
    expect(map.setStops(duplicateStops)).toBe(2);
    expect(adapter.setView).toHaveBeenCalledWith([37.5, 127], 14);
    expect(adapter.fitBounds).not.toHaveBeenCalled();
    const offsets = adapter.addMarker.mock.calls.map(call => call[4]);
    expect(offsets[0]).not.toEqual(offsets[1]);
    expect(adapter.addLine).toHaveBeenCalledWith([[37.5, 127], [37.5, 127]]);
  });
});
