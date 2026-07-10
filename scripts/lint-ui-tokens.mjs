#!/usr/bin/env node
/**
 * CI helper: fail if banned ad-hoc UI tokens reappear in src (excluding print libs).
 * Usage: node scripts/lint-ui-tokens.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src');
const SKIP_DIRS = new Set(['node_modules', 'dist']);
const SKIP_FILE_RE = /Print\.(js|jsx|View|Content)|PrintContent|printHtml|officeDeskPrint|PrintView/i;
const BANNED = [
  { re: /text-\[(9|10)px\]/g, label: 'text-[9px/10px] — use text-ui-xs or text-xs' },
  { re: /\[#134e4a\]/g, label: 'hardcoded #134e4a — use zarewa-teal token' },
  { re: /\bz-\[100\]\b/g, label: 'z-[100] — use --z-layer-modal' },
];

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (!SKIP_DIRS.has(ent.name)) walk(p, out);
    } else if (/\.(jsx|js|tsx|ts|css)$/.test(ent.name) && !SKIP_FILE_RE.test(p)) {
      out.push(p);
    }
  }
  return out;
}

const violations = [];
for (const file of walk(ROOT)) {
  const rel = path.relative(process.cwd(), file).replace(/\\/g, '/');
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split(/\r?\n/);
  const bannedForFile =
    rel === 'index.css' ? BANNED.filter((b) => !b.re.source.includes('9|10')) : BANNED;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { re, label } of bannedForFile) {
      re.lastIndex = 0;
      if (re.test(line)) {
        violations.push(`${rel}:${i + 1} ${label}`);
      }
    }
  }
}

if (violations.length) {
  console.error('lint-ui-tokens: banned patterns found:\n');
  for (const v of violations.slice(0, 50)) console.error('  ', v);
  if (violations.length > 50) console.error(`  … and ${violations.length - 50} more`);
  process.exit(1);
}

console.log('lint-ui-tokens: OK');
