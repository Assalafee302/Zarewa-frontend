import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { recordPayrollBankExportTotal } from '../../lib/hrExtended';
import { HrAddFormButton, HrFormModal } from './HrFormModal';
import { HrCard } from './hrPageUi';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from './hrFormStyles';

/**
 * Payroll reconciliation, bonus approval, and hold summary for a run.
 * @param {{ runId: string; canManage?: boolean; netPayableNgn?: number | null }} props
 */
export function HrPayrollControlPanel({ runId, canManage = false, netPayableNgn = null }) {
  const [recon, setRecon] = useState(null);
  const [bonusRequests, setBonusRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [bankExportTotal, setBankExportTotal] = useState('');
  const [recordBusy, setRecordBusy] = useState(false);
  const [bankExportOpen, setBankExportOpen] = useState(false);
  const [bonusOpen, setBonusOpen] = useState(false);
  const [bonusBusy, setBonusBusy] = useState(false);
  const [approveBonusId, setApproveBonusId] = useState('');

  const load = useCallback(async () => {
    if (!runId) return;
    setLoading(true);
    setError('');
    const [r1, r2] = await Promise.all([
      apiFetch(`/api/hr/payroll-runs/${encodeURIComponent(runId)}/reconciliation`),
      apiFetch(`/api/hr/payroll-runs/${encodeURIComponent(runId)}/bonus-requests`),
    ]);
    setLoading(false);
    if (!r1.ok || !r1.data?.ok) {
      setError(r1.data?.error || 'Could not load reconciliation.');
      return;
    }
    setRecon(r1.data);
    if (r2.ok && r2.data?.ok) setBonusRequests(r2.data.requests || []);
  }, [runId]);

  useEffect(() => {
    load();
  }, [load]);

  const requestBonus = async () => {
    setBonusBusy(true);
    setError('');
    const { ok, data } = await apiFetch(`/api/hr/payroll-runs/${encodeURIComponent(runId)}/bonus-requests`, {
      method: 'POST',
      body: JSON.stringify({ bonusType: 'half_month', notes: 'End-of-year bonus request' }),
    });
    setBonusBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not request bonus.');
      return;
    }
    setMessage('Bonus request submitted for GMHR approval.');
    setBonusOpen(false);
    await load();
  };

  const approveBonus = async (id) => {
    setApproveBonusId('');
    const { ok, data } = await apiFetch(`/api/hr/bonus-requests/${encodeURIComponent(id)}/approve`, { method: 'POST' });
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not approve bonus.');
      return;
    }
    setMessage('Bonus approved and applied to payroll lines.');
    await load();
  };

  const recordBankExport = async (e) => {
    e.preventDefault();
    const total = Math.round(Number(bankExportTotal) || 0);
    if (total <= 0) {
      setError('Enter the bank file total (net salaries paid).');
      return;
    }
    setRecordBusy(true);
    setError('');
    const { ok, data } = await recordPayrollBankExportTotal(runId, total);
    setRecordBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not record bank export total.');
      return;
    }
    setMessage('Bank export total recorded for reconciliation.');
    setBankExportOpen(false);
    await load();
  };

  if (loading) return <p className="text-sm text-slate-500">Loading payroll controls…</p>;
  if (error && !recon) return <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>;

  return (
    <div className="space-y-4">
      {message ? <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</div> : null}
      {error ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

      <HrCard title="Payroll reconciliation" subtitle="Compare net payroll vs bank export and held lines">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Staff on run" value={recon?.staffCount ?? '—'} />
          <Stat label="Payable" value={recon?.payCount ?? '—'} />
          <Stat label="On hold" value={recon?.heldCount ?? '—'} tone="amber" />
          <Stat label="Net total" value={recon?.payrollTotalNgn != null ? `₦${recon.payrollTotalNgn.toLocaleString()}` : '—'} />
        </div>
        {recon?.anomalies?.length ? (
          <ul className="mt-4 space-y-2">
            {recon.anomalies.map((a, i) => (
              <li key={i} className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                {a.message}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-emerald-700 font-semibold">No reconciliation anomalies detected.</p>
        )}
        {canManage ? (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <HrAddFormButton onClick={() => setBankExportOpen(true)}>Record bank export total</HrAddFormButton>
          </div>
        ) : null}
      </HrCard>

      {canManage ? (
        <HrCard title="Bonus approval" subtitle="Request end-of-year bonus — requires GMHR approval before application">
          {bonusRequests.length ? (
            <ul className="space-y-2">
              {bonusRequests.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                  <span>
                    <span className="font-bold uppercase">{b.status}</span>
                    {' · '}
                    {b.bonusType}
                    {b.requestedAtIso ? ` · ${b.requestedAtIso.slice(0, 10)}` : ''}
                  </span>
                  {b.status === 'pending' ? (
                    <button
                      type="button"
                      onClick={() => setApproveBonusId(b.id)}
                      className={`${HR_BTN_PRIMARY} w-full sm:w-auto min-h-[44px]`}
                    >
                      Approve & apply
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <HrAddFormButton onClick={() => setBonusOpen(true)}>Request bonus (50% base)</HrAddFormButton>
          )}
        </HrCard>
      ) : null}

      <HrFormModal
        isOpen={bankExportOpen}
        onClose={() => setBankExportOpen(false)}
        title="Record bank export total"
        description="Enter the total net salaries from the bank payment file for reconciliation."
        size="md"
      >
        <form className="space-y-4" onSubmit={recordBankExport}>
          <label className="text-xs font-semibold text-slate-600">
            Bank file total (₦)
            <input
              type="number"
              min={0}
              inputMode="numeric"
              className={`${HR_FIELD_CLASS} min-h-[44px]`}
              value={bankExportTotal}
              onChange={(e) => setBankExportTotal(e.target.value)}
              placeholder={netPayableNgn != null ? String(netPayableNgn) : ''}
              required
            />
          </label>
          {netPayableNgn != null ? (
            <button
              type="button"
              className="text-xs font-bold text-zarewa-teal hover:underline"
              onClick={() => setBankExportTotal(String(netPayableNgn))}
            >
              Use payroll net (₦{netPayableNgn.toLocaleString()})
            </button>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setBankExportOpen(false)} className={HR_BTN_SECONDARY}>
              Cancel
            </button>
            <button type="submit" disabled={recordBusy} className={`${HR_BTN_PRIMARY} min-h-[44px]`}>
              {recordBusy ? 'Saving…' : 'Record total'}
            </button>
          </div>
        </form>
      </HrFormModal>

      <HrPayrollConfirmBonusModal isOpen={bonusOpen} onClose={() => setBonusOpen(false)} busy={bonusBusy} onConfirm={requestBonus} />

      <HrFormModal isOpen={Boolean(approveBonusId)} onClose={() => setApproveBonusId('')} title="Approve bonus" size="sm">
        <p className="text-sm text-slate-600">Apply this end-of-year bonus to payroll lines after GM HR approval?</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setApproveBonusId('')} className={HR_BTN_SECONDARY}>
            Cancel
          </button>
          <button type="button" onClick={() => approveBonus(approveBonusId)} className={HR_BTN_PRIMARY}>
            Approve & apply
          </button>
        </div>
      </HrFormModal>
    </div>
  );
}

function HrPayrollConfirmBonusModal({ isOpen, onClose, busy, onConfirm }) {
  if (!isOpen) return null;
  return (
    <HrFormModal isOpen={isOpen} onClose={busy ? undefined : onClose} title="Request end-of-year bonus" size="sm">
      <p className="text-sm text-slate-600">
        Submit a 50% base-salary bonus request for GM HR approval. Applies to December payroll lines after approval.
      </p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} disabled={busy} className={HR_BTN_SECONDARY}>
          Cancel
        </button>
        <button type="button" onClick={onConfirm} disabled={busy} className={`${HR_BTN_PRIMARY} min-h-[44px]`}>
          {busy ? 'Submitting…' : 'Submit request'}
        </button>
      </div>
    </HrFormModal>
  );
}

function Stat({ label, value, tone }) {
  const cls = tone === 'amber' ? 'text-amber-800' : 'text-zarewa-teal';
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
      <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-black tabular-nums ${cls}`}>{value}</p>
    </div>
  );
}
