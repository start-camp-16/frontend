import { getPosts } from './board-api.js';
import { POST_DISTRICTS, POST_PREFIXES } from './board-constants.js';
import { openDistrictModal } from './district-modal.js';
import { renderAsyncState } from '../../ui/async-state.js';
import { renderPagination } from '../../ui/pagination.js';
import './board.css';

const PAGE_SIZES = [10, 20, 30];

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
  const requestedSize = Number.parseInt(query.get('size') ?? '', 10);
  const size = PAGE_SIZES.includes(requestedSize) ? requestedSize : 10;
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
        <div class="board-list-toolbar">
          <div class="board-page-size">
            <select class="board-page-size__native" id="post-page-size" name="page-size" aria-label="페이지당 표시 개수">
              ${PAGE_SIZES.map((pageSize) => `<option value="${pageSize}"${pageSize === size ? ' selected' : ''}>${pageSize}개씩 보기</option>`).join('')}
            </select>
            <button class="board-page-size__trigger" type="button" aria-haspopup="listbox" aria-expanded="false">
              <span data-page-size-value>${size}개씩 보기</span>
            </button>
            <div class="board-page-size__menu" role="listbox" hidden>
              ${PAGE_SIZES.map((pageSize) => `<button class="board-page-size__option" type="button" role="option" data-page-size="${pageSize}" aria-selected="${pageSize === size ? 'true' : 'false'}">${pageSize}개씩 보기</button>`).join('')}
            </div>
          </div>
        </div>
        <div id="board-state" aria-live="polite"></div>
        <div id="post-list" class="post-list"></div>
        <div id="board-pagination"></div>
      </div>
    </section>`;

  outlet.querySelector('h1').textContent = boardTitle(district, prefix);
  outlet.querySelector('[name=q]').value = q;

  const go = ({ nextDistrict = district, nextPrefix = prefix, nextQ = q, nextPage = 1, nextSize = size } = {}) => {
    const params = new URLSearchParams();
    if (nextDistrict) params.set('district', nextDistrict);
    if (nextPrefix) params.set('prefix', nextPrefix);
    if (nextQ.trim()) params.set('q', nextQ.trim());
    if (nextPage > 1) params.set('page', String(nextPage));
    params.set('size', String(nextSize));
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

  const pageSizeSelect = outlet.querySelector('[name="page-size"]');
  const pageSizeTrigger = outlet.querySelector('.board-page-size__trigger');
  const pageSizeMenu = outlet.querySelector('.board-page-size__menu');
  const pageSizeValue = outlet.querySelector('[data-page-size-value]');

  const closePageSizeMenu = () => {
    pageSizeMenu.hidden = true;
    pageSizeTrigger.setAttribute('aria-expanded', 'false');
  };

  pageSizeTrigger.addEventListener('click', (event) => {
    event.stopPropagation();
    const willOpen = pageSizeMenu.hidden;
    pageSizeMenu.hidden = !willOpen;
    pageSizeTrigger.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) pageSizeMenu.querySelector('[aria-selected="true"]')?.focus();
  });

  pageSizeMenu.addEventListener('click', (event) => {
    const option = event.target.closest('[data-page-size]');
    if (!option) return;
    pageSizeSelect.value = option.dataset.pageSize;
    pageSizeValue.textContent = option.textContent.trim();
    pageSizeMenu.querySelectorAll('[data-page-size]').forEach((item) => {
      item.setAttribute('aria-selected', String(item === option));
    });
    closePageSizeMenu();
    pageSizeSelect.dispatchEvent(new Event('change', { bubbles: true }));
  });

  pageSizeMenu.addEventListener('keydown', (event) => {
    const options = [...pageSizeMenu.querySelectorAll('[data-page-size]')];
    const current = options.indexOf(document.activeElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      closePageSizeMenu();
      pageSizeTrigger.focus();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      options[Math.min(current + 1, options.length - 1)]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      options[Math.max(current - 1, 0)]?.focus();
    }
  });

  document.addEventListener('click', closePageSizeMenu);

  pageSizeSelect.addEventListener('change', (event) => {
    go({ nextSize: Number(event.currentTarget.value) });
  });

  const state = outlet.querySelector('#board-state');
  const list = outlet.querySelector('#post-list');

  const load = async () => {
    renderAsyncState(state, { kind: 'loading', message: '게시글을 불러오고 있습니다…' });
    try {
      const data = await getPosts({ district, prefix, q, page, size, signal });
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
        const heading = document.createElement('span');
        heading.className = 'post-row-heading';
        const commentCount = document.createElement('span');
        commentCount.className = 'post-comment-count';
        commentCount.textContent = `댓글 ${post.comment_count ?? 0}`;
        heading.append(title, commentCount);
        const meta = document.createElement('span');
        meta.className = 'post-row-meta';
        const date = new Date(post.created_at).toLocaleDateString('ko-KR');
        meta.textContent = [post.district, post.prefix, date].filter(Boolean).join(' · ');
        link.append(heading, meta);
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
  return () => {
    document.removeEventListener('click', closePageSizeMenu);
  };
}
