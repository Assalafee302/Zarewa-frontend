#!/usr/bin/env node
/** Exit 1 if frontend src/shared expense modules drift from backend shared/. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, '..');
const backendRoot = path.resolve(frontendRoot, '..', 'Zarewa-backend-main');

const PAIRS = [
  ['shared/workspaceGovernance.js', 'src/shared/workspaceGovernance.js'],
  ['shared/expenseCategories.js', 'src/shared/expenseCategories.js'],
  ['shared/expenseCategoryLanes.js', 'src/shared/expenseCategoryLanes.js'],
  ['shared/expenseCategoryPolicy.js', 'src/shared/expenseCategoryPolicy.js'],
  ['shared/lib/expenseCategoryGlMap.js', 'src/shared/lib/expenseCategoryGlMap.js'],
  ['shared/lib/expenseCategorySuggestions.js', 'src/shared/lib/expenseCategorySuggestions.js'],
  ['shared/lib/ap3CostingClassification.js', 'src/shared/lib/ap3CostingClassification.js'],
];

let drift = 0;
for (const [fromRel, toRel] of PAIRS) {
  const from = path.join(backendRoot, fromRel);
  const to = path.join(frontendRoot, toRel);
  if (!fs.existsSync(from) || !fs.existsSync(to)) {
    console.error(`missing: ${fromRel}`);
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
console.log('Shared expense modules in sync.');
