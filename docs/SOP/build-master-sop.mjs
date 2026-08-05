#!/usr/bin/env node
/**
 * Combines all SOP markdown files into a single master document.
 * Usage: node docs/SOP/build-master-sop.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ORDER = [
  '00-MASTER-INDEX.md',
  '01-COMPANY-GOVERNANCE-AND-SYSTEM.md',
  'SOP-01-SALES-OFFICE.md',
  'SOP-02-CASHIER-DESK.md',
  'SOP-03-ACCOUNTING-DESK.md',
  'SOP-04-OPERATIONS-STORE.md',
  'SOP-05-PRODUCTION.md',
  'SOP-06-PROCUREMENT.md',
  'SOP-07-HUMAN-RESOURCES.md',
  'SOP-08-EXECUTIVE-OFFICE.md',
  'SOP-09-MAINTENANCE.md',
  'SOP-10-OFFICE-ADMINISTRATION.md',
  'APPENDIX-A-GLOSSARY-AND-REFERENCE.md',
  'ANNEX-B-SCENARIO-WALKTHROUGHS.md',
  'ANNEX-C-IT-OPERATIONS.md',
  'ANNEX-D-COMPLIANCE-AND-AUDIT.md',
  'ANNEX-E-EXTENDED-PROCEDURES.md',
  'ANNEX-F-ACCOUNTING-POLICIES.md',
  'ANNEX-G-HR-POLICIES.md',
  'ANNEX-H-INVENTORY-PRODUCTION-STANDARDS.md',
];

const parts = [];
let totalWords = 0;

for (const file of ORDER) {
  const path = join(__dirname, file);
  const content = readFileSync(path, 'utf8');
  const words = content.split(/\s+/).filter(Boolean).length;
  totalWords += words;
  parts.push(`\n\n---\n\n<!-- SOURCE: ${file} (${words.toLocaleString()} words) -->\n\n`);
  parts.push(content);
}

const header = `# ZAREWA ALUMINIUM AND PLASTICS LTD
## COMPLETE SYSTEM OF OPERATIONS — MASTER DOCUMENT

**Generated:** ${new Date().toISOString().split('T')[0]}  
**Version:** 3.0 Code-Accurate Edition  
**Total words:** ${totalWords.toLocaleString()}  
**Source:** Zarewa ERP (frontend + backend codebase)

---

`;

const output = header + parts.join('');
const outPath = join(__dirname, 'ZAREWA_COMPLETE_SOP_v3.md');
writeFileSync(outPath, output, 'utf8');

console.log(`Combined ${ORDER.length} files`);
console.log(`Total words: ${totalWords.toLocaleString()}`);
console.log(`Output: ${outPath}`);
