import { beforeEach, expect, it, vi } from 'vitest';

const leaflet = vi.hoisted(() => {
  const mapInstance = {
    removeLayer: vi.fn(),
    setView: vi.fn(),
    fitBounds: vi.fn(),
    invalidateSize: vi.fn(),
    remove: vi.fn(),
  };
  const zoomControl = { addTo: vi.fn() };
  const tileLayer = { on: vi.fn(), off: vi.fn(), addTo: vi.fn() };
  return {
    mapInstance,
    zoomControl,
    tileLayer,
    default: {
      map: vi.fn(() => mapInstance),
      control: { zoom: vi.fn(() => zoomControl) },
      tileLayer: vi.fn(() => tileLayer),
      divIcon: vi.fn(options => options),
      marker: vi.fn(() => ({
        bindPopup: vi.fn(), on: vi.fn(), addTo: vi.fn(),
        setIcon: vi.fn(), setZIndexOffset: vi.fn(), openPopup: vi.fn(),
      })),
      polyline: vi.fn(() => ({ addTo: vi.fn() })),
    },
  };
});

vi.mock('leaflet', () => ({ default: leaflet.default }));

import { createCourseLeafletAdapter } from '../../../src/features/courses/course-map-adapter.js';

beforeEach(() => {
  vi.clearAllMocks();
});

it('방문 번호 마커와 안전한 팝업, 직선 레이어를 만든다', () => {
  const onClick = vi.fn();
  const adapter = createCourseLeafletAdapter(document.body);
  const stop = { location: { content_id: '1', title: '문화비축기지', address: '서울 마포구' } };
  const marker = adapter.addMarker(stop, 0, [37.5, 127], onClick);

  expect(leaflet.default.divIcon).toHaveBeenCalledWith(expect.objectContaining({
    className: 'course-marker',
    html: '<span aria-hidden="true">1</span>',
  }));
  const popup = marker.bindPopup.mock.calls[0][0];
  expect(popup.textContent).toContain('1번째 · 문화비축기지');
  expect(popup.textContent).toContain('서울 마포구');
  expect(marker.on).toHaveBeenCalledWith('click', onClick);

  adapter.addLine([[37.5, 127], [37.6, 127.1]]);
  expect(leaflet.default.polyline).toHaveBeenCalledWith(
    [[37.5, 127], [37.6, 127.1]],
    expect.objectContaining({ className: 'course-route' }),
  );
});

it('선택 스타일, 레이어 정리, 타일 재시도와 지도 제거를 위임한다', () => {
  const adapter = createCourseLeafletAdapter(document.body);
  const marker = adapter.addMarker({ location: { content_id: '2', title: '하늘공원' } }, 1, [37.6, 127.1], vi.fn());
  adapter.addLine([[37.5, 127], [37.6, 127.1]]);
  adapter.selectMarker(marker, true);
  adapter.openPopup(marker);
  adapter.clearLayers();
  adapter.retryTiles();
  adapter.destroy();

  expect(marker.setIcon).toHaveBeenCalledWith(expect.objectContaining({ className: 'course-marker course-marker--active' }));
  expect(marker.openPopup).toHaveBeenCalledOnce();
  expect(leaflet.mapInstance.removeLayer).toHaveBeenCalledTimes(3);
  expect(leaflet.default.tileLayer).toHaveBeenCalledTimes(2);
  expect(leaflet.mapInstance.remove).toHaveBeenCalledOnce();
});

it('동일 좌표 마커의 픽셀 offset을 기본·활성 아이콘과 팝업에 유지한다', () => {
  const adapter = createCourseLeafletAdapter(document.body);
  const marker = adapter.addMarker(
    { location: { content_id: '3', title: '망원시장' } },
    2,
    [37.5, 127],
    vi.fn(),
    { x: 24, y: -8 },
  );
  expect(leaflet.default.divIcon).toHaveBeenLastCalledWith(expect.objectContaining({
    iconAnchor: [-9, 46],
    popupAnchor: [24, -42],
  }));

  adapter.selectMarker(marker, true);
  expect(leaflet.default.divIcon).toHaveBeenLastCalledWith(expect.objectContaining({
    iconAnchor: [-5, 54],
    popupAnchor: [24, -50],
  }));
});
