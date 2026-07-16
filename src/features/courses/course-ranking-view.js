import { renderAsyncState } from '../../ui/async-state.js';

function renderStops(root, course) {
  root.querySelector('[data-course-ranking-district]').textContent = `${course.district} 추천 코스`;
  const list = root.querySelector('[data-course-ranking-stops]');
  list.replaceChildren();
  [...(course.stops ?? [])].sort((a, b) => a.position - b.position).forEach((stop, index) => {
    const item = document.createElement('li');
    item.className = 'course-ranking-stop';
    const number = document.createElement('span');
    number.className = 'course-ranking-stop__number';
    number.textContent = String(stop.position ?? index + 1);
    const copy = document.createElement('span');
    copy.className = 'course-ranking-stop__copy';
    const title = document.createElement('strong');
    title.textContent = stop.location?.title ?? '';
    const address = document.createElement('small');
    address.textContent = stop.location?.address ?? '주소 정보 없음';
    copy.append(title, address);
    item.append(number, copy);
    list.append(item);
  });
}

export function renderCourseRankingCarousel(root, courses) {
  const body = root.querySelector('[data-course-ranking-body]');
  body.innerHTML = `<div class="course-ranking-content" aria-live="polite" aria-atomic="true"><h3 data-course-ranking-district></h3><ol class="course-ranking-stops" data-course-ranking-stops></ol></div><div class="course-ranking-carousel" aria-label="추천 코스 슬라이드"><button type="button" class="course-ranking-carousel__arrow" data-course-ranking-prev aria-label="이전 추천 코스"><span aria-hidden="true"></span></button><div class="course-ranking-dots" data-course-ranking-dots></div><button type="button" class="course-ranking-carousel__arrow course-ranking-carousel__arrow--next" data-course-ranking-next aria-label="다음 추천 코스"><span aria-hidden="true"></span></button></div>`;
  const items = [...courses].sort((a, b) => a.rank - b.rank);
  const dots = root.querySelector('[data-course-ranking-dots]');
  let activeIndex = 0;

  function show(index) {
    activeIndex = (index + items.length) % items.length;
    renderStops(root, items[activeIndex]);
    dots.querySelectorAll('[data-course-ranking-dot]').forEach((dot, dotIndex) => {
      dot.setAttribute('aria-current', dotIndex === activeIndex ? 'true' : 'false');
    });
  }

  items.forEach((course, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'course-ranking-dot';
    dot.dataset.courseRankingDot = String(index);
    dot.setAttribute('aria-label', `${course.district} 추천 코스 보기`);
    dot.addEventListener('click', () => show(index));
    dots.append(dot);
  });
  root.querySelector('[data-course-ranking-prev]').addEventListener('click', () => show(activeIndex - 1));
  root.querySelector('[data-course-ranking-next]').addEventListener('click', () => show(activeIndex + 1));
  show(0);
}

export function renderCourseRankingError(root, { message, onRetry }) {
  renderAsyncState(root.querySelector('[data-course-ranking-body]'), { kind: 'error', message, onRetry });
}
