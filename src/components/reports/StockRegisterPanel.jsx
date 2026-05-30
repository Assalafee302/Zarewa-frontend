import React, { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck, ChevronDown, Eye, Loader2, Printer, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../Data/mockData';
import { StockRegisterPrintModal } from './StockRegisterPrintModal';

const STATUS_STEPS = [
  { key: 'draft', label: 'Draft' },
  { key: 'printed', label: 'Printed' },
  { key: 'store_confirmed', label: 'Store' },
  { key: 'bm_approved', label: 'BM' },
  { key: 'md_approved', label: 'MD' },
  { key: 'locked', label: 'Locked' },
];

function WorkflowStepper({ status }) {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  return (
    <ol className="flex flex-wrap gap-1 mt-2">
      {STATUS_STEPS.map((step, i) => {
        const done = idx >= i && idx >= 0;
        const active = step.key === status;
        return (
          <li
            key={step.key}
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              active
                ? 'bg-teal-700 text-white border-teal-700'
                : done
                  ? 'bg-teal-50 text-teal-800 border-teal-200'
                  : 'bg-slate-50 text-slate-400 border-slate-200'
            }`}
          >
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}

function priceSourceLabel(source) {
  const s = String(source || '').toLowerCase();
  if (s.includes('purchase_grn')) return '31d GRN ₦/kg';
  if (s.includes('purchase_kg')) return '31d PO kg price';
  if (s.includes('purchase_metre')) return '31d PO m→₦/kg';
  if (s.includes('purchase_31d') || s === 'purchase_avg') return '31d purchase ₦/kg';
  if (s === 'coil_lots_all') return 'Coil lots avg ₦/kg';
  if (s === 'receipt_avg') return '31d receipt avg';
  return '—';
}

function SummaryStat({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white/80 px-3 py-2.5 min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 truncate">{label}</p>
      <p className="text-sm font-black text-slate-900 tabular-nums mt-0.5 truncate">{value}</p>
      {sub ? <p className="text-[10px] text-slate-500 mt-0.5 truncate">{sub}</p> : null}
    </div>
  );
}

/**
 * Month-end stock register — compact card; full detail in preview / print modal.
 */
export function StockRegisterPanel({ endDate, branchId, branchLabel, showToast, roleKey }) {
  const [loading, setLoading] = useState(false);
  const [register, setRegister] = useState(null);
  const [workflow, setWorkflow] = useState(null);
  const [countNotes, setCountNotes] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [autoPrint, setAutoPrint] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(false);

  const load = useCallback(async () => {
    if (!endDate || !branchId) return;
    setLoading(true);
    try {
      const { ok, data } = await apiFetch(`/api/stock-register?periodEnd=${encodeURIComponent(endDate)}`);
      if (!ok || !data?.ok) {
        showToast?.(data?.error || 'Could not load stock register.', { variant: 'error' });
        setRegister(null);
        return;
      }
      setRegister(data.register);
      setWorkflow(data.workflow);
      setCountNotes(data.workflow?.countNotes || '');
    } finally {
      setLoading(false);
    }
  }, [endDate, branchId, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const savePrintSnapshot = async () => {
    const { ok, data } = await apiFetch('/api/stock-register/print-snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ periodEnd: endDate }),
    });
    if (!ok || !data?.ok) {
      showToast?.(data?.error || 'Print snapshot failed.', { variant: 'error' });
      return false;
    }
    setRegister(data.register);
    setWorkflow(data.workflow);
    return true;
  };

  const openPreview = () => {
    if (!register) return;
    setAutoPrint(false);
    setPreviewOpen(true);
  };

  const printForCount = async () => {
    const saved = await savePrintSnapshot();
    if (!saved) return;
    showToast?.('Snapshot saved for physical count.');
    setAutoPrint(true);
    setPreviewOpen(true);
  };

  const workflowAction = async (action) => {
    const periodKey = register?.periodKey || endDate?.slice(0, 7);
    const { ok, data } = await apiFetch('/api/stock-register/workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, periodKey, countNotes }),
    });
    if (!ok || !data?.ok) {
      showToast?.(data?.error || 'Workflow step failed.', { variant: 'error' });
      return;
    }
    setWorkflow(data.workflow);
    showToast?.(`Recorded: ${action.replace(/_/g, ' ')}`);
    await load();
  };

  const captureClosing = async () => {
    const { ok, data } = await apiFetch('/api/stock-register/capture-closing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ periodEnd: endDate }),
    });
    if (!ok || !data?.ok) {
      showToast?.(data?.error || 'Capture failed.', { variant: 'error' });
      return;
    }
    setWorkflow(data.workflow);
    showToast?.(`Closing captured (${data.coilLineCount} coil lines) — next month opening ready.`);
    await load();
  };

  const rk = String(roleKey || '').toLowerCase();
  const isBm = rk === 'sales_manager' || rk === 'branch_manager' || rk === 'admin' || rk === 'md';
  const isMd = rk === 'md' || rk === 'admin';
  const status = workflow?.status || 'draft';
  const summary = register?.summary;

  return (
    <>
      <div className="z-soft-panel p-5 sm:p-6 mb-8 transition-all hover:border-teal-100/80">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <h4 className="text-lg font-black text-[#134e4a] tracking-tight">Month-end stock register</h4>
            <p className="text-sm font-medium text-slate-600 mt-1 leading-relaxed">
              Physical count register for <strong>{branchLabel || branchId || 'branch'}</strong> · period ending{' '}
              <strong>{endDate}</strong>
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {register?.meta?.openingSource === 'previous_capture'
                ? 'Opening from prior month capture'
                : 'Opening derived from live balances + movements'}
              {register?.meta?.coilRowCount != null ? ` · ${register.meta.coilRowCount} coil lines` : ''}
            </p>
            {register ? <WorkflowStepper status={status} /> : null}
          </div>

          <div className="z-form-actions !mt-0 !pt-0 !border-0 flex-wrap shrink-0">
            <button type="button" className="z-btn-secondary min-w-0" onClick={load} disabled={loading || !branchId}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Refresh
            </button>
            <button
              type="button"
              className="z-btn-secondary min-w-0 flex-1 justify-center sm:min-w-[9rem]"
              onClick={openPreview}
              disabled={!register}
            >
              <Eye size={14} />
              Preview
            </button>
            <button
              type="button"
              className="z-btn-primary min-w-0 flex-1 justify-center sm:min-w-[9rem]"
              onClick={printForCount}
              disabled={!register || !branchId}
            >
              <Printer size={14} />
              Print
            </button>
          </div>
        </div>

        {!branchId ? (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
            Select a branch workspace (not HQ roll-up) to build the stock register.
          </p>
        ) : null}

        {loading && !register ? (
          <p className="text-sm text-slate-500 flex items-center gap-2 mt-4">
            <Loader2 size={14} className="animate-spin" /> Loading register…
          </p>
        ) : null}

        {register && branchId ? (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <SummaryStat
              label="Alu net kg"
              value={summary?.aluminium?.netClosingKg?.toLocaleString() ?? '—'}
              sub={
                summary?.aluminium?.unitCostNgnPerKg
                  ? `${formatNgn(summary.aluminium.unitCostNgnPerKg)}/kg · ${priceSourceLabel(summary.aluminium.priceSource)}`
                  : 'No kg price'
              }
            />
            <SummaryStat
              label="Alu closing ₦"
              value={formatNgn(summary?.aluminium?.valueNgn || 0)}
            />
            <SummaryStat
              label="Aluzinc net kg"
              value={summary?.aluzinc?.netClosingKg?.toLocaleString() ?? '—'}
              sub={
                summary?.aluzinc?.unitCostNgnPerKg
                  ? `${formatNgn(summary.aluzinc.unitCostNgnPerKg)}/kg · ${priceSourceLabel(summary.aluzinc.priceSource)}`
                  : 'No kg price'
              }
            />
            <SummaryStat
              label="Stone remain m"
              value={summary?.stoneCoated?.totalRemainingM?.toLocaleString() ?? '—'}
              sub={
                summary?.stoneCoated?.unitPriceNgnPerM
                  ? `${formatNgn(summary.stoneCoated.unitPriceNgnPerM)}/m · ${priceSourceLabel(summary.stoneCoated.priceSource)}`
                  : 'No m price'
              }
            />
            <SummaryStat
              label="Accessories ₦"
              value={formatNgn(summary?.accessories?.valueNgn || 0)}
              sub={
                summary?.accessories?.unitPriceNgn
                  ? `${formatNgn(summary.accessories.unitPriceNgn)}/unit · ${priceSourceLabel(summary.accessories.priceSource)}`
                  : 'No unit price'
              }
            />
            <SummaryStat
              label="Total closing ₦"
              value={formatNgn(summary?.totalClosingValueNgn || 0)}
              sub="Alu + aluzinc + stone + acc"
            />
          </div>
        ) : null}

        {register && branchId ? (
          <div className="mt-4 border-t border-slate-200/80 pt-3">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 text-left text-sm font-bold text-slate-800 py-1"
              onClick={() => setWorkflowOpen((v) => !v)}
            >
              <span className="flex items-center gap-2">
                <ClipboardCheck size={16} className="text-teal-700" />
                Sign-off workflow
                {workflow?.storeConfirmedByName ? (
                  <span className="text-xs font-medium text-teal-800">
                    · Store: {workflow.storeConfirmedByName}
                  </span>
                ) : null}
              </span>
              <ChevronDown size={16} className={`shrink-0 transition ${workflowOpen ? 'rotate-180' : ''}`} />
            </button>
            {workflowOpen ? (
              <div className="mt-3 space-y-3 pb-1">
                <label className="block text-sm max-w-2xl">
                  <span className="font-medium text-slate-700">Count / reconciliation notes</span>
                  <textarea
                    className="z-input w-full mt-1 min-h-[3.5rem]"
                    value={countNotes}
                    onChange={(e) => setCountNotes(e.target.value)}
                    placeholder="Variances found on floor, adjustments pending…"
                    disabled={status === 'locked'}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="z-btn-primary text-sm"
                    disabled={status === 'locked' || !['printed', 'store_confirmed'].includes(status)}
                    onClick={() => workflowAction('store_confirm')}
                  >
                    Store confirms count
                  </button>
                  {isBm ? (
                    <button
                      type="button"
                      className="z-btn-secondary text-sm"
                      disabled={status !== 'store_confirmed'}
                      onClick={() => workflowAction('bm_approve')}
                    >
                      Branch manager approve
                    </button>
                  ) : null}
                  {isMd ? (
                    <button
                      type="button"
                      className="z-btn-secondary text-sm"
                      disabled={status !== 'bm_approved'}
                      onClick={() => workflowAction('md_approve')}
                    >
                      MD approve
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="z-btn-secondary text-sm"
                    disabled={status !== 'md_approved'}
                    onClick={captureClosing}
                  >
                    Capture closing
                  </button>
                </div>
                <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
                  Print saves a snapshot for the floor count. After variances are noted and stock adjusted, complete
                  Store → BM → MD → Capture closing for next month&apos;s opening.
                </p>
              </div>
            ) : null}
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
      />
    </>
  );
}
