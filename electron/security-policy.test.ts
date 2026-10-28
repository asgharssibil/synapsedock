import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { isNavigationAllowed, SECURE_WEB_PREFERENCES } from './security-policy';

describe('Electron trust boundary', () => {
  it('keeps the renderer sandboxed and isolated from Node.js', () => {
    expect(SECURE_WEB_PREFERENCES).toEqual({ contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true });
  });

  it('rejects lookalike and remote navigation origins', () => {
    expect(isNavigationAllowed('http://localhost:5173/dashboard', true)).toBe(true);
    expect(isNavigationAllowed('http://localhost:5173.evil.example/', true)).toBe(false);
    expect(isNavigationAllowed('https://localhost:5173/', true)).toBe(false);
    expect(isNavigationAllowed('https://example.com/', false)).toBe(false);
    expect(isNavigationAllowed('file:///C:/app/dist/index.html', false)).toBe(true);
  });

  it('ships a CSP that rejects remote scripts by default', () => {
    const html = fs.readFileSync(path.resolve('index.html'), 'utf8');
    expect(html).toContain("default-src 'self'");
    expect(html).toContain("script-src 'self'");
    expect(html).not.toMatch(/script-src[^;]*https:/);
  });
});
