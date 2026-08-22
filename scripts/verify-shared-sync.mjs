#!/usr/bin/env node
/** Exit 1 if frontend src/shared modules drift from backend shared/. */
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

if (!fs.existsSync(path.join(backendRoot, 'shared'))) {
  console.error(
    `Backend shared/ not found at ${backendRoot}. Set ZAREWA_BACKEND_ROOT or clone the backend as a sibling (Zarewa-backend-main).`
  );
  process.exit(1);
}

let drift = 0;
for (const [fromRel, toRel] of SHARED_SYNC_PAIRS) {
  const from = path.join(backendRoot, fromRel);
  const to = path.join(frontendRoot, toRel);
  if (!fs.existsSync(from) || !fs.existsSync(to)) {
    console.error(`missing: ${fromRel} → ${toRel}`);
    drift += 1;
    continue;
  }
  const a = fs.readFileSync(from, 'utf8').replace(/\r\n/g, '\n');
  const b = fs.readFileSync(to, 'utf8').replace(/\r\n/g, '\n');
  if (a !== b) {
    console.error(`DRIFT: ${toRel} — run npm run sync:shared`);
    drift += 1;
  }
}
if (drift) {
  process.exit(1);
}
console.log(`Shared modules in sync (${SHARED_SYNC_PAIRS.length} file(s)) vs ${backendRoot}.`);
