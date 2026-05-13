/**
 * Client-side PDF export from a DOM subtree (quotation / receipt print roots).
 * Uses html2pdf.js (html2canvas + jsPDF) — loaded on demand to keep initial bundle smaller.
 */

/** Strip characters unsafe in Windows / macOS filenames. */
export function sanitizePdfFilenameBase(raw, maxLen = 72) {
  const unsafe = new Set('<>:"/\\|?*');
  const stripped = String(raw ?? '')
    .split('')
    .filter((ch) => {
      const code = ch.codePointAt(0);
      if (code == null) return false;
      if (code < 32 || code === 127) return false;
      if (unsafe.has(ch)) return false;
      return true;
    })
    .join('');
  const s = stripped
    .trim()
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

  const maxCanvasPx = 8192;
  const h = Math.max(1, element.scrollHeight || 1);
  const w = Math.max(1, element.scrollWidth || 1);
  /** html2canvas × scale must stay under browser canvas limits (tall print roots often fail at scale 2). */
  const scaleFor = (base) =>
    Math.min(base, Math.max(0.5, Math.floor((maxCanvasPx / Math.max(h, w)) * 100) / 100));

  const buildOpt = (scale) => ({
    margin: [6, 6, 6, 6],
    filename: filenameHint,
    image: { type: 'jpeg', quality: 0.92 },
    html2canvas: {
      scale,
      useCORS: true,
      allowTaint: false,
      logging: false,
      letterRendering: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: w,
      windowHeight: h,
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['legacy'] },
  });

  const run = (scale) =>
    html2pdf().set(buildOpt(scale)).from(element).outputPdf('blob');

  try {
    return await run(scaleFor(2));
  } catch (e1) {
    try {
      return await run(scaleFor(1));
    } catch (e2) {
      const msg = String(e2?.message || e2 || e1?.message || e1 || 'unknown');
      throw new Error(`PDF export failed (${msg})`);
    }
  }
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
