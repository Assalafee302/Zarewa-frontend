import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../lib/formatNgn';
import { FinanceSequencePanel } from '../layout';

/** Compact contribution pulse; AP3 remains the detailed finance report. */
export function ManagerBreakEvenCard({ branchId = '' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!branchId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await apiFetch(`/api/finance/ap3-branch-pl?branchId=${encodeURIComponent(branchId)}`).catch(() => ({ ok: false }));
    setData(res.ok && res.data?.ok ? res.data : null);
    setLoading(false);
  }, [branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const row = useMemo(
    () => (data?.rows || []).find((item) => String(item.branchId) === String(branchId)) || data?.rows?.[0] || null,
    [branchId, data]
  );
  const contribution = Number(row?.contributionNgn || 0);
  const metres = Number(row?.producedMetres || 0);
  const perMetre = contribution > 0 && metres > 0 ? contribution / metres : null;

  return (
    <FinanceSequencePanel className="!min-h-0 sm:!min-h-0 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-black tracking-tight text-zarewa-teal">Contribution pulse</h3>
          <p className="mt-0.5 text-ui-xs text-slate-500">AP3 management draft · current month</p>
        </div>
        <button type="button" onClick={() => void load()} className="text-ui-xs font-bold uppercase text-zarewa-teal hover:underline">
          Refresh
        </button>
      </div>
      {loading ? <p className="py-5 text-xs text-slate-500">Loading contribution…</p> : !row ? (
        <p className="py-5 text-xs text-slate-500">No production contribution data yet.</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
            <p className="text-ui-xs font-bold uppercase text-slate-500">Contribution</p>
            <p className={`mt-1 text-lg font-black tabular-nums ${contribution > 0 ? 'text-zarewa-teal' : 'text-rose-800'}`}>{formatNgn(contribution)}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
            <p className="text-ui-xs font-bold uppercase text-slate-500">Metres</p>
            <p className="mt-1 text-lg font-black tabular-nums text-zarewa-teal">{metres.toLocaleString('en-NG')}</p>
          </div>
          <div className="col-span-2 rounded-lg border border-teal-100 bg-teal-50/50 px-2.5 py-2">
            <p className="text-ui-xs font-bold uppercase text-slate-500">Break-even proxy</p>
            <p className="mt-0.5 text-xs font-bold text-slate-800">
              {contribution <= 0 ? 'Below break-even' : perMetre == null ? 'No production metres recorded' : `${formatNgn(perMetre)} contribution per metre`}
            </p>
          </div>
          <p className="col-span-2 text-ui-xs text-slate-500">Margin {row.marginPct != null ? `${row.marginPct}%` : '—'} · excludes HQ, selling and admin costs.</p>
        </div>
      )}
    </FinanceSequencePanel>
  );
}
