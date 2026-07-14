import { getPosts } from './board-api.js';
import { POST_TAGS } from './board-constants.js';
import { renderAsyncState } from '../../ui/async-state.js';
import { renderPagination } from '../../ui/pagination.js';
import './board.css';

export function mountBoardListPage({ outlet, query, signal, navigate }) {
  const tags = ['전체', ...POST_TAGS];
  const tag = POST_TAGS.includes(query.get('tag')) ? query.get('tag') : '';
  const q = query.get('q') ?? '';
  const page = Math.max(1, parseInt(query.get('page') ?? '1', 10) || 1);

  outlet.innerHTML = `
    <header class="section-head">
      <div>
        <p class="eyebrow">Neighborhood board</p>
        <h1>동네 이야기를 나눠요</h1>
      </div>
    </header>
    <section class="board-shell panel">
      <div class="board-toolbar">
        <div class="tag-tabs" role="tablist">
          ${tags.map((t) => `<button role="tab" aria-selected="${(t === '전체' && !tag) || t === tag}" data-tag="${t === '전체' ? '' : t}">${t}</button>`).join('')}
        </div>
        <form class="search-form">
          <label class="visually-hidden" for="post-search">게시글 검색</label>
          <input id="post-search" name="q" value="">
          <button>검색</button>
          <a class="button" href="/posts/new">글쓰기</a>
        </form>
      </div>
      <div id="board-state" aria-live="polite"></div>
      <div class="post-list-head" aria-hidden="true">
        <span>분류</span>
        <span>제목</span>
        <span>작성일</span>
      </div>
      <div id="post-list" class="post-list"></div>
      <div id="board-pagination"></div>
    </section>`;

  outlet.querySelector('[name=q]').value = q;

  const go = (nextTag = tag, nextQ = q, nextPage = 1) => {
    const p = new URLSearchParams();
    if (nextTag) p.set('tag', nextTag);
    if (nextQ.trim()) p.set('q', nextQ.trim());
    if (nextPage > 1) p.set('page', String(nextPage));
    navigate(`/posts${p.size ? `?${p}` : ''}`);
  };

  outlet.querySelectorAll('[data-tag]').forEach((button) => {
    button.addEventListener('click', () => go(button.dataset.tag, q, 1));
  });

  outlet.querySelector('form').addEventListener('submit', (event) => {
    event.preventDefault();
    go(tag, event.currentTarget.elements.q.value, 1);
  });

  const state = outlet.querySelector('#board-state');
  const list = outlet.querySelector('#post-list');

  const load = async () => {
    renderAsyncState(state, { kind: 'loading', message: '게시글을 불러오고 있습니다…' });

    try {
      const data = await getPosts({ tag, q, page, signal });
      state.replaceChildren();
      list.replaceChildren();

      if (!data.items.length) {
        renderAsyncState(state, { kind: 'empty', message: '아직 게시글이 없습니다. 첫 이야기를 남겨보세요.' });
        return;
      }

      data.items.forEach((post) => {
        const a = document.createElement('a');
        a.className = 'post-row panel';
        a.href = `/posts/${post.id}`;
        a.innerHTML = '<span class="post-tag"></span><strong></strong><time></time>';
        a.children[0].textContent = post.tag;
        a.children[1].textContent = post.title;
        a.children[2].dateTime = post.created_at;
        a.children[2].textContent = new Date(post.created_at).toLocaleDateString('ko-KR');
        list.append(a);
      });

      renderPagination(outlet.querySelector('#board-pagination'), {
        page: data.pagination.page,
        totalPages: data.pagination.total_pages,
        onPageChange: (nextPage) => go(tag, q, nextPage),
      });
    } catch (error) {
      if (error.name !== 'AbortError') {
        renderAsyncState(state, { kind: 'error', message: error.message, onRetry: load });
      }
    }
  };

  load();

  return () => {};
}
