export function toCourseCoordinate({ latitude, longitude } = {}) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return [latitude, longitude];
}

export function toCourseSegments(stops) {
  const segments = [];
  for (let index = 1; index < stops.length; index += 1) {
    const previous = toCourseCoordinate(stops[index - 1].location);
    const current = toCourseCoordinate(stops[index].location);
    if (previous && current) segments.push([previous, current]);
  }
  return segments;
}

function prefersReducedMotion() {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function createCourseMap({ adapter, onSelect = () => {} }) {
  const markers = new Map();
  let selectedId = null;
  let destroyed = false;

  function setStops(stops) {
    adapter.clearLayers();
    markers.clear();
    selectedId = null;
    const coordinates = [];

    stops.forEach((stop, index) => {
      const coordinate = toCourseCoordinate(stop.location);
      if (!coordinate) return;
      const id = String(stop.location.content_id);
      const marker = adapter.addMarker(stop, index, coordinate, () => onSelect(id));
      markers.set(id, { marker, coordinate });
      coordinates.push(coordinate);
    });

    toCourseSegments(stops).forEach(segment => adapter.addLine(segment));
    if (coordinates.length === 1) adapter.setView(coordinates[0], 14);
    else if (coordinates.length > 1) adapter.fitBounds(coordinates);
    return coordinates.length;
  }

  function select(contentId, { focus = true } = {}) {
    const id = String(contentId);
    const next = markers.get(id);
    if (!next) return false;
    if (selectedId && markers.has(selectedId)) {
      adapter.selectMarker(markers.get(selectedId).marker, false);
    }
    selectedId = id;
    adapter.selectMarker(next.marker, true);
    if (focus) adapter.setView(next.coordinate, 15, { animate: !prefersReducedMotion() });
    adapter.openPopup(next.marker);
    return true;
  }

  return {
    setStops,
    select,
    invalidateSize: () => adapter.invalidateSize(),
    retryTiles: () => adapter.retryTiles(),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      markers.clear();
      adapter.destroy();
    },
  };
}
