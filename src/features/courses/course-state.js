function normalizePositions(stops) {
  return stops.map((stop, index) => ({ ...stop, position: index + 1 }));
}

export function moveStop(stops, fromIndex, toIndex) {
  if (fromIndex < 0 || fromIndex >= stops.length || toIndex < 0 || toIndex >= stops.length) return stops;
  const next = [...stops];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return normalizePositions(next);
}

export function appendStop(stops, location) {
  if (stops.length >= 5) throw new Error('코스에는 최대 5곳까지 담을 수 있습니다.');
  if (stops.some(stop => stop.location.content_id === location.content_id)) throw new Error('이미 포함된 장소입니다.');
  return normalizePositions([...stops, { location }]);
}

export function removeStop(stops, index) {
  if (stops.length <= 3) throw new Error('코스에는 최소 3곳이 필요합니다.');
  return normalizePositions(stops.filter((_, stopIndex) => stopIndex !== index));
}

export function toLocationIds(stops) {
  return stops.map(stop => stop.location.content_id);
}
