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
  if (/\bis not a function\b/i.test(raw)) {
    return `${raw} — often a stale app-shell JavaScript file after deploy (browser cached an older assets/* bundle). Hard refresh (Ctrl+Shift+R). IT must replace the entire dist/ folder atomically and set Cache-Control: no-cache on index.html.`;
  }
  if (/Cannot access .+ before initialization/i.test(raw)) {
    return `${raw} — usually a mismatched JavaScript bundle after deploy (old cached assets/* with new index.html). Hard refresh (Ctrl+Shift+R). IT must upload the entire dist/ folder in one step.`;
  }

  const m = raw.match(/Minified React error #(\d+)/i);
  if (!m) return raw;

  const code = m[1];
  const known = {
    185: 'Maximum update depth exceeded — an infinite render loop (often an effect that updates state when a callback dependency is recreated every render). Hard refresh; if it persists after deploy, report the build id to IT.',
    300: 'Rendered fewer hooks than expected. This may be caused by an accidental early return before all hooks run, or by loading a mix of old and new JavaScript files after a deploy.',
    301: 'Rendered more hooks than expected. A component may be calling hooks conditionally.',
    310: 'Rendered more hooks than during the previous render.',
  };
  const detail = known[code];
  return detail ? `${detail} (${raw})` : raw;
}
