import { escapeHtml, openPrintHtmlDocument } from './officeDeskPrint.js';

export function printOfficialNotice(notice) {
  const title = escapeHtml(notice?.title || 'Official notice');
  const content = escapeHtml(notice?.content || '').replace(/\n/g, '<br/>');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;padding:2rem;max-width:720px;margin:0 auto;line-height:1.5}</style></head>
<body><h1>${title}</h1><div>${content}</div></body></html>`;
  return openPrintHtmlDocument(html, title);
}
