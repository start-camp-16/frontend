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

export function toCourseMarkerOffsets(stops) {
  const offsets = stops.map(() => null);
  const groups = new Map();
  stops.forEach((stop, index) => {
    const coordinate = toCourseCoordinate(stop.location);
    if (!coordinate) return;
    const key = coordinate.join(',');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(index);
  });
  groups.forEach(indices => indices.forEach((stopIndex, groupIndex) => {
    if (indices.length === 1) {
      offsets[stopIndex] = { x: 0, y: 0 };
      return;
    }
    const angle = -Math.PI / 2 + (2 * Math.PI * groupIndex) / indices.length;
    offsets[stopIndex] = { x: 28 * Math.cos(angle), y: 28 * Math.sin(angle) };
  }));
  return offsets;
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
    const uniqueCoordinates = new Map();
    const offsets = toCourseMarkerOffsets(stops);

    stops.forEach((stop, index) => {
      const coordinate = toCourseCoordinate(stop.location);
      if (!coordinate) return;
      const id = String(stop.location.content_id);
      const marker = adapter.addMarker(stop, index, coordinate, () => onSelect(id), offsets[index]);
      markers.set(id, { marker, coordinate });
      coordinates.push(coordinate);
      uniqueCoordinates.set(coordinate.join(','), coordinate);
    });

    toCourseSegments(stops).forEach(segment => adapter.addLine(segment));
    const viewportCoordinates = [...uniqueCoordinates.values()];
    if (viewportCoordinates.length === 1) adapter.setView(viewportCoordinates[0], 14);
    else if (viewportCoordinates.length > 1) adapter.fitBounds(viewportCoordinates);
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
