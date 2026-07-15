import { describe, expect, it } from 'vitest';
import { matchRoute } from '../../../src/router/routes.js';

describe('matchRoute', () => {
  it.each([
    ['/', 'ranking', {}],
    ['/courses', 'courses', {}],
    ['/courses/0123456789abcdef0123456789abcdef', 'course-detail', { publicId: '0123456789abcdef0123456789abcdef' }],
    ['/posts', 'posts', {}],
    ['/posts/new', 'post-new', {}],
    ['/posts/12', 'post-detail', { id: '12' }],
    ['/posts/12/edit', 'post-edit', { id: '12' }],
  ])('%s를 해석한다', (path, name, params) => {
    expect(matchRoute(path)).toEqual({ name, params });
  });

  it('1 미만이거나 숫자가 아닌 id를 거부한다', () => {
    expect(matchRoute('/posts/0')).toBeNull();
    expect(matchRoute('/posts/x')).toBeNull();
  });

  it('잘못된 코스 공개 ID를 거부한다', () => {
    expect(matchRoute('/courses/not-a-public-id')).toBeNull();
    expect(matchRoute('/courses/0123456789ABCDEF0123456789ABCDEF')).toBeNull();
  });
});
