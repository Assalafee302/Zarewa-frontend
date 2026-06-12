import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { downloadHrPayrollExport, formatPeriodYyyymm } from '../../lib/hrPayroll';
import { formatNgn } from '../../lib/hrFormat';
import { FinanceKpiCard } from './FinanceKpiCard';

/** Approved / locked payroll runs — bank bulk payment file for accounts. */
export function FinancePayrollPaymentsPanel() {
  const [runs, setRuns] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadRuns = useCallback(async () => {
    setLoading(true);
    const { ok, data } = await apiFetch('/api/hr/payroll-runs/finance-queue');
    setLoading(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not load payroll queue.');
      setRuns([]);
      return;
    }
    const list = data.runs || [];
    setRuns(list);
    setSelectedId((prev) => prev || list[0]?.id || '');
    setError('');
  }, []);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  useEffect(() => {
    if (!selectedId) {
      setTotals(null);
      return;
    }
    (async () => {
      const { ok, data } = await apiFetch(`/api/hr/payroll-runs/${encodeURIComponent(selectedId)}/totals`);
      if (ok && data?.ok) setTotals(data.totals);
      else setTotals(null);
    })();
  }, [selectedId]);

  const downloadBankFile = async () => {
    if (!selectedId) return;
    setMessage('');
    const r = await downloadHrPayrollExport(selectedId, 'bank-upload');
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setError('');
    setMessage('Bank payment file downloaded. Upload to your bank portal for bulk salary payment.');
  };

  const selected = runs.find((r) => r.id === selectedId);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-sm font-bold text-slate-900">Payroll bank payments</h3>
        <p className="mt-1 text-sm text-slate-600">
          After GM HR approves and HR locks the run, download one consolidated file with all branch staff beneficiaries
          for bulk bank upload.
        </p>
      </div>

      {error ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      {message ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</div>
      ) : null}

      {loading ? <p className="text-sm text-slate-500">Loading payroll queue…</p> : null}

      {!loading && runs.length === 0 ? (
        <p className="text-sm text-slate-600">No GM-approved or locked payroll runs yet.</p>
      ) : null}

      {runs.length > 0 ? (
        <>
          <label className="block text-xs font-semibold text-slate-600">
            Payroll run
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="mt-1 block w-full max-w-md rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {formatPeriodYyyymm(r.periodYyyymm)} — {r.status}
                  {r.gmApprovedAtIso ? ' · GM approved' : ''}
                </option>
              ))}
            </select>
          </label>

          {totals && !totals.amountsRedacted ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <FinanceKpiCard label="Staff" value={String(totals.headcount)} />
              <FinanceKpiCard label="Net payable" value={formatNgn(totals.netTotalNgn)} />
              <FinanceKpiCard label="PAYE total" value={formatNgn(totals.taxTotalNgn)} />
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadBankFile}
              disabled={!selectedId || (selected?.status === 'draft' && !selected?.gmApprovedAtIso)}
              className="rounded-xl bg-[#134e4a] px-4 py-2.5 text-[11px] font-bold uppercase text-white disabled:opacity-50"
            >
              Download bank payment file
            </button>
            {selected?.status === 'draft' ? (
              <span className="self-center text-xs text-amber-800">Lock run in HR after GM approval before bank upload.</span>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
