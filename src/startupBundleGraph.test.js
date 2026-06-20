/**
 * Production bundle guard — lazy chunks must not import the entry index chunk (TDZ crash).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { cwd } from 'node:process';

function resolveAssetsDir() {
  for (const dir of ['dist/assets', 'dist-check/assets']) {
    const assetsDir = join(cwd(), dir);
    if (!existsSync(assetsDir)) continue;
    const assets = readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
    if (assets.some((f) => f.startsWith('index-'))) return assetsDir;
  }
  return null;
}

describe('production bundle chunk graph', () => {
  it('lazy chunks do not import entry index (prevents Q TDZ)', () => {
    const assetsDir = resolveAssetsDir();
    if (!assetsDir) {
      console.warn('Skipping bundle graph test — run `npm run build` to generate dist/assets.');
      return;
    }
    const assets = readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
    const indexFile = assets.find((f) => f.startsWith('index-'));
    expect(indexFile).toBeTruthy();

    const importingIndex = assets.filter((f) => {
      if (f === indexFile) return false;
      const code = readFileSync(join(assetsDir, f), 'utf8');
      return code.includes(`./${indexFile.replace('.js', '')}`);
    });

    expect(importingIndex).toEqual([]);
  });

  it('lucide is not split into micro-chunks that import app-shell (prevents Q TDZ)', () => {
    const assetsDir = resolveAssetsDir();
    if (!assetsDir) return;
    const assets = readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
    const shellFile = assets.find((f) => f.startsWith('app-shell-'));
    expect(assets.some((f) => f.startsWith('vendor-lucide-'))).toBe(false);
    if (!shellFile) return;

    const lucideMicroChunks = assets.filter((f) => {
      if (f === shellFile || f.startsWith('index-') || f.startsWith('rolldown-runtime-')) return false;
      const code = readFileSync(join(assetsDir, f), 'utf8');
      return (
        code.length < 800 &&
        code.includes(`./${shellFile.replace('.js', '')}`) &&
        /var \w=\w\(`[a-z0-9-]+`/i.test(code)
      );
    });

    expect(lucideMicroChunks).toEqual([]);
  });
});
