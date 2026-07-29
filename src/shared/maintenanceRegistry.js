/**
 * Maintenance vendor + technician specialty constants (mirror of backend shared/maintenanceRegistry.js).
 */

export const MAINTENANCE_SPECIALTIES = Object.freeze([
  'electrical',
  'mechanical',
  'hydraulics',
  'generator',
  'general',
]);

export const MAINTENANCE_SPECIALTY_LABELS = Object.freeze({
  electrical: 'Electrical',
  mechanical: 'Mechanical',
  hydraulics: 'Hydraulics',
  generator: 'Generator',
  general: 'General',
});

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeMaintenanceSpecialty(raw) {
  const s = String(raw || '')
    .trim()
    .toLowerCase();
  if (MAINTENANCE_SPECIALTIES.includes(s)) return s;
  return 'general';
}

/** Roles that may create/edit maintenance vendors. */
export function userMayEditMaintenanceVendors(roleKey) {
  const rk = String(roleKey || '')
    .trim()
    .toLowerCase();
  return rk === 'sales_manager' || rk === 'branch_manager' || rk === 'md' || rk === 'admin';
}

/** Ops / BM / exec may list vendors (ops read-only in UI). */
export function userMayViewMaintenanceVendors(roleKey, permissions = []) {
  if (userMayEditMaintenanceVendors(roleKey)) return true;
  const rk = String(roleKey || '')
    .trim()
    .toLowerCase();
  if (rk === 'operations_officer' || rk === 'ceo' || rk === 'chairman') return true;
  const perms = Array.isArray(permissions) ? permissions : [];
  return perms.includes('operations.view') || perms.includes('operations.manage') || perms.includes('*');
}
