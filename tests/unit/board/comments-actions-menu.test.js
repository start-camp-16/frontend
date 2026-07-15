import { expect, it, vi } from 'vitest';
import { getComments } from '../../../src/features/board/board-api.js';
import { mountComments } from '../../../src/features/board/comments-controller.js';

vi.mock('../../../src/features/board/board-api.js', () => ({
  getComments: vi.fn(),
  createComment: vi.fn(),
  updateComment: vi.fn(),
  deleteComment: vi.fn(),
}));
vi.mock('../../../src/ui/modal.js', () => ({ openModal: vi.fn() }));

it('댓글의 수정과 삭제를 세로 점 메뉴에 배치한다', async () => {
  getComments.mockResolvedValue({
    items: [{ id: 11, content: '사진 찍기 좋은 시간이 궁금해요.', created_at: '2026-07-15T00:00:00Z' }],
  });
  const root = document.createElement('section');
  mountComments({ root, postId: '7', signal: new AbortController().signal });

  await vi.waitFor(() => expect(root.querySelector('.comment-actions')).not.toBeNull());

  expect(root.querySelector('.comment-actions summary').getAttribute('aria-label')).toBe('댓글 메뉴');
  expect([...root.querySelectorAll('.comment-actions button')].map((button) => button.textContent)).toEqual(['수정', '삭제']);

  root.querySelector('.comment-actions button').click();
  expect(root.querySelector('.comment > form')).not.toBeNull();
});
