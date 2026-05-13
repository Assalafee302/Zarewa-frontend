/**
 * Client-side PDF export from a DOM subtree (quotation / receipt print roots).
 * Uses html2pdf.js (html2canvas + jsPDF) — loaded on demand to keep initial bundle smaller.
 */

/** Strip characters unsafe in Windows / macOS filenames. */
export function sanitizePdfFilenameBase(raw, maxLen = 72) {
  const s = String(raw ?? '')
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\.+$/g, '')
    .slice(0, maxLen)
    .trim();
  return s || 'Project';
}

/**
 * @param {string} projectName
 * @param {'quotation' | 'invoice' | 'receipt'} documentKind
 * @param {string} [quotationId]
 */
export function buildQuotationPdfFilename(projectName, documentKind, quotationId = '') {
  const proj = sanitizePdfFilenameBase(projectName);
  const kind =
    documentKind === 'invoice' ? 'Invoice' : documentKind === 'receipt' ? 'Receipt' : 'Quotation';
  const id = sanitizePdfFilenameBase(String(quotationId || 'draft').replace(/\s+/g, '-'), 36);
  return `${proj}-${kind}-${id}.pdf`;
}

/**
 * @param {HTMLElement} element
 * @param {string} filenameHint Used by html2pdf for internal save fallback; blob uses same logical name from caller.
 */
export async function exportElementToPdfBlob(element, filenameHint = 'document.pdf') {
  const html2pdf = (await import('html2pdf.js')).default;
  const opt = {
    margin: [6, 6, 6, 6],
    filename: filenameHint,
    image: { type: 'jpeg', quality: 0.92 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      letterRendering: true,
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] },
  };
  return html2pdf().set(opt).from(element).outputPdf('blob');
}

export function downloadPdfBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * @param {Blob} blob
 * @param {string} filename
 * @param {{ title?: string; text?: string }} [meta]
 */
export async function sharePdfFileIfSupported(blob, filename, meta = {}) {
  const file = new File([blob], filename, { type: 'application/pdf' });
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return { ok: false, reason: 'no-share' };
  }
  if (typeof navigator.canShare === 'function' && !navigator.canShare({ files: [file] })) {
    return { ok: false, reason: 'cannot-share-files' };
  }
  try {
    await navigator.share({
      files: [file],
      title: meta.title ?? filename,
      text: meta.text ?? '',
    });
    return { ok: true };
  } catch (e) {
    if (String(e?.name || '') === 'AbortError') return { ok: false, reason: 'aborted' };
    return { ok: false, reason: 'share-failed', error: e };
  }
}
