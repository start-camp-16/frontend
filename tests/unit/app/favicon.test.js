import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('favicon', () => {
  it('links the approved PNG favicon from the document head', () => {
    const html = readFileSync(resolve('index.html'), 'utf8');

    expect(html).toContain('<link rel="icon" type="image/png" href="/wink-gu-favicon.png" />');
    expect(html).toContain('<link rel="apple-touch-icon" href="/wink-gu-favicon.png" />');
  });

  it('keeps the supplied wink character PNG asset', () => {
    const png = readFileSync(resolve('public/wink-gu-favicon.png'));

    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(png.length).toBeGreaterThan(1000);
  });
});
