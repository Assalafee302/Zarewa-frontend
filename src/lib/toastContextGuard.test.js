/**
 * Guards against useToast misuse that crashes at runtime (minified: "s is not a function").
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { cwd } from 'node:process';

/** @param {string} dir @param {string[]} acc */
function walkSource(dir, acc = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'test') continue;
      walkSource(p, acc);
    } else if (/\.(jsx?|tsx?)$/.test(ent.name) && !/\.(test|spec)\.(jsx?|tsx?)$/.test(ent.name)) {
      acc.push(p);
    }
  }
  return acc;
}

describe('ToastContext usage guard', () => {
  it('does not destructure showToast from useToast() — use { show: showToast }', () => {
    const srcDir = join(cwd(), 'src');
    const offenders = [];
    for (const file of walkSource(srcDir)) {
      if (file.includes('ToastContext.jsx')) continue;
      const code = readFileSync(file, 'utf8');
      if (/\{[^}]*\bshowToast\b[^}]*\}\s*=\s*useToast\s*\(\)/.test(code)) {
        offenders.push(file.replace(`${srcDir}\\`, '').replace(`${srcDir}/`, ''));
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('dynamic Lucide icon guard', () => {
  it('does not use lowercase member JSX for dynamic icons (<z.icon />)', () => {
    const srcDir = join(cwd(), 'src');
    const offenders = [];
    for (const file of walkSource(srcDir)) {
      const code = readFileSync(file, 'utf8');
      if (/<[a-z][a-z0-9]*\.icon\b/.test(code)) {
        offenders.push(file.replace(`${srcDir}\\`, '').replace(`${srcDir}/`, ''));
      }
    }
    expect(offenders).toEqual([]);
  });
});
