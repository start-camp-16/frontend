function hasUniqueValues(values = []) {
  return new Set(values).size === values.length;
}

export function validateCriteria({ district = '', categories = [], stop_count = 0 }) {
  const errors = {};
  if (!district.trim()) errors.district = '구를 선택해 주세요.';
  if (categories.length > Number(stop_count)) {
    errors.categories = '카테고리 수는 방문 장소 수보다 많을 수 없습니다.';
  } else if (categories.length < 1 || categories.length > 3 || !hasUniqueValues(categories)) {
    errors.categories = '서로 다른 카테고리를 1~3개 선택해 주세요.';
  }
  if (!Number.isInteger(Number(stop_count)) || Number(stop_count) < 3 || Number(stop_count) > 5) errors.stop_count = '장소 수는 3~5개로 선택해 주세요.';
  return errors;
}

export function validateCourse({ title = '', password = '', stops = [] }) {
  const errors = {};
  const ids = stops.map(stop => stop.location?.content_id).filter(Boolean);
  if (title.trim().length < 1 || title.trim().length > 100) errors.title = '제목은 1~100자로 입력해 주세요.';
  if (password.length < 4 || password.length > 20) errors.password = '비밀번호는 4~20자로 입력해 주세요.';
  if (ids.length < 3 || ids.length > 5 || !hasUniqueValues(ids)) errors.stops = '서로 다른 장소를 3~5개 담아 주세요.';
  return errors;
}

export function courseErrorMessage(error = {}) {
  const messages = {
    VALIDATION_ERROR: '입력 내용을 다시 확인해 주세요.',
    COURSE_NOT_ENOUGH_LOCATIONS: '조건에 맞는 장소가 부족합니다. 카테고리를 바꾸거나 장소 수를 줄여 주세요.',
    PASSWORD_MISMATCH: '비밀번호가 일치하지 않습니다.',
    COURSE_NOT_FOUND: '코스를 찾을 수 없습니다. 공유 링크를 다시 확인해 주세요.',
    LOCATION_NOT_FOUND: '선택한 장소를 찾을 수 없습니다. 장소 목록을 다시 확인해 주세요.',
  };
  return messages[error.code] || error.message || '요청을 처리할 수 없습니다.';
}
