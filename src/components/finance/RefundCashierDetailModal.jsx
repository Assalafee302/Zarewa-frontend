/**
 * Cashier View on a refund — quote, receipts, ledger, treasury payouts, and credit applied
 * onto another quotation. Does not approve or pay; Payout stays a separate action.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { ModalFrame, ModalScrollShell, ModalScrollBody, ModalActionFooter } from '../layout';
import { formatNgn } from '../../Data/mockData';
import { useWorkspace } from '../../context/WorkspaceContext';
import { apiFetch } from '../../lib/apiBase';
import { flattenQuotationLineItems } from '../../lib/managerDashboardCore';
import { receiptCashReceivedNgn } from '../../lib/salesReceiptsList';
import { refundStatusIsWithdrawn } from '../../lib/refundsStore';
import { refundCashierCustomerName, refundCashierMoneyStory, refundCashierOverpayResidualNgn } from '../../lib/refundCashierDetail';
import { refundCreditApplicationIsActive } from '../../lib/refundFundApply.js';
import { FinanceDeskQueueActionButton } from './FinanceDeskColoredQueuePanel';
import { RefundApplyToQuotationPanel } from './RefundApplyToQuotationPanel.jsx';

function MoneyRow({ label, value, tone }) {
  const cls =
    tone === 'rose'
      ? 'text-rose-800'
      : tone === 'emerald'
        ? 'text-emerald-800'
        : tone === 'amber'
          ? 'text-amber-900'
          : 'text-slate-900';
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className={`font-black tabular-nums ${cls}`}>{formatNgn(value)}</span>
    </div>
  );
}

export function RefundCashierDetailModal({ refund, isOpen, onClose, onPay, onReverseApply, onApplied }) {
  const ws = useWorkspace();
  const [intelligence, setIntelligence] = useState(null);
  const [intelBusy, setIntelBusy] = useState(false);

  const qref = String(refund?.quotationRef || refund?.quotation_ref || '').trim();
  const story = useMemo(() => refundCashierMoneyStory(refund), [refund]);

  const quote = useMemo(() => {
    const list = Array.isArray(ws?.snapshot?.quotations) ? ws.snapshot.quotations : [];
    return list.find((q) => String(q.id || '').trim() === qref) || null;
  }, [ws?.snapshot?.quotations, qref]);

  const quoteLines = useMemo(() => flattenQuotationLineItems(quote || {}), [quote]);

  const workspaceReceipts = useMemo(() => {
    const list = Array.isArray(ws?.snapshot?.receipts) ? ws.snapshot.receipts : [];
    return list.filter((r) => String(r.quotationRef || r.quotation_ref || '').trim() === qref);
  }, [ws?.snapshot?.receipts, qref]);

  const linkedReceipts = useMemo(() => {
    const fromIntel = Array.isArray(intelligence?.receipts) ? intelligence.receipts : [];
    if (fromIntel.length) {
      return fromIntel.map((r) => ({
        id: r.id || r.receiptID || '—',
        amountNgn: Math.round(Number(r.amountNgn ?? r.cashReceivedNgn) || 0),
      }));
    }
    return workspaceReceipts.map((r) => ({
      id: r.id || r.receiptID || '—',
      amountNgn: receiptCashReceivedNgn(r),
    }));
  }, [intelligence?.receipts, workspaceReceipts]);

  const ledgerOnQuote = useMemo(() => {
    const list = Array.isArray(ws?.snapshot?.ledgerEntries) ? ws.snapshot.ledgerEntries : [];
    return list
      .filter((e) => String(e.quotationRef || e.quotation_ref || '').trim() === qref)
      .slice()
      .sort((a, b) => String(b.dateISO || b.date_iso || '').localeCompare(String(a.dateISO || a.date_iso || '')));
  }, [ws?.snapshot?.ledgerEntries, qref]);

  const priorRefunds = useMemo(() => {
    const list = Array.isArray(ws?.snapshot?.refunds) ? ws.snapshot.refunds : [];
    const self = String(refund?.refundID || '').trim();
    return list.filter((r) => {
      if (String(r.quotationRef || '').trim() !== qref) return false;
      if (refundStatusIsWithdrawn(r.status)) return false;
      return String(r.refundID || '').trim() !== self;
    });
  }, [ws?.snapshot?.refunds, qref, refund?.refundID]);

  const creditApplies = useMemo(() => {
    const list = Array.isArray(ws?.snapshot?.refundCreditApplications)
      ? ws.snapshot.refundCreditApplications
      : [];
    const self = String(refund?.refundID || '').trim();
    if (!self) return [];
    return list.filter(
      (a) => refundCreditApplicationIsActive(a) && String(a.refundId || a.refund_id || '').trim() === self
    );
  }, [ws?.snapshot?.refundCreditApplications, refund?.refundID]);
  const payouts = Array.isArray(refund?.payoutHistory) ? refund.payoutHistory : [];
  const customerName = refundCashierCustomerName(refund, quote);
  const quoteTotal = Math.round(Number(quote?.totalNgn ?? quote?.total_ngn) || 0);
  const ledgerCashIn = Math.round(
    Number(intelligence?.summary?.quotationCashInNgn) ||
      Number(quote?.paidNgn ?? quote?.paid_ngn) ||
      0
  );
  const overpayResidualNgn = refundCashierOverpayResidualNgn({
    cashInNgn: ledgerCashIn,
    quoteTotalNgn: quoteTotal,
    refunds: priorRefunds,
    excludeRefundId: refund?.refundID,
  });
  const looksOverpay =
    String(refund?.reasonCategory || refund?.reason_category || '').toLowerCase().includes('overpay') ||
    (Array.isArray(refund?.calculationLines) &&
      refund.calculationLines.some((l) => String(l?.category || '').toLowerCase().includes('overpay')));
  const blockCashPayout = Boolean(looksOverpay && story.cashDueNgn > 0 && overpayResidualNgn < story.cashDueNgn);

  useEffect(() => {
    if (!isOpen || !qref) {
      setIntelligence(null);
      return undefined;
    }
    let cancelled = false;
    setIntelBusy(true);
    void apiFetch(`/api/refunds/intelligence?quotationRef=${encodeURIComponent(qref)}`).then(({ ok, data }) => {
      if (cancelled) return;
      setIntelBusy(false);
      if (ok && data?.ok !== false) setIntelligence(data);
      else setIntelligence(null);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, qref, refund?.refundID]);

  if (!refund) return null;

  return (
    <ModalFrame isOpen={isOpen} onClose={onClose} title={`Refund ${refund.refundID || ''}`} surface="plain">
      <ModalScrollShell>
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="min-w-0">
            <p className="text-ui-xs font-bold uppercase tracking-widest text-rose-800">Refund transaction</p>
            <h2 className="text-lg font-black text-slate-900 font-mono truncate">{refund.refundID}</h2>
            <p className="text-sm font-semibold text-slate-700 truncate">
              {customerName}
              {refund.customerID ? (
                <span className="ml-1.5 font-mono text-xs font-medium text-slate-500">{refund.customerID}</span>
              ) : null}
            </p>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              {refund.status || '—'}
              {qref ? ` · ${qref}` : ''}
            </p>
          </div>
          <RotateCcw className="text-rose-600 shrink-0 mt-1" size={22} aria-hidden />
        </div>
        <ModalScrollBody className="px-5 pb-4 space-y-4">
          {story.appliedNgn > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-950 leading-relaxed">
              ₦{story.appliedNgn.toLocaleString('en-NG')} of this refund was applied to{' '}
              {story.appliedToQuote ? (
                <span className="font-mono font-bold">{story.appliedToQuote}</span>
              ) : (
                'a customer receipt'
              )}
              . That is not a till payout
              {blockCashPayout ? '.' : `. Cash still to pay is ${formatNgn(story.cashDueNgn)}.`}
              {creditApplies.length > 0 && onReverseApply ? (
                <span className="block mt-2">
                  {creditApplies.map((a) => (
                    <FinanceDeskQueueActionButton
                      key={a.applicationId || a.application_id}
                      tone="rose"
                      onClick={() => onReverseApply(a.applicationId || a.application_id)}
                    >
                      Reverse apply
                    </FinanceDeskQueueActionButton>
                  ))}
                </span>
              ) : null}
            </div>
          ) : null}

          <RefundApplyToQuotationPanel
            refund={refund}
            onApplied={async () => {
              await onApplied?.();
            }}
          />

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 space-y-1.5">
            <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500 mb-1">How this refund was used</p>
            <MoneyRow label="Requested" value={story.requestedNgn} />
            {story.appliedNgn > 0 ? (
              <MoneyRow
                label={story.appliedToQuote ? `Applied to ${story.appliedToQuote}` : 'Applied to a receipt'}
                value={story.appliedNgn}
                tone="amber"
              />
            ) : null}
            <MoneyRow label="Approved for cash" value={story.approvedNgn} />
            {story.companyCutNgn > 0 ? (
              <MoneyRow label="Company cut (retained)" value={story.companyCutNgn} tone="amber" />
            ) : null}
            {story.unclearedOffsetNgn > 0 ? (
              <MoneyRow label="Uncleared receipt offset" value={story.unclearedOffsetNgn} tone="amber" />
            ) : null}
            <MoneyRow label="Paid from till / bank" value={story.paidNgn} tone="emerald" />
            <MoneyRow label="Still to pay" value={story.cashDueNgn} tone="rose" />
          </div>

          {blockCashPayout ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-950 leading-relaxed" role="alert">
              Do not pay this from the till. Overpayment left on the quotation is {formatNgn(overpayResidualNgn)} after
              other refunds on this quote. Paying {formatNgn(story.cashDueNgn)} would double-pay the customer.
            </div>
          ) : null}

          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 space-y-2">
            <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Quotation</p>
            <div className="flex justify-between gap-2 text-sm">
              <span className="font-mono font-bold text-slate-800">{qref || '—'}</span>
              <span className="tabular-nums font-black text-slate-900">{formatNgn(quoteTotal)}</span>
            </div>
            <p className="text-xs text-slate-600">
              Cash in {intelBusy ? '…' : formatNgn(ledgerCashIn)}
              {linkedReceipts.length === 0
                ? ' · No sales receipts linked'
                : ` · ${linkedReceipts.length} receipt${linkedReceipts.length === 1 ? '' : 's'}`}
            </p>
            {linkedReceipts.length > 0 ? (
              <ul className="space-y-1 pt-1 border-t border-slate-100">
                {linkedReceipts.map((r) => (
                  <li key={r.id} className="flex justify-between gap-2 text-xs">
                    <span className="font-mono text-slate-600">{r.id}</span>
                    <span className="tabular-nums font-semibold">{formatNgn(r.amountNgn)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {payouts.length > 0 ? (
            <div className="rounded-xl border border-teal-200 bg-teal-50/60 px-3 py-3 space-y-1.5">
              <p className="text-ui-xs font-bold uppercase tracking-wide text-teal-900">Treasury payouts</p>
              <ul className="space-y-1">
                {payouts.map((p) => (
                  <li key={p.id || `${p.postedAtISO}-${p.amountNgn}`} className="flex flex-wrap justify-between gap-x-2 text-xs text-teal-950">
                    <span>
                      {String(p.postedAtISO || '').slice(0, 16).replace('T', ' ') || '—'}
                      {p.accountName ? ` · ${p.accountName}` : ''}
                      {p.reference ? ` · ${p.reference}` : ''}
                    </span>
                    <span className="tabular-nums font-bold">{formatNgn(p.amountNgn)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-slate-500">No till or bank payout has been posted on this refund yet.</p>
          )}

          {ledgerOnQuote.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 space-y-1.5">
              <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Quote ledger</p>
              <ul className="space-y-1 max-h-40 overflow-auto">
                {ledgerOnQuote.slice(0, 12).map((e) => (
                  <li
                    key={e.id || `${e.type}-${e.dateISO}-${e.amountNgn}`}
                    className="flex justify-between gap-2 text-xs"
                  >
                    <span className="text-slate-600">
                      <span className="font-semibold">{e.type}</span>
                      {e.dateISO || e.date_iso ? ` · ${String(e.dateISO || e.date_iso).slice(0, 10)}` : ''}
                    </span>
                    <span className="tabular-nums font-semibold">{formatNgn(e.amountNgn)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {priorRefunds.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 space-y-1.5">
              <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Other refunds on this quote</p>
              <ul className="space-y-1">
                {priorRefunds.map((r) => (
                  <li key={r.refundID} className="flex justify-between gap-2 text-xs">
                    <span className="font-mono text-slate-600">
                      {r.refundID} <span className="font-sans text-slate-500">{r.status}</span>
                    </span>
                    <span className="tabular-nums font-semibold">
                      {formatNgn(r.paidAmountNgn > 0 ? r.paidAmountNgn : r.amountNgn)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {quoteLines.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 space-y-1.5">
              <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Quote lines</p>
              <ul className="space-y-1">
                {quoteLines.slice(0, 8).map((line, idx) => (
                  <li key={line.id || `${line.category}-${idx}`} className="flex justify-between gap-2 text-xs">
                    <span className="truncate text-slate-700">
                      <span className="text-slate-400">{line.category === 'products' ? 'Product' : line.category === 'accessories' ? 'Accessory' : 'Service'}</span>{' '}
                      {line.name}
                    </span>
                    <span className="tabular-nums text-slate-800 shrink-0">
                      {line.qty !== '' && line.qty != null ? `${line.qty} · ` : ''}
                      {line.lineTotal !== '' && line.lineTotal != null ? formatNgn(line.lineTotal) : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </ModalScrollBody>
        <ModalActionFooter
          onCancel={onClose}
          cancelLabel="Close"
          onConfirm={onPay && story.cashDueNgn > 0 && !blockCashPayout ? () => onPay(refund) : undefined}
          confirmLabel={
            onPay && story.cashDueNgn > 0 && !blockCashPayout ? `Payout ${formatNgn(story.cashDueNgn)}` : 'Save'
          }
        />
      </ModalScrollShell>
    </ModalFrame>
  );
}
