import { beforeEach, expect, it, vi } from 'vitest';
import { getPost } from '../../../src/features/board/board-api.js';
import { mountComments } from '../../../src/features/board/comments-controller.js';
import { mountPostDetailPage } from '../../../src/features/board/post-detail-page.js';

vi.mock('../../../src/features/board/board-api.js', () => ({
  getPost: vi.fn(),
  deletePost: vi.fn(),
}));
vi.mock('../../../src/features/board/comments-controller.js', () => ({ mountComments: vi.fn() }));
vi.mock('../../../src/ui/modal.js', () => ({ openModal: vi.fn() }));

beforeEach(() => {
  getPost.mockResolvedValue({
    id: 7,
    district: '마포구',
    prefix: '맛집',
    title: '동네 맛집을 소개해요',
    content: '조용하고 맛있는 곳입니다.',
    created_at: '2026-07-15T00:00:00Z',
    updated_at: '2026-07-15T00:00:00Z',
  });
});

it('데스크톱 상세 화면에 테마 사이드바와 넓은 본문 구조를 렌더링한다', async () => {
  const outlet = document.createElement('main');
  mountPostDetailPage({
    outlet,
    params: { id: '7' },
    signal: new AbortController().signal,
    navigate: vi.fn(),
  });

  await vi.waitFor(() => expect(outlet.querySelector('.post-detail-layout')).not.toBeNull());

  expect(outlet.querySelector('.post-detail-sidebar')).not.toBeNull();
  expect(outlet.querySelector('.post-detail-main')).not.toBeNull();
  expect(outlet.querySelector('.post-detail-breadcrumb').textContent).toContain('마포구');
  expect(outlet.querySelector('[data-breadcrumb-district]').getAttribute('href')).toBe('/posts?district=%EB%A7%88%ED%8F%AC%EA%B5%AC');
  expect(outlet.querySelector('[aria-current="page"]').textContent).toBe('맛집');
  expect(outlet.querySelector('.post-detail h1').textContent).toBe('동네 맛집을 소개해요');
  expect(outlet.querySelector('.post-desktop-actions summary').getAttribute('aria-label')).toBe('게시글 메뉴');
  expect(outlet.querySelector('.post-desktop-actions a').getAttribute('href')).toBe('/posts/7/edit');
  expect(outlet.querySelector('.post-desktop-actions button').textContent).toBe('삭제');
  expect(mountComments).toHaveBeenCalledWith(expect.objectContaining({ postId: '7' }));
});
