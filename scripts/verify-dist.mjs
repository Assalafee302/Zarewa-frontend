/**
 * After `npm run build`, verifies every JS/CSS asset referenced from dist/index.html exists.
 * IT should run this on the build machine before uploading dist/.
 */
import { readFileSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const distDir = join(process.cwd(), 'dist');
const indexPath = join(distDir, 'index.html');
const assetsDir = join(distDir, 'assets');

if (!existsSync(indexPath)) {
  console.error('verify-dist: dist/index.html not found — run npm run build first.');
  process.exit(1);
}

const html = readFileSync(indexPath, 'utf8');
const refs = [...html.matchAll(/\/assets\/([A-Za-z0-9._-]+\.(?:js|css))/g)].map((m) => m[1]);
const unique = [...new Set(refs)];
const missing = unique.filter((name) => !existsSync(join(assetsDir, name)));

const manifest = {
  generatedAt: new Date().toISOString(),
  build: html.match(/name="zarewa-build"\s+content="([^"]+)"/)?.[1] || null,
  assetCount: readdirSync(assetsDir).length,
  referencedCount: unique.length,
  missing,
  assets: readdirSync(assetsDir).sort(),
};

writeFileSync(join(distDir, 'asset-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

if (missing.length) {
  console.error('verify-dist: missing assets referenced by index.html:');
  for (const m of missing) console.error(`  - assets/${m}`);
  process.exit(1);
}

console.log(`verify-dist: OK — ${unique.length} referenced assets, ${manifest.assetCount} files in assets/ (build ${manifest.build})`);
