import { POST_DISTRICTS, POST_PREFIXES } from './board-constants.js';

function renderEditorSelect(name, label, options) {
  return `<label class="editor-select-field"><span>${label}</span><select class="editor-select-field__native" name="${name}"><option value="">선택</option>${options.map((option) => `<option value="${option}">${option}</option>`).join('')}</select><button class="editor-select-field__trigger" type="button" aria-haspopup="listbox" aria-expanded="false"><span data-editor-select-value>선택</span></button><div class="editor-select-field__menu" role="listbox" hidden></div><small data-error="${name}"></small></label>`;
}

function attachEditorSelect(select) {
  const field = select.closest('.editor-select-field');
  const trigger = field.querySelector('.editor-select-field__trigger');
  const value = field.querySelector('[data-editor-select-value]');
  const menu = field.querySelector('.editor-select-field__menu');

  const closeMenu = () => {
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
  };

  const syncLabel = () => {
    value.textContent = select.selectedOptions[0]?.textContent || '선택';
  };

  const renderOptions = () => {
    menu.replaceChildren();
    [...select.options].forEach((option) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'editor-select-field__option';
      item.dataset.value = option.value;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(option.value === select.value));
      item.textContent = option.textContent;
      item.addEventListener('click', () => {
        select.value = option.value;
        syncLabel();
        renderOptions();
        closeMenu();
        trigger.focus();
      });
      menu.append(item);
    });
  };

  trigger.addEventListener('click', (event) => {
    event.stopPropagation();
    const willOpen = menu.hidden;
    document.querySelectorAll('.editor-select-field__menu').forEach((node) => { node.hidden = true; });
    document.querySelectorAll('.editor-select-field__trigger').forEach((node) => node.setAttribute('aria-expanded', 'false'));
    menu.hidden = !willOpen;
    trigger.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) menu.querySelector('[aria-selected="true"]')?.focus();
  });

  menu.addEventListener('keydown', (event) => {
    const options = [...menu.querySelectorAll('.editor-select-field__option')];
    const current = options.indexOf(document.activeElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
      trigger.focus();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      options[Math.min(current + 1, options.length - 1)]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      options[Math.max(current - 1, 0)]?.focus();
    }
  });

  select.addEventListener('change', () => {
    syncLabel();
    renderOptions();
  });

  syncLabel();
  renderOptions();
}

export function renderPostForm(container, values = {}, { submitLabel = '게시글 등록' } = {}) {
  container.innerHTML = `
    <form class="editor-form panel" novalidate>
      <section class="editor-form__section editor-form__section--filters" aria-labelledby="editor-filter-title">
        <div class="editor-form__section-head">
          <span>01</span><div><h2 id="editor-filter-title">어디의 어떤 이야기인가요?</h2><p>지역과 이야기의 테마를 선택해 주세요.</p></div>
        </div>
        <div class="editor-form__filters">
          ${renderEditorSelect('district', '지역', POST_DISTRICTS)}
          ${renderEditorSelect('prefix', '테마', POST_PREFIXES)}
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
        <label><span class="visually-hidden">비밀번호</span><input name="password" type="password" minlength="4" maxlength="20" autocomplete="new-password" placeholder="비밀번호를 입력해주세요"><small data-error="password"></small></label>
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
  form.querySelectorAll('.editor-select-field__native').forEach(attachEditorSelect);
  return form;
}

export function showFormErrors(form, errors) {
  form.querySelectorAll('[data-error]').forEach((node) => { node.textContent = errors[node.dataset.error] ?? ''; });
  const first = Object.keys(errors)[0];
  if (!first) return;
  const field = form.elements[first]?.closest?.('.editor-select-field');
  field?.querySelector('.editor-select-field__trigger')?.focus() ?? form.elements[first]?.focus();
}
