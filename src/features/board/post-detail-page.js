import { getPost, deletePost } from './board-api.js';
import { POST_PREFIXES } from './board-constants.js';
import { mountComments } from './comments-controller.js';
import { openModal } from '../../ui/modal.js';
import './board.css';

export function renderPostLoadError(root, message) {
  const box = document.createElement('div');
  box.className = 'async-state';
  box.setAttribute('role', 'alert');
  const text = document.createElement('p');
  text.textContent = message;
  const link = document.createElement('a');
  link.href = '/posts';
  link.textContent = '게시판으로';
  box.append(text, link);
  root.replaceChildren(box);
}

function renderThemeLinks(root, currentPrefix) {
  const list = root.querySelector('.post-detail-theme-list');
  POST_PREFIXES.forEach((prefix) => {
    const link = document.createElement('a');
    link.href = `/posts?prefix=${encodeURIComponent(prefix)}`;
    link.textContent = prefix;
    if (prefix === currentPrefix) link.setAttribute('aria-current', 'page');
    list.append(link);
  });
}

export function mountPostDetailPage({ outlet, params, signal, navigate }) {
  outlet.innerHTML = `
    <nav class="post-detail-breadcrumb" aria-label="현재 위치">
      <a href="/posts">게시판</a><span aria-hidden="true">›</span><span data-breadcrumb-district>서울</span><span aria-hidden="true">›</span><strong data-breadcrumb-prefix>게시글</strong>
    </nav>
    <div class="post-detail-layout">
      <aside class="post-detail-sidebar" aria-label="게시판 테마">
        <p>테마</p>
        <a class="post-detail-all" href="/posts">전체</a>
        <nav class="post-detail-theme-list"></nav>
      </aside>
      <main class="post-detail-main">
        <div id="post-detail"></div>
        <section id="comments-root" class="post-detail-comments"></section>
      </main>
    </div>`;

  const root = outlet.querySelector('#post-detail');

  const removePost = (trigger) => {
    const input = document.createElement('input');
    input.type = 'password';
    input.placeholder = '게시글 비밀번호';
    const error = document.createElement('small');
    const wrap = document.createElement('div');
    wrap.append(input, error);
    openModal({
      title: '게시글을 삭제할까요?',
      content: wrap,
      trigger,
      confirmLabel: '삭제',
      onConfirm: async () => {
        try {
          await deletePost(params.id, { password: input.value }, { signal });
          navigate('/posts');
          return true;
        } catch (requestError) {
          error.textContent = requestError.code === 'PASSWORD_MISMATCH' ? '비밀번호가 일치하지 않습니다.' : requestError.message;
          return false;
        }
      },
    });
  };

  getPost(params.id, { signal }).then((post) => {
    outlet.querySelector('[data-breadcrumb-district]').textContent = post.district;
    outlet.querySelector('[data-breadcrumb-prefix]').textContent = post.prefix;
    renderThemeLinks(outlet, post.prefix);

    const article = document.createElement('article');
    article.className = 'post-detail panel';
    article.innerHTML = `
      <span class="post-tag"></span>
      <div class="post-detail-context"></div>
      <h1></h1>
      <div class="post-meta"></div>
      <p class="post-content"></p>
      <div class="post-actions">
        <a class="button button--secondary" href="/posts/${post.id}/edit">수정</a>
        <button type="button">삭제</button>
      </div>`;
    article.querySelector('.post-tag').textContent = post.prefix;
    article.querySelector('.post-detail-context').textContent = post.district;
    article.querySelector('h1').textContent = post.title;
    article.querySelector('.post-content').textContent = post.content;
    article.querySelector('.post-meta').textContent = `작성 ${new Date(post.created_at).toLocaleString('ko-KR')}${post.updated_at !== post.created_at ? ` · 수정 ${new Date(post.updated_at).toLocaleString('ko-KR')}` : ''}`;
    article.querySelector('button').addEventListener('click', (event) => removePost(event.currentTarget));
    root.replaceChildren(article);
    mountComments({ root: outlet.querySelector('#comments-root'), postId: params.id, signal });
  }).catch((error) => {
    if (error.name !== 'AbortError') renderPostLoadError(root, error.message);
  });

  return () => {};
}
