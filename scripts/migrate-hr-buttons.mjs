/**
 * One-off migration: replace HR_BTN_* class strings with HrButton / HrAddButton.
 * Run: node scripts/migrate-hr-buttons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue;
      walk(full, out);
    } else if (/\.(jsx|js)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

function hrPageUiImportFor(filePath) {
  const rel = path.relative(root, filePath).replace(/\\/g, '/');
  const depth = rel.split('/').length - 1;
  return `${'../'.repeat(depth)}components/hr/hrPageUi`;
}

function patchImports(src, filePath) {
  if (!src.includes('HR_BTN_')) return src;
  const needsHrButton = /HR_BTN_(PRIMARY|SECONDARY|ADD)/.test(src);
  if (!needsHrButton) return src;

  const impPath = hrPageUiImportFor(filePath);
  const importLine = `import { HrButton, HrAddButton } from '${impPath}';`;

  if (src.includes("from './hrPageUi'") || src.includes('from "./hrPageUi"')) {
    if (!src.includes('HrButton')) {
      src = src.replace(
        /import \{([^}]+)\} from ['"]\.\/hrPageUi['"];/,
        (m, names) => {
          const parts = names.split(',').map((s) => s.trim()).filter(Boolean);
          if (!parts.includes('HrButton')) parts.push('HrButton', 'HrAddButton');
          return `import { ${parts.join(', ')} } from './hrPageUi';`;
        }
      );
    }
    return src;
  }

  if (src.includes("from '../../components/hr/hrPageUi'")) {
    if (!src.includes('HrButton')) {
      src = src.replace(
        /import \{([^}]+)\} from ['"]\.\.\/\.\.\/components\/hr\/hrPageUi['"];/,
        (m, names) => {
          const parts = names.split(',').map((s) => s.trim()).filter(Boolean);
          if (!parts.includes('HrButton')) parts.push('HrButton', 'HrAddButton');
          return `import { ${[...new Set(parts)].join(', ')} } from '../../components/hr/hrPageUi';`;
        }
      );
    }
    return src;
  }

  if (!src.includes('HrButton')) {
    const firstImport = src.match(/^import .+;\n/m);
    if (firstImport) {
      const idx = src.indexOf(firstImport[0]) + firstImport[0].length;
      src = src.slice(0, idx) + importLine + '\n' + src.slice(idx);
    } else {
      src = importLine + '\n' + src;
    }
  }
  return src;
}

function patchButtons(src) {
  let next = src;

  // HrAddButton
  next = next.replace(/<button(\s[^>]*)?className=\{HR_BTN_ADD\}/g, '<HrAddButton$1');
  next = next.replace(/<\/button>/g, (match, offset, full) => {
    // only close HrAddButton if we're inside a block that opened HrAddButton - simplified: track in second pass
    return match;
  });

  // Simple single-line patterns
  next = next.replace(
    /<button type="(button|submit)" className=\{HR_BTN_SECONDARY\}([^>]*)>/g,
    '<HrButton type="$1" variant="secondary"$2>'
  );
  next = next.replace(
    /<button type="(button|submit)" className=\{HR_BTN_PRIMARY\}([^>]*)>/g,
    '<HrButton type="$1"$2>'
  );
  next = next.replace(/<button className=\{HR_BTN_SECONDARY\}([^>]*)>/g, '<HrButton variant="secondary"$1>');
  next = next.replace(/<button className=\{HR_BTN_PRIMARY\}([^>]*)>/g, '<HrButton$1>');

  // className after other attrs
  next = next.replace(
    /<button([^>]*?)className=\{HR_BTN_SECONDARY\}([^>]*)>/g,
    '<HrButton$1variant="secondary"$2>'
  );
  next = next.replace(
    /<button([^>]*?)className=\{HR_BTN_PRIMARY\}([^>]*)>/g,
    '<HrButton$1$2>'
  );
  next = next.replace(
    /<button([^>]*?)className=\{HR_BTN_ADD\}([^>]*)>/g,
    '<HrAddButton$1$2>'
  );

  // Close tags — replace </button> following HrButton/HrAddButton open tags naively
  next = next.replace(/<HrAddButton([^>]*)>([\s\S]*?)<\/button>/g, '<HrAddButton$1>$2</HrAddButton>');
  next = next.replace(/<HrButton([^>]*)>([\s\S]*?)<\/button>/g, '<HrButton$1>$2</HrButton>');

  // Clean imports of unused HR_BTN
  next = next.replace(/,\s*HR_BTN_PRIMARY/g, '');
  next = next.replace(/,\s*HR_BTN_SECONDARY/g, '');
  next = next.replace(/,\s*HR_BTN_ADD/g, '');
  next = next.replace(/HR_BTN_PRIMARY,\s*/g, '');
  next = next.replace(/HR_BTN_SECONDARY,\s*/g, '');
  next = next.replace(/HR_BTN_ADD,\s*/g, '');
  next = next.replace(/import \{\s*\} from ['"]\.\/hrFormStyles['"];\n/g, '');

  return next;
}

let changed = 0;
for (const file of walk(root)) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  if (rel === 'components/hr/hrFormStyles.js' || rel === 'components/hr/hrPageUi.jsx') continue;
  if (!fs.readFileSync(file, 'utf8').includes('HR_BTN_')) continue;

  let src = fs.readFileSync(file, 'utf8');
  const original = src;
  src = patchImports(src, file);
  src = patchButtons(src);
  if (src === original) continue;
  fs.writeFileSync(file, src, 'utf8');
  changed++;
  console.log('updated:', rel);
}

console.log(`\nDone. ${changed} files updated.`);
