/**
 * Workspace V3 Feature Flag
 *
 * On by default. Set `VITE_WORKSPACE_V3=0` (or `false`) to fall back to
 * Office Desk V2 / LegacyDashboard. When enabled, `Dashboard.jsx` mounts
 * `WorkspaceShell`.
 *
 * Priority order (first match wins):
 * 1. Workspace V3 (`VITE_WORKSPACE_V3`, default on)
 * 2. Office Desk V2 (`VITE_OFFICE_DESK_V2`)
 * 3. Legacy dashboard
 *
 * EventSource realtime requires cookie session auth with `withCredentials: true`
 * (see `openWorkspaceRealtime` in workspaceV3Api.js).
 */
export function isWorkspaceV3Enabled() {
  try {
    const raw = import.meta.env?.VITE_WORKSPACE_V3;
    if (raw === '0' || raw === 'false') return false;
    if (raw === '1' || raw === 'true') return true;
    // Unset → V3 is the production workspace (Teams-style Chat shell).
    return true;
  } catch {
    return true;
  }
}

/** @returns {boolean} True when env explicitly disables V3 (for dual-path tests). */
export function isWorkspaceV3ExplicitlyDisabled() {
  try {
    const raw = import.meta.env?.VITE_WORKSPACE_V3;
    return raw === '0' || raw === 'false';
  } catch {
    return false;
  }
}
