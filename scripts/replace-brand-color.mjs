import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src');
const CLASS_RE = /([a-z][a-z0-9-]*)-\[#134e4a\](\/[0-9]{1,3})?/g;

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (!['node_modules', 'dist'].includes(ent.name)) walk(p, out);
    } else if (/\.(jsx|js|tsx|ts|css)$/.test(ent.name)) {
      out.push(p);
    }
  }
  return out;
}

let files = 0;
let replacements = 0;

for (const file of walk(ROOT)) {
  let src = fs.readFileSync(file, 'utf8');
  const original = src;

  src = src.replace(CLASS_RE, (match, prefix, opacity) => {
    replacements += 1;
    return `${prefix}-zarewa-teal${opacity || ''}`;
  });

  if (!file.endsWith('index.css')) {
    src = src.replace(/(['"])#134e4a\1/g, '$1var(--color-zarewa-teal)$1');
  }

  if (src !== original) {
    fs.writeFileSync(file, src, 'utf8');
    files += 1;
  }
}

console.log(`Updated ${files} files, ${replacements} class replacements`);
