import React, { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck, Eye, Loader2, Printer, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { StockRegisterPrintContent } from './StockRegisterPrintContent';
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
    <ol className="flex flex-wrap gap-1 sm:gap-2 mt-3 print:hidden">
      {STATUS_STEPS.map((step, i) => {
        const done = idx >= i && idx >= 0;
        const active = step.key === status;
        return (
          <li
            key={step.key}
            className={`text-[10px] sm:text-xs font-bold px-2 py-1 rounded-full border ${
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

/**
 * Month-end stock register — load, preview/print, count sign-off workflow.
 */
export function StockRegisterPanel({ endDate, branchId, branchLabel, showToast, roleKey }) {
  const [loading, setLoading] = useState(false);
  const [register, setRegister] = useState(null);
  const [workflow, setWorkflow] = useState(null);
  const [countNotes, setCountNotes] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

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

  const openPreview = async () => {
    if (!register) return;
    setPreviewOpen(true);
  };

  const printForCount = async () => {
    const saved = await savePrintSnapshot();
    if (!saved) return;
    showToast?.('Snapshot saved for physical count.');
    setPreviewOpen(true);
    setTimeout(() => window.print(), 400);
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

  return (
    <>
      <div className="z-soft-panel p-5 sm:p-7 mb-10">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-2">
          <div className="min-w-0 flex-1">
            <h3 className="z-section-title">Month-end stock register</h3>
            <p className="text-sm text-slate-600 mt-1">
              <strong>{branchLabel || branchId}</strong> · Period ending <strong>{endDate}</strong>
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {register?.meta?.openingSource === 'previous_capture'
                ? 'Opening from prior month capture'
                : 'Opening derived from live balances + movements'}
              {register?.meta?.coilRowCount != null ? ` · ${register.meta.coilRowCount} coil lines` : ''}
            </p>
            <WorkflowStepper status={status} />
            {workflow?.storeConfirmedByName ? (
              <p className="text-xs text-teal-800 mt-2">
                Store: {workflow.storeConfirmedByName}
                {workflow.bmApprovedByName ? ` · BM: ${workflow.bmApprovedByName}` : ''}
                {workflow.mdApprovedByName ? ` · MD: ${workflow.mdApprovedByName}` : ''}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button type="button" className="z-btn-secondary" onClick={load} disabled={loading || !branchId}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Refresh
            </button>
            <button type="button" className="z-btn-secondary" onClick={openPreview} disabled={!register}>
              <Eye size={14} />
              Preview
            </button>
            <button type="button" className="z-btn-primary" onClick={printForCount} disabled={!register || !branchId}>
              <Printer size={14} />
              Print for count
            </button>
          </div>
        </div>

        {!branchId ? (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
            Select a branch workspace (not HQ roll-up) to build the stock register.
          </p>
        ) : null}

        {register && branchId ? (
          <div className="mt-6 border border-slate-200 rounded-lg bg-white p-4 sm:p-5 max-h-[min(70vh,900px)] overflow-y-auto">
            <StockRegisterPrintContent register={register} branchId={branchId} branchLabel={branchLabel} />
          </div>
        ) : null}

        {loading && !register ? (
          <p className="text-sm text-slate-500 flex items-center gap-2 mt-4">
            <Loader2 size={14} className="animate-spin" /> Loading register…
          </p>
        ) : null}

        {register && branchId ? (
          <div className="border-t border-slate-200 pt-5 mt-6 space-y-4">
            <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <ClipboardCheck size={16} />
              Sign-off workflow
            </h4>
            <label className="block text-sm max-w-2xl">
              <span className="font-medium text-slate-700">Count / reconciliation notes</span>
              <textarea
                className="z-input w-full mt-1 min-h-[4rem]"
                value={countNotes}
                onChange={(e) => setCountNotes(e.target.value)}
                placeholder="Variances found on floor, adjustments pending…"
                disabled={status === 'locked'}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="z-btn-primary"
                disabled={status === 'locked' || !['printed', 'store_confirmed'].includes(status)}
                onClick={() => workflowAction('store_confirm')}
              >
                Store confirms count
              </button>
              {isBm ? (
                <button
                  type="button"
                  className="z-btn-secondary"
                  disabled={status !== 'store_confirmed'}
                  onClick={() => workflowAction('bm_approve')}
                >
                  Branch manager approve
                </button>
              ) : null}
              {isMd ? (
                <button
                  type="button"
                  className="z-btn-secondary"
                  disabled={status !== 'bm_approved'}
                  onClick={() => workflowAction('md_approve')}
                >
                  MD approve
                </button>
              ) : null}
              <button
                type="button"
                className="z-btn-secondary"
                disabled={status !== 'md_approved'}
                onClick={captureClosing}
              >
                Capture closing
              </button>
            </div>
            <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
              <strong>Print for count</strong> saves a snapshot then opens print preview. Complete the floor count,
              note variances, adjust stock in Operations if needed, then Store → BM → MD → Capture closing for next
              month&apos;s opening.
            </p>
          </div>
        ) : null}
      </div>

      <StockRegisterPrintModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        register={register}
        branchId={branchId}
        branchLabel={branchLabel}
        workflow={workflow}
      />
    </>
  );
}
