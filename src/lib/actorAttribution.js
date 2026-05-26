import { formatPersonName } from './formatPersonName';

/**
 * Compact "who · when" label for approval / audit rows.
 * @param {string} [name]
 * @param {string} [dateIso]
 * @returns {string | null}
 */
export function formatActorAttribution(name, dateIso) {
  const who = formatPersonName(String(name || '').trim());
  if (!who || who === '—') return null;
  const when = String(dateIso || '').trim();
  if (!when) return who;
  return `${who} · ${when.slice(0, 16).replace('T', ' ')}`;
}

/**
 * @param {{ by?: string; atIso?: string; label?: string } | null | undefined} stage
 * @returns {string | null}
 */
export function formatStageActor(stage) {
  if (!stage) return null;
  const line = formatActorAttribution(stage.by, stage.atIso);
  if (!line) return null;
  return stage.label ? `${stage.label}: ${line}` : line;
}
