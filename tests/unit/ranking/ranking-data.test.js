import { expect, it } from 'vitest';
import { parseRankingQuery, toRankingQuery } from '../../../src/features/ranking/ranking-state.js';

it('랭킹 쿼리에서 지역과 카테고리만 읽는다', () => {
  const query = new URLSearchParams('district=마포구&category=문화시설&page=2');
  expect(parseRankingQuery(query)).toEqual({ district:'마포구', category:'문화시설' });
});

it('랭킹 URL에 페이지 정보를 포함하지 않는다', () => {
  const query = toRankingQuery({ district:'마포구', category:'문화시설' });
  expect(query.get('district')).toBe('마포구');
  expect(query.get('category')).toBe('문화시설');
  expect(query.has('page')).toBe(false);
});
