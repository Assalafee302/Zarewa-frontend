/**
 * Online Office Desk v2 — feature flag (default on after SP12).
 * Set VITE_OFFICE_DESK_V2=0 in .env.local to use legacy Gmail-style workspace.
 */
export function isOfficeDeskV2Enabled() {
  try {
    const raw = import.meta.env?.VITE_OFFICE_DESK_V2;
    if (raw === '0' || raw === 'false') return false;
    if (raw === '1' || raw === 'true') return true;
    // Default on after overhaul completion (SP12).
    return true;
  } catch {
    return true;
  }
}
