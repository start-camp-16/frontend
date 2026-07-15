import { getPosts } from './board-api.js';
import { POST_DISTRICTS, POST_PREFIXES } from './board-constants.js';
import { openDistrictModal } from './district-modal.js';
import { renderAsyncState } from '../../ui/async-state.js';
import { renderPagination } from '../../ui/pagination.js';
import './board.css';

function boardTitle(district, prefix) {
  if (district && prefix) return `서울특별시 ${district} “${prefix}” 관련 소식`;
  if (district) return `서울특별시 ${district} 소식`;
  if (prefix) return `서울 “${prefix}” 관련 소식`;
  return '서울 동네 이야기';
}

export function mountBoardListPage({ outlet, query, signal, navigate }) {
  const district = POST_DISTRICTS.includes(query.get('district')) ? query.get('district') : '';
  const prefix = POST_PREFIXES.includes(query.get('prefix')) ? query.get('prefix') : '';
  const q = query.get('q') ?? '';
  const page = Math.max(1, parseInt(query.get('page') ?? '1', 10) || 1);
  const prefixes = ['전체', ...POST_PREFIXES];

  outlet.innerHTML = `
    <header class="board-page-head">
      <p class="eyebrow">Neighborhood board</p>
      <h1></h1>
      <p>서울의 동네 경험과 장소 이야기를 나눠보세요.</p>
    </header>
    <section class="board-layout">
      <aside class="board-filter-sidebar" aria-label="게시글 필터">
        <div class="board-filter-section">
          <p class="board-filter-label">지역</p>
          <button class="district-filter-trigger" type="button" data-open-district>
            <span>${district || '서울 전체'}</span><span aria-hidden="true">›</span>
          </button>
        </div>
        <div class="board-filter-section board-filter-section--themes">
          <p class="board-filter-label">테마</p>
          <div class="prefix-menu">
            ${prefixes.map((item) => {
              const value = item === '전체' ? '' : item;
              const selected = value === prefix;
              return `<button type="button" data-prefix="${value}" aria-current="${selected ? 'true' : 'false'}">${item}</button>`;
            }).join('')}
          </div>
        </div>
        <a class="button button--write" href="/posts/new">새 글 쓰기</a>
      </aside>
      <div class="board-content">
        <form class="search-form" role="search">
          <label class="visually-hidden" for="post-search">게시글 검색</label>
          <input id="post-search" name="q" placeholder="동네 이야기 검색" value="">
          <button>검색</button>
        </form>
        <div id="board-state" aria-live="polite"></div>
        <div id="post-list" class="post-list"></div>
        <div id="board-pagination"></div>
      </div>
    </section>`;

  outlet.querySelector('h1').textContent = boardTitle(district, prefix);
  outlet.querySelector('[name=q]').value = q;

  const go = ({ nextDistrict = district, nextPrefix = prefix, nextQ = q, nextPage = 1 } = {}) => {
    const params = new URLSearchParams();
    if (nextDistrict) params.set('district', nextDistrict);
    if (nextPrefix) params.set('prefix', nextPrefix);
    if (nextQ.trim()) params.set('q', nextQ.trim());
    if (nextPage > 1) params.set('page', String(nextPage));
    navigate(`/posts${params.size ? `?${params}` : ''}`);
  };

  const districtTrigger = outlet.querySelector('[data-open-district]');
  districtTrigger.addEventListener('click', () => openDistrictModal({
    selectedDistrict: district,
    trigger: districtTrigger,
    onApply: (nextDistrict) => go({ nextDistrict }),
    onClear: () => go({ nextDistrict: '' }),
  }));

  outlet.querySelectorAll('[data-prefix]').forEach((button) => {
    button.addEventListener('click', () => go({ nextPrefix: button.dataset.prefix }));
  });

  outlet.querySelector('.search-form').addEventListener('submit', (event) => {
    event.preventDefault();
    go({ nextQ: event.currentTarget.elements.q.value });
  });

  const state = outlet.querySelector('#board-state');
  const list = outlet.querySelector('#post-list');

  const load = async () => {
    renderAsyncState(state, { kind: 'loading', message: '게시글을 불러오고 있습니다…' });
    try {
      const data = await getPosts({ district, prefix, q, page, signal });
      state.replaceChildren();
      list.replaceChildren();
      if (!data.items.length) {
        const filters = [district, prefix, q.trim() && `“${q.trim()}”`].filter(Boolean).join(' · ');
        renderAsyncState(state, {
          kind: 'empty',
          message: filters ? `${filters} 조건에 맞는 게시글이 없습니다.` : '아직 게시글이 없습니다. 첫 이야기를 남겨보세요.',
        });
        return;
      }
      data.items.forEach((post) => {
        const link = document.createElement('a');
        link.className = 'post-row';
        link.href = `/posts/${post.id}`;
        const title = document.createElement('strong');
        title.textContent = post.title;
        const meta = document.createElement('span');
        meta.className = 'post-row-meta';
        const date = new Date(post.created_at).toLocaleDateString('ko-KR');
        meta.textContent = [post.district, post.prefix, date].filter(Boolean).join(' · ');
        link.append(title, meta);
        list.append(link);
      });
      renderPagination(outlet.querySelector('#board-pagination'), {
        page: data.pagination.page,
        totalPages: data.pagination.total_pages,
        onPageChange: (nextPage) => go({ nextPage }),
      });
    } catch (error) {
      if (error.name !== 'AbortError') renderAsyncState(state, { kind: 'error', message: error.message, onRetry: load });
    }
  };

  load();
  return () => {};
}
