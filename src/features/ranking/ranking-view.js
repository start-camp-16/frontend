import fallback from '../../assets/place-fallback.svg';
import accommodationFallback from '../../assets/category/accommodation.png';
import attractionFallback from '../../assets/category/attraction.png';
import courseFallback from '../../assets/category/course.png';
import cultureFallback from '../../assets/category/culture.png';
import festivalFallback from '../../assets/category/festival.png';
import leisureFallback from '../../assets/category/leisure.png';
import shoppingFallback from '../../assets/category/shopping.png';
import { toCoordinate } from './ranking-map.js';

const CATEGORY_FALLBACKS = {
  관광지: attractionFallback,
  레포츠: leisureFallback,
  문화시설: cultureFallback,
  쇼핑: shoppingFallback,
  숙박: accommodationFallback,
  여행코스: courseFallback,
  축제공연행사: festivalFallback,
};

export function getCategoryFallback(category) {
  return CATEGORY_FALLBACKS[category] ?? fallback;
}

export function renderRankingItems(container, items, { selectedId = null, onSelect = () => {} } = {}) {
  container.replaceChildren();
  for (const item of items) {
    const article=document.createElement('button'); article.type='button'; article.className='place-card panel';
    article.dataset.contentId=String(item.content_id);
    article.setAttribute('aria-label',`${item.rank}위 ${item.title}`);
    if(String(item.content_id)===String(selectedId)) article.setAttribute('aria-current','true');
    article.addEventListener('click',()=>onSelect(String(item.content_id)));
    const categoryFallback=getCategoryFallback(item.category);
    const image=document.createElement('img'); image.src=item.thumbnail_url??item.image_url??categoryFallback; image.alt=`${item.title} 대표 이미지`; image.addEventListener('error',()=>{image.src=categoryFallback;},{once:true});
    const rank=document.createElement('strong'); rank.className='rank-number'; rank.textContent=String(item.rank);
    const copy=document.createElement('div'); const title=document.createElement('h3'); title.textContent=item.title; copy.append(title);
    if(item.address){const p=document.createElement('p');p.textContent=item.address;copy.append(p)} if(item.phone){const p=document.createElement('p');p.textContent=item.phone;copy.append(p)}
    if(!toCoordinate(item)){const missing=document.createElement('small');missing.className='map-missing';missing.textContent='지도 위치 없음';copy.append(missing)}
    article.append(rank,image,copy); container.append(article);
  }
}
