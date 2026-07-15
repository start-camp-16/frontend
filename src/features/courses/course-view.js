import fallbackImage from '../../assets/place-fallback.svg';

function actionButton(label, text, disabled, onClick) {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'course-stop__action';
  button.setAttribute('aria-label', label); button.textContent = text; button.disabled = disabled;
  button.addEventListener('click', onClick);
  return button;
}

export function renderCourseStops(container, stops, { onMove = () => {}, onRemove = () => {} } = {}) {
  container.replaceChildren();
  const list = document.createElement('ol'); list.className = 'course-stops';
  stops.forEach((stop, index) => {
    const { location } = stop;
    const item = document.createElement('li'); item.className = 'course-stop'; item.dataset.courseStop = location.content_id;
    const number = document.createElement('span'); number.className = 'course-stop__number'; number.textContent = String(index + 1).padStart(2, '0');
    const image = document.createElement('img'); image.src = location.thumbnail_url || location.image_url || fallbackImage; image.alt = `${location.title} 이미지`;
    image.addEventListener('error', () => { if (!image.src.endsWith(fallbackImage)) image.src = fallbackImage; }, { once: true });
    const copy = document.createElement('div'); copy.className = 'course-stop__copy';
    const title = document.createElement('h3'); title.textContent = location.title;
    const meta = document.createElement('p'); meta.textContent = [location.category, location.address].filter(Boolean).join(' · ');
    copy.append(title, meta);
    const actions = document.createElement('div'); actions.className = 'course-stop__actions';
    actions.append(
      actionButton(`${location.title} 위로`, '↑', index === 0, () => onMove(index, index - 1)),
      actionButton(`${location.title} 아래로`, '↓', index === stops.length - 1, () => onMove(index, index + 1)),
      actionButton(`${location.title} 삭제`, '삭제', stops.length <= 3, () => onRemove(index)),
    );
    item.append(number, image, copy, actions); list.append(item);
  });
  container.append(list);
  return list;
}

export function renderPlaceSearchResults(container, items, selectedIds, onSelect) {
  container.replaceChildren();
  if (!items.length) {
    const empty = document.createElement('p'); empty.className = 'course-help'; empty.textContent = '선택한 조건에 맞는 장소가 없습니다.'; container.append(empty); return;
  }
  const list = document.createElement('div'); list.className = 'course-place-results';
  items.forEach(location => {
    const row = document.createElement('div'); row.className = 'course-place-result';
    const copy = document.createElement('div');
    const title = document.createElement('strong'); title.textContent = location.title;
    const meta = document.createElement('span'); meta.textContent = [location.category, location.address].filter(Boolean).join(' · ');
    copy.append(title, meta);
    const button = document.createElement('button'); button.type = 'button'; button.className = 'button button--secondary';
    button.dataset.addContentId = location.content_id; button.textContent = selectedIds.has(location.content_id) ? '추가됨' : '추가';
    button.disabled = selectedIds.has(location.content_id); button.addEventListener('click', () => onSelect(location));
    row.append(copy, button); list.append(row);
  });
  container.append(list);
}
