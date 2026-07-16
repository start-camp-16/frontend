import { expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { getCategoryFallback, renderRankingItems } from '../../../src/features/ranking/ranking-view.js';

const items = [
  { content_id:'1', rank:1, title:'좌표 장소', address:'서울', phone:null, image_url:null, thumbnail_url:null, latitude:37.5, longitude:127 },
  { content_id:'2', rank:2, title:'좌표 없는 장소', address:null, phone:null, image_url:null, thumbnail_url:null, latitude:null, longitude:null },
];

it('scopes the mobile Leaflet bottom offset to the ranking map', () => {
  const css = fs.readFileSync('src/features/ranking/ranking.css', 'utf8').replace(/\s+/g, '');
  expect(css).toContain('.ranking-explorer.leaflet-bottom{bottom:7.5rem;}');
  expect(css).not.toContain('}.leaflet-bottom{bottom:7.5rem;}');
});

it('랭킹 항목을 키보드로 선택 가능한 버튼으로 렌더링한다', () => {
  const onSelect = vi.fn();
  renderRankingItems(document.body, items, { selectedId:'1', onSelect });
  const cards = document.querySelectorAll('.place-card');
  expect(cards[0].tagName).toBe('BUTTON');
  expect(cards[0].getAttribute('aria-current')).toBe('true');
  expect(cards[0].dataset.contentId).toBe('1');
  cards[1].click();
  expect(onSelect).toHaveBeenCalledWith('2');
  expect(cards[1].textContent).toContain('지도 위치 없음');
});

it('이미지가 없거나 로딩에 실패하면 카테고리 기본 이미지를 사용한다', () => {
  renderRankingItems(document.body, [
    { content_id:'1', rank:1, title:'문화 장소', category:'문화시설', image_url:null, thumbnail_url:null },
    { content_id:'2', rank:2, title:'쇼핑 장소', category:'쇼핑', image_url:'https://invalid.example/image.png', thumbnail_url:null },
  ]);
  const images = document.querySelectorAll('.place-card img');

  expect(images[0].src).toContain('culture.png');
  images[1].dispatchEvent(new Event('error'));
  expect(images[1].src).toContain('shopping.png');
  expect(getCategoryFallback('알 수 없음')).toMatch(/^(data:image\/svg\+xml)|place-fallback\.svg/);
});
