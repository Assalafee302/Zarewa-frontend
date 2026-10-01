import React from 'react';
import { DecisionBand, DecisionWhatNext } from '../management/DecisionSurface';

/**
 * Month-end stock register — MD no longer stamps; open Procurement to cost and lock.
 */
export function StockRegisterApprovalPreview({
  periodKey = '',
  branchLabel = '',
  status = '',
  loading = false,
}) {
  const statusLabel = String(status || '—').replace(/_/g, ' ');

  return (
    <div className="animate-in fade-in space-y-3 duration-200 text-slate-700">
      <DecisionBand
        tone="po"
        eyebrow="Month-end stock register"
        title={periodKey || '—'}
        subtitle={branchLabel || null}
      >
        {loading ? (
          <p className="mt-2 text-xs text-slate-500">Loading register workflow…</p>
        ) : (
          <p className="mt-2 text-sm text-slate-700">
            Status: <span className="font-semibold capitalize">{statusLabel}</span>
          </p>
        )}
      </DecisionBand>

      <DecisionWhatNext title="Next step">
        MD approval is no longer required. After procurement costing, Capture &amp; lock closes the month on the
        Procurement stock register.
      </DecisionWhatNext>

      <div className="pt-1">
        <a
          href="/procurement"
          className="inline-flex items-center justify-center rounded-lg bg-zarewa-teal px-4 py-2 text-ui-xs font-black uppercase tracking-widest text-white hover:brightness-105"
        >
          Open Procurement stock register →
        </a>
      </div>
    </div>
  );
}
