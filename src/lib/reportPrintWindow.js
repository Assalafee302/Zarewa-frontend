/**
 * Opens a report rendered by `renderReportDocument` (shared print layout) in its own window and prints it.
 * The page carries its own @page rules (landscape A4, repeating headers, page x of y footer).
 * @returns {boolean} false when the browser blocked the pop-up
 */
export function openReportPrintWindow(html) {
  if (typeof window === 'undefined') return false;
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  w.addEventListener('load', () => w.print(), { once: true });
  return true;
}
