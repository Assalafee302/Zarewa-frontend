import React from 'react';
import { AlertTriangle, BarChart3, Building2, Sparkles } from 'lucide-react';
import { isCapexExpenseCategory } from '../../shared/expenseCategories.js';
import { ap3CostingHintForCategory } from '../../shared/lib/ap3CostingClassification.js';
import {
  getExpenseCategoryLaneMeta,
  getExpenseCategoryLane,
  isExceptionExpenseCategory,
} from '../../shared/expenseCategoryLanes.js';

function HintCard({ tone, icon: Icon, title, children }) {
  const tones = {
    slate: 'border-slate-200/90 bg-slate-50/90 text-slate-800',
    teal: 'border-teal-200/90 bg-teal-50/85 text-teal-950',
    amber: 'border-amber-200/90 bg-amber-50/90 text-amber-950',
    violet: 'border-violet-200/90 bg-violet-50/90 text-violet-950',
  };
  return (
    <div className={`rounded-xl border px-3 py-2.5 text-[11px] leading-snug ${tones[tone] || tones.slate}`}>
      <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wide opacity-90 mb-1">
        {Icon ? <Icon size={12} className="shrink-0" aria-hidden /> : null}
        {title}
      </p>
      {children}
    </div>
  );
}

/**
 * Contextual hints below the category picker — lane, capex, Others, AP3.
 */
export function ExpenseCategoryHintPanel({ category = '', othersMinJustificationLen = 40, compact = false }) {
  const cat = String(category || '').trim();
  if (!cat) {
    return (
      <HintCard tone="slate" icon={Sparkles} title="Standard chart">
        <p>Pick the closest category for consistent month-end reporting and GL posting.</p>
      </HintCard>
    );
  }

  const lane = getExpenseCategoryLane(cat);
  const laneMeta = getExpenseCategoryLaneMeta(lane);
  const ap3Hint = ap3CostingHintForCategory(cat);
  const hints = [];

  if (laneMeta?.hint) {
    hints.push(
      <HintCard key="lane" tone="slate" icon={Building2} title={laneMeta.label || 'Category lane'}>
        <p>{laneMeta.hint}</p>
      </HintCard>
    );
  }

  if (isCapexExpenseCategory(cat)) {
    hints.push(
      <HintCard key="capex" tone="teal" icon={Building2} title="Capital expenditure">
        <p>
          Treasury payout needs an attachment and clear asset description. When fully paid, Accounting registers a
          fixed asset and posts capitalization to the GL.
        </p>
      </HintCard>
    );
  }

  if (isExceptionExpenseCategory(cat)) {
    hints.push(
      <HintCard key="others" tone="amber" icon={AlertTriangle} title="Exception category">
        <p>
          Explain why no standard category fits (min {othersMinJustificationLen} characters) and attach an invoice
          or receipt.
        </p>
      </HintCard>
    );
  }

  if (ap3Hint?.isUnclassified) {
    hints.push(
      <HintCard key="ap3-bad" tone="violet" icon={BarChart3} title="AP3 costing">
        <p>
          Counts as <span className="font-bold">{ap3Hint.label}</span> — excluded from cost-per-metre allocation until
          reclassified to a production or overhead bucket.
        </p>
      </HintCard>
    );
  } else if (ap3Hint?.label && !compact) {
    hints.push(
      <HintCard key="ap3-ok" tone="slate" icon={BarChart3} title="AP3 costing bucket">
        <p>
          Maps to <span className="font-semibold">{ap3Hint.label}</span> for branch costing readiness reports.
        </p>
      </HintCard>
    );
  }

  if (hints.length === 0) return null;

  return <div className={`${compact ? 'space-y-2' : 'space-y-2 mt-2'}`}>{hints}</div>;
}
