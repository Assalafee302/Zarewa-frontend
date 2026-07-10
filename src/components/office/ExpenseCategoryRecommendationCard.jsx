import React from 'react';
import { ArrowRight, Lock, Sparkles } from 'lucide-react';
import { ExpenseCategoryLaneBadge } from './ExpenseCategoryLaneBadge.jsx';

/**
 * Memo-based category suggestion with apply action.
 */
export function ExpenseCategoryRecommendationCard({
  category,
  reason = '',
  onApply,
  blocked = false,
  blockedReason = '',
}) {
  if (!category && !blocked) return null;

  if (blocked && category) {
    return (
      <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-3 flex gap-3">
        <div className="rounded-lg bg-slate-200/80 p-2 h-fit shrink-0">
          <Lock size={14} className="text-slate-600" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-ui-xs font-black uppercase tracking-wide text-slate-500">Suggested — needs approval</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className="text-sm font-bold text-slate-900">{category}</span>
            <ExpenseCategoryLaneBadge category={category} />
          </div>
          <p className="text-ui-xs text-slate-600 mt-1.5 leading-snug">
            {blockedReason || 'Finance or your manager must select this category.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3 rounded-xl border border-teal-200/90 bg-gradient-to-br from-teal-50/95 to-emerald-50/80 px-3 py-3 shadow-sm">
      <div className="flex gap-3">
        <div className="rounded-lg bg-teal-100/90 p-2 h-fit shrink-0">
          <Sparkles size={14} className="text-teal-800" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-ui-xs font-black uppercase tracking-wide text-teal-900/75">
            Recommended from description
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className="text-sm font-black text-teal-950">{category}</span>
            <ExpenseCategoryLaneBadge category={category} />
          </div>
          {reason ? <p className="text-ui-xs text-teal-900/85 mt-1.5 leading-snug">{reason}</p> : null}
          {onApply ? (
            <button
              type="button"
              onClick={onApply}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-zarewa-teal px-3 py-1.5 text-ui-xs font-black uppercase tracking-wide text-white hover:bg-[#0f3d3a] transition-colors"
            >
              Use category
              <ArrowRight size={12} aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
