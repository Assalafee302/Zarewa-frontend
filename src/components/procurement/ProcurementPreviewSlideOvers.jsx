import React, { useMemo, useState } from 'react';
import { PrintModalPortal } from '../layout/PrintModalPortal';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Info, Printer, X } from 'lucide-react';
import { SlideOverPanel } from '../layout/SlideOverPanel';
import { PoStatusChip } from './PoStatusChip';
import { formatNgn } from '../../Data/mockData';
import PurchaseOrderPrintView from './PurchaseOrderPrintView';
import {
  procurementKindFromPo,
  poLineBenchmarkPriceNgn,
  poLinePriceSuffix,
  poLineQtyLabel,
} from '../../lib/procurementPoKind';
import { purchaseOrderOrderedValueNgn } from '../../lib/liveAnalytics';
import {
  purchaseOrderCanAssignTransport,
  purchaseOrderTransportActionLabel,
  purchaseOrderTransportGapLabel,
} from '../../lib/purchaseOrderWorkflow';
import { buildPoReceiptPreview, poReceiptFmtQty } from '../../lib/poReceiptPreview';
import { buildPoPaymentPreview } from '../../lib/poPaymentPreview';
import { ZareApprovalHint } from '../ZareApprovalHint';

function kindTitle(kind) {
  if (kind === 'stone') return 'Stone-coated';
  if (kind === 'accessory') return 'Accessories';
  return 'Coil';
}

function lineLineAmountNgn(line, kind) {
  const qty = Number(line?.qtyOrdered) || 0;
  const unit = poLineBenchmarkPriceNgn(line, kind);
  return Math.round(qty * unit);
}

const detailLabel = 'text-ui-xs font-semibold text-slate-500 uppercase tracking-wide';
const detailValue = 'text-xs font-semibold text-slate-800';

const poActionBtn =
  'text-ui-xs font-semibold uppercase tracking-wide px-2.5 py-1.5 rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40';

/**
 * Read-only purchase order detail (Procurement → Purchases list).
 * Optional footer actions (approve, transport, transport fee, etc.).
 */
function receiptDiagnosisUi(tone) {
  if (tone === 'warn') {
    return {
      wrap: 'border-amber-200 bg-amber-50 text-amber-950',
      Icon: AlertTriangle,
    };
  }
  if (tone === 'ok') {
    return {
      wrap: 'border-emerald-200 bg-emerald-50 text-emerald-950',
      Icon: CheckCircle2,
    };
  }
  return {
    wrap: 'border-sky-200 bg-sky-50 text-sky-950',
    Icon: Info,
  };
}

export function ProcurementPoPreviewSlideOver({
  po,
  isOpen,
  onClose,
  onEdit,
  canEdit,
  wsCanMutate = true,
  onApprove,
  onReject,
  onAssignTransport,
  canApprovePo = true,
  coilLots = [],
  movements = [],
  inTransitLoads = [],
  treasuryMovements = [],
  accountsPayable = [],
}) {
  const [showPrint, setShowPrint] = useState(false);
  const [printStampIso, setPrintStampIso] = useState('');

  const receiptPreview = useMemo(
    () =>
      po
        ? buildPoReceiptPreview({ po, coilLots, movements, inTransitLoads })
        : null,
    [po, coilLots, movements, inTransitLoads]
  );

  const paymentPreview = useMemo(
    () =>
      po
        ? buildPoPaymentPreview({ po, treasuryMovements, accountsPayable, movements })
        : null,
    [po, treasuryMovements, accountsPayable, movements]
  );

  const coilsByLineKey = receiptPreview?.coilsByLineKey || {};

  if (!po) return null;
  const kind = procurementKindFromPo(po);
  const ordered = purchaseOrderOrderedValueNgn(po);
  const pending = po.status === 'Pending';
  const canTransport = purchaseOrderCanAssignTransport(po);
  const hasWorkflowFooter =
    (canEdit && onEdit) ||
    (pending && onApprove && onReject) ||
    (canTransport && onAssignTransport);
  const diagUi = receiptDiagnosisUi(receiptPreview?.diagnosis?.tone);
  const DiagIcon = diagUi.Icon;

  return (
    <SlideOverPanel
      isOpen={isOpen}
      onClose={onClose}
      title={po.poID ? `PO ${po.poID}` : 'Purchase order'}
      description="Purchase order details"
      maxWidthClass="max-w-[min(96vw,520px)]"
    >
      <div className="flex h-full min-h-0 flex-1 flex-col bg-slate-50">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="min-w-0">
            <p className="text-ui-xs font-semibold uppercase tracking-widest text-slate-500">Purchase order</p>
            <h2 className="mt-0.5 font-mono text-lg font-bold text-zarewa-teal">{po.poID}</h2>
            <p className="text-xs font-medium text-slate-600">{po.supplierName}</p>
            <p className="mt-1 text-ui-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2 flex-wrap">
              {kindTitle(kind)} · <PoStatusChip status={po.status} />
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setPrintStampIso(new Date().toISOString());
                setShowPrint(true);
              }}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-zarewa-teal"
              aria-label="Print PO"
              title="Print"
            >
              <Printer size={20} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
          <div className="space-y-4">
            <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className={`${detailLabel} mb-2`}>Dates & references</p>
              <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
                <div>
                  <dt className={detailLabel}>Order date</dt>
                  <dd className={detailValue}>{po.orderDateISO || '—'}</dd>
                </div>
                <div>
                  <dt className={detailLabel}>Expected delivery</dt>
                  <dd className={detailValue}>{po.expectedDeliveryISO || '—'}</dd>
                </div>
                {po.invoiceNo ? (
                  <div>
                    <dt className={detailLabel}>Invoice</dt>
                    <dd className={detailValue}>{po.invoiceNo}</dd>
                  </div>
                ) : null}
                {po.deliveryDateISO ? (
                  <div>
                    <dt className={detailLabel}>Delivery date</dt>
                    <dd className={detailValue}>{po.deliveryDateISO}</dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className={`${detailLabel} mb-2`}>Lines (ordered)</p>
              <div className="overflow-x-auto rounded-lg border border-slate-100">
                <table className="min-w-full text-left text-ui-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/90">
                      <th className="px-2 py-1.5 font-bold text-slate-600">Product</th>
                      <th className="px-2 py-1.5 font-bold text-slate-600">Open</th>
                      <th className="px-2 py-1.5 font-bold text-slate-600 text-right">Unit</th>
                      <th className="px-2 py-1.5 font-bold text-slate-600 text-right">Line ₦</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(po.lines || []).map((line) => {
                      const assignedCoils = coilsByLineKey[String(line.lineKey || '').trim()] || [];
                      return (
                      <tr key={line.lineKey || line.productID} className="tabular-nums">
                        <td className="px-2 py-1.5 text-slate-800">
                          <span className="font-mono text-ui-xs text-slate-500">{line.productID}</span>
                          {line.productName ? (
                            <span className="block font-medium text-slate-700">{line.productName}</span>
                          ) : null}
                          {[line.color, line.gauge].filter(Boolean).length ? (
                            <span className="text-ui-xs text-slate-500">
                              {[line.color, line.gauge].filter(Boolean).join(' · ')}
                            </span>
                          ) : null}
                          {assignedCoils.length > 0 ? (
                            <span className="mt-0.5 block text-ui-xs text-zarewa-teal">
                              Coil #:{' '}
                              {assignedCoils.map((c, idx) => (
                                <React.Fragment key={c.coilNo}>
                                  {idx > 0 ? ', ' : ''}
                                  <Link
                                    to={`/operations/coils/${encodeURIComponent(c.coilNo)}`}
                                    className="font-mono font-bold hover:underline"
                                    onClick={onClose}
                                  >
                                    {c.coilNo}
                                  </Link>
                                </React.Fragment>
                              ))}
                            </span>
                          ) : kind === 'coil' && receiptPreview?.receivableInStock ? (
                            <span className="mt-0.5 block text-ui-xs text-slate-400 italic">
                              Coil # assigned at store receipt
                            </span>
                          ) : null}
                        </td>
                        <td className="px-2 py-1.5 text-slate-700">{poLineQtyLabel(line, kind)}</td>
                        <td className="px-2 py-1.5 text-right text-slate-700">
                          {formatNgn(poLineBenchmarkPriceNgn(line, kind))}
                          {poLinePriceSuffix(kind)}
                        </td>
                        <td className="px-2 py-1.5 text-right font-semibold text-zarewa-teal">
                          {formatNgn(lineLineAmountNgn(line, kind))}
                        </td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-right text-xs font-black text-zarewa-teal tabular-nums">
                Ordered value {formatNgn(ordered)}
              </p>
            </section>

            {receiptPreview ? (
              <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className={`${detailLabel} mb-0`}>Store receipt & stock</p>
                  {receiptPreview.receivableInStock ? (
                    <Link
                      to="/operations"
                      className="text-ui-xs font-bold uppercase tracking-wide text-zarewa-teal hover:underline"
                      onClick={onClose}
                    >
                      Open Stock receive →
                    </Link>
                  ) : null}
                </div>

                {receiptPreview.diagnosis?.message ? (
                  <div
                    className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 text-ui-xs leading-snug ${diagUi.wrap}`}
                  >
                    <DiagIcon size={14} className="mt-0.5 shrink-0" aria-hidden />
                    <p>{receiptPreview.diagnosis.message}</p>
                  </div>
                ) : null}

                <div className="overflow-x-auto rounded-lg border border-slate-100">
                  <table className="min-w-full text-left text-ui-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/90">
                        <th className="px-2 py-1.5 font-bold text-slate-600">Line</th>
                        <th className="px-2 py-1.5 font-bold text-slate-600 text-right">Ordered</th>
                        <th className="px-2 py-1.5 font-bold text-slate-600 text-right">Received</th>
                        <th className="px-2 py-1.5 font-bold text-slate-600 text-right">Open</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 tabular-nums">
                      {receiptPreview.lineProgress.map((row) => (
                        <tr key={row.lineKey || row.productID}>
                          <td className="px-2 py-1.5 text-slate-800">
                            <span className="font-medium">{row.productName || row.productID}</span>
                            {row.complete ? (
                              <span className="ml-1 text-ui-xs font-bold uppercase text-emerald-700">Done</span>
                            ) : row.partial ? (
                              <span className="ml-1 text-ui-xs font-bold uppercase text-amber-700">Partial</span>
                            ) : row.notStarted ? (
                              <span className="ml-1 text-ui-xs font-bold uppercase text-slate-500">Pending</span>
                            ) : null}
                            {row.coilNos?.length ? (
                              <span className="mt-0.5 block text-ui-xs text-zarewa-teal">
                                Coil #:{' '}
                                {row.coils.map((c, idx) => (
                                  <React.Fragment key={c.coilNo}>
                                    {idx > 0 ? ', ' : ''}
                                    <Link
                                      to={`/operations/coils/${encodeURIComponent(c.coilNo)}`}
                                      className="font-mono font-bold hover:underline"
                                      onClick={onClose}
                                    >
                                      {c.coilNo}
                                    </Link>
                                  </React.Fragment>
                                ))}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-2 py-1.5 text-right text-slate-700">
                            {poReceiptFmtQty(row.ordered, row.unit)}
                          </td>
                          <td className="px-2 py-1.5 text-right text-slate-700">
                            {poReceiptFmtQty(row.received, row.unit)}
                          </td>
                          <td className="px-2 py-1.5 text-right font-semibold text-zarewa-teal">
                            {poReceiptFmtQty(row.open, row.unit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {receiptPreview.inTransitLoad ? (
                  <dl className="grid grid-cols-1 gap-1.5 text-ui-xs sm:grid-cols-2 border-t border-slate-100 pt-2">
                    <div>
                      <dt className={detailLabel}>In-transit load</dt>
                      <dd className={detailValue}>{receiptPreview.inTransitLoad.id || '—'}</dd>
                    </div>
                    <div>
                      <dt className={detailLabel}>Load status</dt>
                      <dd className={detailValue}>{receiptPreview.inTransitLoad.status || '—'}</dd>
                    </div>
                    {receiptPreview.inTransitLoad.receivedAtISO ? (
                      <div>
                        <dt className={detailLabel}>Load received at</dt>
                        <dd className={detailValue}>
                          {String(receiptPreview.inTransitLoad.receivedAtISO).slice(0, 10)}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                ) : null}

                {receiptPreview.coils.length > 0 ? (
                  <div className="border-t border-slate-100 pt-2 space-y-1">
                    <p className={detailLabel}>Coils created ({receiptPreview.coils.length})</p>
                    <ul className="max-h-36 overflow-y-auto custom-scrollbar space-y-1">
                      {receiptPreview.coils.map((c) => (
                        <li
                          key={c.coilNo}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-100 bg-slate-50/80 px-2 py-1.5 text-ui-xs"
                        >
                          <div className="min-w-0">
                            <Link
                              to={`/operations/coils/${encodeURIComponent(c.coilNo)}`}
                              className="font-mono font-bold text-zarewa-teal hover:underline"
                              onClick={onClose}
                            >
                              {c.coilNo}
                            </Link>
                            {[c.colour, c.gaugeLabel, c.lineKey].filter(Boolean).length ? (
                              <p className="mt-0.5 text-ui-xs text-slate-500">
                                {[c.colour, c.gaugeLabel].filter(Boolean).join(' · ')}
                                {c.lineKey ? ` · line ${c.lineKey}` : ''}
                              </p>
                            ) : null}
                          </div>
                          <span className="text-slate-600 tabular-nums shrink-0">
                            {Number(c.currentWeightKg ?? c.qtyRemaining ?? c.weightKg ?? 0).toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}{' '}
                            kg live · {c.currentStatus || 'Available'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : kind === 'coil' && !receiptPreview.receivableInStock ? (
                  <p className="border-t border-slate-100 pt-2 text-ui-xs text-slate-500 italic">
                    No coil numbers assigned yet for this PO.
                  </p>
                ) : null}

                {receiptPreview.grnMovements.length > 0 ? (
                  <div className="border-t border-slate-100 pt-2 space-y-1">
                    <p className={detailLabel}>GRN stock postings ({receiptPreview.grnMovements.length})</p>
                    <ul className="max-h-36 overflow-y-auto custom-scrollbar space-y-1">
                      {receiptPreview.grnMovements.map((m, idx) => (
                        <li
                          key={`${m.atISO}-${m.productID}-${idx}`}
                          className="rounded-md border border-slate-100 bg-slate-50/80 px-2 py-1.5 text-ui-xs text-slate-700"
                        >
                          <span className="font-mono text-ui-xs text-slate-500">{m.type}</span>
                          <span className="mx-1">·</span>
                          <span className="font-semibold">{m.productID}</span>
                          <span className="mx-1">·</span>
                          <span className="tabular-nums">
                            {Number(m.qty).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                          {m.dateISO || m.atISO ? (
                            <span className="text-slate-500">
                              {' '}
                              · {String(m.dateISO || m.atISO).slice(0, 10)}
                            </span>
                          ) : null}
                          {m.detail ? (
                            <p className="mt-0.5 text-ui-xs text-slate-500 line-clamp-2" title={m.detail}>
                              {m.detail}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            ) : null}

            <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm space-y-3">
              <p className={`${detailLabel} mb-0`}>Supplier payments</p>

              {paymentPreview?.payable ? (
                <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs rounded-lg border border-slate-100 bg-slate-50/80 p-2.5">
                  <div>
                    <dt className={detailLabel}>AP record</dt>
                    <dd className={detailValue}>{paymentPreview.payable.apID}</dd>
                  </div>
                  <div>
                    <dt className={detailLabel}>Invoice ref</dt>
                    <dd className={detailValue}>{paymentPreview.payable.invoiceRef || '—'}</dd>
                  </div>
                  <div>
                    <dt className={detailLabel}>Due date</dt>
                    <dd className={detailValue}>{paymentPreview.payable.dueDateISO || '—'}</dd>
                  </div>
                  <div>
                    <dt className={detailLabel}>Invoice amount</dt>
                    <dd className={detailValue}>{formatNgn(paymentPreview.payable.amountNgn || 0)}</dd>
                  </div>
                  <div>
                    <dt className={detailLabel}>Paid</dt>
                    <dd className={detailValue}>{formatNgn(paymentPreview.payable.paidNgn || 0)}</dd>
                  </div>
                  <div>
                    <dt className={detailLabel}>Outstanding</dt>
                    <dd className={detailValue}>
                      {formatNgn(
                        Math.max(
                          0,
                          (Number(paymentPreview.payable.amountNgn) || 0) -
                            (Number(paymentPreview.payable.paidNgn) || 0)
                        )
                      )}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-ui-xs text-slate-500 leading-snug">
                  No accounts payable record linked yet. Supplier paid on PO:{' '}
                  <span className="font-semibold text-slate-800 tabular-nums">
                    {formatNgn(po.supplierPaidNgn || 0)}
                  </span>
                </p>
              )}

              {paymentPreview?.supplierPayments?.length > 0 ? (
                <div className="space-y-1">
                  <p className={detailLabel}>
                    Payment history ({paymentPreview.supplierPayments.length})
                  </p>
                  <ul className="max-h-44 overflow-y-auto custom-scrollbar space-y-1">
                    {paymentPreview.supplierPayments.map((pay) => (
                      <li
                        key={pay.movementId || `${pay.postedAtISO}-${pay.amountAbs}`}
                        className="rounded-md border border-slate-100 bg-slate-50/80 px-2 py-1.5 text-ui-xs text-slate-700"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 tabular-nums">
                          <span className="font-semibold text-slate-800">
                            {pay.postedAtISO ? String(pay.postedAtISO).slice(0, 10) : '—'}
                          </span>
                          <span className="font-bold text-zarewa-teal">{formatNgn(pay.amountAbs)}</span>
                        </div>
                        <p className="mt-0.5 text-ui-xs text-slate-600">
                          <span className="font-semibold uppercase tracking-wide">{pay.typeLabel}</span>
                          {pay.accountName ? (
                            <>
                              <span className="mx-1">·</span>
                              <span>{pay.accountName}</span>
                            </>
                          ) : null}
                          {pay.reference ? (
                            <>
                              <span className="mx-1">·</span>
                              <span>Ref {pay.reference}</span>
                            </>
                          ) : null}
                        </p>
                        {pay.counterpartyName ? (
                          <p className="text-ui-xs text-slate-500">{pay.counterpartyName}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : paymentPreview?.stockPayments?.length > 0 ? (
                <div className="space-y-1">
                  <p className={detailLabel}>Payment ledger ({paymentPreview.stockPayments.length})</p>
                  <ul className="max-h-36 overflow-y-auto custom-scrollbar space-y-1">
                    {paymentPreview.stockPayments.map((pay, idx) => (
                      <li
                        key={`${pay.atISO}-${idx}`}
                        className="rounded-md border border-slate-100 bg-slate-50/80 px-2 py-1.5 text-ui-xs text-slate-700"
                      >
                        <span className="font-semibold">
                          {pay.atISO ? String(pay.atISO).slice(0, 10) : '—'}
                        </span>
                        {pay.detail ? <span className="ml-1">{pay.detail}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-ui-xs text-slate-500 italic">No supplier payments posted yet.</p>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className={`${detailLabel} mb-2`}>Transport & settlement</p>
              {canTransport ? (
                <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-ui-xs font-semibold text-amber-950 leading-snug">
                  {purchaseOrderTransportGapLabel(po)} — assign haulier and quoted fee so Finance can post payout.
                </p>
              ) : null}
              <dl className="space-y-1.5 text-xs">
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-slate-500">Agent</dt>
                  <dd className="font-medium text-slate-800">{po.transportAgentName || '—'}</dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-slate-500">Reference</dt>
                  <dd className="font-medium text-slate-800">{po.transportReference || '—'}</dd>
                </div>
                {po.transportAmountNgn ? (
                  <div className="flex flex-wrap justify-between gap-2">
                    <dt className="text-slate-500">Transport fee (quoted)</dt>
                    <dd className="font-medium text-slate-800">{formatNgn(po.transportAmountNgn)}</dd>
                  </div>
                ) : null}
                {Number(po.transportAdvanceNgn) > 0 &&
                Number(po.transportAdvanceNgn) !== Number(po.transportAmountNgn) ? (
                  <div className="flex flex-wrap justify-between gap-2">
                    <dt className="text-slate-500">Advance (in transit)</dt>
                    <dd className="font-medium text-slate-800">{formatNgn(po.transportAdvanceNgn)}</dd>
                  </div>
                ) : null}
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-slate-500">Paid (treasury)</dt>
                  <dd className="font-medium text-slate-800">
                    {formatNgn(po.transportPaidNgn || 0)}
                    {po.transportAmountNgn
                      ? ` of ${formatNgn(po.transportAmountNgn)}`
                      : ''}
                  </dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-slate-500">Transport settled</dt>
                  <dd className="font-medium text-slate-800">{po.transportPaid ? 'Yes' : 'No'}</dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-slate-500">Supplier paid</dt>
                  <dd className="font-medium text-slate-800">{formatNgn(po.supplierPaidNgn || 0)}</dd>
                </div>
                {po.transportFinanceAdvice ? (
                  <div className="border-t border-slate-100 pt-2 mt-2">
                    <p className={detailLabel}>Finance advice (DAV)</p>
                    <p className="mt-1 text-ui-xs text-slate-700 leading-snug">{po.transportFinanceAdvice}</p>
                  </div>
                ) : null}
                {po.transportNote ? (
                  <p className="text-ui-xs text-slate-600 leading-snug border-t border-slate-100 pt-2 mt-2">
                    {po.transportNote}
                  </p>
                ) : null}
                {paymentPreview?.transportPayments?.length > 0 ? (
                  <div className="border-t border-slate-100 pt-2 mt-2 space-y-1">
                    <p className={detailLabel}>
                      Transport payment history ({paymentPreview.transportPayments.length})
                    </p>
                    <ul className="max-h-36 overflow-y-auto custom-scrollbar space-y-1">
                      {paymentPreview.transportPayments.map((pay) => (
                        <li
                          key={pay.movementId || `tp-${pay.postedAtISO}-${pay.amountAbs}`}
                          className="rounded-md border border-slate-100 bg-slate-50/80 px-2 py-1.5 text-ui-xs text-slate-700"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 tabular-nums">
                            <span className="font-semibold text-slate-800">
                              {pay.postedAtISO ? String(pay.postedAtISO).slice(0, 10) : '—'}
                            </span>
                            <span className="font-bold text-zarewa-teal">{formatNgn(pay.amountAbs)}</span>
                          </div>
                          <p className="mt-0.5 text-ui-xs text-slate-600">
                            {pay.accountName || pay.typeLabel}
                            {pay.reference ? (
                              <>
                                <span className="mx-1">·</span>
                                <span>Ref {pay.reference}</span>
                              </>
                            ) : null}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </dl>
            </section>
          </div>
        </div>

        {hasWorkflowFooter ? (
          <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 space-y-2">
            <p className="text-ui-xs font-bold uppercase tracking-widest text-slate-400">Actions</p>
            {pending && (!canApprovePo || !wsCanMutate) ? (
              <ZareApprovalHint
                compact
                context={{
                  referenceNo: po.poID,
                  documentType: 'purchase_order',
                  status: po.status,
                  canApprove: canApprovePo && wsCanMutate,
                  canMutate: wsCanMutate,
                  missingPermission: !canApprovePo
                    ? 'Purchase order approval requires purchase_orders.manage permission.'
                    : undefined,
                  zareQuery: `Why can't I approve PO ${po.poID}?`,
                }}
              />
            ) : null}
            <div className="flex flex-wrap gap-1.5">
              {canEdit && onEdit ? (
                <button
                  type="button"
                  disabled={!wsCanMutate}
                  onClick={() => onEdit(po)}
                  className={`${poActionBtn} border border-slate-200 bg-white text-zarewa-teal hover:bg-slate-50`}
                >
                  Edit PO
                </button>
              ) : null}
              {pending && onApprove && onReject ? (
                <>
                  <button
                    type="button"
                    disabled={!wsCanMutate}
                    onClick={() => onApprove(po)}
                    className={`${poActionBtn} bg-zarewa-teal text-white hover:brightness-110`}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={!wsCanMutate}
                    onClick={() => onReject(po)}
                    className={`${poActionBtn} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
                  >
                    Reject
                  </button>
                </>
              ) : null}
              {canTransport && onAssignTransport ? (
                <button
                  type="button"
                  disabled={!wsCanMutate}
                  onClick={() => onAssignTransport(po)}
                  className={`${poActionBtn} border border-violet-300 bg-violet-50 text-violet-900 hover:bg-violet-100`}
                >
                  {purchaseOrderTransportActionLabel(po)}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <PrintModalPortal open={showPrint} onClose={() => setShowPrint(false)}>
              <div className="mx-auto max-w-[210mm] pb-16">
                <div className="quotation-print-root quotation-print-preview-mode rounded-lg border border-slate-200 bg-white shadow-2xl print:rounded-none print:border-0 print:shadow-none">
                  <PurchaseOrderPrintView po={po} printedAtIso={printStampIso} />
                </div>
                <div className="no-print mt-4 flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="rounded-lg bg-zarewa-teal px-5 py-2.5 text-ui-xs font-semibold uppercase tracking-wide text-white shadow-lg"
                  >
                    Print / Save as PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPrint(false)}
                    className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-ui-xs font-semibold uppercase tracking-wide text-slate-700"
                  >
                    Close
                  </button>
                </div>
              </div>
      </PrintModalPortal>
    </SlideOverPanel>
  );
}

/**
 * Accounts payable row detail (Procurement → Payments lists).
 */
export function ProcurementPayablePreviewSlideOver({
  payable: p,
  isOpen,
  onClose,
  branchNameById,
  todayIso,
  canPay,
  wsCanMutate,
  onPay,
}) {
  if (!p) return null;
  const paid = Number(p.paidNgn) || 0;
  const amt = Number(p.amountNgn) || 0;
  const outstanding = Math.max(0, amt - paid);
  const open = paid < amt;
  const pastDue =
    p.dueDateISO && String(p.dueDateISO).trim() && p.dueDateISO < todayIso && open;

  return (
    <SlideOverPanel
      isOpen={isOpen}
      onClose={onClose}
      title={p.apID ? `AP ${p.apID}` : 'Payable'}
      description="Supplier payable details"
      maxWidthClass="max-w-[min(96vw,440px)]"
    >
      <div className="flex h-full min-h-0 flex-1 flex-col bg-slate-50">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="min-w-0">
            <p className="text-ui-xs font-semibold uppercase tracking-widest text-slate-500">Accounts payable</p>
            <h2 className="mt-0.5 font-mono text-lg font-bold text-zarewa-teal">{p.apID}</h2>
            <p className="text-xs font-medium text-slate-600">{p.supplierName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3 text-xs">
            <dl className="space-y-2">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">PO reference</dt>
                <dd className="font-mono font-semibold text-slate-800">{p.poRef || '—'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Invoice ref</dt>
                <dd className="font-semibold text-slate-800">{p.invoiceRef || '—'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Due date</dt>
                <dd className="font-semibold text-slate-800">{p.dueDateISO || '—'}</dd>
              </div>
              {pastDue ? (
                <p className="text-ui-xs font-bold uppercase tracking-wide text-amber-800">Past due</p>
              ) : null}
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Branch</dt>
                <dd className="font-semibold text-slate-800">
                  {p.branchId ? branchNameById[p.branchId] || p.branchId : '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Payment method</dt>
                <dd className="font-semibold text-slate-800">{p.paymentMethod || '—'}</dd>
              </div>
            </dl>
            <div className="border-t border-slate-100 pt-3 space-y-1 tabular-nums">
              <div className="flex justify-between text-slate-600">
                <span>Invoice amount</span>
                <span className="font-bold">{formatNgn(amt)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Paid</span>
                <span className="font-bold">{formatNgn(paid)}</span>
              </div>
              <div className="flex justify-between text-zarewa-teal">
                <span className="font-semibold">{open ? 'Outstanding' : 'Balance'}</span>
                <span className="text-base font-black">{formatNgn(open ? outstanding : 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {open && canPay ? (
          <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3">
            <button
              type="button"
              disabled={!wsCanMutate}
              onClick={() => onPay?.(p)}
              className="w-full rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-ui-xs font-bold uppercase tracking-wide text-sky-900 hover:bg-sky-100 disabled:opacity-40"
            >
              Record payment
            </button>
          </div>
        ) : null}
      </div>
    </SlideOverPanel>
  );
}
