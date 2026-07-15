import { expect, it, vi } from 'vitest';
import { getPosts } from '../../../src/features/board/board-api.js';
import { mountBoardListPage } from '../../../src/features/board/board-list-page.js';

vi.mock('../../../src/features/board/board-api.js', () => ({ getPosts: vi.fn() }));

it('API 목록의 실제 댓글 수를 게시글 옆에 표시한다', async () => {
  getPosts.mockResolvedValue({
    items: [{ id: 1, district: '마포구', prefix: '관광', title: '서울 산책', created_at: '2026-07-15T00:00:00Z', updated_at: '2026-07-15T00:00:00Z', comment_count: 3 }],
    pagination: { page: 1, total_pages: 1 },
  });
  const outlet = document.createElement('main');
  mountBoardListPage({ outlet, query: new URLSearchParams(), signal: new AbortController().signal, navigate: vi.fn() });
  await vi.waitFor(() => expect(outlet.querySelector('.post-row-meta')).not.toBeNull());

  expect(outlet.querySelector('.post-row-meta').textContent).toContain('마포구 · 관광');
  expect(outlet.querySelector('.post-comment-count').textContent).toBe('댓글 3');
  expect(outlet.querySelector('.post-row strong').textContent).toBe('서울 산책');
});
