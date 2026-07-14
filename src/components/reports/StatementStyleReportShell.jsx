import React from 'react';

/**
 * Plain print layout matching Finance → treasury account statement preview/print:
 * Arial, H1 title, meta lines, then content (usually a bordered data table).
 * No letterhead, logo, watermark, or card chrome.
 */
export function StatementStyleReportShell({
  title,
  metaLines = [],
  children,
  layout = 'portrait',
  className = '',
}) {
  const maxW = layout === 'landscape' ? 'max-w-[297mm]' : 'max-w-[210mm]';

  return (
    <div
      className={`statement-style-report mx-auto w-full ${maxW} bg-white px-6 py-6 font-[Arial,Helvetica,sans-serif] text-slate-900 print:max-w-none print:px-0 print:py-0 ${className}`}
      style={{ color: '#0f172a' }}
    >
      <h1 className="m-0 mb-2 text-[20px] font-bold leading-tight">{title}</h1>
      {metaLines
        .filter((line) => line && (line.label != null || line.value != null || typeof line === 'string'))
        .map((line, idx) => {
          if (typeof line === 'string') {
            return (
              <p key={idx} className="m-0 mb-1 text-[12px] text-slate-700" style={{ color: '#334155' }}>
                {line}
              </p>
            );
          }
          const { label, value } = line;
          if (!label && (value == null || value === '')) return null;
          return (
            <p key={idx} className="m-0 mb-1 text-[12px]" style={{ color: '#334155' }}>
              {label ? (
                <>
                  <strong>{label}:</strong> {value != null && value !== '' ? value : '—'}
                </>
              ) : (
                value
              )}
            </p>
          );
        })}
      <div className="mt-4">{children}</div>
    </div>
  );
}

/** Table classes aligned with finance account statement HTML print. */
export const STATEMENT_TBL = 'w-full border-collapse text-[11px] mt-0';
export const STATEMENT_TH =
  'border border-slate-300 bg-slate-50 px-[5px] py-[3px] text-left font-bold align-top leading-tight';
export const STATEMENT_TD =
  'border border-slate-300 px-[5px] py-[3px] align-top leading-tight text-slate-800';
export const STATEMENT_TD_NUM =
  'border border-slate-300 px-[5px] py-[3px] align-top leading-tight text-right whitespace-nowrap tabular-nums text-[10px]';
export const STATEMENT_TF =
  'border border-slate-300 bg-slate-100 px-[5px] py-1 align-middle font-bold text-slate-800';
export const STATEMENT_TF_NUM =
  'border border-slate-300 bg-slate-100 px-[5px] py-1 align-middle font-bold text-right whitespace-nowrap tabular-nums text-[10px]';
export const STATEMENT_H3 = 'mb-2 mt-0 text-[13px] font-bold text-slate-900';
export const STATEMENT_SUB = 'mb-1 text-[11px] font-bold text-slate-800';
