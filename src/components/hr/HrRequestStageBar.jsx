import React from 'react';
import { hrRequestApprovalChain } from './HrRequestPayloadSummary';

/**
 * Visual approval chain for leave/loan HR requests.
 * @param {{ status: string; kind?: string; compact?: boolean }} props
 */
export default function HrRequestStageBar({ status, kind, request, compact = false }) {
  const resolvedStatus = status ?? request?.status;
  const resolvedKind = kind ?? request?.kind;
  const { chain, currentIdx, rejected } = hrRequestApprovalChain(resolvedStatus, resolvedKind);
  if (!resolvedStatus || resolvedStatus === 'draft') return null;

  return (
    <div className={compact ? 'mt-2' : 'rounded-xl border border-slate-200 bg-slate-50/80 p-3'}>
      {!compact ? (
        <p className="z-meta-text mb-2 font-semibold text-slate-500">Approval stages</p>
      ) : null}
      <div
        className="flex gap-1 overflow-x-auto pb-0.5"
        role="list"
        aria-label={`Approval progress: step ${Math.min(currentIdx + 1, chain.length)} of ${chain.length}`}
      >
        {chain.map((step, i) => {
          const complete = i < currentIdx || (i === currentIdx && resolvedStatus === 'approved');
          const active = i === currentIdx && !rejected && resolvedStatus !== 'approved';
          const declined = rejected && i === currentIdx;
          return (
            <span
              key={step}
              role="listitem"
              title={step}
              aria-current={active ? 'step' : undefined}
              className={`shrink-0 rounded-lg px-2 py-1 text-xs font-semibold leading-tight ${
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
