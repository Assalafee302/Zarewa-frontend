import { escapeHtml, openPrintHtmlDocument } from './officeDeskPrint.js';

/**
 * @param {{ filingNo?: string; title?: string; branch?: string; category?: string; filedAtIso?: string }} record
 */
export function buildFiledRecordCertificateHtml(record) {
  const filingNo = escapeHtml(record.filingNo || '—');
  const title = escapeHtml(record.title || 'Office record');
  const branch = escapeHtml(record.branch || '');
  const category = escapeHtml(record.category || '');
  const filed = escapeHtml(record.filedAtIso || new Date().toISOString());
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Filing ${filingNo}</title>
<style>body{font-family:system-ui,sans-serif;padding:2rem;max-width:720px;margin:0 auto}
h1{font-size:1.25rem} .meta{color:#444;font-size:0.9rem;margin-top:1rem}</style></head>
<body><h1>Zarewa — Filed office record</h1>
<p><strong>${title}</strong></p>
<p class="meta">Filing No: <strong>${filingNo}</strong><br/>Branch: ${branch}<br/>Category: ${category}<br/>Filed: ${filed}</p>
</body></html>`;
}

export function printFiledRecordCertificate(record) {
  const html = buildFiledRecordCertificateHtml(record);
  return openPrintHtmlDocument(html, `Filing ${record.filingNo || ''}`);
}
