import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { downloadHrPayrollExport, formatPeriodYyyymm } from '../../lib/hrPayroll';
import { markPayrollRunPaid } from '../../lib/hrExtended';
import { formatNgn } from '../../lib/hrFormat';
import { FinanceKpiCard } from './FinanceKpiCard';

/** Approved / locked payroll runs — bank bulk payment file and treasury posting. */
export function FinancePayrollPaymentsPanel() {
  const ws = useWorkspace();
  const treasuryAccounts = useMemo(
    () => (Array.isArray(ws?.snapshot?.treasuryAccounts) ? ws.snapshot.treasuryAccounts : []).filter(Boolean),
    [ws?.snapshot?.treasuryAccounts]
  );
  const bankAccounts = useMemo(
    () =>
      treasuryAccounts.filter((a) => {
        const t = String(a.type || '').toLowerCase();
        return t === 'bank' || t === 'current' || t === 'savings' || !t;
      }),
    [treasuryAccounts]
  );

  const [runs, setRuns] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [totals, setTotals] = useState(null);
  const [treasuryAccountId, setTreasuryAccountId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!treasuryAccountId && bankAccounts.length) {
      setTreasuryAccountId(String(bankAccounts[0].id));
    }
  }, [bankAccounts, treasuryAccountId]);

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

  useEffect(() => {
    (async () => {
      const { ok, data } = await apiFetch('/api/hr/policy-config');
      if (ok && data?.ok && data.policy?.payrollTreasuryAccountId != null) {
        setTreasuryAccountId((prev) => prev || String(data.policy.payrollTreasuryAccountId));
      }
    })();
  }, []);

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

  const markPaid = async () => {
    if (!selectedId) return;
    if (!treasuryAccountId) {
      setError('Select the treasury bank account salaries were paid from.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    const { ok, data } = await markPayrollRunPaid(selectedId, {
      treasuryAccountId: Number(treasuryAccountId),
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not mark payroll paid.');
      return;
    }
    const treasuryNote =
      data.treasury?.movementId ?
        ` Treasury movement ${data.treasury.movementId} posted (₦${Number(data.treasury.amountNgn || 0).toLocaleString()}).`
      : data.treasury?.alreadyPosted ?
        ' Treasury was already posted for this run.'
      : '';
    setMessage(`Payroll marked paid.${treasuryNote}`);
    await loadRuns();
  };

  const selected = runs.find((r) => r.id === selectedId);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-sm font-bold text-slate-900">Payroll bank payments</h3>
        <p className="mt-1 text-sm text-slate-600">
          After GM HR or MD approves and HR locks the run, download the bulk bank file, pay staff, then mark paid to
          post the net total to treasury.
        </p>
      </div>

      {error ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      {message ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</div>
      ) : null}

      {loading ? <p className="text-sm text-slate-500">Loading payroll queue…</p> : null}

      {!loading && runs.length === 0 ? (
        <p className="text-sm text-slate-600">No approved or locked payroll runs yet.</p>
      ) : null}

      {runs.length > 0 ? (
        <>
          <label className="block text-xs font-semibold text-slate-600">
            Payroll run
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="mt-1 block w-full max-w-md rounded-xl border border-slate-200 px-3 py-3 text-sm min-h-[44px]"
            >
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {formatPeriodYyyymm(r.periodYyyymm)} — {r.status}
                  {r.gmApprovedAtIso ? ' · GM approved' : ''}
                  {r.mdApprovedAtIso ? ' · MD approved' : ''}
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

          <label className="block text-xs font-semibold text-slate-600">
            Pay from treasury account
            <select
              value={treasuryAccountId}
              onChange={(e) => setTreasuryAccountId(e.target.value)}
              className="mt-1 block w-full max-w-md rounded-xl border border-slate-200 px-3 py-3 text-sm min-h-[44px]"
            >
              {bankAccounts.length === 0 ? <option value="">No bank accounts in workspace</option> : null}
              {bankAccounts.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {a.name || a.bankName || `Account ${a.id}`}
                  {a.accNo ? ` · ${a.accNo}` : ''}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={downloadBankFile}
              disabled={!selectedId || selected?.status === 'draft'}
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#134e4a] px-4 py-2.5 text-[11px] font-bold uppercase text-white disabled:opacity-50 sm:w-auto touch-manipulation"
            >
              Download bank payment file
            </button>
            {selected?.status === 'locked' ? (
              <button
                type="button"
                onClick={markPaid}
                disabled={busy || !treasuryAccountId}
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-emerald-700 px-4 py-2.5 text-[11px] font-bold uppercase text-white disabled:opacity-50 sm:w-auto touch-manipulation"
              >
                Mark paid & post treasury
              </button>
            ) : null}
            {selected?.status === 'draft' ? (
              <span className="text-xs text-amber-800 leading-relaxed">Lock run in HR after GM/MD approval before bank upload.</span>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
