import { expect, it } from 'vitest';
import { validatePost } from '../../../src/features/board/post-validation.js';
import { validateComment } from '../../../src/features/board/comment-validation.js';

it('게시글 경계값과 지역·테마를 검증한다', () => {
  expect(validatePost({ district: '', prefix: '', title: '', content: '', password: '123' })).toMatchObject({
    district: expect.any(String),
    prefix: expect.any(String),
    title: expect.any(String),
    content: expect.any(String),
    password: expect.any(String),
  });
  expect(validatePost({ district: '마포구', prefix: '자유', title: 'a'.repeat(100), content: 'b'.repeat(5000), password: '1234' })).toEqual({});
  expect(validatePost({ district: '없는구', prefix: '없는테마', title: 'a'.repeat(101), content: 'b'.repeat(5001), password: '1'.repeat(21) })).toMatchObject({
    district: expect.any(String), prefix: expect.any(String), title: expect.any(String), content: expect.any(String), password: expect.any(String),
  });
});

it('댓글 경계값을 검증한다', () => {
  expect(validateComment({ content: 'a'.repeat(1000), password: '1234' })).toEqual({});
  expect(validateComment({ content: 'a'.repeat(1001), password: '123' })).toMatchObject({ content: expect.any(String), password: expect.any(String) });
});
