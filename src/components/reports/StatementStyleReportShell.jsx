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
  layout = 'landscape',
  className = '',
}) {
  const maxW = layout === 'portrait' ? 'max-w-[210mm]' : 'max-w-[297mm]';

  return (
    <div
      className={`statement-style-report mx-auto w-full ${maxW} bg-white px-6 py-6 font-[Arial,Helvetica,sans-serif] text-slate-900 print:max-w-none print:px-0 print:py-0 ${className}`}
      style={{ color: '#0f172a' }}
    >
      <h1 className="m-0 mb-1.5 text-[18px] font-bold leading-tight tracking-tight">{title}</h1>
      {metaLines
        .filter((line) => line && (line.label != null || line.value != null || typeof line === 'string'))
        .map((line, idx) => {
          if (typeof line === 'string') {
            return (
              <p
                key={idx}
                title={line}
                className="m-0 mb-0.5 max-w-full truncate text-[11px] text-slate-700"
                style={{ color: '#334155' }}
              >
                {line}
              </p>
            );
          }
          const { label, value } = line;
          if (!label && (value == null || value === '')) return null;
          const display = value != null && value !== '' ? String(value) : '—';
          const full = label ? `${label}: ${display}` : display;
          return (
            <p
              key={idx}
              title={full}
              className="m-0 mb-0.5 max-w-full truncate text-[11px]"
              style={{ color: '#334155' }}
            >
              {label ? (
                <>
                  <strong>{label}:</strong> {display}
                </>
              ) : (
                display
              )}
            </p>
          );
        })}
      <div className="mt-3">{children}</div>
    </div>
  );
}

/** Compact statement table cells — one equal-height line; long text ellipsizes. */
export const STATEMENT_TBL =
  'statement-dense-table w-full border-collapse table-fixed text-[10px] mt-0';
export const STATEMENT_TH =
  'border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-left font-bold align-middle leading-none whitespace-nowrap overflow-hidden text-ellipsis';
export const STATEMENT_TD =
  'border border-slate-300 px-1.5 py-0.5 align-middle leading-none text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis';
export const STATEMENT_TD_NUM =
  'border border-slate-300 px-1.5 py-0.5 align-middle leading-none text-right whitespace-nowrap overflow-hidden text-ellipsis tabular-nums text-[9.5px]';
export const STATEMENT_TF =
  'border border-slate-300 bg-slate-100 px-1.5 py-0.5 align-middle font-bold text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis leading-none';
export const STATEMENT_TF_NUM =
  'border border-slate-300 bg-slate-100 px-1.5 py-0.5 align-middle font-bold text-right whitespace-nowrap overflow-hidden text-ellipsis tabular-nums text-[9.5px] leading-none';
export const STATEMENT_H3 = 'mb-1.5 mt-0 text-[12px] font-bold text-slate-900';
export const STATEMENT_SUB = 'mb-0.5 text-[10px] font-bold text-slate-800 truncate';
