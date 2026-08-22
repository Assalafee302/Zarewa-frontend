const CHAIRMAN_OFFICE_ROLES = new Set(['chairman', 'md', 'admin']);

/** Chairman Office desk — Chairman, MD, and Admin (CEO stays on Command Centre). */
export function userMayAccessChairmanOfficeClient(roleKey, permissions = []) {
  if (Array.isArray(permissions) && permissions.includes('*')) return true;
  const rk = String(roleKey || '').trim().toLowerCase();
  return CHAIRMAN_OFFICE_ROLES.has(rk);
}
