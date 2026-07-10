/**
 * One-off migration: replace plain loading paragraphs with InlineLoader.
 * Run: node scripts/migrate-inline-loaders.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

const LOADER_IMPORT = "import { InlineLoader } from '../components/ui/PageLoader';";
const LOADER_IMPORT_DEPTH2 = "import { InlineLoader } from '../../components/ui/PageLoader';";
const LOADER_IMPORT_DEPTH3 = "import { InlineLoader } from '../../../components/ui/PageLoader';";

function depthFromSrc(filePath) {
  const rel = path.relative(root, filePath).replace(/\\/g, '/');
  const parts = rel.split('/');
  return parts.length - 1; // filename doesn't count for ../
}

function loaderImportFor(filePath) {
  const rel = path.relative(root, filePath).replace(/\\/g, '/');
  if (rel.startsWith('pages/hr/')) return LOADER_IMPORT_DEPTH2;
  if (rel.startsWith('components/hr/')) return LOADER_IMPORT_DEPTH2;
  if (rel.startsWith('pages/')) return LOADER_IMPORT_DEPTH2;
  return LOADER_IMPORT;
}

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

const patterns = [
  {
    re: /<p className="text-sm text-slate-600">(Loading[^<]*)<\/p>/g,
    replace: (m, msg) => `<InlineLoader message="${msg}" />`,
  },
  {
    re: /<Suspense fallback=\{<p className="text-sm text-slate-600">(Loading[^<]*)<\/p>\}>/g,
    replace: (m, msg) => `<Suspense fallback={<InlineLoader message="${msg}" />}>`,
  },
  {
    re: /return <p className="text-sm text-slate-600">(Loading[^<]*)<\/p>;/g,
    replace: (m, msg) => `return <InlineLoader message="${msg}" />;`,
  },
  {
    re: /\{loading \? <p className="text-sm text-slate-600">(Loading[^<]*)<\/p> : null\}/g,
    replace: (m, msg) => `{loading ? <InlineLoader message="${msg}" /> : null}`,
  },
  {
    re: /\{loading && <p className="text-sm text-slate-600">(Loading[^<]*)<\/p>\}/g,
    replace: (m, msg) => `{loading && <InlineLoader message="${msg}" />}`,
  },
  {
    re: /\{loading && events\.length === 0 \? <p className="text-sm text-slate-600">Loading…<\/p> : null\}/g,
    replace: () => `{loading && events.length === 0 ? <InlineLoader message="Loading…" /> : null}`,
  },
  {
    re: /\{loading && !chart\.total \? <p className="text-sm text-slate-600">Loading organogram…<\/p> : null\}/g,
    replace: () => `{loading && !chart.total ? <InlineLoader message="Loading organogram…" /> : null}`,
  },
  {
    re: /\{loading && !rows\.length \? <p className="text-sm text-slate-600">(Loading[^<]*)<\/p> : null\}/g,
    replace: (m, msg) => `{loading && !rows.length ? <InlineLoader message="${msg}" /> : null}`,
  },
  {
    re: /\{loading && !clearances\.length \? <p className="text-sm text-slate-600">Loading…<\/p> :/g,
    replace: () => `{loading && !clearances.length ? <InlineLoader message="Loading…" /> :`,
  },
  {
    re: /\{loading && staff\.length === 0 \? <p className="text-sm text-slate-600">Loading…<\/p> : null\}/g,
    replace: () => `{loading && staff.length === 0 ? <InlineLoader message="Loading…" /> : null}`,
  },
  {
    re: /if \(loading\) return <p className="text-sm text-slate-600">(Loading[^<]*)<\/p>;/g,
    replace: (m, msg) => `if (loading) return <InlineLoader message="${msg}" />;`,
  },
  {
    re: /if \(loading && !staff\) return <p className="text-sm text-slate-600">(Loading[^<]*)<\/p>;/g,
    replace: (m, msg) => `if (loading && !staff) return <InlineLoader message="${msg}" variant="inline" className="min-h-[50vh]" />;`,
  },
];

let changed = 0;
for (const file of walk(root)) {
  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes('text-slate-600">Loading')) continue;

  let next = src;
  for (const { re, replace } of patterns) {
    next = next.replace(re, replace);
  }
  if (next === src) continue;

  const imp = loaderImportFor(file);
  if (!next.includes('InlineLoader')) continue;
  if (!next.includes(imp.split("'")[1])) {
    const importMatch = next.match(/^import .+;\n/m);
    if (importMatch) {
      const idx = next.indexOf(importMatch[0]) + importMatch[0].length;
      next = next.slice(0, idx) + imp + '\n' + next.slice(idx);
    } else {
      next = imp + '\n' + next;
    }
  }

  fs.writeFileSync(file, next, 'utf8');
  changed++;
  console.log('updated:', path.relative(root, file));
}

console.log(`\nDone. ${changed} files updated.`);
