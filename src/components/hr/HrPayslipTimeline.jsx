import React from 'react';
import { PAYSLIP_PIPELINE_STEPS, payslipPipelineStepIndex, payslipIsAvailable } from '../../lib/hrPayslipUi';

/**
 * Draft → Locked → Paid → Available pipeline for a payroll run.
 * @param {{ runStatus?: string; compact?: boolean; className?: string }} props
 */
export function HrPayslipTimeline({ runStatus, compact = false, className = '' }) {
  const activeIdx = payslipPipelineStepIndex(runStatus);
  const available = payslipIsAvailable(runStatus);
  const currentIdx = available ? 3 : Math.max(0, activeIdx);

  return (
    <ol
      className={`flex flex-wrap items-center gap-1.5 ${compact ? 'text-ui-xs' : 'text-xs'} ${className}`}
      aria-label="Payslip availability"
    >
      {PAYSLIP_PIPELINE_STEPS.map((step, idx) => {
        const done = idx < currentIdx || (idx === 3 && available);
        const current = idx === currentIdx;
        const chipCls = done
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
          : current
            ? 'border-zarewa-teal/30 bg-teal-50 text-zarewa-teal ring-1 ring-zarewa-teal/20'
            : 'border-slate-200 bg-slate-50 text-slate-400';

        return (
          <React.Fragment key={step.id}>
            {idx > 0 ? <span className="text-slate-300" aria-hidden="true">→</span> : null}
            <li
              className={`rounded-full border px-2.5 py-0.5 font-semibold ${chipCls} ${current ? 'font-bold' : ''}`}
              aria-current={current ? 'step' : undefined}
            >
              {step.label}
            </li>
          </React.Fragment>
        );
      })}
    </ol>
  );
}
