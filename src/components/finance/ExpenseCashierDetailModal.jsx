/**
 * Cashier View on an expense payment request — memo, lines, payee, payouts,
 * and lookalike requests so till staff can compare before paying (or after).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Banknote, Paperclip, Printer } from 'lucide-react';
import { ModalFrame, ModalScrollShell, ModalScrollBody, ModalActionFooter } from '../layout';
import { Button } from '../ui/button';
import { formatNgn } from '../../Data/mockData';
import { useWorkspace } from '../../context/WorkspaceContext';
import { apiFetch, apiUrl } from '../../lib/apiBase';
import { normalizePaymentRequest } from '../../lib/accountCore';
import { printExpenseRequestRecord } from '../../lib/expenseRequestPrint';
import {
  expenseCashierMoneyStory,
  expenseCashierTreasuryPayouts,
  findSimilarPaymentRequests,
} from '../../lib/expenseCashierDetail';
import { ExpenseCategoryLaneBadge } from '../office/ExpenseCategoryLaneBadge.jsx';
import { maintenanceCostKindLabel } from '../../shared/lib/maintenanceCostEnvelope';

function MoneyRow({ label, value, tone }) {
  const cls =
    tone === 'rose' ? 'text-rose-800' : tone === 'emerald' ? 'text-emerald-800' : 'text-slate-900';
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className={`font-black tabular-nums ${cls}`}>{formatNgn(value)}</span>
    </div>
  );
}

function statusTone(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('paid') || (s.includes('approv') && s.includes('paid'))) return 'emerald';
  if (s.includes('approv')) return 'teal';
  if (s.includes('reject') || s.includes('cancel')) return 'rose';
  return 'amber';
}

function mergeRequest(base, detail) {
  if (!detail) return base;
  return normalizePaymentRequest({ ...base, ...detail });
}

function requestLines(req) {
  return Array.isArray(req?.lineItems) ? req.lineItems : [];
}

function ExpenseFacts({ req, payouts, compact }) {
  const story = expenseCashierMoneyStory(req);
  const lines = requestLines(req);
  const payeeBits = [req?.payeeBankName, req?.payeeAccountNo].filter(Boolean).join(' · ');
  const wo = String(req?.maintenanceWorkOrderId || '').trim();

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 space-y-1.5">
        <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Money</p>
        <MoneyRow label="Requested" value={story.requestedNgn} />
        <MoneyRow label="Paid from till / bank" value={story.paidNgn} tone="emerald" />
        <MoneyRow label="Still to pay" value={story.dueNgn} tone="rose" />
      </div>

      {req?.description?.trim() ? (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
          <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Memo</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{req.description}</p>
        </div>
      ) : null}

      {req?.payeeName || req?.payeeAccountNo || req?.payeeBankName ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50/80 px-3 py-3 text-sm text-sky-950 space-y-0.5">
          <p className="text-ui-xs font-bold uppercase tracking-wide text-sky-900/90">Pay to</p>
          {req.payeeName ? <p className="font-bold">{req.payeeName}</p> : null}
          <p className="font-mono text-xs font-semibold tabular-nums">{payeeBits || '—'}</p>
        </div>
      ) : null}

      {wo || req?.maintenanceCostKind ? (
        <p className="text-xs font-semibold text-teal-900">
          Work order {wo || req.requestReference}
          {req.maintenanceCostKind ? ` · ${maintenanceCostKindLabel(req.maintenanceCostKind)}` : ''}
        </p>
      ) : null}

      {lines.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 space-y-1.5">
          <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Line items</p>
          <ul className="space-y-1">
            {lines.slice(0, 20).map((ln, i) => (
              <li key={ln.id || `${ln.item}-${i}`} className="flex justify-between gap-2 text-xs">
                <span className="truncate text-slate-700" title={ln.item || '—'}>
                  {ln.item || '—'}
                </span>
                <span className="tabular-nums text-slate-800 shrink-0">
                  {Number(ln.unit) || 0} · {formatNgn(Number(ln.lineTotalNgn ?? ln.line_total_ngn) || 0)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {req?.attachmentPresent && req?.requestID ? (
        <a
          href={apiUrl(`/api/payment-requests/${encodeURIComponent(req.requestID)}/attachment`)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-zarewa-teal hover:border-teal-200"
        >
          <Paperclip size={14} className="shrink-0" />
          <span className="truncate">{req.attachmentName || 'View attachment'}</span>
        </a>
      ) : null}

      {payouts.length > 0 ? (
        <div className="rounded-xl border border-teal-200 bg-teal-50/60 px-3 py-3 space-y-1.5">
          <p className="text-ui-xs font-bold uppercase tracking-wide text-teal-900">Treasury payouts</p>
          <ul className="space-y-1">
            {payouts.map((p) => (
              <li
                key={p.id || p.movementId || `${p.postedAtISO}-${p.amountNgn}`}
                className="flex flex-wrap justify-between gap-x-2 text-xs text-teal-950"
              >
                <span>
                  {String(p.postedAtISO || '').slice(0, 16).replace('T', ' ') || '—'}
                  {p.accountName ? ` · ${p.accountName}` : ''}
                </span>
                <span className="tabular-nums font-bold">
                  {formatNgn(Math.abs(Number(p.amountNgn) || 0))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : story.paidNgn <= 0 ? (
        <p className="text-xs text-slate-500">No till or bank payout has been posted on this request yet.</p>
      ) : null}

      {req?.approvedBy || req?.paidBy || req?.approvalNote ? (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-700 space-y-1">
          {req.approvedBy ? (
            <p>
              Approved by <span className="font-semibold">{req.approvedBy}</span>
              {req.approvedAtISO ? ` · ${String(req.approvedAtISO).slice(0, 16).replace('T', ' ')}` : ''}
            </p>
          ) : null}
          {req.approvalNote ? <p className="whitespace-pre-wrap text-slate-600">{req.approvalNote}</p> : null}
          {req.paidBy ? (
            <p>
              Paid by <span className="font-semibold">{req.paidBy}</span>
              {req.paidAtISO ? ` · ${String(req.paidAtISO).slice(0, 16).replace('T', ' ')}` : ''}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ExpenseCashierDetailModal({ request, isOpen, onClose, onPay }) {
  const ws = useWorkspace();
  const [liveDetail, setLiveDetail] = useState(null);
  const [compareId, setCompareId] = useState('');
  const [compareDetail, setCompareDetail] = useState(null);

  const display = useMemo(() => mergeRequest(request, liveDetail), [request, liveDetail]);
  const similar = useMemo(
    () => findSimilarPaymentRequests(display, ws?.snapshot?.paymentRequests),
    [display, ws?.snapshot?.paymentRequests]
  );
  const compareRow = useMemo(() => {
    const id = String(compareId || '').trim();
    if (!id) return null;
    return similar.find((hit) => String(hit.request.requestID || '').trim() === id)?.request || null;
  }, [compareId, similar]);
  const compareDisplay = useMemo(() => mergeRequest(compareRow, compareDetail), [compareRow, compareDetail]);

  const story = useMemo(() => expenseCashierMoneyStory(display), [display]);
  const payouts = useMemo(
    () => expenseCashierTreasuryPayouts(display?.requestID, ws?.snapshot?.treasuryMovements),
    [display?.requestID, ws?.snapshot?.treasuryMovements]
  );
  const comparePayouts = useMemo(
    () => expenseCashierTreasuryPayouts(compareDisplay?.requestID, ws?.snapshot?.treasuryMovements),
    [compareDisplay?.requestID, ws?.snapshot?.treasuryMovements]
  );

  useEffect(() => {
    if (!isOpen) {
      setLiveDetail(null);
      setCompareId('');
      setCompareDetail(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const id = String(request?.requestID || '').trim();
    if (!isOpen || !id || request?.postedExpenseOnly) {
      setLiveDetail(null);
      return undefined;
    }
    let cancelled = false;
    void apiFetch(`/api/payment-requests/${encodeURIComponent(id)}`).then(({ ok, data }) => {
      if (cancelled) return;
      if (ok && data?.request) setLiveDetail(data.request);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, request?.requestID, request?.postedExpenseOnly]);

  useEffect(() => {
    const id = String(compareId || '').trim();
    if (!isOpen || !id) {
      setCompareDetail(null);
      return undefined;
    }
    let cancelled = false;
    void apiFetch(`/api/payment-requests/${encodeURIComponent(id)}`).then(({ ok, data }) => {
      if (cancelled) return;
      if (ok && data?.request) setCompareDetail(data.request);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, compareId]);

  if (!request) return null;

  const titleId = display?.requestID || display?.expenseID || 'Expense';
  const comparing = Boolean(compareDisplay);
  const canPayout = Boolean(onPay && story.dueNgn > 0 && !display?.postedExpenseOnly);

  return (
    <ModalFrame isOpen={isOpen} onClose={onClose} title={`Expense ${titleId}`} surface="plain">
      <ModalScrollShell size={comparing ? 'xl' : 'lg'}>
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="min-w-0">
            <p className="text-ui-xs font-bold uppercase tracking-widest text-teal-800">Expense request</p>
            <h2 className="text-lg font-black text-slate-900 font-mono truncate">{titleId}</h2>
            <p className="text-sm font-semibold text-slate-700 truncate">
              {display?.payeeName || display?.description || '—'}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span
                className={`text-ui-xs font-bold uppercase tracking-wide ${
                  statusTone(display?.approvalStatus) === 'emerald'
                    ? 'text-emerald-800'
                    : statusTone(display?.approvalStatus) === 'teal'
                      ? 'text-teal-800'
                      : 'text-amber-800'
                }`}
              >
                {display?.approvalStatus || '—'}
                {story.paidNgn > 0 && story.dueNgn <= 0 ? ' · Paid' : story.dueNgn > 0 && story.paidNgn > 0 ? ' · Part-paid' : ''}
              </span>
              {display?.expenseCategory ? (
                <ExpenseCategoryLaneBadge category={display.expenseCategory} laneKey={display.expenseCategoryLane} />
              ) : null}
              {display?.expenseCategory ? (
                <span className="text-ui-xs font-semibold text-slate-600">{display.expenseCategory}</span>
              ) : null}
            </div>
          </div>
          <Banknote className="text-teal-700 shrink-0 mt-1" size={22} aria-hidden />
        </div>
        <ModalScrollBody className="px-5 pb-4 space-y-4">
          {similar.length > 0 ? (
            <div
              className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-950 leading-relaxed"
              data-testid="expense-similar-banner"
            >
              <p className="font-semibold">
                {similar.length} similar request{similar.length === 1 ? '' : 's'} — compare before you confirm this is
                not a repeat payout.
              </p>
              <ul className="mt-2 space-y-1.5">
                {similar.map((hit) => {
                  const id = String(hit.request.requestID || hit.request.expenseID || '');
                  const paid = Math.round(Number(hit.request.paidAmountNgn) || 0);
                  const selected = compareId === String(hit.request.requestID || '');
                  return (
                    <li key={id} className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        <span className="font-mono font-bold">{id}</span>
                        <span className="text-amber-900/80">
                          {' '}
                          · {hit.reason}
                          {paid > 0 ? ` · already paid ${formatNgn(paid)}` : ''}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="rounded-md border border-amber-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-950 hover:bg-amber-100"
                        onClick={() => setCompareId(selected ? '' : String(hit.request.requestID || ''))}
                      >
                        {selected ? 'Hide' : 'Compare'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {comparing ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <section className="rounded-xl border border-teal-200 bg-white p-3">
                <p className="text-ui-xs font-bold uppercase tracking-wide text-teal-800 mb-2">This request</p>
                <ExpenseFacts req={display} payouts={payouts} compact />
              </section>
              <section className="rounded-xl border border-amber-200 bg-white p-3">
                <p className="text-ui-xs font-bold uppercase tracking-wide text-amber-900 mb-2">Compare with</p>
                <ExpenseFacts req={compareDisplay} payouts={comparePayouts} compact />
              </section>
            </div>
          ) : (
            <ExpenseFacts req={display} payouts={payouts} />
          )}
        </ModalScrollBody>
        <ModalActionFooter
          onCancel={onClose}
          cancelLabel="Close"
          onConfirm={canPayout ? () => onPay(display) : undefined}
          confirmLabel={canPayout ? `Payout ${formatNgn(story.dueNgn)}` : 'Save'}
        >
          {display?.requestID ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => printExpenseRequestRecord(display, formatNgn)}
            >
              <Printer size={14} aria-hidden />
              Print
            </Button>
          ) : null}
        </ModalActionFooter>
      </ModalScrollShell>
    </ModalFrame>
  );
}
