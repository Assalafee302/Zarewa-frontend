import React, { useCallback, useEffect, useState } from 'react';
import {
  ClipboardCheck,
  ChevronDown,
  Eye,
  Loader2,
  Lock,
  Printer,
  RefreshCw,
} from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import {
  formatStockRegisterMonth,
  isCaptureReadyStatus,
  stockRegisterWaitingLabel,
} from '../../lib/stockRegisterPeriod';
import { StockRegisterPrintModal } from './StockRegisterPrintModal';
import {
  fetchStockRegister,
  printStockRegisterSnapshot,
  reopenStockRegisterClosing,
} from './stockRegister/stockRegisterApi';
import { StockRegisterCeremonyRail } from './stockRegister/StockRegisterCeremonyRail';
import { StockRegisterStoreConfirmWorkspace } from './stockRegister/StockRegisterStoreConfirmWorkspace';
import { StockRegisterBmClearanceWorkspace } from './stockRegister/StockRegisterBmClearanceWorkspace';
import { StockRegisterProcurementWorkspace } from './stockRegister/StockRegisterProcurementWorkspace';
import { StockRegisterCaptureConfirmModal } from './stockRegister/StockRegisterCaptureConfirmModal';

function viewModeForRole(roleMode) {
  if (roleMode === 'procurement') return 'procurement';
  if (roleMode === 'reports') return 'finance';
  if (roleMode === 'manager') return 'manager';
  return 'store';
}

function isExecutiveRole(roleKey) {
  const rk = String(roleKey || '').toLowerCase();
  return rk === 'md' || rk === 'admin';
}

function DeskKpi({ label, value, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-slate-200 bg-white text-slate-800',
    warn: 'border-amber-200 bg-amber-50 text-amber-950',
    ok: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    brand: 'border-teal-200 bg-teal-50 text-teal-950',
  };
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${tones[tone] || tones.neutral}`}>
      <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-bold mt-0.5 truncate">{value}</p>
    </div>
  );
}

/**
 * Month-end stock desk body — role workspace inline; print + capture as focused modals only.
 */
export function StockRegisterPanel({
  roleMode = 'reports',
  embedded = false,
  endDate,
  branchId,
  branchLabel,
  showToast,
  roleKey,
}) {
  const [loading, setLoading] = useState(false);
  const [register, setRegister] = useState(null);
  const [workflow, setWorkflow] = useState(null);
  const [procurementPricing, setProcurementPricing] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [autoPrint, setAutoPrint] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopening, setReopening] = useState(false);

  const viewMode = viewModeForRole(roleMode);
  const showCosting = roleMode === 'reports' || roleMode === 'procurement';
  const periodKey = register?.periodKey || endDate?.slice(0, 7);

  const load = useCallback(async () => {
    if (!endDate || !branchId) return;
    setLoading(true);
    try {
      const { ok, data } = await fetchStockRegister(endDate, viewMode);
      if (!ok || !data?.ok) {
        showToast?.(data?.error || 'Could not load stock register.', { variant: 'error' });
        setRegister(null);
        return;
      }
      setRegister(data.register);
      setWorkflow(data.workflow);
      setProcurementPricing(data.workflow?.procurementPricing || null);
    } finally {
      setLoading(false);
    }
  }, [endDate, branchId, showToast, viewMode]);

  useEffect(() => {
    load();
  }, [load]);

  const handleWorkflowSaved = (data) => {
    if (data?.workflow) setWorkflow(data.workflow);
    load();
  };

  const openPreview = () => {
    if (!register) return;
    setAutoPrint(false);
    setPreviewOpen(true);
  };

  const printForCount = async () => {
    if (
      !window.confirm(
        'Create a versioned count snapshot and open the blind count sheet?\n\nSystem closing quantities will be blank so the yard writes counted figures.'
      )
    ) {
      return;
    }
    const { ok, data } = await printStockRegisterSnapshot(endDate);
    if (!ok || !data?.ok) {
      showToast?.(data?.error || 'Print snapshot failed.', { variant: 'error' });
      return;
    }
    setRegister(data.register);
    setWorkflow(data.workflow);
    showToast?.('Count snapshot saved — write yard figures in the Counted column.');
    setAutoPrint(true);
    setPreviewOpen(true);
  };

  const handleReopen = async () => {
    if (!endDate || !branchId) {
      showToast?.('Period and branch are required to reopen.', { variant: 'error' });
      return;
    }
    const why = String(reopenReason || '').trim();
    if (why.length < 8) {
      showToast?.('Enter a reopen reason (at least 8 characters).', { variant: 'error' });
      return;
    }
    setReopening(true);
    try {
      const { ok, data } = await reopenStockRegisterClosing(endDate, why);
      if (!ok || !data?.ok) {
        showToast?.(data?.error || 'Reopen failed.', { variant: 'error' });
        return;
      }
      setWorkflow(data.workflow);
      setReopenReason('');
      showToast?.('Register reopened — correct costing if needed, then Capture & lock again.');
      load();
    } finally {
      setReopening(false);
    }
  };

  const isExecutive = isExecutiveRole(roleKey);
  const status = workflow?.status || 'draft';
  const summary = register?.summary;
  const procurementSummary = register?.procurementSummary;
  const monthLabel = formatStockRegisterMonth(endDate);
  const waiting = stockRegisterWaitingLabel(status);

  const shellClass = embedded
    ? 'space-y-4'
    : 'z-soft-panel p-5 sm:p-6 mb-8 space-y-4 transition-all hover:border-teal-100/80';

  return (
    <>
      <div className={shellClass}>
        {!embedded ? (
          <div className="min-w-0">
            <h4 className="text-lg font-black text-zarewa-teal tracking-tight">Month-end stock desk</h4>
            <p className="text-sm font-medium text-slate-600 mt-1">
              {branchLabel || branchId} · <strong>{monthLabel}</strong>
            </p>
          </div>
        ) : null}

        {register ? <StockRegisterCeremonyRail status={status} /> : null}

        {register ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <DeskKpi label="Month" value={monthLabel} tone="brand" />
            <DeskKpi
              label="Waiting"
              value={waiting}
              tone={status === 'locked' ? 'ok' : 'warn'}
            />
            <DeskKpi
              label="Stage"
              value={String(status).replace(/_/g, ' ')}
              tone="neutral"
            />
            <DeskKpi
              label="Closing value"
              value={
                showCosting && summary?.totalClosingValueNgn != null
                  ? formatNgn(summary.totalClosingValueNgn || 0)
                  : roleMode === 'store' || roleMode === 'manager'
                    ? 'Hidden on count'
                    : '—'
              }
              tone="neutral"
            />
          </div>
        ) : null}

        <div className="z-form-actions !mt-0 !pt-0 !border-0 flex-wrap">
          <button type="button" className="z-btn-secondary min-w-0" onClick={load} disabled={loading || !branchId}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Refresh
          </button>
          {roleMode !== 'procurement' ? (
            <>
              <button type="button" className="z-btn-secondary" onClick={openPreview} disabled={!register}>
                <Eye size={14} />
                Screen preview
              </button>
              {(roleMode === 'store' || roleMode === 'manager' || roleMode === 'reports') && (
                <button
                  type="button"
                  className={status === 'draft' || status === 'printed' ? 'z-btn-primary' : 'z-btn-secondary'}
                  onClick={printForCount}
                  disabled={!register}
                  title="Creates a versioned snapshot and opens the blind count sheet"
                >
                  <Printer size={14} />
                  Print for count
                </button>
              )}
            </>
          ) : null}
          {roleMode === 'reports' && isCaptureReadyStatus(status) ? (
            <button type="button" className="z-btn-secondary inline-flex items-center gap-1" onClick={() => setCaptureOpen(true)}>
              <Lock size={14} />
              Capture &amp; lock (audit)
            </button>
          ) : null}
        </div>

        {!branchId ? (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
            Select a branch workspace (not HQ roll-up).
          </p>
        ) : null}

        {loading && !register ? (
          <p className="text-sm text-slate-500 flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" /> Loading…
          </p>
        ) : null}

        {/* Role workspaces — inline, not nested modals */}
        {roleMode === 'store' && register ? (
          <div className="space-y-3">
            {status === 'draft' ? (
              <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 text-sm text-teal-950">
                <p className="font-bold">Start with Print for count</p>
                <p className="text-xs mt-1 leading-relaxed">
                  Creates a blind count sheet (system Close blank). After the yard counts, complete the checklist
                  below and send to the manager.
                </p>
              </div>
            ) : null}
            <StockRegisterStoreConfirmWorkspace
              periodKey={periodKey}
              periodEnd={endDate}
              workflow={workflow}
              initialCountNotes={workflow?.countNotes}
              initialChecklist={workflow?.storeChecklist}
              showToast={showToast}
              onSaved={handleWorkflowSaved}
            />
          </div>
        ) : null}

        {roleMode === 'manager' && register ? (
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-bold text-zarewa-teal">Manager clearance</h3>
              <p className="text-xs text-slate-500 mt-0.5">Clear every line, then approve to procurement</p>
            </div>
            <StockRegisterBmClearanceWorkspace
              register={register}
              workflow={workflow}
              periodKey={periodKey}
              showToast={showToast}
              onSaved={handleWorkflowSaved}
              onPrint={openPreview}
            />
          </div>
        ) : null}

        {roleMode === 'procurement' && register ? (
          <StockRegisterProcurementWorkspace
            periodKey={periodKey}
            procurementSummary={procurementSummary}
            accessoryBalance={(register?.accessories?.rows || []).reduce(
              (s, r) => s + (Number(r.balance) || 0),
              0
            )}
            initialPricing={procurementPricing}
            workflow={workflow}
            showToast={showToast}
            onSaved={handleWorkflowSaved}
            onCapture={() => setCaptureOpen(true)}
          />
        ) : null}

        {roleMode === 'reports' && register ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
            <h3 className="text-base font-bold text-zarewa-teal">Finance view</h3>
            <p className="text-sm text-slate-600">
              {waiting}. Store and manager work their desks; procurement costs and locks.
            </p>
            {summary?.totalClosingValueNgn != null ? (
              <p className="text-sm font-bold text-zarewa-teal">
                Total closing value: {formatNgn(summary.totalClosingValueNgn || 0)}
              </p>
            ) : null}
          </div>
        ) : null}

        {register?.materialDamageSummary?.categories?.length ? (
          <section className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4">
            <p className="text-ui-xs font-black uppercase tracking-widest text-amber-900 mb-2">
              Material damage this period (MEX)
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-ui-xs">
                <thead>
                  <tr className="text-left text-slate-500 uppercase">
                    <th className="py-1 pr-2">Category</th>
                    <th className="py-1 pr-2">Disposition</th>
                    <th className="py-1 pr-2 text-right">Count</th>
                    <th className="py-1 pr-2 text-right">Metres</th>
                    <th className="py-1 text-right">Kg</th>
                  </tr>
                </thead>
                <tbody>
                  {register.materialDamageSummary.categories.map((row, idx) => (
                    <tr key={idx} className="border-t border-amber-100/80">
                      <td className="py-1 pr-2 font-semibold text-slate-800">
                        {row.incidentType?.replace(/_/g, ' ')}
                        {row.materialFamily ? ` · ${row.materialFamily}` : ''}
                      </td>
                      <td className="py-1 pr-2 text-slate-600">
                        {row.returnDisposition?.replace(/_/g, ' ') || '—'}
                      </td>
                      <td className="py-1 pr-2 text-right tabular-nums">{row.count}</td>
                      <td className="py-1 pr-2 text-right tabular-nums">
                        {Number(row.totalMeters || 0).toFixed(2)}
                      </td>
                      <td className="py-1 text-right tabular-nums">
                        {Number(row.kgDeducted || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {roleMode === 'reports' && register && !embedded ? (
          <div className="border-t border-slate-200 pt-3">
            <button
              type="button"
              className="flex w-full items-center justify-between text-sm font-bold text-slate-800 py-1"
              onClick={() => setWorkflowOpen((v) => !v)}
            >
              <span className="flex items-center gap-2">
                <ClipboardCheck size={16} />
                Audit workflow
              </span>
              <ChevronDown size={16} className={`transition ${workflowOpen ? 'rotate-180' : ''}`} />
            </button>
            {workflowOpen ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {isCaptureReadyStatus(status) ? (
                  <button type="button" className="z-btn-secondary text-sm" onClick={() => setCaptureOpen(true)}>
                    Capture &amp; lock (audit)
                  </button>
                ) : null}
                {isExecutive && status === 'locked' ? (
                  <div className="flex flex-wrap items-end gap-2 w-full">
                    <div className="min-w-[220px] flex-1">
                      <label className="text-ui-xs font-bold uppercase text-slate-500">Reopen reason</label>
                      <input
                        value={reopenReason}
                        onChange={(e) => setReopenReason(e.target.value)}
                        className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        placeholder="Why reopen this locked register?"
                      />
                    </div>
                    <button
                      type="button"
                      className="z-btn-secondary text-sm"
                      disabled={reopening}
                      onClick={handleReopen}
                    >
                      {reopening ? 'Reopening…' : 'Reopen locked register'}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {roleMode === 'reports' && isExecutive && status === 'locked' && embedded ? (
          <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-4">
            <div className="min-w-[220px] flex-1">
              <label className="text-ui-xs font-bold uppercase text-slate-500">Reopen reason</label>
              <input
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Why reopen this locked register?"
              />
            </div>
            <button type="button" className="z-btn-secondary text-sm" disabled={reopening} onClick={handleReopen}>
              {reopening ? 'Reopening…' : 'Reopen locked register'}
            </button>
          </div>
        ) : null}
      </div>

      <StockRegisterPrintModal
        open={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setAutoPrint(false);
        }}
        register={register}
        branchId={branchId}
        branchLabel={branchLabel}
        workflow={workflow}
        autoPrint={autoPrint}
        viewMode={viewMode}
      />

      <StockRegisterCaptureConfirmModal
        open={captureOpen}
        onClose={() => setCaptureOpen(false)}
        periodEnd={endDate}
        branchLabel={branchLabel || branchId}
        workflow={workflow}
        showToast={showToast}
        onSaved={handleWorkflowSaved}
      />
    </>
  );
}
