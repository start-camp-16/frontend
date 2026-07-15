import { expect, it, vi } from 'vitest';
import { mountPostFormPage } from '../../../src/features/board/post-form-page.js';

vi.mock('../../../src/features/board/board-api.js', () => ({
  createPost: vi.fn(),
  getPost: vi.fn(),
  updatePost: vi.fn(),
}));

it('데스크톱 새 게시글 화면에 작성 안내와 편집 영역을 분리한다', () => {
  const outlet = document.createElement('main');
  mountPostFormPage({
    outlet,
    params: {},
    signal: new AbortController().signal,
    navigate: vi.fn(),
  });

  expect(outlet.querySelector('.post-editor-layout')).not.toBeNull();
  expect(outlet.querySelector('.post-editor-sidebar')).not.toBeNull();
  expect(outlet.querySelector('.post-editor-main')).not.toBeNull();
  expect(outlet.querySelector('.post-editor-breadcrumb a').getAttribute('href')).toBe('/posts');
  expect(outlet.querySelector('.editor-form__actions button').textContent).toBe('게시글 등록');
});
