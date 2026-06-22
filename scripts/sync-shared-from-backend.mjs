#!/usr/bin/env node
/**
 * Copy canonical shared expense-category modules from backend → frontend.
 * Run after backend shared/ changes: npm run sync:shared
 */
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

let copied = 0;
for (const [fromRel, toRel] of PAIRS) {
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
