/**
 * Hostinger deploys Zarewa-frontend but runs Express (server/index.js).
 * This script builds the SPA from the current checkout, clones Zarewa-backend
 * (899b14f+), copies dist → app/dist, so `node server/index.js` can start the API.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { debugAgentLog } from './debug-agent-log.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.join(__dirname, '..');
const backendDir = path.join(frontendRoot, '.build', 'backend');
const DEFAULT_BACKEND_GIT = 'https://github.com/Assalafee302/Zarewa-backend.git';

function run(cmd, args, cwd, env = process.env) {
  const r = spawnSync(cmd, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function readGitHead(repoDir) {
  try {
    return fs.readFileSync(path.join(repoDir, '.git', 'HEAD'), 'utf8').trim();
  } catch {
    return null;
  }
}

function readClonedBackendSha(repoDir) {
  try {
    return fs.readFileSync(path.join(repoDir, '.git', 'refs', 'heads', 'main'), 'utf8').trim().slice(0, 7);
  } catch {
    return readGitHead(repoDir);
  }
}

const frontendPkg = JSON.parse(fs.readFileSync(path.join(frontendRoot, 'package.json'), 'utf8'));

// #region agent log
debugAgentLog({
  hypothesisId: 'D',
  location: 'hostinger-deploy-backend.mjs:start',
  message: 'Frontend-repo Hostinger build started',
  data: {
    frontendPackage: frontendPkg.name,
    frontendRoot,
    nodeEnv: process.env.NODE_ENV || null,
  },
  runId: process.env.ZAREWA_DEBUG_RUN_ID || 'pre-fix',
});
// #endregion

console.log('[zarewa] Hostinger: build SPA from frontend checkout');
run('npm', ['run', 'build:spa'], frontendRoot);

const viteDist = path.join(frontendRoot, 'dist');
if (!fs.existsSync(path.join(viteDist, 'index.html'))) {
  console.error('[zarewa] Missing dist/index.html after vite build.');
  process.exit(1);
}

const gitUrl = String(process.env.ZAREWA_BACKEND_GIT_URL || DEFAULT_BACKEND_GIT).trim();
const gitRef = String(process.env.ZAREWA_BACKEND_GIT_REF || 'main').trim();

if (fs.existsSync(backendDir)) {
  fs.rmSync(backendDir, { recursive: true, force: true });
}

console.log(`[zarewa] Hostinger: clone backend ${gitUrl} (${gitRef})`);
run('git', ['clone', '--depth', '1', '--branch', gitRef, gitUrl, backendDir], frontendRoot);

const backendSha = readClonedBackendSha(backendDir);

// #region agent log
debugAgentLog({
  hypothesisId: 'E',
  location: 'hostinger-deploy-backend.mjs:cloned',
  message: 'Backend cloned for Express start',
  data: {
    backendDir,
    backendSha,
    gitUrl,
    gitRef,
  },
  runId: process.env.ZAREWA_DEBUG_RUN_ID || 'pre-fix',
});
// #endregion

console.log(`[zarewa] Hostinger: backend at commit ${backendSha || gitRef}`);
console.log('[zarewa] Hostinger: npm ci in backend');
run('npm', ['ci'], backendDir);

const appDist = path.join(backendDir, 'app', 'dist');
fs.mkdirSync(path.dirname(appDist), { recursive: true });
fs.rmSync(appDist, { recursive: true, force: true });
fs.cpSync(viteDist, appDist, { recursive: true });

// #region agent log
debugAgentLog({
  hypothesisId: 'F',
  location: 'hostinger-deploy-backend.mjs:copy',
  message: 'SPA copied into cloned backend app/dist',
  data: {
    appDist,
    appIndexExists: fs.existsSync(path.join(appDist, 'index.html')),
    backendSha,
  },
  runId: process.env.ZAREWA_DEBUG_RUN_ID || 'pre-fix',
});
// #endregion

console.log(`[zarewa] Hostinger: ready — start with node server/index.js (backend ${backendSha || gitRef})`);
