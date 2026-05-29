/**
 * Online Office Desk v2 — opt-in via VITE_OFFICE_DESK_V2=1.
 * Default off so home route uses the stable legacy workspace until explicitly enabled.
 */
export function isOfficeDeskV2Enabled() {
  try {
    const raw = import.meta.env?.VITE_OFFICE_DESK_V2;
    if (raw === '1' || raw === 'true') return true;
    return false;
  } catch {
    return false;
  }
}
