import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Banknote, Check, X } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { useToast } from '../../context/ToastContext';
import { approveOtRequest, getOtRequest, rejectOtRequest } from '../../lib/otRequestsApi';
import { ModalFrame } from '../layout/ModalFrame';
import {
  DecisionBand,
  DecisionChip,
  DecisionModalBody,
  DecisionModalHeader,
  DecisionStickyActions,
  DecisionActionTile,
} from '../management/DecisionSurface';
import { OtStatusChip, OtStatusTimeline } from '../ot/OtStatusTimeline';

/**
 * Branch manager OT pay approval popup — full request detail, then approve/reject.
 */
export function OtApprovalDecisionModal({
  isOpen,
  requestId = '',
  onClose,
  onDecisionComplete,
  variant = 'modal',
  readOnly = false,
}) {
  const { show: showToast } = useToast();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rateApproved, setRateApproved] = useState('');
  const [varianceReason, setVarianceReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    const id = String(requestId || '').trim();
    if (!id) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setLoadError('');
    setRejectReason('');
    const res = await getOtRequest(id).catch(() => ({ ok: false }));
    setLoading(false);
    if (!res.ok || res.data?.ok === false) {
      setDetail(null);
      setLoadError(res.data?.error || 'Could not open OT request');
      return;
    }
    setDetail(res.data);
    const reqRate = res.data?.paymentLine?.rateRequested;
    setRateApproved(reqRate != null ? String(reqRate) : '');
    setVarianceReason('');
  }, [requestId]);

  useEffect(() => {
    if (!isOpen) {
      setDetail(null);
      setLoadError('');
      return;
    }
    void load();
  }, [isOpen, load]);

  const rateRequested = Number(detail?.paymentLine?.rateRequested) || 0;
  const rateNum = Math.round(Number(rateApproved) || 0);
  const rateChanged = rateNum > 0 && rateNum !== rateRequested;
  const previewPayable = useMemo(() => {
    const q = Number(detail?.paymentLine?.quantity) || 0;
    return Math.round(q * (rateNum || rateRequested));
  }, [detail, rateNum, rateRequested]);

  const handleApprove = async () => {
    const id = String(requestId || '').trim();
    if (!id) return;
    if (!(rateNum > 0)) {
      showToast('Enter a positive approved rate', { variant: 'error' });
      return;
    }
    if (rateChanged && String(varianceReason || '').trim().length < 3) {
      showToast('Variance reason required when you change the rate', { variant: 'error' });
      return;
    }
    setBusy(true);
    const body = {
      rateApproved: rateNum,
      varianceReason: rateChanged ? String(varianceReason).trim() : undefined,
    };
    const res = await approveOtRequest(id, body).catch(() => ({ ok: false }));
    setBusy(false);
    if (!res.ok || res.data?.ok === false) {
      showToast(res.data?.error || 'Approve failed', { variant: 'error' });
      return;
    }
    showToast(`Approved · payable ${formatNgn(res.data?.request?.totalPayableNgn)}`, {
      variant: 'success',
    });
    await onDecisionComplete?.({ decision: 'approve', id, data: res.data });
    onClose?.();
  };

  const handleReject = async () => {
    const id = String(requestId || '').trim();
    if (!id) return;
    if (String(rejectReason || '').trim().length < 3) {
      showToast('Rejection reason required (min 3 characters)', { variant: 'error' });
      return;
    }
    setBusy(true);
    const res = await rejectOtRequest(id, { reason: rejectReason }).catch(() => ({ ok: false }));
    setBusy(false);
    if (!res.ok || res.data?.ok === false) {
      showToast(res.data?.error || 'Reject failed', { variant: 'error' });
      return;
    }
    showToast('OT request rejected (store must create a new request)', { variant: 'success' });
    await onDecisionComplete?.({ decision: 'reject', id, data: res.data });
    onClose?.();
  };

  const req = detail?.request;
  const showActions = !loading && req && !readOnly;
  const actions = showActions ? (
          <DecisionStickyActions hint="Approve locks the payable for cashier. Reject is terminal — store must create a new request.">
            <div className="grid grid-cols-2 gap-2">
              <DecisionActionTile
                variant="reject"
                icon={X}
                label="Reject"
                disabled={busy}
                onClick={() => void handleReject()}
              />
              <DecisionActionTile
                variant="approve"
                icon={Check}
                label="Approve"
                disabled={busy}
                onClick={() => void handleApprove()}
              />
            </div>
          </DecisionStickyActions>
  ) : null;

  const inner = (
        <>
        <DecisionModalBody className={variant === 'inline' ? '!px-0 !py-0' : undefined}>
          {loading ? (
            <p className="py-10 text-center text-xs text-slate-500">Loading OT request…</p>
          ) : null}
          {loadError ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
              {loadError}
            </p>
          ) : null}
          {!loading && req ? (
            <div className="space-y-4">
              <DecisionBand
                tone="production"
                eyebrow="OT pay · pending BM"
                title={req.id}
                subtitle={`${req.dayIso || '—'} · ${req.workType || '—'} · ${req.createdByName || 'Store'}`}
                meta={
                  <>
                    <OtStatusChip status={req.status} />
                    {req.quotationRef ? <DecisionChip tone="teal">{req.quotationRef}</DecisionChip> : null}
                    {req.poId ? <DecisionChip tone="teal">{req.poId}</DecisionChip> : null}
                    {req.approvalBeforeStart ? (
                      <DecisionChip tone="emerald">Pre-approved</DecisionChip>
                    ) : (
                      <DecisionChip tone="amber">No pre-approval</DecisionChip>
                    )}
                  </>
                }
              />

              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-xs">
                <div>
                  <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-400">Reason / work done</p>
                  <p className="mt-1 font-semibold text-slate-800">{req.reason || '—'}</p>
                </div>
                {detail.workDetails?.workDone && detail.workDetails.workDone !== req.reason ? (
                  <div>
                    <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-400">Work details</p>
                    <p className="mt-1 text-slate-700">{detail.workDetails.workDone}</p>
                  </div>
                ) : null}
                {detail.staffLines?.length ? (
                  <div>
                    <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-400">Staff on OT</p>
                    <ul className="mt-1 space-y-1 text-slate-700">
                      {detail.staffLines.map((s) => (
                        <li key={s.id || s.staffUserId}>
                          <span className="font-semibold">
                            {s.displayName || s.username || s.staffUserId}
                          </span>
                          {s.roleLabel ? ` · ${s.roleLabel}` : ''}
                          {s.startTime ? ` · ${s.startTime}–${s.endTime}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                <p className="text-ui-xs font-bold uppercase tracking-widest text-amber-900/70">Rate decision</p>
                <p className="text-xs text-slate-700">
                  Requested:{' '}
                  <span className="font-bold tabular-nums">₦{rateRequested.toLocaleString()}</span>
                  {' · '}Qty:{' '}
                  <span className="font-bold tabular-nums">{detail.paymentLine?.quantity ?? '—'}</span>
                  {detail.paymentLine?.remarks ? ` · ${detail.paymentLine.remarks}` : ''}
                </p>
                <label className="block">
                  <span className="text-ui-xs font-bold uppercase text-slate-500">Rate approved (₦)</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    disabled={busy}
                    className="z-input mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-semibold tabular-nums"
                    value={rateApproved}
                    onChange={(e) => setRateApproved(e.target.value)}
                  />
                </label>
                {rateChanged ? (
                  <label className="block">
                    <span className="text-ui-xs font-bold uppercase text-amber-800">
                      Variance reason (required)
                    </span>
                    <textarea
                      rows={2}
                      disabled={busy}
                      className="z-input mt-1 w-full rounded-lg border border-amber-200 px-2.5 py-1.5 text-sm font-semibold"
                      value={varianceReason}
                      onChange={(e) => setVarianceReason(e.target.value)}
                      placeholder="Why is the approved rate different?"
                    />
                  </label>
                ) : null}
                <p className="text-base font-black tabular-nums text-zarewa-teal">
                  Payable at approve: {formatNgn(previewPayable)}
                </p>
                <p className="text-[10px] text-slate-500">
                  Locked for cashier — they cannot change the amount at pay time.
                </p>
              </div>

              <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
                <label className="block">
                  <span className="text-ui-xs font-bold uppercase text-slate-500">Reject reason</span>
                  <textarea
                    rows={2}
                    disabled={busy}
                    className="z-input mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Required to reject — store must open a new request"
                  />
                </label>
              </div>

              {detail.statusHistory?.length ? (
                <div>
                  <p className="mb-1 text-ui-xs font-bold uppercase text-slate-400">Timeline</p>
                  <OtStatusTimeline history={detail.statusHistory} />
                </div>
              ) : null}
            </div>
          ) : null}
        </DecisionModalBody>
        {actions}
        </>
  );

  if (variant === 'inline') {
    if (!isOpen || !requestId) return null;
    return <div className="space-y-4">{inner}</div>;
  }

  return (
    <ModalFrame
      isOpen={Boolean(isOpen && requestId)}
      onClose={() => !busy && onClose?.()}
      title="Overtime pay approval"
      description="Review overtime pay request and approve or reject."
      surface="plain"
      closeDisabled={busy}
      showCloseButton={false}
    >
      <div className="z-modal-panel flex max-h-[min(92vh,880px)] w-full max-w-3xl flex-col overflow-hidden p-0">
        <DecisionModalHeader
          title="Overtime pay approval"
          onClose={() => !busy && onClose?.()}
          busy={busy}
          icon={Banknote}
        />
        {inner}
      </div>
    </ModalFrame>
  );
}

export default OtApprovalDecisionModal;
