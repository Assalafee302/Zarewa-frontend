/**
 * Client-side PDF export from a DOM subtree (quotation / receipt print roots).
 * Uses html2pdf.js (html2canvas + jsPDF) — loaded on demand to keep initial bundle smaller.
 */

/** Modern color spaces in computed values break html2canvas’s CSS parser. */
const MODERN_COLOR_FN_RE = /(oklab|oklch|color\(|lab\(|lch\()/i;

/**
 * Best-effort: resolve a color string to something html2canvas accepts (usually rgb/rgba).
 * @param {string} value
 */
function coerceCssColorForPdf(value) {
  const v = String(value || '').trim();
  if (!v || v === 'transparent') return v;
  if (!MODERN_COLOR_FN_RE.test(v)) return v;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '#000000';
    ctx.fillStyle = '#000';
    ctx.fillStyle = v;
    const out = ctx.fillStyle;
    if (typeof out === 'string' && out && !MODERN_COLOR_FN_RE.test(out)) return out;
  } catch {
    /* ignore */
  }
  return '#000000';
}

/**
 * @param {string} prop
 * @param {string} val
 */
function sanitizeComputedValueForPdf(prop, val) {
  const v = String(val ?? '');
  if (!v || !MODERN_COLOR_FN_RE.test(v)) return val;
  const p = String(prop || '').toLowerCase();
  if (p === 'filter' || p === 'backdrop-filter') return 'none';
  if (p.includes('shadow')) return 'none';
  if (p === 'background-image') return 'none';
  if (p === 'border-image-source') return 'none';
  if (
    p === 'color' ||
    p.endsWith('-color') ||
    p === 'fill' ||
    p === 'stroke' ||
    p === 'caret-color' ||
    p === 'flood-color' ||
    p === 'lighting-color' ||
    p === 'stop-color'
  ) {
    return coerceCssColorForPdf(v);
  }
  return val;
}

/**
 * html2canvas cannot parse Tailwind v4 / CSS Color 4 `oklab()` in linked stylesheets.
 * Remove author styles on the cloned iframe document and copy resolved computed styles from the live DOM.
 *
 * @param {Document} clonedDoc
 * @param {HTMLElement} clonedRoot html2canvas root (e.g. html2pdf container wrapping the clone)
 * @param {HTMLElement} liveSourceRoot element passed to html2pdf `.from()` — still attached in the real document
 */
function neutralizeOklabStylesForHtml2Canvas(clonedDoc, clonedRoot, liveSourceRoot) {
  clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach((n) => n.remove());
  clonedDoc.querySelectorAll('style').forEach((n) => n.remove());

  const liveWorkbook =
    liveSourceRoot.id === 'workbook-print-root'
      ? liveSourceRoot
      : liveSourceRoot.querySelector?.('#workbook-print-root') || liveSourceRoot;

  const clonedWorkbook =
    clonedRoot.id === 'workbook-print-root'
      ? clonedRoot
      : clonedDoc.getElementById('workbook-print-root') ||
        clonedRoot.querySelector('#workbook-print-root') ||
        clonedRoot.firstElementChild ||
        clonedRoot;

  const liveNodes = [liveWorkbook, ...liveWorkbook.querySelectorAll('*')];
  const clonedNodes = [clonedWorkbook, ...clonedWorkbook.querySelectorAll('*')];
  const n = Math.min(liveNodes.length, clonedNodes.length);

  for (let i = 0; i < n; i++) {
    const live = liveNodes[i];
    const clone = clonedNodes[i];
    if (live.nodeType !== Node.ELEMENT_NODE || clone.nodeType !== Node.ELEMENT_NODE) continue;
    try {
      const cs = getComputedStyle(live);
      for (let j = 0; j < cs.length; j++) {
        const prop = cs.item(j);
        let val = cs.getPropertyValue(prop);
        if (prop === 'background' && MODERN_COLOR_FN_RE.test(val)) {
          val = coerceCssColorForPdf(cs.getPropertyValue('background-color'));
        } else {
          val = sanitizeComputedValueForPdf(prop, val);
        }
        try {
          clone.style.setProperty(prop, val, cs.getPropertyPriority(prop));
        } catch {
          /* invalid combination for this element */
        }
      }
    } catch {
      /* ignore per-node */
    }
  }
}

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
  const mod = await import('html2pdf.js');
  const html2pdf = mod.default ?? mod;
  if (typeof html2pdf !== 'function') {
    throw new Error('PDF library did not load (html2pdf.js).');
  }

  const maxCanvasPx = 8192;
  const h = Math.max(1, element.scrollHeight || 1);
  const w = Math.max(1, element.scrollWidth || 1);
  /**
   * html2canvas output is roughly (w × scale) by (h × scale) px — both sides must stay under the
   * browser canvas limit. Using max(h,w) was wrong and produced oversized canvases on tall quotes.
   */
  const scaleFor = (desired) => {
    const cap = Math.min(maxCanvasPx / w, maxCanvasPx / h);
    return Math.min(desired, Math.max(0.35, Math.floor(cap * 100) / 100));
  };

  const scaleCandidates = [
    scaleFor(2),
    scaleFor(1.5),
    scaleFor(1),
    scaleFor(0.75),
    scaleFor(0.5),
    scaleFor(0.35),
  ];
  const scales = [...new Set(scaleCandidates.filter((s) => s >= 0.35))].sort((a, b) => b - a);

  const buildOpt = (scale) => ({
    margin: [6, 6, 6, 6],
    filename: filenameHint,
    image: { type: 'jpeg', quality: 0.88 },
    enableLinks: false,
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
      backgroundColor: '#ffffff',
      onclone(clonedDoc, clonedRoot) {
        neutralizeOklabStylesForHtml2Canvas(clonedDoc, clonedRoot, element);
      },
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['legacy'] },
  });

  let lastErr;
  for (const scale of scales) {
    try {
      return await html2pdf().set(buildOpt(scale)).from(element).outputPdf('blob');
    } catch (e) {
      lastErr = e;
    }
  }

  const raw = String(lastErr?.message || lastErr || 'unknown');
  const msg = raw.length > 220 ? `${raw.slice(0, 220)}…` : raw;
  throw new Error(`PDF export failed (${msg})`);
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
