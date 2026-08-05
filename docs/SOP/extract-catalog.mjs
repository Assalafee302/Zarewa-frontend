#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backend = path.resolve(__dirname, '../../../Zarewa-backend-main');

const auth = fs.readFileSync(path.join(backend, 'server/auth.js'), 'utf8');
const hr = fs.readFileSync(path.join(backend, 'server/hrPermissionKeys.js'), 'utf8');
const http = fs.readFileSync(path.join(backend, 'server/httpApi.js'), 'utf8');
const hrApi = fs.readFileSync(path.join(backend, 'server/hrApi.js'), 'utf8');
const mobile = fs.readFileSync(path.join(backend, 'server/mobileApi.js'), 'utf8');
const schema = fs.readFileSync(path.join(backend, 'server/schemaSql.js'), 'utf8');

const roleBlock = auth.match(/export const ROLE_DEFINITIONS = \{([\s\S]*?)\n\};/);
const roles = [];
if (roleBlock) {
  for (const m of roleBlock[1].matchAll(/^\s{2}([a-z_]+):\s*\{/gm)) roles.push(m[1]);
}

const perms = new Set();
for (const src of [auth, hr]) {
  for (const m of src.matchAll(/'([a-z*][a-z0-9_.*]*)'/g)) {
    const p = m[1];
    if (p === '*' || p.includes('.')) perms.add(p);
  }
}

const routes = new Set();
for (const src of [http, hrApi, mobile]) {
  for (const m of src.matchAll(/\.(get|post|put|patch|delete)\(\s*['`]([^'`]+)/gi)) {
    const p = m[2];
    if (p.startsWith('/')) routes.add(`${m[1].toUpperCase()} ${p}`);
  }
}

const tables = [...schema.matchAll(/CREATE TABLE IF NOT EXISTS\s+(\w+)/gi)].map((m) => m[1]);

const out = {
  roles: [...new Set(roles)],
  perms: [...perms].sort(),
  routes: [...routes].sort(),
  tables: [...new Set(tables)].sort(),
};
fs.writeFileSync(path.join(__dirname, '_extract.json'), JSON.stringify(out, null, 2));
console.log(
  `roles=${out.roles.length} perms=${out.perms.length} routes=${out.routes.length} tables=${out.tables.length}`,
);
