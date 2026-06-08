/** @param {unknown} error */
export function humanizeReactError(error) {
  const raw = String(error?.message || error || '');
  if (/Failed to fetch dynamically imported module|Loading chunk \d+ failed|Importing a module script failed/i.test(raw)) {
    const url = raw.match(/https?:\/\/[^\s)]+/)?.[0] || '';
    const file = url ? url.split('/').pop() : 'a page script';
    return url
      ? `Missing or outdated app file after deploy (${file}). IT must upload the entire dist/ folder in one step — all assets/* plus index.html from the same build.`
      : 'Missing or outdated app file after deploy. IT must upload the entire dist/ folder in one step — all assets/* plus index.html from the same build.';
  }
  const m = raw.match(/Minified React error #(\d+)/i);
  if (!m) return raw;

  const code = m[1];
  const known = {
    300: 'Rendered fewer hooks than expected. This may be caused by an accidental early return before all hooks run, or by loading a mix of old and new JavaScript files after a deploy.',
    301: 'Rendered more hooks than expected. A component may be calling hooks conditionally.',
    310: 'Rendered more hooks than during the previous render.',
  };
  const detail = known[code];
  return detail ? `${detail} (${raw})` : raw;
}
