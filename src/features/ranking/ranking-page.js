import { getCategories, getDistricts, getRankings } from './ranking-api.js';
import { parseRankingQuery, toRankingQuery } from './ranking-state.js';
import { renderRankingItems } from './ranking-view.js';
import { createRankingMap } from './ranking-map.js';
import { createLeafletAdapter } from './ranking-map-adapter.js';
import { renderAsyncState } from '../../ui/async-state.js';
import './ranking.css';

export function mountRankingPage(
  { outlet, query, signal, navigate },
  { mapFactory = createRankingMap, adapterFactory = createLeafletAdapter } = {},
) {
  const state = parseRankingQuery(query);
  let currentItems = [];
  let selectedId = null;
  document.body.classList.add('ranking-map-active');

  outlet.innerHTML = `<section class="ranking-page"><div class="ranking-explorer"><div id="ranking-map" class="ranking-map" role="region" aria-label="현재 랭킹 장소 지도"></div><section class="ranking-top-panel panel"><div class="ranking-hero"><p class="eyebrow">Seoul city guide</p><h1 class="page-title">서울의 즐거움, 빠르게 찾아봐요.</h1><p class="lede">원하는 지역과 활동을 선택하면 지금 둘러볼 장소를 추천해드려요.</p></div><form class="ranking-filter"><label class="ranking-select-field"><span>어느 구에서?</span><select class="ranking-native-select" name="district" disabled><option value="">구 선택</option></select><button class="ranking-select-trigger" type="button" aria-haspopup="listbox" aria-expanded="false" disabled><span data-select-value>구 선택</span></button><div class="ranking-select-menu" role="listbox" hidden></div></label><label class="ranking-select-field"><span>무엇을 할까요?</span><select class="ranking-native-select" name="category" disabled><option value="">카테고리 선택</option></select><button class="ranking-select-trigger" type="button" aria-haspopup="listbox" aria-expanded="false" disabled><span data-select-value>카테고리 선택</span></button><div class="ranking-select-menu" role="listbox" hidden></div></label><button class="ranking-submit" disabled>장소 찾기</button></form></section><div id="map-status" class="map-status" aria-live="polite"></div><section class="ranking-results-panel" data-sheet-state="collapsed" data-sidebar-state="expanded" aria-label="장소 랭킹 목록"><header class="ranking-sidebar-header"><h2>랭킹</h2><button class="ranking-sidebar-toggle" type="button" aria-controls="ranking-sheet-content" aria-expanded="true" aria-label="장소 사이드바 접기"><span aria-hidden="true"></span></button></header><div class="ranking-sheet-header"><button class="ranking-sheet-toggle" type="button" aria-controls="ranking-sheet-content" aria-expanded="false" aria-label="장소 목록 펼치기"><span class="ranking-sheet-handle" aria-hidden="true"></span></button><div class="ranking-recommendation-box" hidden><p id="ranking-recommendation" class="ranking-recommendation" hidden></p><span id="ranking-result-count" class="ranking-result-count" aria-live="polite"></span></div></div><div id="ranking-sheet-content" class="ranking-sheet-content"><div id="ranking-status" aria-live="polite"></div><div id="ranking-results" class="place-grid"></div></div></section></div></section>`;

  const form = outlet.querySelector('form');
  const recommendation = outlet.querySelector('#ranking-recommendation');
  const recommendationBox = outlet.querySelector('.ranking-recommendation-box');
  const resultCount = outlet.querySelector('#ranking-result-count');
  const resultsPanel = outlet.querySelector('.ranking-results-panel');
  const sheetToggle = outlet.querySelector('.ranking-sheet-toggle');
  const sidebarToggle = outlet.querySelector('.ranking-sidebar-toggle');
  const status = outlet.querySelector('#ranking-status');
  const mapStatus = outlet.querySelector('#map-status');
  const results = outlet.querySelector('#ranking-results');
  const mapContainer = outlet.querySelector('#ranking-map');
  const [districtSelect, categorySelect] = form.querySelectorAll('select');
  const submit = form.querySelector('.ranking-submit');
  const selectControls = [districtSelect, categorySelect].map(createSelectControl);
  let rankingMap;
  let tileErrorVisible = false;
  let pointerStartY = null;
  let suppressNextSheetClick = false;

  function closeSelectMenus(except = null) {
    selectControls.forEach(control => {
      if (control === except) return;
      control.menu.hidden = true;
      control.trigger.setAttribute('aria-expanded', 'false');
    });
  }

  function createSelectControl(select) {
    const field = select.closest('.ranking-select-field');
    const trigger = field.querySelector('.ranking-select-trigger');
    const value = trigger.querySelector('[data-select-value]');
    const menu = field.querySelector('.ranking-select-menu');

    function syncLabel() {
      value.textContent = select.selectedOptions[0]?.textContent || select.options[0]?.textContent || '';
    }

    function renderOptions() {
      menu.replaceChildren();
      [...select.options].forEach(option => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'ranking-select-option';
        item.dataset.value = option.value;
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', String(option.value === select.value));
        item.textContent = option.textContent;
        item.addEventListener('click', () => {
          select.value = option.value;
          select.dispatchEvent(new Event('change', { bubbles:true }));
          syncLabel();
          renderOptions();
          closeSelectMenus();
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
      closeSelectMenus();
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
      const options = [...menu.querySelectorAll('.ranking-select-option')];
      const current = options.indexOf(document.activeElement);
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSelectMenus();
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

    return { select, trigger, menu, renderOptions };
  }

  function setSheetState(nextState) {
    const expanded = nextState === 'expanded';
    resultsPanel.dataset.sheetState = expanded ? 'expanded' : 'collapsed';
    sheetToggle.setAttribute('aria-expanded', String(expanded));
    sheetToggle.setAttribute('aria-label', expanded ? '장소 목록 접기' : '장소 목록 펼치기');
    queueMicrotask(() => rankingMap?.invalidateSize());
  }

  function toggleSheet(event) {
    if (suppressNextSheetClick) {
      suppressNextSheetClick = false;
      event.preventDefault();
      return;
    }
    setSheetState(resultsPanel.dataset.sheetState === 'expanded' ? 'collapsed' : 'expanded');
  }

  function setSidebarState(nextState) {
    const expanded = nextState === 'expanded';
    resultsPanel.dataset.sidebarState = expanded ? 'expanded' : 'collapsed';
    sidebarToggle.setAttribute('aria-expanded', String(expanded));
    sidebarToggle.setAttribute('aria-label', expanded ? '장소 사이드바 접기' : '장소 사이드바 펼치기');
    queueMicrotask(() => rankingMap?.invalidateSize());
  }

  function toggleSidebar() {
    setSidebarState(resultsPanel.dataset.sidebarState === 'expanded' ? 'collapsed' : 'expanded');
  }

  function onSheetPointerDown(event) {
    pointerStartY = event.clientY;
  }

  function onSheetPointerUp(event) {
    if (pointerStartY === null) return;
    const distance = event.clientY - pointerStartY;
    pointerStartY = null;
    if (distance <= -48) {
      suppressNextSheetClick = true;
      setSheetState('expanded');
    } else if (distance >= 48) {
      suppressNextSheetClick = true;
      setSheetState('collapsed');
    }
  }

  function onSheetPointerCancel() {
    pointerStartY = null;
  }

  function renderTileStatus({ failed }) {
    if (!failed) {
      if (tileErrorVisible) mapStatus.replaceChildren();
      tileErrorVisible = false;
      return;
    }
    tileErrorVisible = true;
    mapStatus.replaceChildren();
    const message = document.createElement('span'); message.textContent = '지도를 불러오지 못했습니다.';
    const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = '지도 다시 시도';
    retry.addEventListener('click', () => { tileErrorVisible = false; mapStatus.replaceChildren(); rankingMap.retryTiles(); });
    mapStatus.append(message, retry);
  }

  const adapter = mapFactory === createRankingMap
    ? adapterFactory(mapContainer, { onTileStatusChange: renderTileStatus })
    : undefined;
  rankingMap = mapFactory({ container: mapContainer, adapter, onSelect:id => selectItem(id, { source:'marker' }) });

  function renderItems() {
    renderRankingItems(results, currentItems, { selectedId, onSelect:id => selectItem(id, { source:'list' }) });
  }

  function selectItem(id, { source }) {
    selectedId = String(id);
    const item = currentItems.find(candidate => String(candidate.content_id) === selectedId);
    renderItems();
    const mapped = rankingMap.select(selectedId, { focus:true });
    if (!mapped) mapStatus.textContent = '이 장소는 지도 위치 정보가 없습니다.';
    else mapStatus.textContent = `${item?.title ?? '장소'}을(를) 지도에서 선택했습니다.`;
    if (source === 'marker') {
      [...results.querySelectorAll('[data-content-id]')]
        .find(element => element.dataset.contentId === selectedId)
        ?.scrollIntoView({ block:'nearest' });
    }
  }

  function fill(select, items, value) {
    items.forEach(item => select.add(new Option(item, item)));
    if (items.includes(value)) select.value = value;
    select.disabled = false;
    selectControls.find(control => control.select === select)?.renderOptions();
  }

  function renderSelectionPrompt() {
    renderAsyncState(status, { kind:'error', message:'구와 카테고리를 모두 선택해 주세요.' });
  }

  async function loadRankings() {
    if (!districtSelect.value || !categorySelect.value) return;
    recommendationBox.hidden = true;
    recommendation.hidden = true;
    renderAsyncState(status, { kind:'loading', message:'장소를 찾고 있습니다…' });
    results.replaceChildren(); mapStatus.replaceChildren(); rankingMap.setItems([]);
    try {
      const data = await getRankings({ district:districtSelect.value, category:categorySelect.value, signal });
      status.replaceChildren(); currentItems = data.items; selectedId = null;
      if (!data.items.length) {
        renderAsyncState(status, { kind:'empty', message:'선택 조건에 해당하는 장소가 없습니다.' });
        mapStatus.textContent = '현재 결과에는 표시할 위치 정보가 없습니다.';
        return;
      }
      recommendation.textContent = `AI가 추천한 장소 TOP ${data.items.length}입니다.`;
      resultCount.textContent = `${data.items.length}곳`;
      recommendationBox.hidden = false;
      recommendation.hidden = false;
      renderItems();
      const markerCount = rankingMap.setItems(data.items);
      if (!markerCount) mapStatus.textContent = '현재 결과에는 표시할 위치 정보가 없습니다.';
      queueMicrotask(() => rankingMap.invalidateSize());
    } catch (error) {
      if (error.name !== 'AbortError') renderAsyncState(status, { kind:'error', message:error.message, onRetry:loadRankings });
    }
  }

  async function loadMeta() {
    renderAsyncState(status, { kind:'loading', message:'지역과 카테고리를 불러오고 있습니다…' });
    try {
      const [districts, categories] = await Promise.all([getDistricts({ signal }), getCategories({ signal })]);
      fill(districtSelect, districts, state.district); fill(categorySelect, categories, state.category);
      submit.disabled = false; status.replaceChildren();
      if (districtSelect.value && categorySelect.value) await loadRankings();
      else renderSelectionPrompt();
    } catch (error) {
      if (error.name !== 'AbortError') renderAsyncState(status, { kind:'error', message:error.message, onRetry:loadMeta });
    }
  }

  function onSubmit(event) {
    event.preventDefault();
    if (!districtSelect.value || !categorySelect.value) {
      renderSelectionPrompt(); return;
    }
    navigate(`/?${toRankingQuery({ district:districtSelect.value, category:categorySelect.value })}`);
  }

  form.addEventListener('submit', onSubmit);
  document.addEventListener('click', closeSelectMenus);
  sheetToggle.addEventListener('click', toggleSheet);
  sheetToggle.addEventListener('pointerdown', onSheetPointerDown);
  sheetToggle.addEventListener('pointerup', onSheetPointerUp);
  sheetToggle.addEventListener('pointercancel', onSheetPointerCancel);
  sidebarToggle.addEventListener('click', toggleSidebar);
  loadMeta();
  return () => {
    form.removeEventListener('submit', onSubmit);
    document.removeEventListener('click', closeSelectMenus);
    sheetToggle.removeEventListener('click', toggleSheet);
    sheetToggle.removeEventListener('pointerdown', onSheetPointerDown);
    sheetToggle.removeEventListener('pointerup', onSheetPointerUp);
    sheetToggle.removeEventListener('pointercancel', onSheetPointerCancel);
    sidebarToggle.removeEventListener('click', toggleSidebar);
    document.body.classList.remove('ranking-map-active');
    rankingMap.destroy();
  };
}
