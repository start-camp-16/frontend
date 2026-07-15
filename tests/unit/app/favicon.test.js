import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('favicon', () => {
  it('links the approved SVG favicon from the document head', () => {
    const html = readFileSync(resolve('index.html'), 'utf8');

    expect(html).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg" />');
  });

  it('keeps the approved rounded-square wink character geometry', () => {
    const svg = readFileSync(resolve('public/favicon.svg'), 'utf8');

    expect(svg).toContain('<rect x="9" y="9" width="110" height="110" rx="30" fill="#315cfd" />');
    expect(svg).not.toMatch(/<circle[^>]+cx="99"[^>]+cy="29"/);
  });
});
