/** Repair HrButton closing tags: reset all, then fix only HrButton/HrAddButton pairs. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue;
      walk(full, out);
    } else if (/\.(jsx|js)$/.test(name)) out.push(full);
  }
  return out;
}

let fixed = 0;
for (const file of walk(root)) {
  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes('HrButton') && !src.includes('HrAddButton') && !src.includes('</HrButton>')) continue;
  const original = src;
  src = src.replace(/<\/HrButton>/g, '</button>');
  src = src.replace(/<\/HrAddButton>/g, '</button>');
  src = src.replace(/<HrAddButton([^>]*)>([\s\S]*?)<\/button>/g, '<HrAddButton$1>$2</HrAddButton>');
  src = src.replace(/<HrButton([^>]*)>([\s\S]*?)<\/button>/g, '<HrButton$1>$2</HrButton>');
  if (src !== original) {
    fs.writeFileSync(file, src, 'utf8');
    fixed++;
  }
}
console.log(`Repaired ${fixed} files.`);
