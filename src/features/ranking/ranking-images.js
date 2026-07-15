import fallback from '../../assets/place-fallback.svg';
import accommodationFallback from '../../assets/category/accommodation.png';
import attractionFallback from '../../assets/category/attraction.png';
import courseFallback from '../../assets/category/course.png';
import cultureFallback from '../../assets/category/culture.png';
import festivalFallback from '../../assets/category/festival.png';
import leisureFallback from '../../assets/category/leisure.png';
import shoppingFallback from '../../assets/category/shopping.png';

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
