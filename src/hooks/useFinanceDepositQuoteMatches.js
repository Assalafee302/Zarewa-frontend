import { useCallback, useMemo, useState } from 'react';
import { apiFetch } from '../lib/apiBase';
import { appConfirm } from '../lib/appConfirm';
import { formatNgn } from '../Data/mockData';
import {
  RECEIPT_AMOUNT_CONFIRM_THRESHOLD_NGN,
  isReceiptPendingClearance,
} from '../lib/receiptClearance.js';
import { quotationsStillToBalanceRows } from '../lib/quotationPaymentSummary.js';
import {
  matchesByDepositId,
  matchesByQuotationRef,
  recommendBankDepositsForQuoteBalances,
} from '../lib/bankDepositQuoteMatch.js';
import { useAccountPage } from '../pages/account/AccountPageContext.jsx';

export function useFinanceDepositQuoteMatches() {
  const {
    liveQuotations,
    liveReceipts,
    liveLedgerEntries,
    openReceiptFinance,
    showToast,
    ws,
  } = useAccountPage();
  const [busyKey, setBusyKey] = useState('');

  const payOpts = useMemo(
    () => ({ salesReceipts: liveReceipts, ledgerEntries: liveLedgerEntries }),
    [liveReceipts, liveLedgerEntries]
  );

  const quoteRows = useMemo(
    () => quotationsStillToBalanceRows(liveQuotations, payOpts),
    [liveQuotations, payOpts]
  );

  const pendingReceipts = useMemo(
    () => (Array.isArray(liveReceipts) ? liveReceipts : []).filter(isReceiptPendingClearance),
    [liveReceipts]
  );

  const matches = useMemo(
    () =>
      recommendBankDepositsForQuoteBalances({
        deposits: Array.isArray(ws?.snapshot?.bankDeposits) ? ws.snapshot.bankDeposits : [],
        quoteRows,
        pendingReceipts,
      }),
    [ws?.snapshot?.bankDeposits, quoteRows, pendingReceipts]
  );

  const byQuote = useMemo(() => matchesByQuotationRef(matches), [matches]);
  const byDeposit = useMemo(() => matchesByDepositId(matches), [matches]);

  const canApply = Boolean(ws?.hasPermission?.('receipts.post') && ws?.canMutate);
  const canConfirmPending = Boolean(
    (ws?.hasPermission?.('finance.pay') || ws?.hasPermission?.('finance.post')) && ws?.canMutate
  );

  const runMatch = useCallback(
    async (match) => {
      if (!match) return;
      if (match.action === 'confirm_receipt' && match.pendingReceipt) {
        if (!canConfirmPending) {
          showToast?.('You can view this match, but confirming the pending receipt needs cashier or finance clearance.', {
            variant: 'info',
          });
          return;
        }
        openReceiptFinance?.(match.pendingReceipt);
        return;
      }
      if (!canApply) {
        showToast?.('Receipt posting permission is required to apply a registered bank payment onto a quotation.', {
          variant: 'info',
        });
        return;
      }
      const customer = match.customer || 'this customer';
      const proceed = await appConfirm({
        title: 'Apply bank payment to balance',
        message: match.amountExact
          ? `${formatNgn(match.applyNgn)} on ${match.depositId} fits the remaining balance on ${match.quotationRef} (${customer}).\n\nPost the receipt from this registered bank payment? Treasury will not be credited again.`
          : `${match.depositId} remaining ${formatNgn(match.depositRemainingNgn)} is close to ${match.quotationRef} balance ${formatNgn(match.quoteBalanceNgn)} (${customer}).\n\nPost ${formatNgn(match.applyNgn)} from the registered bank payment? Treasury will not be credited again.`,
        confirmLabel: 'Confirm & post',
      });
      if (!proceed) return;
      const customerID = String(match.customerID || match.quote?.customerID || match.quote?.quotation?.customerID || '').trim();
      if (!customerID) {
        showToast?.('This quotation has no customer on file.', { variant: 'error' });
        return;
      }
      const dateISO =
        String(match.deposit?.bankDateISO || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
      const receiptBody = {
        customerID,
        customerName: String(match.customer || '').trim(),
        quotationId: match.quotationRef,
        quotationRef: match.quotationRef,
        amountNgn: match.applyNgn,
        paymentMethod: 'Transfer',
        bankReference: String(match.deposit?.bankReference || match.depositId).trim(),
        dateISO,
        paymentLines: [],
        bankDepositId: match.depositId,
        fullAmountAsReceipt: true,
      };
      if (match.applyNgn >= RECEIPT_AMOUNT_CONFIRM_THRESHOLD_NGN) {
        receiptBody.confirmAmountNgn = match.applyNgn;
      }
      const branchId = String(ws?.session?.currentBranchId ?? '').trim();
      if (branchId) receiptBody.branchId = branchId;
      setBusyKey(match.key);
      try {
        const idempotencyKey =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `bdq-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
        const { ok, data } = await apiFetch('/api/ledger/receipt', {
          method: 'POST',
          body: JSON.stringify(receiptBody),
          headers: { 'Idempotency-Key': idempotencyKey },
        });
        if (!ok || data?.ok === false) {
          showToast?.(data?.error || 'Could not apply the bank payment to this quotation.', { variant: 'error' });
          return;
        }
        const receiptId = String(data?.receipt?.id || data?.receipt?.receiptID || '').trim();
        if (receiptId && canConfirmPending) {
          const settle = await apiFetch(`/api/sales-receipts/${encodeURIComponent(receiptId)}/finance-settlement`, {
            method: 'PATCH',
            body: JSON.stringify({
              bankReceivedAmountNgn: match.applyNgn,
              clearForDelivery: true,
            }),
          });
          if (!settle.ok || settle.data?.ok === false) {
            showToast?.(
              `Posted ${formatNgn(match.applyNgn)} from ${match.depositId} onto ${match.quotationRef}, but clearance still needs confirm: ${settle.data?.error || 'open Pending clearance.'}`,
              { variant: 'warning' }
            );
            await ws?.refresh?.();
            return;
          }
        }
        showToast?.(
          `Confirmed ${formatNgn(match.applyNgn)} from ${match.depositId} onto ${match.quotationRef}.`,
          { variant: 'success' }
        );
        await ws?.refresh?.();
      } finally {
        setBusyKey('');
      }
    },
    [canApply, canConfirmPending, openReceiptFinance, showToast, ws]
  );

  return { matches, byQuote, byDeposit, busyKey, runMatch, canApply, canConfirmPending };
}
