import { beforeEach, expect, it, vi } from 'vitest';
import { getPosts } from '../../../src/features/board/board-api.js';
import { mountBoardListPage } from '../../../src/features/board/board-list-page.js';

vi.mock('../../../src/features/board/board-api.js', () => ({ getPosts: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  getPosts.mockResolvedValue({ items: [], pagination: { page: 3, total_pages: 3 } });
});

function mount(query = 'district=마포구&prefix=맛집&q=파스타&page=3') {
  const outlet = document.createElement('main');
  const navigate = vi.fn();
  mountBoardListPage({ outlet, query: new URLSearchParams(query), signal: new AbortController().signal, navigate });
  return { outlet, navigate };
}

it('유효한 필터로 API를 호출하고 선택 상태 제목을 표시한다', async () => {
  const { outlet } = mount();
  await vi.waitFor(() => expect(getPosts).toHaveBeenCalled());
  expect(getPosts).toHaveBeenCalledWith(expect.objectContaining({ district: '마포구', prefix: '맛집', q: '파스타', page: 3 }));
  expect(outlet.querySelector('h1').textContent).toBe('서울특별시 마포구 “맛집” 관련 소식');
});

it('테마를 바꾸면 지역과 검색어를 유지하고 페이지를 초기화한다', () => {
  const { outlet, navigate } = mount();
  outlet.querySelector('[data-prefix="문화"]').click();
  expect(navigate).toHaveBeenCalledWith('/posts?district=%EB%A7%88%ED%8F%AC%EA%B5%AC&prefix=%EB%AC%B8%ED%99%94&q=%ED%8C%8C%EC%8A%A4%ED%83%80');
});

it('지역 모달 적용과 전체 보기를 URL에 반영한다', () => {
  const { outlet, navigate } = mount();
  outlet.querySelector('[data-open-district]').click();
  document.querySelector('[data-district-option="중구"]').click();
  document.querySelector('[data-apply-district]').click();
  expect(navigate).toHaveBeenLastCalledWith('/posts?district=%EC%A4%91%EA%B5%AC&prefix=%EB%A7%9B%EC%A7%91&q=%ED%8C%8C%EC%8A%A4%ED%83%80');

  outlet.querySelector('[data-open-district]').click();
  document.querySelector('[data-clear-district]').click();
  expect(navigate).toHaveBeenLastCalledWith('/posts?prefix=%EB%A7%9B%EC%A7%91&q=%ED%8C%8C%EC%8A%A4%ED%83%80');
});

it('잘못된 지역과 테마는 전체 필터로 처리한다', async () => {
  const { outlet } = mount('district=없는구&prefix=없는테마');
  await vi.waitFor(() => expect(getPosts).toHaveBeenCalled());
  expect(getPosts).toHaveBeenCalledWith(expect.objectContaining({ district: '', prefix: '' }));
  expect(outlet.querySelector('h1').textContent).toBe('서울 동네 이야기');
});
