import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Landmark, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { downloadHrPayrollExport, formatPeriodYyyymm } from '../../lib/hrPayroll';
import { markPayrollRunPaid } from '../../lib/hrExtended';
import { formatNgn } from '../../lib/hrFormat';
import { ProcurementFormSection } from '../procurement/ProcurementFormSection';
import {
  AccountingDeskKpiCard,
  ACCOUNTING_FIELD_LABEL,
  ACCOUNTING_INPUT,
} from './accounting/AccountingDeskUi';
import { AccountingRegisterHeader } from './accounting/AccountingRegisterLayout';

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
    await downloadHrPayrollExport(selectedId);
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
      data.treasury?.movementId
        ? ` Treasury movement ${data.treasury.movementId} posted (₦${Number(data.treasury.amountNgn || 0).toLocaleString()}).`
        : data.treasury?.alreadyPosted
          ? ' Treasury was already posted for this run.'
          : '';
    setMessage(`Payroll marked paid.${treasuryNote}`);
    await loadRuns();
  };

  const selected = runs.find((r) => r.id === selectedId);

  return (
    <div className="space-y-4 min-w-0">
      <AccountingRegisterHeader
        title="Payroll bank payments"
        subtitle="Download bulk bank file after HR locks the run, pay staff, then mark paid to post net total to treasury."
        compact
        actions={
          <button
            type="button"
            onClick={loadRuns}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#134e4a] hover:bg-slate-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        }
      />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 px-4 py-3 text-[11px] font-medium text-rose-800">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 text-[11px] font-medium text-emerald-900">
          {message}
        </div>
      ) : null}

      {loading ? <p className="text-[11px] text-slate-500">Loading payroll queue…</p> : null}

      {!loading && runs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-14 px-6 text-center">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
            No approved or locked payroll runs yet
          </p>
        </div>
      ) : null}

      {runs.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <AccountingDeskKpiCard icon={<Landmark size={12} />} label="Queue" value={runs.length} tone="teal" />
            {totals && !totals.amountsRedacted ? (
              <>
                <AccountingDeskKpiCard label="Staff" value={String(totals.headcount)} />
                <AccountingDeskKpiCard label="Net payable" value={formatNgn(totals.netTotalNgn)} tone="teal" />
              </>
            ) : null}
          </div>

          <ProcurementFormSection letter="1" title="Select run & treasury account" compact>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className={ACCOUNTING_FIELD_LABEL}>
                Payroll run
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className={ACCOUNTING_INPUT}
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
              <label className={ACCOUNTING_FIELD_LABEL}>
                Pay from treasury account
                <select
                  value={treasuryAccountId}
                  onChange={(e) => setTreasuryAccountId(e.target.value)}
                  className={ACCOUNTING_INPUT}
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
            </div>
            {totals && !totals.amountsRedacted ? (
              <p className="mt-3 text-[10px] text-slate-600">
                PAYE total: <span className="font-bold tabular-nums">{formatNgn(totals.taxTotalNgn)}</span>
              </p>
            ) : null}
          </ProcurementFormSection>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={downloadBankFile}
              disabled={!selectedId || selected?.status === 'draft'}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#134e4a] px-4 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-white disabled:opacity-50"
            >
              Download bank payment file
            </button>
            {selected?.status === 'locked' ? (
              <button
                type="button"
                onClick={markPaid}
                disabled={busy || !treasuryAccountId}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-white disabled:opacity-50"
              >
                Mark paid & post treasury
              </button>
            ) : null}
            {selected?.status === 'draft' ? (
              <span className="text-[10px] text-amber-800 leading-relaxed self-center">
                Lock run in HR after GM/MD approval before bank upload.
              </span>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
