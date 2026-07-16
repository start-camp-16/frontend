import { getComments, createComment, updateComment, deleteComment } from './board-api.js';
import { validateComment } from './comment-validation.js';
import { openModal } from '../../ui/modal.js';

export function mountComments({ root, postId, signal }) {
  root.innerHTML = `
    <h2>댓글</h2>
    <form class="comment-form">
      <label class="visually-hidden" for="new-comment-content">댓글</label>
      <textarea id="new-comment-content" name="content" maxlength="1000" rows="3" placeholder="댓글을 입력해 주세요"></textarea>
      <label class="visually-hidden" for="new-comment-password">비밀번호</label>
      <input id="new-comment-password" name="password" type="password" maxlength="20" placeholder="비밀번호를 입력해 주세요">
      <small role="alert"></small>
      <button>댓글 남기기</button>
    </form>
    <div class="comments"></div>`;

  const form = root.querySelector('form');
  const list = root.querySelector('.comments');

  const editComment = (comment, article) => {
    article.innerHTML = `
      <form>
        <label>댓글<textarea name="content"></textarea></label>
        <label>비밀번호<input name="password" type="password"></label>
        <small role="alert"></small>
        <button>수정 저장</button>
      </form>`;
    const editForm = article.querySelector('form');
    editForm.elements.content.value = comment.content;
    editForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(editForm));
      const errors = validateComment(values);
      if (Object.keys(errors).length) {
        editForm.querySelector('small').textContent = Object.values(errors)[0];
        return;
      }
      try {
        await updateComment(comment.id, values, { signal });
        await load();
      } catch (error) {
        editForm.querySelector('small').textContent = error.code === 'PASSWORD_MISMATCH' ? '비밀번호가 일치하지 않습니다.' : error.message;
      }
    });
  };

  const removeComment = (comment, trigger) => {
    const input = document.createElement('input');
    input.type = 'password';
    input.placeholder = '댓글 비밀번호';
    const error = document.createElement('small');
    const wrap = document.createElement('div');
    wrap.append(input, error);
    openModal({
      title: '댓글을 삭제할까요?',
      content: wrap,
      trigger,
      confirmLabel: '삭제',
      onConfirm: async () => {
        try {
          await deleteComment(comment.id, { password: input.value }, { signal });
          await load();
          return true;
        } catch (requestError) {
          error.textContent = requestError.code === 'PASSWORD_MISMATCH' ? '비밀번호가 일치하지 않습니다.' : requestError.message;
          return false;
        }
      },
    });
  };

  const renderComment = (comment) => {
    const article = document.createElement('article');
    article.className = 'comment panel';

    const head = document.createElement('div');
    head.className = 'comment-head';
    const content = document.createElement('p');
    content.textContent = comment.content;

    const actions = document.createElement('details');
    actions.className = 'comment-actions';
    const summary = document.createElement('summary');
    summary.setAttribute('aria-label', '댓글 메뉴');
    summary.textContent = '⋮';
    const menu = document.createElement('div');
    menu.className = 'comment-actions__menu';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.textContent = '수정';
    edit.addEventListener('click', () => editComment(comment, article));
    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = '삭제';
    del.addEventListener('click', () => removeComment(comment, del));
    menu.append(edit, del);
    actions.append(summary, menu);
    head.append(content, actions);

    const time = document.createElement('time');
    time.textContent = new Date(comment.created_at).toLocaleString('ko-KR');
    article.append(head, time);
    return article;
  };

  const load = async () => {
    try {
      const data = await getComments(postId, { signal });
      list.replaceChildren(...data.items.map(renderComment));
    } catch (error) {
      if (error.name !== 'AbortError') list.textContent = error.message;
    }
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    const errors = validateComment(values);
    if (Object.keys(errors).length) {
      form.querySelector('small').textContent = Object.values(errors)[0];
      return;
    }
    try {
      await createComment(postId, values, { signal });
      form.reset();
      await load();
    } catch (error) {
      form.querySelector('small').textContent = error.message;
    }
  });

  load();
  return () => {};
}
