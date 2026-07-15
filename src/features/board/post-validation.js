import { POST_DISTRICTS, POST_PREFIXES } from './board-constants.js';

export function validatePost({ district, prefix, title = '', content = '', password = '' }) {
  const errors = {};
  const normalizedTitle = title.trim();
  const normalizedContent = content.trim();
  if (!POST_DISTRICTS.includes(district)) errors.district = '지역을 선택해 주세요.';
  if (!POST_PREFIXES.includes(prefix)) errors.prefix = '테마를 선택해 주세요.';
  if (normalizedTitle.length < 1 || normalizedTitle.length > 100) errors.title = '제목은 1~100자로 입력해 주세요.';
  if (normalizedContent.length < 1 || normalizedContent.length > 5000) errors.content = '본문은 1~5,000자로 입력해 주세요.';
  if (password.length < 4 || password.length > 20) errors.password = '비밀번호는 4~20자로 입력해 주세요.';
  return errors;
}
