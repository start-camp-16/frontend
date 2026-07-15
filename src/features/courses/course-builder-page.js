import { getCategories, getDistricts, getRankings } from '../ranking/ranking-api.js';
import { createCourse, suggestCourse } from './course-api.js';
import { appendStop, moveStop, removeStop, toLocationIds } from './course-state.js';
import { validateCourse, validateCriteria } from './course-validation.js';
import { renderCourseStops, renderPlaceSearchResults } from './course-view.js';
import { renderAsyncState } from '../../ui/async-state.js';
import './courses.css';

function option(value) { const item = document.createElement('option'); item.value = value; item.textContent = value; return item; }
function messageFor(error) {
  if (error.code === 'COURSE_NOT_ENOUGH_LOCATIONS') return '조건에 맞는 장소가 부족합니다. 카테고리를 바꾸거나 장소 수를 줄여 주세요.';
  return error.message || '요청을 처리할 수 없습니다.';
}

export function mountCourseBuilderPage({ outlet, signal, navigate }) {
  outlet.innerHTML = `<section class="course-hero"><p class="eyebrow">Build a day in Seoul</p><h1 class="page-title">가까운 곳부터,<br><span>가볍게 골라봐요.</span></h1><p class="lede">지역과 관심사를 고르면 하루 코스의 방문 순서를 만들어 드려요.</p></section><section class="course-workspace"><form id="course-criteria" class="course-criteria panel"><div><p class="course-step">01 · 조건 고르기</p><h2>어디에서 무엇을 할까요?</h2></div><label>어느 구에서?<select name="district" disabled><option value="">구 선택</option></select></label><fieldset disabled><legend>관심 카테고리 <small>1~3개</small></legend><div id="course-categories" class="course-category-grid"></div></fieldset><label>방문 장소 수<select name="stop_count"><option value="3">3곳</option><option value="4">4곳</option><option value="5">5곳</option></select></label><p class="course-error" data-criteria-error role="alert"></p><button type="submit" disabled>코스 초안 만들기</button></form><section class="course-draft panel" aria-labelledby="course-draft-title"><div class="course-draft__header"><div><p class="course-step">02 · 순서 다듬기</p><h2 id="course-draft-title">나의 방문 순서</h2></div></div><div id="course-draft-status" aria-live="polite"></div><div id="course-stops"></div><div id="course-place-search"></div><div id="course-save"></div></section></section>`;
  const form = outlet.querySelector('#course-criteria');
  const districtSelect = form.elements.district; const categoryFieldset = form.querySelector('fieldset');
  const categoriesRoot = form.querySelector('#course-categories'); const submit = form.querySelector('[type="submit"]');
  const criteriaError = form.querySelector('[data-criteria-error]'); const status = outlet.querySelector('#course-draft-status');
  const stopsRoot = outlet.querySelector('#course-stops'); const searchRoot = outlet.querySelector('#course-place-search'); const saveRoot = outlet.querySelector('#course-save');
  let metadata = { districts: [], categories: [] }; let draft = []; let saveValues = { title: '', password: '' };

  const criteria = () => ({ district: districtSelect.value, categories: [...form.querySelectorAll('[name="categories"]:checked')].map(input => input.value), stop_count: Number(form.elements.stop_count.value) });
  const updateSubmit = () => { submit.disabled = Object.keys(validateCriteria(criteria())).length > 0; };

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
      } catch (error) { if (error.name !== 'AbortError') errorRoot.textContent = messageFor(error); }
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
    searchRoot.innerHTML = `<section class="course-place-search" aria-label="장소 추가"><div class="course-place-search__header"><h3>추가할 장소 찾기</h3><button type="button" class="button button--secondary" data-close-search>닫기</button></div><form id="place-search-form" class="course-place-search__form"><label>장소를 찾을 구<select name="place-district" disabled><option value="">구 선택</option></select></label><label>장소 카테고리<select name="place-category" disabled><option value="">카테고리 선택</option></select></label><button type="submit">장소 찾기</button></form><div data-place-results aria-live="polite"></div></section>`;
    const searchForm = searchRoot.querySelector('form'); const district = searchForm.elements['place-district']; const category = searchForm.elements['place-category'];
    metadata.districts.forEach(value => district.append(option(value))); metadata.categories.forEach(value => category.append(option(value)));
    district.disabled = false; category.disabled = false; searchRoot.querySelector('[data-close-search]').addEventListener('click', () => searchRoot.replaceChildren());
    searchForm.addEventListener('submit', async event => {
      event.preventDefault(); const results = searchRoot.querySelector('[data-place-results]');
      if (!district.value || !category.value) { results.textContent = '구와 카테고리를 선택해 주세요.'; return; }
      renderAsyncState(results, { kind: 'loading', message: '장소를 찾고 있어요.' });
      try {
        const data = await getRankings({ district: district.value, category: category.value, page: 1, signal });
        renderPlaceSearchResults(results, data.items, new Set(toLocationIds(draft)), location => { draft = appendStop(draft, location); renderDraft(`${location.title}을 코스에 추가했습니다.`); });
      } catch (error) { if (error.name !== 'AbortError') renderAsyncState(results, { kind: 'error', message: messageFor(error), onRetry: () => searchForm.requestSubmit() }); }
    });
    searchRoot.querySelector('select').focus();
  }

  form.addEventListener('change', updateSubmit);
  form.addEventListener('submit', async event => {
    event.preventDefault(); const values = criteria(); const errors = validateCriteria(values);
    if (Object.keys(errors).length) { criteriaError.textContent = Object.values(errors)[0]; return; }
    submit.disabled = true; criteriaError.textContent = ''; renderAsyncState(stopsRoot, { kind: 'loading', message: '방문 순서를 만들고 있어요.' });
    try { const result = await suggestCourse(values, { signal }); draft = result.stops; renderDraft('코스 초안을 만들었습니다. 순서를 자유롭게 다듬어 보세요.'); outlet.querySelector('#course-draft-title').focus?.(); }
    catch (error) { if (error.name !== 'AbortError') renderAsyncState(stopsRoot, { kind: 'error', message: messageFor(error), onRetry: () => form.requestSubmit() }); }
    finally { updateSubmit(); }
  });

  async function loadMetadata() {
    try {
      const [districts, categories] = await Promise.all([getDistricts({ signal }), getCategories({ signal })]); metadata = { districts, categories };
      districts.forEach(value => districtSelect.append(option(value)));
      categories.forEach(value => { const label = document.createElement('label'); label.className = 'course-category'; const input = document.createElement('input'); input.type = 'checkbox'; input.name = 'categories'; input.value = value; label.append(input, document.createTextNode(value)); categoriesRoot.append(label); });
      districtSelect.disabled = false; categoryFieldset.disabled = false; updateSubmit();
    } catch (error) { if (error.name !== 'AbortError') { criteriaError.textContent = '선택 항목을 불러오지 못했습니다.'; const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'button button--secondary'; retry.textContent = '다시 시도'; retry.addEventListener('click', loadMetadata); form.append(retry); } }
  }
  renderDraft(); loadMetadata(); return () => {};
}
