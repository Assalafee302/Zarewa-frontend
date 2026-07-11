import React, { useCallback, useEffect, useState } from 'react';
import {
  ClipboardCheck,
  ChevronDown,
  Eye,
  Loader2,
  Lock,
  Printer,
  RefreshCw,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { StockRegisterPrintModal } from './StockRegisterPrintModal';
import { STATUS_STEPS } from './stockRegister/stockRegisterConstants';
import {
  fetchStockRegister,
  printStockRegisterSnapshot,
  reopenStockRegisterClosing,
} from './stockRegister/stockRegisterApi';
import { StockRegisterStoreConfirmModal } from './stockRegister/StockRegisterStoreConfirmModal';
import { StockRegisterBmReviewModal } from './stockRegister/StockRegisterBmReviewModal';
import { StockRegisterProcurementModal } from './stockRegister/StockRegisterProcurementModal';
import { StockRegisterCaptureConfirmModal } from './stockRegister/StockRegisterCaptureConfirmModal';
import { StockRegisterMdApproveModal } from './stockRegister/StockRegisterMdApproveModal';

function WorkflowStepper({ status, roleMode }) {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  const nextHint = (() => {
    const st = String(status || 'draft');
    if (roleMode === 'store') {
      if (st === 'draft') return 'Next: Print for count';
      if (st === 'printed') return 'Next: Store confirm → send to manager';
      if (st === 'store_confirmed') return 'Waiting on branch manager';
      return '';
    }
    if (roleMode === 'manager') {
      if (st === 'store_confirmed' || st === 'printed') return 'Next: Clear lines → Approve';
      if (st === 'bm_approved') return 'Waiting on procurement costing';
      return '';
    }
    if (roleMode === 'procurement') {
      if (st === 'bm_approved') return 'Next: Enter costing';
      if (st === 'procurement_costed') return 'Waiting on MD approve';
      if (st === 'md_approved') return 'Next: Capture & lock';
      return '';
    }
    if (st === 'procurement_costed') return 'Next: MD approve closing value';
    if (st === 'md_approved') return 'Next: Capture & lock (procurement)';
    return '';
  })();

  return (
    <div className="mt-2 space-y-1.5">
      <ol className="flex flex-wrap gap-1">
        {STATUS_STEPS.map((step, i) => {
          const done = idx >= i && idx >= 0;
          const active = step.key === status;
          return (
            <li
              key={step.key}
              className={`text-ui-xs font-bold px-2 py-0.5 rounded-full border ${
                active
                  ? 'bg-teal-700 text-white border-teal-700'
                  : done
                    ? 'bg-teal-50 text-teal-800 border-teal-200'
                    : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}
            >
              <span className="opacity-70 mr-1">{i + 1}.</span>
              {step.label}
            </li>
          );
        })}
      </ol>
      {nextHint ? <p className="text-ui-xs font-semibold text-teal-800">{nextHint}</p> : null}
    </div>
  );
}

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
  const [procurementPricing, setProcurementPricing] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [autoPrint, setAutoPrint] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [storeConfirmOpen, setStoreConfirmOpen] = useState(false);
  const [bmReviewOpen, setBmReviewOpen] = useState(false);
  const [procurementOpen, setProcurementOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [mdApproveOpen, setMdApproveOpen] = useState(false);
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
      showToast?.('Period end date and branch are required to reopen.', { variant: 'error' });
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
      showToast?.('Register reopened to MD approved — correct then Capture again.');
      load();
    } finally {
      setReopening(false);
    }
  };

  const rk = String(roleKey || '').toLowerCase();
  const isBm =
    rk === 'sales_manager' || rk === 'branch_manager' || rk === 'admin' || rk === 'md';
  const isExecutive = isExecutiveRole(roleKey);
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
              <h4 className="text-lg font-black text-zarewa-teal tracking-tight">Month-end stock register</h4>
              <p className="text-sm font-medium text-slate-600 mt-1">
                {branchLabel || branchId} · period ending <strong>{endDate}</strong>
              </p>
              {register ? <WorkflowStepper status={status} roleMode={roleMode} /> : null}
            </div>
          </div>
        ) : (
          <div className="mb-3">
            {register ? <WorkflowStepper status={status} roleMode={roleMode} /> : null}
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

          {roleMode === 'store' && register ? (
            <button
              type="button"
              className="z-btn-primary inline-flex items-center gap-2"
              disabled={status !== 'printed'}
              onClick={() => setStoreConfirmOpen(true)}
              title={status !== 'printed' ? 'Print the count sheet first' : ''}
            >
              <Send size={14} />
              Store confirm
            </button>
          ) : null}

          {roleMode === 'manager' && register && status !== 'locked' ? (
            <button
              type="button"
              className="z-btn-primary inline-flex items-center gap-2"
              disabled={!['store_confirmed', 'printed', 'bm_approved'].includes(status)}
              onClick={() => setBmReviewOpen(true)}
            >
              <ClipboardCheck size={14} />
              Review register
            </button>
          ) : null}

          {roleMode === 'procurement' && register ? (
            <>
              {status === 'bm_approved' ? (
                <button
                  type="button"
                  className="z-btn-primary text-sm inline-flex items-center gap-1"
                  onClick={() => setProcurementOpen(true)}
                >
                  Enter costing
                </button>
              ) : null}
              {['procurement_costed', 'md_approved', 'locked'].includes(status) ? (
                <button
                  type="button"
                  className="z-btn-secondary text-sm inline-flex items-center gap-1"
                  onClick={() => setProcurementOpen(true)}
                >
                  View costing
                </button>
              ) : null}
              {status === 'md_approved' ? (
                <button
                  type="button"
                  className="z-btn-primary text-sm inline-flex items-center gap-1"
                  onClick={() => setCaptureOpen(true)}
                >
                  <Lock size={14} />
                  Capture &amp; lock
                </button>
              ) : null}
            </>
          ) : null}

          {roleMode === 'reports' && isExecutive && register && status === 'procurement_costed' ? (
            <button
              type="button"
              className="z-btn-primary text-sm inline-flex items-center gap-1"
              onClick={() => setMdApproveOpen(true)}
            >
              <ShieldCheck size={14} />
              Approve closing stock value
            </button>
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

        {roleMode === 'store' && register ? (
          <p className="text-xs text-slate-500 mt-3">
            {status === 'draft'
              ? 'Print for count first (creates a blind count sheet), then Store confirm to send to the branch manager.'
              : status === 'printed'
                ? 'Count sheet printed — complete Store confirm when the yard count is done.'
                : 'Store confirmation follows Print for count → Send to manager.'}
          </p>
        ) : null}

        {roleMode === 'procurement' && register && status === 'procurement_costed' ? (
          <p className="text-xs text-teal-800 bg-teal-50 border border-teal-200 rounded-lg p-2 mt-3">
            Costing saved — next: MD approves closing value, then you Capture &amp; lock.
          </p>
        ) : null}

        {roleMode === 'reports' && isExecutive && status === 'procurement_costed' ? (
          <p className="text-xs text-teal-900 bg-teal-50 border border-teal-200 rounded-lg p-2 mt-3">
            Costing is ready — use <strong>Approve closing stock value</strong> above. Capture &amp; lock is done by
            procurement after your approval.
          </p>
        ) : null}

        {showCosting && register && summary?.totalClosingValueNgn != null && roleMode !== 'procurement' ? (
          <p className="mt-3 text-sm font-bold text-zarewa-teal">
            Total closing value: {formatNgn(summary.totalClosingValueNgn || 0)}
          </p>
        ) : null}

        {register?.materialDamageSummary?.categories?.length ? (
          <section className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/40 p-4">
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
                      <td className="py-1 pr-2 text-slate-600">{row.returnDisposition?.replace(/_/g, ' ') || '—'}</td>
                      <td className="py-1 pr-2 text-right tabular-nums">{row.count}</td>
                      <td className="py-1 pr-2 text-right tabular-nums">{Number(row.totalMeters || 0).toFixed(2)}</td>
                      <td className="py-1 text-right tabular-nums">{Number(row.kgDeducted || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {register.materialDamageSummary.poolBalance?.length ? (
              <p className="mt-2 text-ui-xs text-amber-950">
                Offcut pool balance:{' '}
                {register.materialDamageSummary.poolBalance
                  .reduce((s, r) => s + (Number(r.metersAvailable) || 0), 0)
                  .toFixed(2)}{' '}
                m across {register.materialDamageSummary.poolBalance.length} incident(s) — reference MEX IDs on
                production complete and count variances.
              </p>
            ) : null}
          </section>
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
                {isExecutive && status === 'procurement_costed' ? (
                  <button type="button" className="z-btn-secondary text-sm inline-flex items-center gap-1" onClick={() => setMdApproveOpen(true)}>
                    <ShieldCheck size={14} />
                    Approve closing stock value
                  </button>
                ) : null}
                {isBm && status === 'md_approved' ? (
                  <button
                    type="button"
                    className="z-btn-secondary text-sm"
                    onClick={() => setCaptureOpen(true)}
                    title="Audit path — primary Capture is owned by procurement"
                  >
                    Capture closing (audit)
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

      <StockRegisterStoreConfirmModal
        open={storeConfirmOpen}
        onClose={() => setStoreConfirmOpen(false)}
        periodKey={periodKey}
        periodEnd={endDate}
        branchLabel={branchLabel || branchId}
        workflow={workflow}
        initialCountNotes={workflow?.countNotes}
        initialChecklist={workflow?.storeChecklist}
        showToast={showToast}
        onSaved={handleWorkflowSaved}
      />

      <StockRegisterBmReviewModal
        open={bmReviewOpen}
        onClose={() => setBmReviewOpen(false)}
        register={register}
        workflow={workflow}
        periodKey={periodKey}
        periodEnd={endDate}
        branchLabel={branchLabel || branchId}
        showToast={showToast}
        onSaved={handleWorkflowSaved}
        onPrint={() => {
          setAutoPrint(false);
          setPreviewOpen(true);
        }}
      />

      <StockRegisterProcurementModal
        open={procurementOpen}
        onClose={() => setProcurementOpen(false)}
        periodKey={periodKey}
        periodEnd={endDate}
        branchLabel={branchLabel || branchId}
        procurementSummary={procurementSummary}
        accessoryBalance={(register?.accessories?.rows || []).reduce((s, r) => s + (Number(r.balance) || 0), 0)}
        initialPricing={procurementPricing}
        workflow={workflow}
        showToast={showToast}
        onSaved={handleWorkflowSaved}
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

      <StockRegisterMdApproveModal
        open={mdApproveOpen}
        onClose={() => setMdApproveOpen(false)}
        periodKey={periodKey}
        periodEnd={endDate}
        branchLabel={branchLabel || branchId}
        register={register}
        workflow={workflow}
        showToast={showToast}
        onSaved={handleWorkflowSaved}
      />
    </>
  );
}
