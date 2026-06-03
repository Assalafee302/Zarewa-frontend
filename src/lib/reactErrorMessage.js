/** @param {unknown} error */
export function humanizeReactError(error) {
  const raw = String(error?.message || error || '');
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
