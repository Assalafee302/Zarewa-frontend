import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Landmark, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrPayrollMarkPaidModal } from '../hr/HrPayrollRunModals';
import { downloadHrPayrollExport, formatPayrollPeriodLabel, sortPayrollRunsByPeriod } from '../../lib/hrPayroll';
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
  const [searchParams] = useSearchParams();
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
  const [run, setRun] = useState(null);
  const [totals, setTotals] = useState(null);
  const [treasuryAccountId, setTreasuryAccountId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [remitPaye, setRemitPaye] = useState('');
  const [remitPension, setRemitPension] = useState('');
  const [remitDate, setRemitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [remitBusy, setRemitBusy] = useState(false);

  const sortedRuns = useMemo(() => sortPayrollRunsByPeriod(runs), [runs]);

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
    const list = sortPayrollRunsByPeriod(data.runs || []);
    setRuns(list);
    setSelectedId((prev) => {
      const fromUrl = searchParams.get('runId');
      if (fromUrl && list.some((r) => r.id === fromUrl)) return fromUrl;
      return prev || list[0]?.id || '';
    });
    setError('');
  }, [searchParams]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  useEffect(() => {
    if (!selectedId) {
      setTotals(null);
      setRun(null);
      setGlStatus(null);
      return;
    }
    (async () => {
      const [runRes, totalsRes, glRes] = await Promise.all([
        apiFetch(`/api/hr/payroll-runs/${encodeURIComponent(selectedId)}`),
        apiFetch(`/api/hr/payroll-runs/${encodeURIComponent(selectedId)}/totals`),
        apiFetch(`/api/finance/payroll-runs/${encodeURIComponent(selectedId)}/gl-status`),
      ]);
      setRun(runRes.ok && runRes.data?.ok ? runRes.data.run : null);
      setTotals(totalsRes.ok && totalsRes.data?.ok ? totalsRes.data.totals : null);
      setGlStatus(glRes.ok && glRes.data?.ok ? glRes.data : null);
    })();
  }, [selectedId]);

  useEffect(() => {
    if (!totals?.amountsRedacted) {
      setRemitPaye(totals?.taxTotalNgn != null ? String(totals.taxTotalNgn) : '');
      setRemitPension(totals?.pensionTotalNgn != null ? String(totals.pensionTotalNgn) : '');
    }
  }, [totals?.taxTotalNgn, totals?.pensionTotalNgn, totals?.amountsRedacted, selectedId]);

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
    await downloadHrPayrollExport(selectedId, 'bank-upload');
  };

  const confirmMarkPaid = async () => {
    if (!selectedId || !treasuryAccountId) return;
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
    const glNote =
      data.glPayment?.journalId
        ? ` GL payment journal ${data.glPayment.journalId}.`
        : data.glPayment?.duplicate
          ? ' GL payment already posted.'
          : '';
    setMessage(`Payroll marked paid.${treasuryNote}${glNote}`);
    setMarkPaidOpen(false);
    await loadRuns();
  };

  const postAccrualGl = async () => {
    if (!selectedId) return;
    setGlBusy(true);
    setError('');
    const { ok, data } = await apiFetch(`/api/finance/payroll-runs/${encodeURIComponent(selectedId)}/accrual-gl`, {
      method: 'POST',
    });
    setGlBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not post payroll accrual to GL.');
      return;
    }
    setMessage(
      data.duplicate ? 'Payroll accrual already in GL.' : `Accrual posted — journal ${data.journalId || 'saved'}.`
    );
    const glRes = await apiFetch(`/api/finance/payroll-runs/${encodeURIComponent(selectedId)}/gl-status`);
    if (glRes.ok && glRes.data?.ok) setGlStatus(glRes.data);
  };

  const postStatutoryRemittance = async () => {
    if (!treasuryAccountId) return;
    const payeNgn = Math.round(Number(remitPaye) || 0);
    const pensionNgn = Math.round(Number(remitPension) || 0);
    if (payeNgn + pensionNgn <= 0) {
      setError('Enter PAYE and/or pension amount to remit.');
      return;
    }
    setRemitBusy(true);
    setError('');
    const period = run?.periodYyyymm || selected?.periodYyyymm || '';
    const { ok, data } = await apiFetch('/api/finance/payroll-remittance', {
      method: 'POST',
      body: {
        entryDateISO: remitDate,
        treasuryAccountId: Number(treasuryAccountId),
        payeNgn,
        pensionNgn,
        sourceId: `REMIT-${period || remitDate}-${selectedId || 'MANUAL'}`,
        memo: period ? `PAYE/pension remittance ${period}` : 'Payroll statutory remittance',
      },
    });
    setRemitBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not post remittance.');
      return;
    }
    setMessage(
      data.duplicate
        ? 'Remittance already posted for this reference.'
        : `Remittance posted — journal ${data.journalId || 'saved'}.`
    );
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
                  {sortedRuns.map((r) => (
                    <option key={r.id} value={r.id}>
                      {formatPayrollPeriodLabel(r.periodYyyymm)} — {r.status}
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
            {glStatus ? (
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold">
                <span
                  className={`rounded-md px-2 py-0.5 ${glStatus.accrualPosted ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}
                >
                  Accrual GL: {glStatus.accrualPosted ? 'Posted' : 'Pending'}
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 ${glStatus.netPaymentPosted ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}
                >
                  Net payment GL: {glStatus.netPaymentPosted ? 'Posted' : selected?.status === 'paid' ? 'Pending' : 'After mark paid'}
                </span>
              </div>
            ) : null}
          </ProcurementFormSection>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {(selected?.status === 'locked' || selected?.status === 'paid') && !glStatus?.accrualPosted ? (
              <button
                type="button"
                onClick={postAccrualGl}
                disabled={glBusy}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[#134e4a] bg-white px-4 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-[#134e4a] disabled:opacity-50"
              >
                Post accrual to GL
              </button>
            ) : null}
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
                onClick={() => setMarkPaidOpen(true)}
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

      {runs.length > 0 && totals && !totals.amountsRedacted ? (
        <ProcurementFormSection letter="2" title="Statutory remittance (PAYE / pension)" compact>
          <p className="text-[10px] text-slate-600 mb-3">
            When you pay FIRS / pension administrator, post Dr 2300/2400 and Cr bank to clear payables.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className={ACCOUNTING_FIELD_LABEL}>
              PAYE amount (₦)
              <input
                type="number"
                min="0"
                value={remitPaye}
                onChange={(e) => setRemitPaye(e.target.value)}
                className={ACCOUNTING_INPUT}
              />
            </label>
            <label className={ACCOUNTING_FIELD_LABEL}>
              Pension amount (₦)
              <input
                type="number"
                min="0"
                value={remitPension}
                onChange={(e) => setRemitPension(e.target.value)}
                className={ACCOUNTING_INPUT}
              />
            </label>
            <label className={ACCOUNTING_FIELD_LABEL}>
              Remittance date
              <input
                type="date"
                value={remitDate}
                onChange={(e) => setRemitDate(e.target.value)}
                className={ACCOUNTING_INPUT}
              />
            </label>
          </div>
          <button
            type="button"
            onClick={postStatutoryRemittance}
            disabled={remitBusy || !treasuryAccountId}
            className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[#134e4a] bg-white px-4 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-[#134e4a] disabled:opacity-50"
          >
            Post remittance to GL
          </button>
        </ProcurementFormSection>
      ) : null}

      <HrPayrollMarkPaidModal
        isOpen={markPaidOpen}
        onClose={() => setMarkPaidOpen(false)}
        run={run || selected}
        totals={totals}
        bankTreasuryAccounts={bankAccounts}
        treasuryAccountId={treasuryAccountId}
        onTreasuryAccountChange={setTreasuryAccountId}
        busy={busy}
        onConfirm={confirmMarkPaid}
      />
    </div>
  );
}
