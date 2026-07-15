import { afterEach, expect, it, vi } from 'vitest';
import { getPosts } from '../../../src/features/board/board-api.js';

afterEach(() => vi.unstubAllGlobals());

it('게시글 목록 필터를 district와 prefix로 전송한다', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
    JSON.stringify({ items: [], pagination: { page: 1, size: 20, total_items: 0, total_pages: 0 } }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )));

  await getPosts({ district: '마포구', prefix: '맛집' });

  const url = new URL(fetch.mock.calls[0][0]);
  expect(url.searchParams.get('district')).toBe('마포구');
  expect(url.searchParams.get('prefix')).toBe('맛집');
  expect(url.searchParams.has('tag')).toBe(false);
});
