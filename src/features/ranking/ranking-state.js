export function parseRankingQuery(params) {
  return { district: params.get('district') ?? '', category: params.get('category') ?? '' };
}
export function toRankingQuery({ district, category }) {
  const params = new URLSearchParams();
  if (district) params.set('district', district); if (category) params.set('category', category);
  return params;
}
