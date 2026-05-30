/**
 * Hostinger entry: start the cloned Zarewa-backend API + static app/dist from build step.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.join(__dirname, '..');
const backendRoot = path.join(frontendRoot, '.build', 'backend');
const backendEntry = path.join(backendRoot, 'server', 'index.js');

if (!fs.existsSync(backendEntry)) {
  console.error(
    '[zarewa] Missing .build/backend/server/index.js — run npm run build:serve:lan before start.'
  );
  process.exit(1);
}

if (!process.env.ZAREWA_STATIC_DIR) {
  process.env.ZAREWA_STATIC_DIR = path.join(backendRoot, 'app', 'dist');
}

process.chdir(backendRoot);
await import(backendEntry);
