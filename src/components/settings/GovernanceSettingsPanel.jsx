import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Factory, Scale, Shield, Tags } from 'lucide-react';
import QuotationLineIntegrityPanel from './QuotationLineIntegrityPanel';
import AdminDataResetPanel from './AdminDataResetPanel';
import { apiFetch, apiUrl } from '../../lib/apiBase';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';

/** Approvals, period locks, audits, cutting gates — plus admin data reset when allowed. */
export default function GovernanceSettingsPanel() {
  const { show: showToast } = useToast();
  const ws = useWorkspace();
  const location = useLocation();
  const wsRefresh = ws?.refresh;
  const permissions = ws?.permissions ?? [];
  const periodLocks = ws?.snapshot?.periodLocks ?? [];
  const auditLog = ws?.snapshot?.auditLog ?? [];
  const currentUser = ws?.session?.user;
  const showAdminDataReset = String(currentUser?.roleKey || '').toLowerCase() === 'admin';

  const [periodForm, setPeriodForm] = useState({
    periodKey: new Date().toISOString().slice(0, 7),
    reason: '',
  });
  const [branchAudit, setBranchAudit] = useState(null);
  const [branchAuditBusy, setBranchAuditBusy] = useState(false);
  const [cuttingDraftPct, setCuttingDraftPct] = useState({});
  const [cuttingSaveBusy, setCuttingSaveBusy] = useState('');
  const [govLimitsForm, setGovLimitsForm] = useState({
    expenseExecutiveThresholdNgn: 200_000,
    refundExecutiveThresholdNgn: 1_000_000,
    othersMinJustificationLen: 40,
    othersFinanceReviewThresholdNgn: 50_000,
    ap3UnclassifiedAlertThresholdNgn: 100_000,
    othersBranchCoachThresholdPct: 15,
    refundStaffAllocationDeductionPct: 20,
  });
  const [govLimitsBusy, setGovLimitsBusy] = useState(false);

  const showPeriodControls = Boolean(ws?.hasPermission?.('period.manage'));
  const showAuditExport = permissions.includes('*') || permissions.includes('audit.export');
  const showBranchAudit = permissions.includes('*') || permissions.includes('settings.view');
  const showCuttingThresholdControl = permissions.includes('*') || permissions.includes('settings.view');
  const showGovernanceLimitsControl = permissions.includes('*') || permissions.includes('settings.view');
  const showQuotationLineIntegrityAudit =
    permissions.includes('*') ||
    permissions.includes('settings.view') ||
    permissions.includes('finance.approve') ||
    permissions.includes('refunds.approve') ||
    permissions.includes('quotations.manage');
  const governanceHasContent =
    showPeriodControls ||
    showAuditExport ||
    showBranchAudit ||
    showCuttingThresholdControl ||
    showGovernanceLimitsControl ||
    showQuotationLineIntegrityAudit ||
    auditLog.length > 0 ||
    showAdminDataReset;

  const workspaceBranches = useMemo(
    () => ws?.snapshot?.workspaceBranches ?? [],
    [ws?.snapshot?.workspaceBranches]
  );
  const branchCuttingSig = workspaceBranches
    .map((b) => `${b.id}:${Number(b.cuttingListMinPaidFraction)}`)
    .join(',');

  useEffect(() => {
    const next = {};
    for (const b of workspaceBranches) {
      const f = Number(b.cuttingListMinPaidFraction);
      const pct = Math.round((Number.isFinite(f) ? f : 0.7) * 100);
      next[b.id] = String(Math.min(100, Math.max(5, pct)));
    }
    setCuttingDraftPct(next);
  }, [branchCuttingSig, workspaceBranches]);

  useEffect(() => {
    if (location.hash !== '#admin-reset') return;
    const el = document.getElementById('admin-reset');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.hash]);

  const saveBranchCuttingPct = async (branchId) => {
    const bid = String(branchId || '').trim();
    const n = Number(String(cuttingDraftPct[bid] ?? '').replace(/,/g, ''));
    if (!Number.isFinite(n) || n < 5 || n > 100) {
      showToast('Enter a whole percent between 5 and 100.', { variant: 'error' });
      return;
    }
    setCuttingSaveBusy(bid);
    try {
      const { ok, data } = await apiFetch(`/api/branches/${encodeURIComponent(bid)}/cutting-threshold`, {
        method: 'PATCH',
        body: JSON.stringify({ cuttingListMinPaidFraction: n / 100 }),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not update cutting threshold.', { variant: 'error' });
        return;
      }
      await wsRefresh?.();
      showToast('Cutting list payment gate saved for branch.');
    } finally {
      setCuttingSaveBusy('');
    }
  };

  const loadBranchAudit = useCallback(async () => {
    if (!showBranchAudit) return;
    setBranchAuditBusy(true);
    try {
      const { ok, data } = await apiFetch('/api/branches/strict-audit');
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not load branch integrity audit.', { variant: 'error' });
        return;
      }
      setBranchAudit(data);
    } finally {
      setBranchAuditBusy(false);
    }
  }, [showBranchAudit, showToast]);

  useEffect(() => {
    if (!showBranchAudit) return;
    void loadBranchAudit();
  }, [showBranchAudit, loadBranchAudit]);

  useEffect(() => {
    if (!showGovernanceLimitsControl) return;
    let cancelled = false;
    (async () => {
      const { ok, data } = await apiFetch('/api/org/governance-limits');
      if (cancelled) return;
      if (ok && data?.ok && data.limits) {
        setGovLimitsForm({
          expenseExecutiveThresholdNgn: Number(data.limits.expenseExecutiveThresholdNgn) || 200_000,
          refundExecutiveThresholdNgn: Number(data.limits.refundExecutiveThresholdNgn) || 1_000_000,
          othersMinJustificationLen: Number(data.limits.othersMinJustificationLen) || 40,
          othersFinanceReviewThresholdNgn: Number(data.limits.othersFinanceReviewThresholdNgn) || 50_000,
          ap3UnclassifiedAlertThresholdNgn: Number(data.limits.ap3UnclassifiedAlertThresholdNgn) || 100_000,
          othersBranchCoachThresholdPct: Number(data.limits.othersBranchCoachThresholdPct) || 15,
          refundStaffAllocationDeductionPct:
            data.limits.refundStaffAllocationDeductionPct != null
              ? Number(data.limits.refundStaffAllocationDeductionPct)
              : 20,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showGovernanceLimitsControl, ws?.refreshEpoch]);

  const saveGovernanceLimits = async () => {
    setGovLimitsBusy(true);
    try {
      const { ok, data } = await apiFetch('/api/org/governance-limits', {
        method: 'PATCH',
        body: JSON.stringify({
          expenseExecutiveThresholdNgn: Number(govLimitsForm.expenseExecutiveThresholdNgn),
          refundExecutiveThresholdNgn: Number(govLimitsForm.refundExecutiveThresholdNgn),
          othersMinJustificationLen: Number(govLimitsForm.othersMinJustificationLen),
          othersFinanceReviewThresholdNgn: Number(govLimitsForm.othersFinanceReviewThresholdNgn),
          ap3UnclassifiedAlertThresholdNgn: Number(govLimitsForm.ap3UnclassifiedAlertThresholdNgn),
          othersBranchCoachThresholdPct: Number(govLimitsForm.othersBranchCoachThresholdPct),
          refundStaffAllocationDeductionPct: Number(govLimitsForm.refundStaffAllocationDeductionPct),
        }),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not save limits.', { variant: 'error' });
        return;
      }
      showToast('Approval thresholds saved.');
      await ws?.refresh?.();
    } finally {
      setGovLimitsBusy(false);
    }
  };

  const downloadAuditNdjson = async () => {
    try {
      const r = await fetch(apiUrl('/api/audit/export.ndjson'), { credentials: 'include' });
      if (!r.ok) {
        showToast('Could not download audit export.', { variant: 'error' });
        return;
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'zarewa-audit-export.ndjson';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Audit export downloaded.');
    } catch {
      showToast('Audit export failed.', { variant: 'error' });
    }
  };

  const lockPeriod = async (e) => {
    e.preventDefault();
    const periodKey = periodForm.periodKey.trim();
    if (!periodKey) return;
    const { ok, data } = await apiFetch('/api/controls/period-locks', {
      method: 'POST',
      body: JSON.stringify({
        periodKey,
        reason: periodForm.reason.trim(),
      }),
    });
    if (!ok || !data?.ok) {
      showToast(data?.error || 'Could not lock period.', { variant: 'error' });
      return;
    }
    await ws?.refresh?.();
    setPeriodForm((prev) => ({ ...prev, reason: '' }));
    showToast(`Period ${periodKey} locked.`);
  };

  const unlockPeriod = async (periodKey) => {
    const { ok, data } = await apiFetch(`/api/controls/period-locks/${encodeURIComponent(periodKey)}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason: 'Unlocked from Settings' }),
    });
    if (!ok || !data?.ok) {
      showToast(data?.error || 'Could not unlock period.', { variant: 'error' });
      return;
    }
    await ws?.refresh?.();
    showToast(`Period ${periodKey} unlocked.`);
  };

  return (
    <div className="space-y-8">
      {showQuotationLineIntegrityAudit ? <QuotationLineIntegrityPanel /> : null}

      {!governanceHasContent ? (
        <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
          <p className="text-sm font-semibold text-slate-700">No controls in this section for your role</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
            Period locking and full audit export require additional permissions. If you need access, ask an
            administrator.
          </p>
        </div>
      ) : null}

      {showGovernanceLimitsControl ? (
        <section className="rounded-md border border-slate-200/90 bg-white p-6 shadow-sm">
          <h3 className="z-section-title flex items-center gap-2">
            <Scale size={14} /> Office approval thresholds (NGN)
          </h3>
          <p className="mb-4 text-xs text-gray-500">
            Branch managers may approve payment requests at or below the expense threshold; amounts above require
            MD/CEO (or admin). Refunds above the refund threshold require executive sign-off. Changes are audited.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="z-field-label">Expense — branch manager max (NGN)</label>
              <input
                type="number"
                min={0}
                step={1000}
                className="z-input"
                value={govLimitsForm.expenseExecutiveThresholdNgn}
                onChange={(e) =>
                  setGovLimitsForm((p) => ({
                    ...p,
                    expenseExecutiveThresholdNgn: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div>
              <label className="z-field-label">Refund — executive above (NGN)</label>
              <input
                type="number"
                min={0}
                step={1000}
                className="z-input"
                value={govLimitsForm.refundExecutiveThresholdNgn}
                onChange={(e) =>
                  setGovLimitsForm((p) => ({
                    ...p,
                    refundExecutiveThresholdNgn: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div>
              <label className="z-field-label">Staff refund company cut (%)</label>
              <input
                type="number"
                min={0}
                max={99}
                step={1}
                className="z-input"
                value={govLimitsForm.refundStaffAllocationDeductionPct}
                onChange={(e) =>
                  setGovLimitsForm((p) => ({
                    ...p,
                    refundStaffAllocationDeductionPct: Number(e.target.value),
                  }))
                }
              />
              <p className="mt-1 text-[11px] leading-snug text-slate-500">
                Applied to associated / claiming-staff allocations (not the quote customer). 0 disables the cut.
                Default 20.
              </p>
            </div>
          </div>
          <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-5">
            <h4 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Tags size={15} className="text-amber-700" aria-hidden />
              Expense category governance
            </h4>
            <p className="mb-4 text-xs text-gray-500">
              Controls for the Others exception lane, AP3 costing alerts, and branch manager coaching when too many
              requests use catch-all categories.
            </p>
            <div className="space-y-5">
              <div>
                <p className="mb-3 text-ui-xs font-medium text-slate-600">Others lane</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="z-field-label">Min explanation (characters)</label>
                    <input
                      type="number"
                      min={10}
                      max={500}
                      step={1}
                      className="z-input"
                      value={govLimitsForm.othersMinJustificationLen}
                      onChange={(e) =>
                        setGovLimitsForm((p) => ({
                          ...p,
                          othersMinJustificationLen: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="z-field-label">Finance review from (NGN)</label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      className="z-input"
                      value={govLimitsForm.othersFinanceReviewThresholdNgn}
                      onChange={(e) =>
                        setGovLimitsForm((p) => ({
                          ...p,
                          othersFinanceReviewThresholdNgn: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="border-t border-amber-100/90 pt-5">
                <p className="mb-3 text-ui-xs font-medium text-slate-600">Alerts & coaching</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="z-field-label">AP3 unclassified alert from (NGN)</label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      className="z-input"
                      value={govLimitsForm.ap3UnclassifiedAlertThresholdNgn}
                      onChange={(e) =>
                        setGovLimitsForm((p) => ({
                          ...p,
                          ap3UnclassifiedAlertThresholdNgn: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="z-field-label">Branch coach — Others % threshold</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      step={1}
                      className="z-input"
                      value={govLimitsForm.othersBranchCoachThresholdPct}
                      onChange={(e) =>
                        setGovLimitsForm((p) => ({
                          ...p,
                          othersBranchCoachThresholdPct: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <button
              type="button"
              disabled={govLimitsBusy}
              onClick={() => void saveGovernanceLimits()}
              className="z-btn-primary justify-center"
            >
              {govLimitsBusy ? 'Saving…' : 'Save thresholds'}
            </button>
          </div>
        </section>
      ) : null}

      {showPeriodControls ? (
        <section className="rounded-md border border-slate-200/90 bg-white p-6 shadow-sm">
          <h3 className="z-section-title flex items-center gap-2">
            <Shield size={14} /> Period controls
          </h3>
          <p className="mb-4 text-xs text-gray-500">
            Lock completed accounting periods so late postings and reversals cannot backdate into closed months.
          </p>
          <form className="grid gap-4 md:grid-cols-[12rem_1fr_auto]" onSubmit={lockPeriod}>
            <div>
              <label className="z-field-label">Period</label>
              <input
                type="month"
                value={periodForm.periodKey}
                onChange={(e) => setPeriodForm((prev) => ({ ...prev, periodKey: e.target.value }))}
                className="z-input"
              />
            </div>
            <div>
              <label className="z-field-label">Reason</label>
              <input
                value={periodForm.reason}
                onChange={(e) => setPeriodForm((prev) => ({ ...prev, reason: e.target.value }))}
                className="z-input"
                placeholder="Month-end close completed"
              />
            </div>
            <div className="flex items-end">
              <button type="submit" className="z-btn-primary w-full justify-center md:w-auto">
                Lock period
              </button>
            </div>
          </form>

          <div className="mt-5 space-y-3">
            {periodLocks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 text-sm text-slate-500">
                No accounting periods are locked yet.
              </div>
            ) : (
              periodLocks.map((lock) => (
                <div
                  key={lock.periodKey}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="z-stencil text-sm text-slate-900">{lock.periodKey}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {lock.reason || 'Locked period'} · {lock.lockedByName || 'System'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => unlockPeriod(lock.periodKey)}
                    className="z-btn-secondary justify-center"
                  >
                    Unlock
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}

      {showAuditExport ? (
        <section className="rounded-md border border-slate-200/90 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="z-section-title mb-0 flex items-center gap-2">
              <Shield size={14} /> Compliance export
            </h3>
            <button type="button" onClick={downloadAuditNdjson} className="z-btn-secondary text-xs">
              Download full audit log (NDJSON)
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Newline-delimited JSON for archiving, SIEM ingest, or offline review. Respects your current session.
          </p>
        </section>
      ) : null}

      {showCuttingThresholdControl ? (
        <section className="rounded-md border border-slate-200/90 bg-white p-6 shadow-sm">
          <h3 className="z-section-title flex items-center gap-2">
            <Factory size={14} /> Cutting list — minimum paid %
          </h3>
          <p className="mt-2 text-xs text-slate-500">
            Before a cutting list can be saved without manager production approval, the quotation must reach this
            paid fraction (ledger receipts plus advance applied). Enforced on the server per branch.
          </p>
          <div className="mt-4 space-y-3">
            {workspaceBranches.length === 0 ? (
              <p className="text-sm text-slate-500">No branches in workspace.</p>
            ) : (
              workspaceBranches.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-end sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-zarewa-teal">{b.name || b.code || b.id}</p>
                    <p className="font-mono text-ui-xs text-slate-500">{b.id}</p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div>
                      <label className="z-field-label">Min paid (%)</label>
                      <input
                        type="number"
                        min={5}
                        max={100}
                        step={1}
                        value={cuttingDraftPct[b.id] ?? ''}
                        onChange={(e) =>
                          setCuttingDraftPct((prev) => ({ ...prev, [b.id]: e.target.value }))
                        }
                        className="z-input w-28"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={cuttingSaveBusy === b.id}
                      onClick={() => saveBranchCuttingPct(b.id)}
                      className="z-btn-primary justify-center text-xs"
                    >
                      {cuttingSaveBusy === b.id ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}

      {showBranchAudit ? (
        <section className="rounded-md border border-slate-200/90 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="z-section-title mb-0 flex items-center gap-2">
              <Shield size={14} /> Branch isolation audit
            </h3>
            <button
              type="button"
              onClick={loadBranchAudit}
              disabled={branchAuditBusy}
              className="z-btn-secondary text-xs"
            >
              {branchAuditBusy ? 'Refreshing…' : 'Refresh audit'}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Checks branch-enabled tables for missing or invalid branch IDs.
          </p>
          {branchAudit ? (
            <>
              <div
                className={`mt-4 rounded-xl border px-4 py-3 text-xs ${
                  branchAudit.strictBranchIsolationOk
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-red-200 bg-red-50 text-red-800'
                }`}
              >
                <p className="font-semibold">
                  {branchAudit.strictBranchIsolationOk
                    ? 'Strict branch isolation: OK'
                    : 'Strict branch isolation: Issues found'}
                </p>
                <p className="mt-1">
                  Missing branch IDs: {branchAudit.totals?.missingBranchIdRows ?? 0} · Invalid branch IDs:{' '}
                  {branchAudit.totals?.invalidBranchIdRows ?? 0}
                </p>
              </div>
              <div className="mt-4 max-h-[280px] space-y-2 overflow-y-auto pr-1">
                {(branchAudit.tables || []).map((row) => (
                  <div key={row.table} className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
                    <p className="text-xs font-semibold text-slate-800">{row.table}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      Missing: {row.missingBranchIdRows} · Invalid: {row.invalidBranchIdRows}
                    </p>
                    {Array.isArray(row.sampleIds) && row.sampleIds.length > 0 ? (
                      <p className="mt-1 text-ui-xs text-slate-500">
                        Sample IDs: {row.sampleIds.join(', ')}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-4 text-xs text-slate-500">
              No audit loaded yet.
            </div>
          )}
        </section>
      ) : null}

      {auditLog.length > 0 ? (
        <section className="rounded-md border border-slate-200/90 bg-white p-6 shadow-sm">
          <h3 className="z-section-title flex items-center gap-2">
            <Shield size={14} /> Recent audit activity
          </h3>
          <div className="max-h-[min(520px,55vh)] space-y-3 overflow-y-auto pr-1">
            {auditLog.slice(0, 12).map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{entry.action}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {entry.actorName || 'System'} · {entry.entityKind || 'record'} · {entry.entityId || '—'}
                    </p>
                  </div>
                  <span className="z-stencil text-ui-xs text-slate-500">
                    {String(entry.occurredAtISO || '').replace('T', ' ').slice(0, 16)}
                  </span>
                </div>
                {entry.note ? <p className="mt-2 text-xs text-slate-600">{entry.note}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {showAdminDataReset ? (
        <section id="admin-reset" className="scroll-mt-6 space-y-5">
          <AdminDataResetPanel />
        </section>
      ) : null}
    </div>
  );
}
