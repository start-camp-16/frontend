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
  expect(outlet.querySelector('[name="password"]').placeholder).toBe('비밀번호를 입력해주세요');
  expect(outlet.querySelector('.editor-form__section--password .visually-hidden').textContent).toBe('비밀번호');
});

it('글쓰기 지역 서브메뉴에서 옵션을 선택한다', () => {
  const outlet = document.createElement('main');
  mountPostFormPage({
    outlet,
    params: {},
    signal: new AbortController().signal,
    navigate: vi.fn(),
  });

  const field = outlet.querySelector('.editor-select-field');
  const select = field.querySelector('[name="district"]');
  const trigger = field.querySelector('.editor-select-field__trigger');
  const menu = field.querySelector('.editor-select-field__menu');

  trigger.click();
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  expect(menu.hidden).toBe(false);

  menu.querySelector('[data-value="강남구"]').click();
  expect(select.value).toBe('강남구');
  expect(trigger.textContent.trim()).toBe('강남구');
  expect(menu.hidden).toBe(true);
});
