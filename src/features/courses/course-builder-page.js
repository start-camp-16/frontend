import { getCategories, getDistricts, getRankings } from '../ranking/ranking-api.js';
import { createCourse, getCourseRankings, suggestCourse } from './course-api.js';
import { renderCourseRankingCarousel, renderCourseRankingError } from './course-ranking-view.js';
import { appendStop, moveStop, removeStop, toLocationIds } from './course-state.js';
import { courseErrorMessage, validateCourse, validateCriteria } from './course-validation.js';
import { renderCourseStops, renderPlaceSearchResults } from './course-view.js';
import { renderAsyncState } from '../../ui/async-state.js';
import { renderPagination } from '../../ui/pagination.js';
import './courses.css';

function option(value) { const item = document.createElement('option'); item.value = value; item.textContent = value; return item; }

function createCourseSelectControl(select) {
  const field = select.closest('.course-select-field');
  const trigger = field.querySelector('.course-select-trigger');
  const value = trigger.querySelector('[data-select-value]');
  const menu = field.querySelector('.course-select-menu');

  function syncLabel() {
    value.textContent = select.selectedOptions[0]?.textContent || select.options[0]?.textContent || '';
  }

  function close() {
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
  }

  function renderOptions() {
    menu.replaceChildren();
    [...select.options].forEach(option => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'course-select-option';
      item.dataset.value = option.value;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(option.value === select.value));
      item.textContent = option.textContent;
      item.addEventListener('click', () => {
        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        syncLabel();
        renderOptions();
        close();
        trigger.focus();
      });
      menu.append(item);
    });
    syncLabel();
    trigger.disabled = select.disabled;
  }

  trigger.addEventListener('click', event => {
    event.stopPropagation();
    if (trigger.disabled) return;
    const willOpen = menu.hidden;
    close();
    menu.hidden = !willOpen;
    trigger.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) menu.querySelector('[aria-selected="true"]')?.focus();
  });

  trigger.addEventListener('keydown', event => {
    if ((event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') && menu.hidden) {
      event.preventDefault();
      trigger.click();
    }
  });

  menu.addEventListener('keydown', event => {
    const options = [...menu.querySelectorAll('.course-select-option')];
    const current = options.indexOf(document.activeElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      trigger.focus();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      options[Math.min(current + 1, options.length - 1)]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      options[Math.max(current - 1, 0)]?.focus();
    }
  });

  select.addEventListener('change', renderOptions);
  renderOptions();
  return { select, trigger, menu, renderOptions, close };
}

export function mountCourseBuilderPage({ outlet, signal, navigate }) {
  outlet.innerHTML = `<section class="course-hero"><p class="eyebrow">Build a day in Seoul</p><h1 class="page-title">가까운 곳부터,<br><span>가볍게 골라봐요.</span></h1><p class="lede">지역과 관심사를 고르면 하루 코스의 방문 순서를 만들어 드려요.</p></section><section class="course-workspace"><form id="course-criteria" class="course-criteria panel"><div><p class="course-step">01 · 조건 고르기</p><h2>어디에서 무엇을 할까요?</h2></div><label class="course-select-field">어느 구에서?<select class="course-native-select" name="district" disabled><option value="">구 선택</option></select><button class="course-select-trigger" type="button" aria-haspopup="listbox" aria-expanded="false" disabled><span data-select-value>구 선택</span></button><div class="course-select-menu" role="listbox" hidden></div></label><fieldset disabled><legend>관심 카테고리 <small>1~3개</small></legend><div id="course-categories" class="course-category-grid"></div></fieldset><label class="course-select-field">방문 장소 수<select class="course-native-select" name="stop_count"><option value="3">3곳</option><option value="4">4곳</option><option value="5">5곳</option></select><button class="course-select-trigger" type="button" aria-haspopup="listbox" aria-expanded="false"><span data-select-value>3곳</span></button><div class="course-select-menu" role="listbox" hidden></div></label><p class="course-error" data-criteria-error role="alert"></p><button type="submit" disabled>코스 초안 만들기</button></form><section class="course-draft panel" aria-labelledby="course-draft-title"><div class="course-draft__header"><div><p class="course-step">02 · 순서 다듬기</p><h2 id="course-draft-title" tabindex="-1">나의 방문 순서</h2></div></div><div id="course-draft-status" aria-live="polite"></div><div id="course-stops"></div><div id="course-place-search"></div><div id="course-save"></div></section></section>`;
  outlet.querySelector('.course-workspace').insertAdjacentHTML('beforebegin', `<section class="course-ranking-panel panel" data-course-rankings data-collapsed="false" aria-labelledby="course-ranking-title"><header class="course-ranking-header"><h2 id="course-ranking-title">오늘의 추천 코스</h2><button type="button" class="course-ranking-toggle" data-course-ranking-toggle aria-expanded="true" aria-controls="course-ranking-body" aria-label="추천 코스 접기"><span aria-hidden="true"></span></button></header><div id="course-ranking-body" class="course-ranking-body" data-course-ranking-body><div class="async-state">추천 코스를 불러오고 있어요.</div></div></section>`);
  const rankingPanel = outlet.querySelector('[data-course-rankings]');
  const rankingToggle = rankingPanel.querySelector('[data-course-ranking-toggle]');
  rankingToggle.addEventListener('click', () => {
    const collapsed = rankingPanel.dataset.collapsed !== 'true';
    rankingPanel.dataset.collapsed = String(collapsed);
    rankingToggle.setAttribute('aria-expanded', String(!collapsed));
    rankingToggle.setAttribute('aria-label', collapsed ? '추천 코스 펼치기' : '추천 코스 접기');
    rankingPanel.querySelector('[data-course-ranking-body]').hidden = collapsed;
  });
  const form = outlet.querySelector('#course-criteria');
  const districtSelect = form.elements.district; const categoryFieldset = form.querySelector('fieldset');
  const selectControls = [...form.querySelectorAll('.course-native-select')].map(createCourseSelectControl);
  const closeSelectMenus = () => selectControls.forEach(control => control.close());
  const categoriesRoot = form.querySelector('#course-categories'); const submit = form.querySelector('[type="submit"]');
  const criteriaError = form.querySelector('[data-criteria-error]'); const status = outlet.querySelector('#course-draft-status');
  const stopsRoot = outlet.querySelector('#course-stops'); const searchRoot = outlet.querySelector('#course-place-search'); const saveRoot = outlet.querySelector('#course-save');
  let metadata = { districts: [], categories: [] }; let draft = []; let draftDistrict = ''; let saveValues = { title: '', password: '' }; let metadataRetry;

  const criteria = () => ({ district: districtSelect.value, categories: [...form.querySelectorAll('[name="categories"]:checked')].map(input => input.value), stop_count: Number(form.elements.stop_count.value) });
  const updateSubmit = (showError = false) => { const errors = validateCriteria(criteria()); submit.disabled = Object.keys(errors).length > 0; if (showError) criteriaError.textContent = errors.categories || errors.district || errors.stop_count || ''; };

  function renderSave() {
    saveRoot.replaceChildren(); if (draft.length < 3) return;
    const saveForm = document.createElement('form'); saveForm.id = 'course-save-form'; saveForm.className = 'course-save';
    saveForm.innerHTML = `<div><p class="course-step">03 · 저장하고 공유하기</p><h2>이 코스의 이름을 정해 주세요</h2></div><label>코스 제목<input name="title" maxlength="100" autocomplete="off"></label><label>수정·삭제 비밀번호<input name="password" type="password" minlength="4" maxlength="20" autocomplete="new-password"></label><p class="course-help">비밀번호는 나중에 확인할 수 없으니 기억해 주세요.</p><p class="course-error" data-save-error role="alert"></p><button type="submit">코스 저장하기</button>`;
    saveForm.elements.title.value = saveValues.title; saveForm.elements.password.value = saveValues.password;
    saveForm.addEventListener('input', () => { saveValues = { title: saveForm.elements.title.value, password: saveForm.elements.password.value }; });
    saveForm.addEventListener('submit', async event => {
      event.preventDefault(); saveValues = { title: saveForm.elements.title.value, password: saveForm.elements.password.value };
      const errors = validateCourse({ ...saveValues, stops: draft }); const errorRoot = saveForm.querySelector('[data-save-error]');
      if (Object.keys(errors).length) { errorRoot.textContent = Object.values(errors)[0]; return; }
      const button = saveForm.querySelector('button'); button.disabled = true; errorRoot.textContent = '';
      try {
        const course = await createCourse({ title: saveValues.title.trim(), password: saveValues.password, location_content_ids: toLocationIds(draft) }, { signal });
        saveForm.elements.password.value = ''; saveValues.password = ''; navigate(`/courses/${course.public_id}`);
      } catch (error) { if (error.name !== 'AbortError') errorRoot.textContent = courseErrorMessage(error); }
      finally { button.disabled = false; saveForm.elements.password.value = ''; saveValues.password = ''; }
    });
    saveRoot.append(saveForm);
  }

  function renderDraft(message = '') {
    status.textContent = message; searchRoot.replaceChildren();
    if (!draft.length) { stopsRoot.replaceChildren(); renderAsyncState(stopsRoot, { kind: 'empty', message: '조건을 고르고 코스 초안을 만들어 보세요.' }); saveRoot.replaceChildren(); return; }
    renderCourseStops(stopsRoot, draft, {
      onMove(from, to) { draft = moveStop(draft, from, to); renderDraft(); },
      onRemove(index) { if (draft.length <= 3) { status.textContent = '코스에는 최소 3곳이 필요합니다.'; return; } draft = removeStop(draft, index); renderDraft(); },
    });
    const add = document.createElement('button'); add.type = 'button'; add.className = 'button button--secondary course-add-place'; add.dataset.openPlaceSearch = '';
    add.textContent = draft.length >= 5 ? '장소는 최대 5곳까지 담을 수 있어요' : '+ 장소 추가'; add.disabled = draft.length >= 5;
    add.addEventListener('click', renderPlaceSearch); stopsRoot.append(add); renderSave();
  }

  function renderPlaceSearch() {
    searchRoot.innerHTML = `<section class="course-place-search" aria-label="장소 추가"><div class="course-place-search__header"><h3>추가할 장소 찾기</h3><button type="button" class="button button--secondary" data-close-search>닫기</button></div><p class="course-place-district">선택한 구: <strong data-place-district></strong></p><form id="place-search-form" class="course-place-search__form course-place-search__form--category-only"><label>장소 카테고리<select name="place-category" disabled><option value="">카테고리 선택</option></select></label><button type="submit">장소 찾기</button></form><div data-place-results aria-live="polite"></div><div data-place-pagination></div></section>`;
    const searchForm = searchRoot.querySelector('form'); const category = searchForm.elements['place-category'];
    searchRoot.querySelector('[data-place-district]').textContent = draftDistrict;
    metadata.categories.forEach(value => category.append(option(value)));
    category.disabled = false; searchRoot.querySelector('[data-close-search]').addEventListener('click', () => searchRoot.replaceChildren());
    const loadPage = async page => {
      const results = searchRoot.querySelector('[data-place-results]'); const pagination = searchRoot.querySelector('[data-place-pagination]');
      if (!category.value) { results.textContent = '카테고리를 선택해 주세요.'; return; }
      renderAsyncState(results, { kind: 'loading', message: '장소를 찾고 있어요.' });
      try {
        const data = await getRankings({ district: draftDistrict, category: category.value, page, signal });
        renderPlaceSearchResults(results, data.items, new Set(toLocationIds(draft)), location => { draft = appendStop(draft, location); renderDraft(`${location.title}을 코스에 추가했습니다.`); stopsRoot.querySelector(`[data-course-stop="${location.content_id}"]`)?.focus(); });
        const pageInfo = data.pagination ?? { page: 1, total_pages: 1 };
        renderPagination(pagination, { page: pageInfo.page, totalPages: pageInfo.total_pages, onPageChange: loadPage });
      } catch (error) { if (error.name !== 'AbortError') renderAsyncState(results, { kind: 'error', message: courseErrorMessage(error), onRetry: () => loadPage(page) }); }
    };
    searchForm.addEventListener('submit', event => {
      event.preventDefault(); loadPage(1);
    });
    category.focus();
  }

  form.addEventListener('change', () => updateSubmit(true));
  document.addEventListener('click', closeSelectMenus);
  form.addEventListener('submit', async event => {
    event.preventDefault(); const values = criteria(); const errors = validateCriteria(values);
    if (Object.keys(errors).length) { criteriaError.textContent = Object.values(errors)[0]; return; }
    submit.disabled = true; criteriaError.textContent = ''; renderAsyncState(stopsRoot, { kind: 'loading', message: '방문 순서를 만들고 있어요.' });
    try { const result = await suggestCourse(values, { signal }); draft = result.stops; draftDistrict = result.district || values.district; renderDraft('코스 초안을 만들었습니다. 순서를 자유롭게 다듬어 보세요.'); outlet.querySelector('#course-draft-title').focus?.(); }
    catch (error) { if (error.name !== 'AbortError') renderAsyncState(stopsRoot, { kind: 'error', message: courseErrorMessage(error), onRetry: () => form.requestSubmit() }); }
    finally { updateSubmit(); }
  });

  async function loadMetadata() {
    try {
      const [districts, categories] = await Promise.all([getDistricts({ signal }), getCategories({ signal })]); metadata = { districts, categories };
      districtSelect.querySelectorAll('option:not(:first-child)').forEach(item => item.remove()); categoriesRoot.replaceChildren();
      districts.forEach(value => districtSelect.append(option(value)));
      categories.forEach(value => { const label = document.createElement('label'); label.className = 'course-category'; const input = document.createElement('input'); input.type = 'checkbox'; input.name = 'categories'; input.value = value; label.append(input, document.createTextNode(value)); categoriesRoot.append(label); });
      districtSelect.disabled = false; categoryFieldset.disabled = false; selectControls.forEach(control => control.renderOptions()); criteriaError.textContent = ''; metadataRetry?.remove(); metadataRetry = undefined; updateSubmit();
    } catch (error) { if (error.name !== 'AbortError') { criteriaError.textContent = '선택 항목을 불러오지 못했습니다.'; if (!metadataRetry) { metadataRetry = document.createElement('button'); metadataRetry.type = 'button'; metadataRetry.className = 'button button--secondary'; metadataRetry.textContent = '다시 시도'; metadataRetry.addEventListener('click', loadMetadata); form.append(metadataRetry); } } }
  }
  async function loadRankedCourses() {
    try {
      const data = await getCourseRankings({ signal });
      renderCourseRankingCarousel(rankingPanel, data.items);
    } catch (error) {
      if (error.name !== 'AbortError') {
        renderCourseRankingError(rankingPanel, {
          message: courseErrorMessage(error),
          onRetry: loadRankedCourses,
        });
      }
    }
  }
  renderDraft(); loadMetadata(); loadRankedCourses(); return () => {
    document.removeEventListener('click', closeSelectMenus);
  };
}
