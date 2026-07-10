import fs from 'fs';
import path from 'path';

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(js|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = walk('src');
let fixed = 0;

for (const file of files) {
  let src = fs.readFileSync(file, 'utf8');
  const needsPrimary = /\bHR_BTN_PRIMARY\b/.test(src);
  const needsSecondary = /\bHR_BTN_SECONDARY\b/.test(src);
  if (!needsPrimary && !needsSecondary) continue;

  const importNames = [];
  if (needsPrimary && !/import\s*\{[^}]*\bHR_BTN_PRIMARY\b/.test(src)) importNames.push('HR_BTN_PRIMARY');
  if (needsSecondary && !/import\s*\{[^}]*\bHR_BTN_SECONDARY\b/.test(src)) importNames.push('HR_BTN_SECONDARY');
  if (!importNames.length) continue;

  const hrPageUiImport = src.match(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]*hrPageUi)['"]/);
  if (hrPageUiImport) {
    const names = hrPageUiImport[1].split(',').map((s) => s.trim()).filter(Boolean);
    for (const n of importNames) {
      if (!names.includes(n)) names.push(n);
    }
    const replacement = `import { ${names.join(', ')} } from '${hrPageUiImport[2]}'`;
    src = src.replace(hrPageUiImport[0], replacement);
  } else {
    const rel = path.relative(path.dirname(file), path.join('src', 'components', 'hr', 'hrFormStyles')).replace(/\\/g, '/');
    const line = `import { ${importNames.join(', ')} } from '${rel.startsWith('.') ? rel : `./${rel}`}';\n`;
    const importMatch = src.match(/^import .+;\n/m);
    if (importMatch) src = src.replace(importMatch[0], `${importMatch[0]}${line}`);
    else src = `${line}${src}`;
  }

  fs.writeFileSync(file, src);
  fixed += 1;
  console.log('fixed', file);
}

console.log('TOTAL', fixed);
