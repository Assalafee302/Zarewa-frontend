/**
 * Client-side PDF export from a DOM subtree (quotations, workbook print, etc.).
 * Uses html2canvas on the **live** element (same layout as on-screen preview) + jsPDF — no html2pdf clone step.
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
 * Computed properties to copy onto the html2canvas clone. Copying the full declaration list
 * flattens cascade awkwardly and hurts colours; Tailwind utilities still need resolved layout paint.
 */
const PDF_COMPUTED_PROPS = [
  'print-color-adjust',
  '-webkit-print-color-adjust',
  'color',
  'background-color',
  'background',
  'opacity',
  'visibility',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'font-variant',
  'line-height',
  'letter-spacing',
  'text-align',
  'text-transform',
  'text-indent',
  'white-space',
  'word-break',
  'word-spacing',
  'vertical-align',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-top-style',
  'border-right-style',
  'border-bottom-style',
  'border-left-style',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'border-radius',
  'box-sizing',
  'display',
  'width',
  'height',
  'max-width',
  'min-width',
  'max-height',
  'min-height',
  'flex-direction',
  'flex-wrap',
  'flex-grow',
  'flex-shrink',
  'flex-basis',
  'justify-content',
  'align-items',
  'align-content',
  'align-self',
  'gap',
  'grid-template-columns',
  'grid-template-rows',
  'grid-column',
  'grid-row',
  'justify-items',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'z-index',
  'overflow',
  'overflow-x',
  'overflow-y',
  'border-collapse',
  'border-spacing',
  'box-shadow',
  'text-shadow',
  'background-image',
  'outline-width',
  'outline-style',
  'outline-color',
  'text-decoration',
  'text-decoration-line',
  'text-decoration-color',
  'text-decoration-style',
  'fill',
  'stroke',
  'stroke-width',
];

/**
 * Resolve a computed color value to rgb/rgba using the live document (handles oklch/oklab from Tailwind).
 * @param {string} prop Longhand CSS property name, e.g. `border-top-color`.
 * @param {string} value
 */
function resolveCssColorToRgb(prop, value) {
  const v = String(value || '').trim();
  if (!v || v === 'transparent') return v;
  if (!MODERN_COLOR_FN_RE.test(v)) return v;
  try {
    const probe = document.createElement('span');
    probe.setAttribute('data-pdf-color-probe', '1');
    const safe = String(prop || 'color')
      .toLowerCase()
      .replace(/[^a-z-]/g, '');
    if (!safe) return coerceCssColorForPdf(v);
    probe.style.cssText = `position:fixed;left:-9999px;top:0;visibility:hidden;${safe}:${v}`;
    document.body.appendChild(probe);
    const out = getComputedStyle(probe).getPropertyValue(safe);
    probe.remove();
    if (out && typeof out === 'string' && out.trim() && !MODERN_COLOR_FN_RE.test(out)) return out.trim();
  } catch {
    /* ignore */
  }
  return coerceCssColorForPdf(v);
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
    return resolveCssColorToRgb(p, v);
  }
  return val;
}

/** @param {Element} root */
function stampPdfSyncIds(root) {
  let i = 0;
  /** @param {Element} el */
  const walk = (el) => {
    if (el.nodeType !== Node.ELEMENT_NODE) return;
    el.setAttribute('data-pdf-sync', String(i++));
    const kids = el.children;
    for (let k = 0; k < kids.length; k++) walk(kids[k]);
  };
  walk(root);
}

/** @param {Element} root */
function clearPdfSyncIds(root) {
  if (root.nodeType === Node.ELEMENT_NODE && root.hasAttribute('data-pdf-sync')) {
    root.removeAttribute('data-pdf-sync');
  }
  root.querySelectorAll('[data-pdf-sync]').forEach((el) => el.removeAttribute('data-pdf-sync'));
}

/** @param {Element} root */
function buildPdfSyncNodeMap(root) {
  /** @type {Map<string, Element>} */
  const map = new Map();
  /** @param {Element} el */
  const walk = (el) => {
    if (el.nodeType !== Node.ELEMENT_NODE) return;
    const id = el.getAttribute('data-pdf-sync');
    if (id != null) map.set(id, el);
    const kids = el.children;
    for (let k = 0; k < kids.length; k++) walk(kids[k]);
  };
  walk(root);
  return map;
}

/**
 * html2canvas cannot parse Tailwind v4 / CSS Color 4 `oklab()` in linked stylesheets.
 * Strip author styles on the clone, then copy resolved computed styles from the live DOM using stable sync ids.
 *
 * @param {Document} clonedDoc
 * @param {HTMLElement} clonedRoot
 * @param {HTMLElement} liveSourceRoot
 */
function neutralizeOklabStylesForHtml2Canvas(clonedDoc, clonedRoot, liveSourceRoot) {
  const liveWorkbook =
    liveSourceRoot.id === 'workbook-print-root'
      ? liveSourceRoot
      : liveSourceRoot.querySelector?.('#workbook-print-root') || liveSourceRoot;

  const clonedWorkbook =
    clonedDoc.getElementById('workbook-print-root') ||
    (clonedRoot?.querySelector?.('#workbook-print-root') ?? clonedRoot);

  clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach((n) => n.remove());
  /** Drop global/theme styles only — keep embedded style blocks inside the print subtree (letterhead, print tweaks). */
  clonedDoc.querySelectorAll('style').forEach((n) => {
    if (clonedWorkbook instanceof HTMLElement && clonedWorkbook.contains(n)) return;
    n.remove();
  });

  const liveMap = buildPdfSyncNodeMap(liveWorkbook);
  const cloneMap = buildPdfSyncNodeMap(clonedWorkbook);

  for (const [id, live] of liveMap) {
    const clone = cloneMap.get(id);
    if (!clone || live.nodeType !== Node.ELEMENT_NODE || clone.nodeType !== Node.ELEMENT_NODE) continue;
    try {
      const cs = getComputedStyle(live);
      for (const prop of PDF_COMPUTED_PROPS) {
        let val = cs.getPropertyValue(prop);
        if (!val) continue;
        if (prop === 'background' && MODERN_COLOR_FN_RE.test(val)) {
          val = resolveCssColorToRgb('background-color', cs.getPropertyValue('background-color'));
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

/** Convert layout px → mm (CSS reference pixel ~ 1/96 inch). */
function pxToMm(px) {
  return (Number(px) || 0) * (25.4 / 96);
}

/**
 * PDF page width (mm) from the element’s laid-out width on screen.
 * @param {HTMLElement} el
 */
function pdfPageWidthMmFromElement(el) {
  const rect = el.getBoundingClientRect?.();
  const px = Math.max(1, el.scrollWidth, el.offsetWidth, rect?.width || 0);
  const mm = Math.ceil(pxToMm(px) + 0.5);
  return Math.min(420, Math.max(148, mm));
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {number} pageWidthMm
 * @param {number} pageHeightMm
 */
async function canvasToPagedPdfBlob(canvas, pageWidthMm, pageHeightMm) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    unit: 'mm',
    format: [pageWidthMm, pageHeightMm],
    orientation: 'portrait',
  });
  let imgData;
  try {
    imgData = canvas.toDataURL('image/png');
  } catch {
    throw new Error(
      'Could not rasterize preview to an image (blocked image data). Try Print and Save as PDF instead.'
    );
  }
  const imgWidthMm = pageWidthMm;
  const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;
  let positionMm = 0;
  let heightLeftMm = imgHeightMm;
  doc.addImage(imgData, 'PNG', 0, positionMm, imgWidthMm, imgHeightMm);
  heightLeftMm -= pageHeightMm;
  while (heightLeftMm > 0) {
    positionMm -= pageHeightMm;
    doc.addPage([pageWidthMm, pageHeightMm], 'portrait');
    doc.addImage(imgData, 'PNG', 0, positionMm, imgWidthMm, imgHeightMm);
    heightLeftMm -= pageHeightMm;
  }
  return doc.output('blob');
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
 * @param {HTMLElement} element Root node exactly as shown in the UI (not a detached clone).
 */
export async function exportElementToPdfBlob(element) {
  if (!element || !(element instanceof HTMLElement)) {
    throw new Error('PDF export requires a visible HTML element.');
  }

  const pageWidthMm = pdfPageWidthMmFromElement(element);
  const pageHeightMm = 297;

  stampPdfSyncIds(element);
  try {
    const { default: html2canvas } = await import('html2canvas');

    const w = Math.max(1, element.scrollWidth);
    const h = Math.max(1, element.scrollHeight);
    const maxCanvasPx = 8192;
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

    let lastErr;
    for (const scale of scales) {
      try {
        const canvas = await html2canvas(element, {
          scale,
          useCORS: true,
          allowTaint: false,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: w,
          windowHeight: h,
          scrollX: 0,
          scrollY: 0,
          onclone(clonedDoc, cloneEl) {
            neutralizeOklabStylesForHtml2Canvas(clonedDoc, cloneEl, element);
          },
        });
        return await canvasToPagedPdfBlob(canvas, pageWidthMm, pageHeightMm);
      } catch (e) {
        lastErr = e;
      }
    }

    const raw = String(lastErr?.message || lastErr || 'unknown');
    const msg = raw.length > 220 ? `${raw.slice(0, 220)}…` : raw;
    throw new Error(`PDF export failed (${msg})`);
  } finally {
    clearPdfSyncIds(element);
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
  const tryAnyway = Boolean(meta.tryAnywayIfCannotShare);
  if (typeof navigator.canShare === 'function' && !navigator.canShare({ files: [file] })) {
    if (!tryAnyway) return { ok: false, reason: 'cannot-share-files' };
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
