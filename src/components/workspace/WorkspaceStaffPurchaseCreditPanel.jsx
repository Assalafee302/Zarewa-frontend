import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { decideStaffPurchaseCredit } from '../../lib/hrStaffPurchaseCredit';
import { canApproveStaffPurchaseCredit, canRejectStaffPurchaseCredit } from '../../lib/hrAccess';
import { formatNgn } from '../../lib/hrFormat';
import { ZareApprovalHint } from '../ZareApprovalHint';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY } from '../hr/hrFormStyles';

/**
 * Approve or reject staff purchase credit from the workspace command center.
 */
export default function WorkspaceStaffPurchaseCreditPanel({ item, onDone }) {
  const ws = useWorkspace();
  const { show: showToast } = useToast();
  const [busy, setBusy] = useState(false);

  const permissions = ws?.permissions ?? [];
  const roleKey = ws?.session?.user?.roleKey;
  const mayApprove = canApproveStaffPurchaseCredit(roleKey, permissions);
  const mayReject = canRejectStaffPurchaseCredit(roleKey, permissions);
  const id = String(item?.sourceId || item?.referenceNo || item?.data?.accountId || '').trim();
  const data = item?.data && typeof item.data === 'object' ? item.data : {};

  const act = useCallback(
    async (decision) => {
      if (!id) return;
      if (!ws?.canMutate) {
        showToast('Reconnect to decide — workspace is read-only.', { variant: 'info' });
        return;
      }
      setBusy(true);
      try {
        const { ok, data: resp } = await decideStaffPurchaseCredit(id, decision, {
          note: decision === 'approve' ? 'Approved by MD (command center)' : 'Rejected (command center)',
        });
        if (!ok || !resp?.ok) {
          showToast(resp?.error || 'Action failed.', { variant: 'error' });
          return;
        }
        showToast(decision === 'approve' ? 'Staff purchase credit approved.' : 'Staff purchase credit rejected.');
        await ws.refresh?.();
        onDone?.();
      } finally {
        setBusy(false);
      }
    },
    [id, onDone, showToast, ws]
  );

  if (!id) {
    return <p className="p-4 text-sm text-slate-500">Missing purchase credit id.</p>;
  }

  const amountNgn = Number(data.amountNgn) || 0;
  const installmentNgn = Number(data.installmentNgn) || 0;
  const termMonths = Number(data.termMonths) || 0;
  const quoteRef = String(data.quotationRef || '').trim();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-white px-4 py-5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-900/80">Staff purchase credit</p>
      <h2 className="mt-1 text-lg font-semibold text-slate-900">{item?.title || 'Staff purchase credit'}</h2>
      <p className="mt-2 font-mono text-xs text-slate-500">{id}</p>
      <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-3 text-sm text-slate-800">
        {data.staffDisplayName ? (
          <p>
            <span className="text-[11px] font-semibold uppercase text-slate-500">Staff</span>
            <span className="mt-0.5 block">{data.staffDisplayName}</span>
          </p>
        ) : null}
        {quoteRef ? (
          <p>
            <span className="text-[11px] font-semibold uppercase text-slate-500">Quotation</span>
            <span className="mt-0.5 block font-mono">{quoteRef}</span>
          </p>
        ) : null}
        {amountNgn > 0 ? (
          <p>
            <span className="text-[11px] font-semibold uppercase text-slate-500">Credit amount</span>
            <span className="mt-0.5 block font-semibold">{formatNgn(amountNgn)}</span>
          </p>
        ) : null}
        {installmentNgn > 0 ? (
          <p>
            <span className="text-[11px] font-semibold uppercase text-slate-500">Payroll repayment</span>
            <span className="mt-0.5 block">
              {formatNgn(installmentNgn)}/mo
              {termMonths > 0 ? ` · ${termMonths} months` : ''}
            </span>
          </p>
        ) : null}
        {item?.summary ? (
          <p>
            <span className="text-[11px] font-semibold uppercase text-slate-500">Summary</span>
            <span className="mt-0.5 block">{item.summary}</span>
          </p>
        ) : null}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        Staff roofing / materials on credit. Approved balances are collected via payroll and cover the quotation balance
        for delivery.
      </p>
      {!mayApprove && !mayReject ? (
        <ZareApprovalHint
          className="mt-4"
          context={{
            referenceNo: id,
            documentType: 'staff_purchase_credit',
            status: item?.status,
            canApprove: false,
            missingPermission: 'Only the Managing Director can approve staff purchase credit.',
            zareQuery: `Why can't I approve staff purchase credit ${id}?`,
          }}
        />
      ) : null}
      {!mayApprove && mayReject ? (
        <p className="mt-4 text-xs font-semibold text-amber-800 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
          Awaiting Managing Director approval. You can reject if the request should not proceed.
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-2">
        {mayReject ? (
          <button type="button" className={HR_BTN_SECONDARY} disabled={busy} onClick={() => void act('reject')}>
            {busy ? 'Working…' : 'Reject'}
          </button>
        ) : null}
        {mayApprove ? (
          <button type="button" className={HR_BTN_PRIMARY} disabled={busy} onClick={() => void act('approve')}>
            {busy ? 'Working…' : 'Approve'}
          </button>
        ) : null}
        <Link to="/hr/payroll?tab=loans" className={HR_BTN_SECONDARY}>
          Open HR loans queue
        </Link>
      </div>
    </div>
  );
}
