import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { mountBoardListPage } from '../../../src/features/board/board-list-page.js';

vi.mock('../../../src/features/board/board-api.js', () => ({
  getPosts: vi.fn(() => Promise.resolve({ items: [], pagination: { page: 1, total_pages: 1 } })),
}));

describe('board district filter layout', () => {
  it('renders the sidebar, district trigger, themes, and content area', () => {
    const outlet = document.createElement('main');
    mountBoardListPage({ outlet, query: new URLSearchParams(), signal: new AbortController().signal, navigate: vi.fn() });

    expect(outlet.querySelector('.board-layout')).not.toBeNull();
    expect(outlet.querySelector('.board-filter-sidebar')).not.toBeNull();
    expect(outlet.querySelector('[data-open-district]')).not.toBeNull();
    expect(outlet.querySelectorAll('[data-prefix]')).toHaveLength(8);
    expect(outlet.querySelector('.board-content')).not.toBeNull();
    expect(outlet.querySelector('a.button[href="/posts/new"]')).not.toBeNull();
  });

  it('defines desktop two-column and mobile single-column rules', () => {
    const css = fs.readFileSync(path.join(process.cwd(), 'src/features/board/board.css'), 'utf8').replace(/\s+/g, '');
    expect(css).toContain('.board-layout{display:grid;grid-template-columns:15remminmax(0,1fr)');
    expect(css).toContain('@media(max-width:899px)');
    expect(css).toContain('.board-layout{grid-template-columns:1fr');
  });
});
