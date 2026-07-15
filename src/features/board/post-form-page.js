import { createPost, getPost, updatePost } from './board-api.js';
import { validatePost } from './post-validation.js';
import { renderPostForm, showFormErrors } from './post-form-view.js';
import './board.css';

export function mountPostFormPage({ outlet, params, signal, navigate }, mode = 'create') {
  const isEdit = mode === 'edit';
  const pageTitle = isEdit ? '게시글 수정' : '새 게시글';
  outlet.innerHTML = `
    <nav class="post-editor-breadcrumb" aria-label="현재 위치">
      <a href="/posts">게시판</a><span aria-hidden="true">›</span><strong>${pageTitle}</strong>
    </nav>
    <div class="post-editor-layout">
      <aside class="post-editor-sidebar" aria-label="게시글 작성 순서">
        <p>글쓰기</p>
        <ol>
          <li><span>01</span> 지역과 테마</li>
          <li><span>02</span> 제목과 본문</li>
          <li><span>03</span> 비밀번호</li>
        </ol>
      </aside>
      <main class="post-editor-main">
        <header class="post-editor-head">
          <p class="eyebrow">Write a story</p>
          <h1>${pageTitle}</h1>
          <p>동네에서 발견한 장소와 경험을 이웃에게 들려주세요.</p>
        </header>
        <div id="editor"></div>
      </main>
    </div>`;

  const root = outlet.querySelector('#editor');
  let form;

  const submit = async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    const errors = validatePost(values);
    showFormErrors(form, errors);
    if (Object.keys(errors).length) return;

    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      const result = isEdit
        ? await updatePost(params.id, values, { signal })
        : await createPost(values, { signal });
      navigate(`/posts/${result.id}`);
    } catch (error) {
      if (error.name !== 'AbortError') {
        form.querySelector('[data-form-error]').textContent = error.code === 'PASSWORD_MISMATCH' ? '비밀번호가 일치하지 않습니다.' : error.message;
      }
    } finally {
      button.disabled = false;
    }
  };

  const mount = (values) => {
    form = renderPostForm(root, values, { submitLabel: isEdit ? '변경사항 저장' : '게시글 등록' });
    form.addEventListener('submit', submit);
  };

  if (isEdit) {
    getPost(params.id, { signal }).then(mount).catch((error) => { root.textContent = error.message; });
  } else {
    mount({});
  }

  return () => {};
}
