export function clearHrSensitiveUnlock() {
  /* legacy sessionStorage key — best-effort clear for older sessions */
  try {
    sessionStorage.removeItem('zarewa_hr_sensitive_unlock');
  } catch {
    /* ignore */
  }
}
