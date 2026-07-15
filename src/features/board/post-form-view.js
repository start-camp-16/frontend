import { POST_DISTRICTS, POST_PREFIXES } from './board-constants.js';

export function renderPostForm(container, values = {}, { submitLabel = '게시글 등록' } = {}) {
  container.innerHTML = `
    <form class="editor-form panel" novalidate>
      <section class="editor-form__section editor-form__section--filters" aria-labelledby="editor-filter-title">
        <div class="editor-form__section-head">
          <span>01</span><div><h2 id="editor-filter-title">어디의 어떤 이야기인가요?</h2><p>지역과 이야기의 테마를 선택해 주세요.</p></div>
        </div>
        <div class="editor-form__filters">
          <label>지역
            <select name="district"><option value="">선택</option>${POST_DISTRICTS.map((district) => `<option value="${district}">${district}</option>`).join('')}</select>
            <small data-error="district"></small>
          </label>
          <label>테마
            <select name="prefix"><option value="">선택</option>${POST_PREFIXES.map((prefix) => `<option value="${prefix}">${prefix}</option>`).join('')}</select>
            <small data-error="prefix"></small>
          </label>
        </div>
      </section>
      <section class="editor-form__section" aria-labelledby="editor-content-title">
        <div class="editor-form__section-head">
          <span>02</span><div><h2 id="editor-content-title">이야기를 작성해 주세요</h2><p>알아보기 쉬운 제목과 자세한 내용을 적어주세요.</p></div>
        </div>
        <label>제목<input name="title" maxlength="100"><small data-error="title"></small></label>
        <label>본문<textarea name="content" maxlength="5000" rows="10"></textarea><small data-error="content"></small></label>
      </section>
      <section class="editor-form__section editor-form__section--password" aria-labelledby="editor-password-title">
        <div class="editor-form__section-head">
          <span>03</span><div><h2 id="editor-password-title">수정용 비밀번호</h2><p>나중에 게시글을 수정하거나 삭제할 때 사용합니다.</p></div>
        </div>
        <label>비밀번호<input name="password" type="password" minlength="4" maxlength="20" autocomplete="new-password"><small data-error="password"></small></label>
      </section>
      <div data-form-error role="alert"></div>
      <div class="editor-form__actions">
        <a class="button button--secondary" href="/posts">취소</a>
        <button type="submit">${submitLabel}</button>
      </div>
    </form>`;

  const form = container.querySelector('form');
  form.elements.district.value = values.district ?? '';
  form.elements.prefix.value = values.prefix ?? '';
  form.elements.title.value = values.title ?? '';
  form.elements.content.value = values.content ?? '';
  return form;
}

export function showFormErrors(form, errors) {
  form.querySelectorAll('[data-error]').forEach((node) => { node.textContent = errors[node.dataset.error] ?? ''; });
  const first = Object.keys(errors)[0];
  if (first) form.elements[first]?.focus();
}
