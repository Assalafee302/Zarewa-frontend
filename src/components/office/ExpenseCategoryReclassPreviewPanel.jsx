import React from 'react';
import { ArrowRight, GitBranch } from 'lucide-react';
import { ExpenseCategoryLaneBadge } from './ExpenseCategoryLaneBadge.jsx';

/**
 * GL reclass preview for post-pay category changes.
 */
export function ExpenseCategoryReclassPreviewPanel({ preview, newCategory = '' }) {
  if (!preview?.gl) return null;

  const priorCategory = preview.priorCategory || '—';
  const targetCategory = newCategory || preview.expenseCategory || '—';
  const sameAccount = preview.gl.fromAccountCode === preview.gl.toAccountCode;

  return (
    <div className="rounded-xl border border-violet-200/90 bg-gradient-to-r from-violet-50/95 to-indigo-50/60 px-4 py-3">
      <p className="text-[9px] font-black uppercase tracking-wide text-violet-900/80 flex items-center gap-1.5">
        <GitBranch size={12} aria-hidden />
        GL reclass preview
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <ExpenseCategoryLaneBadge category={priorCategory} />
          <span className="font-semibold text-slate-800 truncate">{priorCategory}</span>
          <span className="text-[10px] font-mono text-violet-800 tabular-nums">({preview.gl.fromAccountCode})</span>
        </div>
        <ArrowRight size={14} className="text-violet-600 shrink-0" aria-hidden />
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <ExpenseCategoryLaneBadge category={targetCategory} />
          <span className="font-bold text-violet-950 truncate">{targetCategory}</span>
          <span className="text-[10px] font-mono text-violet-800 tabular-nums">({preview.gl.toAccountCode})</span>
        </div>
      </div>
      {sameAccount ? (
        <p className="text-[10px] text-violet-800 mt-2 leading-snug">
          Same GL account — expense register update only; no balancing journal required.
        </p>
      ) : (
        <p className="text-[10px] text-violet-900/85 mt-2 leading-snug">
          Posts Dr {preview.gl.toAccountCode} / Cr {preview.gl.fromAccountCode} for treasury-paid amounts.
        </p>
      )}
      {Number(preview.paidAmountNgn) > 0 ? (
        <p className="text-[9px] text-violet-900/70 mt-1 tabular-nums">
          Based on paid amount · review before saving
        </p>
      ) : null}
    </div>
  );
}
