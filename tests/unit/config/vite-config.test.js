import { describe, expect, it } from 'vitest';
import config from '../../../vite.config.js';

describe('vite dev server proxy', () => {
  it('forwards api requests to the Render backend server', () => {
    expect(config.server?.proxy?.['/api']).toMatchObject({
      target: 'https://backend-ml00.onrender.com',
      changeOrigin: true,
      secure: false,
    });
  });
});
