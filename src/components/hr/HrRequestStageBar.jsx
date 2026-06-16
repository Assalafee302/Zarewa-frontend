import React from 'react';
import { hrRequestApprovalChain } from './HrRequestPayloadSummary';

/**
 * Visual approval chain for leave/loan HR requests.
 * @param {{ status: string; kind?: string; compact?: boolean }} props
 */
export default function HrRequestStageBar({ status, kind, compact = false }) {
  const { chain, currentIdx, rejected } = hrRequestApprovalChain(status, kind);
  if (!status || status === 'draft') return null;

  return (
    <div className={compact ? 'mt-2' : 'rounded-xl border border-slate-200 bg-slate-50/80 p-3'}>
      {!compact ? (
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Approval stages</p>
      ) : null}
      <div className="flex gap-1 overflow-x-auto pb-0.5">
        {chain.map((step, i) => {
          const complete = i < currentIdx || (i === currentIdx && status === 'approved');
          const active = i === currentIdx && !rejected && status !== 'approved';
          const declined = rejected && i === currentIdx;
          return (
            <span
              key={step}
              title={step}
              className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-semibold leading-tight ${
                declined
                  ? 'bg-red-100 text-red-900 border border-red-200'
                  : active
                    ? 'bg-teal-800 text-white'
                    : complete
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                      : 'bg-white text-slate-500 border border-slate-200'
              }`}
            >
              {complete && !active && !declined ? '✓ ' : ''}
              {step}
            </span>
          );
        })}
      </div>
    </div>
  );
}
