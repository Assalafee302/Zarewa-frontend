import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * public/sw.js is not importable (it runs in the service-worker scope), so pull the
 * matcher out and exercise it directly. Guards a real regression: the first version
 * expected `name.hash.js` while Vite emits `name-hash.js`, so it matched nothing and
 * the whole precache silently did nothing.
 */
function loadIsCacheableAsset(origin = 'https://erp.zarewaglobalservices.com') {
  const src = fs.readFileSync(path.join(process.cwd(), 'public', 'sw.js'), 'utf8');
  const start = src.indexOf('function isCacheableAsset');
  const end = src.indexOf("self.addEventListener('fetch'");
  if (start < 0 || end < 0) throw new Error('isCacheableAsset not found in public/sw.js');
  const body = src.slice(start, end);
  const fakeSelf = { location: { origin } };
  return new Function('self', 'URL', `${body}; return isCacheableAsset;`)(fakeSelf, URL);
}

describe('service worker asset matching', () => {
  const isCacheable = loadIsCacheableAsset();
  const origin = 'https://erp.zarewaglobalservices.com';

  it('caches Vite hashed bundles (hyphen + single dot)', () => {
    expect(isCacheable(`${origin}/assets/Sales-CaM8ZNa0.js`)).toBe(true);
    expect(isCacheable(`${origin}/assets/vendor-react-dom-D8z1cteh.js`)).toBe(true);
    expect(isCacheable(`${origin}/assets/index-BsW4h2xQ.css`)).toBe(true);
  });

  it('caches self-hosted fonts and brand images', () => {
    expect(isCacheable(`${origin}/fonts/f1.woff2`)).toBe(true);
    expect(isCacheable(`${origin}/login-mill-hero.webp`)).toBe(true);
    expect(isCacheable(`${origin}/zarewa-logo.png`)).toBe(true);
  });

  it('never cache-firsts the shell, the worker itself, or the manifest', () => {
    expect(isCacheable(`${origin}/sw.js`)).toBe(false);
    expect(isCacheable(`${origin}/manifest.webmanifest`)).toBe(false);
    expect(isCacheable(`${origin}/index.html`)).toBe(false);
  });

  it('never caches API traffic or other origins', () => {
    expect(isCacheable(`${origin}/api/bootstrap?mode=shell`)).toBe(false);
    expect(isCacheable(`${origin}/api/workspace/sales-snapshot`)).toBe(false);
    expect(isCacheable('https://cdn.example.com/assets/x-abc123.js')).toBe(false);
  });

  it('matches every real filename in the current build', () => {
    const dir = path.join(process.cwd(), 'dist', 'assets');
    if (!fs.existsSync(dir)) return; // dist is optional in CI
    const built = fs.readdirSync(dir).filter((f) => /\.(js|css)$/.test(f));
    expect(built.length).toBeGreaterThan(0);
    const missed = built.filter((f) => !isCacheable(`${origin}/assets/${f}`));
    expect(missed).toEqual([]);
  });
});
