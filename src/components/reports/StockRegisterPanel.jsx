import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ClipboardCheck, ChevronDown, Eye, Loader2, Printer, RefreshCw, Send } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../Data/mockData';
import { StockRegisterBmAdjustEditor } from './StockRegisterBmAdjustEditor';
import { StockRegisterPrintModal } from './StockRegisterPrintModal';
import { StockRegisterProcurementCosting } from './StockRegisterProcurementCosting';

const STATUS_STEPS = [
  { key: 'draft', label: 'Draft' },
  { key: 'printed', label: 'Printed' },
  { key: 'store_confirmed', label: 'With manager' },
  { key: 'bm_approved', label: 'BM OK' },
  { key: 'procurement_costed', label: 'Costed' },
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

function viewModeForRole(roleMode) {
  if (roleMode === 'procurement') return 'procurement';
  if (roleMode === 'reports') return 'finance';
  if (roleMode === 'manager') return 'manager';
  return 'store';
}

/**
 * Month-end stock register — role-based workflow (store / manager / procurement / reports).
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
  const [countNotes, setCountNotes] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [autoPrint, setAutoPrint] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [bmAdjustments, setBmAdjustments] = useState(null);
  const [procurementPricing, setProcurementPricing] = useState(null);
  const bmAdjustmentsRef = useRef(null);
  const procurementPricingRef = useRef(null);

  const viewMode = viewModeForRole(roleMode);
  const showCosting = roleMode === 'reports' || roleMode === 'procurement';

  const load = useCallback(async () => {
    if (!endDate || !branchId) return;
    setLoading(true);
    try {
      const { ok, data } = await apiFetch(
        `/api/stock-register?periodEnd=${encodeURIComponent(endDate)}&viewMode=${viewMode}`
      );
      if (!ok || !data?.ok) {
        showToast?.(data?.error || 'Could not load stock register.', { variant: 'error' });
        setRegister(null);
        return;
      }
      setRegister(data.register);
      setWorkflow(data.workflow);
      setCountNotes(data.workflow?.countNotes || '');
      setBmAdjustments(data.workflow?.bmAdjustments || null);
      setProcurementPricing(data.workflow?.procurementPricing || null);
    } finally {
      setLoading(false);
    }
  }, [endDate, branchId, showToast, viewMode]);

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

  const workflowAction = async (action, extra = {}) => {
    const periodKey = register?.periodKey || endDate?.slice(0, 7);
    const { ok, data } = await apiFetch('/api/stock-register/workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        periodKey,
        countNotes,
        adjustments: extra.adjustments ?? bmAdjustmentsRef.current ?? bmAdjustments,
        pricing: extra.pricing ?? procurementPricingRef.current ?? procurementPricing,
      }),
    });
    if (!ok || !data?.ok) {
      showToast?.(data?.error || 'Workflow step failed.', { variant: 'error' });
      return false;
    }
    setWorkflow(data.workflow);
    showToast?.(`Recorded: ${action.replace(/_/g, ' ')}`);
    await load();
    return true;
  };

  const saveBmAdjustments = async () => {
    const periodKey = register?.periodKey || endDate?.slice(0, 7);
    const adj = bmAdjustmentsRef.current ?? bmAdjustments;
    const { ok, data } = await apiFetch('/api/stock-register/bm-adjustments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ periodKey, adjustments: adj }),
    });
    if (!ok || !data?.ok) {
      showToast?.(data?.error || 'Could not save adjustments.', { variant: 'error' });
      return;
    }
    showToast?.('Count adjustments saved.');
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
  const status = workflow?.status || 'draft';
  const summary = register?.summary;
  const procurementSummary = register?.procurementSummary;

  const shellClass = embedded
    ? ''
    : 'z-soft-panel p-5 sm:p-6 mb-8 transition-all hover:border-teal-100/80';

  return (
    <>
      <div className={shellClass}>
        {!embedded ? (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-4">
            <div className="min-w-0 flex-1">
              <h4 className="text-lg font-black text-[#134e4a] tracking-tight">Month-end stock register</h4>
              <p className="text-sm font-medium text-slate-600 mt-1">
                {branchLabel || branchId} · period ending <strong>{endDate}</strong>
              </p>
              {register ? <WorkflowStepper status={status} /> : null}
            </div>
          </div>
        ) : (
          <div className="mb-3">
            {register ? <WorkflowStepper status={status} /> : null}
          </div>
        )}

        <div className="z-form-actions !mt-0 !pt-0 !border-0 flex-wrap">
          <button type="button" className="z-btn-secondary min-w-0" onClick={load} disabled={loading || !branchId}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Refresh
          </button>
          {roleMode !== 'procurement' ? (
            <>
              <button type="button" className="z-btn-secondary" onClick={openPreview} disabled={!register}>
                <Eye size={14} />
                Preview
              </button>
              {(roleMode === 'store' || roleMode === 'reports') && (
                <button type="button" className="z-btn-primary" onClick={printForCount} disabled={!register}>
                  <Printer size={14} />
                  Print
                </button>
              )}
            </>
          ) : null}
        </div>

        {!branchId ? (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
            Select a branch workspace (not HQ roll-up).
          </p>
        ) : null}

        {loading && !register ? (
          <p className="text-sm text-slate-500 flex items-center gap-2 mt-4">
            <Loader2 size={14} className="animate-spin" /> Loading…
          </p>
        ) : null}

        {roleMode === 'manager' && register && status !== 'locked' ? (
          <div className="mt-4">
            <StockRegisterBmAdjustEditor
              register={register}
              initialAdjustments={bmAdjustments}
              onChange={(adj) => {
                bmAdjustmentsRef.current = adj;
                setBmAdjustments(adj);
              }}
            />
            <div className="flex flex-wrap gap-2 mt-3">
              <button type="button" className="z-btn-secondary text-sm" onClick={saveBmAdjustments}>
                Save adjustments
              </button>
              <button
                type="button"
                className="z-btn-primary text-sm"
                disabled={!['store_confirmed', 'printed', 'bm_approved'].includes(status)}
                onClick={async () => {
                  await saveBmAdjustments();
                  await workflowAction('bm_approve');
                }}
              >
                Approve &amp; send to procurement
              </button>
              <button
                type="button"
                className="z-btn-secondary text-sm"
                disabled={!['store_confirmed'].includes(status)}
                onClick={() => workflowAction('bm_return_to_store')}
              >
                Return to store
              </button>
            </div>
          </div>
        ) : null}

        {roleMode === 'procurement' && register ? (
          <div className="mt-4">
            <StockRegisterProcurementCosting
              procurementSummary={procurementSummary}
              initialPricing={procurementPricing}
              onChange={(p) => {
                procurementPricingRef.current = p;
                setProcurementPricing(p);
              }}
            />
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                className="z-btn-primary text-sm"
                disabled={status !== 'bm_approved'}
                onClick={async () => {
                  const ok = await workflowAction('procurement_lock');
                  if (ok) await captureClosing();
                }}
              >
                Save costing, lock &amp; capture closing
              </button>
            </div>
          </div>
        ) : null}

        {showCosting && register && summary?.totalClosingValueNgn != null && roleMode !== 'procurement' ? (
          <p className="mt-3 text-sm font-bold text-[#134e4a]">
            Total closing value: {formatNgn(summary.totalClosingValueNgn || 0)}
          </p>
        ) : null}

        {roleMode === 'store' && register ? (
          <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
            <label className="block text-sm max-w-2xl">
              <span className="font-medium text-slate-700">Count notes</span>
              <textarea
                className="z-input w-full mt-1 min-h-[3rem]"
                value={countNotes}
                onChange={(e) => setCountNotes(e.target.value)}
                disabled={status === 'locked'}
              />
            </label>
            <button
              type="button"
              className="z-btn-primary text-sm inline-flex items-center gap-2"
              disabled={!['printed', 'draft'].includes(status)}
              onClick={() => workflowAction('forward_to_manager')}
            >
              <Send size={14} />
              Send to branch manager
            </button>
            <p className="text-xs text-slate-500">Print the register for the floor count first, then send to manager.</p>
          </div>
        ) : null}

        {roleMode === 'reports' && register && !embedded ? (
          <div className="mt-4 border-t border-slate-200 pt-3">
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
                {isBm ? (
                  <button
                    type="button"
                    className="z-btn-secondary text-sm"
                    disabled={status !== 'procurement_costed'}
                    onClick={captureClosing}
                  >
                    Capture closing
                  </button>
                ) : null}
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
        viewMode={viewMode}
      />
    </>
  );
}
