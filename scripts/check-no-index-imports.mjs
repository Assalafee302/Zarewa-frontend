import { readFileSync, readdirSync } from 'fs';

const assets = readdirSync('dist/assets');
const indexFile = assets.find((f) => f.startsWith('index-') && f.endsWith('.js'));
const shellFile = assets.find((f) => f.startsWith('app-shell-') && f.endsWith('.js'));
const index = readFileSync(`dist/assets/${indexFile}`, 'utf8');

const importingIndex = [];
const importingShell = [];

for (const f of assets.filter((x) => x.endsWith('.js') && x !== indexFile && x !== shellFile)) {
  const c = readFileSync(`dist/assets/${f}`, 'utf8');
  if (indexFile && c.includes(`./${indexFile.replace('.js', '')}`)) {
    importingIndex.push(f);
  }
  if (shellFile && c.includes(`./${shellFile.replace('.js', '')}`)) {
    importingShell.push(f);
  }
}

console.log(
  JSON.stringify(
    {
      indexFile,
      indexSize: index.length,
      shellFile,
      shellSize: shellFile ? readFileSync(`dist/assets/${shellFile}`, 'utf8').length : 0,
      lazyChunksImportingIndex: importingIndex.length,
      lazyChunksImportingIndexSample: importingIndex.slice(0, 5),
      lazyChunksImportingShell: importingShell.length,
      lazyChunksImportingShellSample: importingShell.slice(0, 8),
    },
    null,
    2
  )
);

if (importingIndex.length > 0) {
  console.error('FAIL: lazy chunks still import entry index');
  process.exit(1);
}

const lucideVendor = assets.find((f) => f.startsWith('vendor-lucide-') && f.endsWith('.js'));
if (lucideVendor && shellFile) {
  const c = readFileSync(`dist/assets/${lucideVendor}`, 'utf8');
  if (c.includes(`./${shellFile.replace('.js', '')}`)) {
    console.error('FAIL: vendor-lucide imports app-shell (lucide Q TDZ)');
    process.exit(1);
  }
}

const lucideMicro = assets.filter((f) => {
  if (!f.endsWith('.js') || f === indexFile || f === shellFile) return false;
  const c = readFileSync(`dist/assets/${f}`, 'utf8');
  return (
    shellFile &&
    c.length < 800 &&
    c.includes(`./${shellFile.replace('.js', '')}`) &&
    /var \w=\w\(`[a-z0-9-]+`/i.test(c)
  );
});
if (lucideMicro.length > 0) {
  console.error('FAIL: lucide split into micro-chunks importing app-shell:', lucideMicro.slice(0, 5));
  process.exit(1);
}
