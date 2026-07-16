import { expect, it } from 'vitest';
import { renderLayout } from '../../../src/app/layout.js';

it('공통 앱 셸을 렌더링한다', () => {
  const { outlet, chatRoot } = renderLayout(document.body);
  expect(document.body.textContent).toContain('뭐할구');
  expect(document.querySelector('.brand__icon').getAttribute('src')).toBe('/wink-gu-favicon.png');
  expect(document.querySelector('.brand__icon').getAttribute('alt')).toBe('');
  expect(document.querySelector('.brand__gu').textContent).toBe('구');
  expect(document.querySelector('.brand__question').textContent).toBe('?');
  expect(document.querySelector('a[href="/"]')).not.toBeNull();
  expect(document.querySelector('a[href="/courses"]').textContent).toBe('코스');
  expect(document.querySelector('a[href="/posts"]')).not.toBeNull();
  expect([...document.querySelectorAll('nav a')].map(link => link.textContent)).toEqual(['홈', '코스', '게시판']);
  expect(outlet.id).toBe('route-outlet');
  expect(chatRoot.id).toBe('chat-root');
  expect(document.body.textContent).toContain('한국관광공사 TourAPI 제공 · 공공누리 제3유형');
});
