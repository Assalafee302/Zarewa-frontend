#!/usr/bin/env node
/**
 * Copy canonical shared modules from backend → frontend src/shared/.
 * Run after backend shared/ changes: npm run sync:shared
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHARED_SYNC_PAIRS } from './shared-sync-pairs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, '..');

function resolveBackendRoot() {
  const fromEnv = String(process.env.ZAREWA_BACKEND_ROOT || '').trim();
  if (fromEnv) return path.resolve(fromEnv);
  const candidates = [
    path.resolve(frontendRoot, '..', 'Zarewa-backend-main'),
    path.resolve(frontendRoot, '..', 'Zarewa-backend'),
    path.resolve(frontendRoot, '.ci', 'zarewa-backend'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'shared'))) return candidate;
  }
  return candidates[0];
}

const backendRoot = resolveBackendRoot();

let copied = 0;
for (const [fromRel, toRel] of SHARED_SYNC_PAIRS) {
  const from = path.join(backendRoot, fromRel);
  const to = path.join(frontendRoot, toRel);
  if (!fs.existsSync(from)) {
    console.warn(`skip (missing): ${fromRel}`);
    continue;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  copied += 1;
  console.log(`synced ${fromRel} → ${toRel}`);
}
console.log(`Done — ${copied} file(s).`);
