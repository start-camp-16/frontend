import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
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
    expect(writeLink.classList.contains('button--write')).toBe(true);
  });

  it('keeps the tablet board controls visible and aligned', () => {
    const css = fs.readFileSync(path.join(process.cwd(), 'src/features/board/board.css'), 'utf8');
    const compactCss = css.replace(/\s+/g, '');

    expect(compactCss).toContain('.search-form{display:grid;grid-template-columns:minmax(0,1fr)autoauto');
    expect(compactCss).toContain('.button--write{background:#111827;color:#fff');
    expect(compactCss).toContain('.tag-tabsbutton{background:#fff;color:#334155;border:1pxsolid#cbd5e1');
    expect(compactCss).toContain('.post-row{display:grid;grid-template-columns:5rem1fr8rem;gap:1rem;align-items:center;text-decoration:none;padding:1rem1.2rem;background:#fff;border:1pxsolid#d6deea');
  });
});
