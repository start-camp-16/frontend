import { describe, expect, it, vi } from 'vitest';
import { mountBoardListPage } from '../../../src/features/board/board-list-page.js';

vi.mock('../../../src/features/board/board-api.js', () => ({
  getPosts: vi.fn(() => Promise.resolve({
    items: [],
    pagination: { page: 1, total_pages: 1 },
  })),
}));

describe('board desktop layout structure', () => {
  it('renders desktop grouping hooks for the toolbar and post list', () => {
    const outlet = document.createElement('main');

    mountBoardListPage({
      outlet,
      query: new URLSearchParams(),
      signal: new AbortController().signal,
      navigate: vi.fn(),
    });

    expect(outlet.querySelector('.board-shell')).not.toBeNull();
    expect(outlet.querySelector('.board-toolbar')).not.toBeNull();
    expect(outlet.querySelector('.post-list-head')).not.toBeNull();

    const writeLink = outlet.querySelector('a.button[href="/posts/new"]');
    expect(writeLink).not.toBeNull();
    expect(writeLink.closest('.search-form')).not.toBeNull();
    expect(writeLink.closest('.section-head')).toBeNull();
  });
});
