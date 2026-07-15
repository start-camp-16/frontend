import { deleteCourse, getCourse, updateCourse } from './course-api.js';
import { appendStop, moveStop, removeStop, toLocationIds } from './course-state.js';
import { courseErrorMessage, validateCourse } from './course-validation.js';
import { renderCourseStops, renderPlaceSearchResults } from './course-view.js';
import { getCategories, getDistricts, getRankings } from '../ranking/ranking-api.js';
import { openModal } from '../../ui/modal.js';
import { renderAsyncState } from '../../ui/async-state.js';
import { renderPagination } from '../../ui/pagination.js';
import './courses.css';

export async function copyCourseLink(url, clipboard = navigator.clipboard) {
  if (!clipboard?.writeText) return false;
  try { await clipboard.writeText(url); return true; } catch { return false; }
}

const formatDate = value => new Date(value).toLocaleString('ko-KR');
function option(value) { const item = document.createElement('option'); item.value = value; item.textContent = value; return item; }

export function mountCourseDetailPage({ outlet, params, signal, navigate }) {
  outlet.innerHTML = '<div id="course-detail"></div>';
  const root = outlet.querySelector('#course-detail'); let course; let editDraft = [];

  function renderRead() {
    root.innerHTML = `<article class="course-detail"><header class="course-detail__header"><div><p class="eyebrow">Shared Seoul course</p><h1 class="page-title" tabindex="-1"></h1><p class="course-detail__date"></p></div><div class="course-detail__actions"><button type="button" class="button button--secondary" data-copy-course>링크 복사</button><button type="button" class="button button--secondary" data-edit-course>수정</button><button type="button" data-delete-course>삭제</button></div></header><p class="course-copy-status" aria-live="polite"></p><section class="course-detail__stops panel" aria-labelledby="shared-course-stops"><p class="course-step">방문 순서</p><h2 id="shared-course-stops">이 순서로 둘러보세요</h2><div data-read-stops></div></section></article>`;
    root.querySelector('h1').textContent = course.title;
    root.querySelector('.course-detail__date').textContent = `만든 날 ${formatDate(course.created_at)}${course.updated_at !== course.created_at ? ` · 수정 ${formatDate(course.updated_at)}` : ''}`;
    renderCourseStops(root.querySelector('[data-read-stops]'), course.stops);
    root.querySelectorAll('.course-stop__actions').forEach(actions => actions.remove());
    root.querySelector('[data-copy-course]').addEventListener('click', async () => {
      const url = `${location.origin}/courses/${course.public_id}`; const status = root.querySelector('.course-copy-status');
      if (await copyCourseLink(url)) status.textContent = '공유 링크를 복사했습니다.';
      else { status.textContent = '아래 링크를 직접 복사해 주세요.'; const input = document.createElement('input'); input.readOnly = true; input.value = url; input.setAttribute('aria-label', '공유 링크'); status.after(input); input.select(); }
    });
    root.querySelector('[data-edit-course]').addEventListener('click', renderEdit);
    root.querySelector('[data-delete-course]').addEventListener('click', event => confirmDelete(event.currentTarget));
    root.querySelector('h1').focus();
  }

  function renderEdit() {
    editDraft = course.stops.map(stop => ({ ...stop, location: { ...stop.location } }));
    root.innerHTML = `<section class="course-edit"><p class="eyebrow">Edit course</p><h1>코스 수정</h1><form id="course-edit-form" class="course-edit__form panel"><label>코스 제목<input name="title" maxlength="100"></label><div data-edit-stops></div><button type="button" class="button button--secondary" data-edit-add>+ 장소 추가</button><div data-edit-search></div><label>수정 비밀번호<input type="password" name="password" minlength="4" maxlength="20" autocomplete="current-password"></label><p class="course-error" data-edit-error role="alert"></p><div class="course-edit__actions"><button type="button" class="button button--secondary" data-cancel-edit>취소</button><button type="submit">변경 내용 저장</button></div></form></section>`;
    const form = root.querySelector('form'); form.elements.title.value = course.title; const stopsRoot = form.querySelector('[data-edit-stops]');
    const drawStops = () => {
      renderCourseStops(stopsRoot, editDraft, { onMove(from, to) { editDraft = moveStop(editDraft, from, to); drawStops(); }, onRemove(index) { if (editDraft.length <= 3) { form.querySelector('[data-edit-error]').textContent = '코스에는 최소 3곳이 필요합니다.'; return; } editDraft = removeStop(editDraft, index); drawStops(); } });
      form.querySelector('[data-edit-add]').disabled = editDraft.length >= 5;
    };
    drawStops(); form.querySelector('[data-cancel-edit]').addEventListener('click', renderRead); form.querySelector('[data-edit-add]').addEventListener('click', () => renderEditSearch(form, drawStops));
    form.addEventListener('submit', async event => {
      event.preventDefault(); const values = { title: form.elements.title.value, password: form.elements.password.value, stops: editDraft }; const errors = validateCourse(values); const errorRoot = form.querySelector('[data-edit-error]');
      if (Object.keys(errors).length) { errorRoot.textContent = Object.values(errors)[0]; return; }
      const submit = form.querySelector('[type="submit"]'); submit.disabled = true; errorRoot.textContent = '';
      try { course = await updateCourse(params.publicId, { password: values.password, title: values.title.trim(), location_content_ids: toLocationIds(editDraft) }, { signal }); renderRead(); }
      catch (error) { if (error.name !== 'AbortError') { errorRoot.textContent = courseErrorMessage(error); form.elements.password.value = ''; } }
      finally { submit.disabled = false; }
    });
  }

  async function renderEditSearch(form, drawStops) {
    const host = form.querySelector('[data-edit-search]'); host.innerHTML = `<section class="course-place-search"><div class="course-place-search__header"><h3>추가할 장소 찾기</h3><button type="button" class="button button--secondary" data-close-search>닫기</button></div><div class="course-place-search__form"><label>장소를 찾을 구<select name="edit-place-district" disabled><option value="">구 선택</option></select></label><label>장소 카테고리<select name="edit-place-category" disabled><option value="">카테고리 선택</option></select></label><button type="button" data-edit-place-search>장소 찾기</button></div><div data-results aria-live="polite"></div><div data-pagination></div></section>`;
    const district = host.querySelector('[name="edit-place-district"]'); const category = host.querySelector('[name="edit-place-category"]'); const results = host.querySelector('[data-results]'); const pagination = host.querySelector('[data-pagination]'); const search = host.querySelector('[data-edit-place-search]'); host.querySelector('[data-close-search]').addEventListener('click', () => host.replaceChildren());
    try { const [districts, categories] = await Promise.all([getDistricts({ signal }), getCategories({ signal })]); districts.forEach(value => district.append(option(value))); categories.forEach(value => category.append(option(value))); district.disabled = false; category.disabled = false; }
    catch (error) { if (error.name !== 'AbortError') renderAsyncState(results, { kind: 'error', message: courseErrorMessage(error), onRetry: () => renderEditSearch(form, drawStops) }); }
    const loadPage = async page => {
      if (!district.value || !category.value) { results.textContent = '구와 카테고리를 선택해 주세요.'; return; }
      try { const data = await getRankings({ district: district.value, category: category.value, page, signal }); renderPlaceSearchResults(results, data.items, new Set(toLocationIds(editDraft)), location => { editDraft = appendStop(editDraft, location); host.replaceChildren(); drawStops(); form.querySelector(`[data-course-stop="${location.content_id}"]`)?.focus(); }); const pageInfo = data.pagination ?? { page: 1, total_pages: 1 }; renderPagination(pagination, { page: pageInfo.page, totalPages: pageInfo.total_pages, onPageChange: loadPage }); }
      catch (error) { if (error.name !== 'AbortError') renderAsyncState(results, { kind: 'error', message: courseErrorMessage(error), onRetry: () => loadPage(page) }); }
    };
    search.addEventListener('click', () => loadPage(1));
  }

  function confirmDelete(trigger) {
    const wrap = document.createElement('div'); const label = document.createElement('label'); label.textContent = '삭제 비밀번호'; const input = document.createElement('input'); input.type = 'password'; input.name = 'delete-password'; input.minLength = 4; input.maxLength = 20; input.autocomplete = 'current-password'; const error = document.createElement('p'); error.className = 'course-error'; error.setAttribute('role', 'alert'); label.append(input); wrap.append(label, error);
    openModal({ title: '이 코스를 삭제할까요?', content: wrap, trigger, confirmLabel: '삭제', onConfirm: async () => { if (input.value.length < 4 || input.value.length > 20) { error.textContent = '비밀번호는 4~20자로 입력해 주세요.'; return false; } try { await deleteCourse(params.publicId, { password: input.value }, { signal }); input.value = ''; navigate('/courses'); return true; } catch (requestError) { error.textContent = courseErrorMessage(requestError); input.value = ''; return false; } } });
  }

  renderAsyncState(root, { kind: 'loading', message: '코스를 불러오고 있어요.' });
  getCourse(params.publicId, { signal }).then(data => { course = data; renderRead(); }).catch(error => {
    if (error.name === 'AbortError') return;
    if (error.code === 'COURSE_NOT_FOUND') root.innerHTML = '<section class="async-state"><h1>코스를 찾을 수 없습니다</h1><p>링크를 다시 확인하거나 새 코스를 만들어 보세요.</p><a class="button" href="/courses">새 코스 만들기</a></section>';
    else renderAsyncState(root, { kind: 'error', message: courseErrorMessage(error), onRetry: () => location.reload() });
  });
  return () => {};
}
