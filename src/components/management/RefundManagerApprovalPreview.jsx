import React, { Fragment, useMemo } from 'react';
import { RefreshCw, CheckCircle2, RotateCcw } from 'lucide-react';
import { flattenQuotationLineItems, formatRefundReasonCategory, ledgerTypeStyle } from '../../lib/managerDashboardCore';
import { formatActorAttribution, formatStageActor } from '../../lib/actorAttribution';
import { formatPersonName } from '../../lib/formatPersonName';
import { normalizeRefund } from '../../lib/refundsStore';

function Panel({ title, hint, children, className = '' }) {
  return (
    <section
      className={`flex min-h-[min(42vh,360px)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <header className="shrink-0 border-b border-slate-100 bg-slate-50/90 px-3 py-2">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#134e4a]">{title}</h4>
        {hint ? <p className="mt-0.5 text-[10px] leading-snug text-slate-500">{hint}</p> : null}
      </header>
      <div className="custom-scrollbar flex-1 overflow-y-auto p-3 text-[11px] text-slate-800">
        {children}
      </div>
    </section>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div
      className={`rounded-lg border px-2 py-1.5 ${accent ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-200 bg-slate-50/80'}`}
    >
      <p className="text-[8px] font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

function DetailRow({ label, value, mono }) {
  if (value == null || value === '' || value === '—') return null;
  return (
    <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 border-b border-slate-100 py-1.5 last:border-0">
      <span className="shrink-0 text-[10px] font-semibold text-slate-500">{label}</span>
      <span className={`min-w-0 text-right text-[11px] font-medium text-slate-900 ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function ActorCaption({ name, dateIso, className = 'text-[9px] text-slate-500' }) {
  const line = formatActorAttribution(name, dateIso);
  if (!line) return null;
  return <p className={className}>By {line}</p>;
}

function sumCalcLines(lines) {
  return (lines || []).reduce((s, l) => s + (Number(l.amountNgn ?? l.amount_ngn) || 0), 0);
}

/**
 * Four-quadrant refund approval intel for Management → Action inbox → Refunds.
 */
export function RefundManagerApprovalPreview({
  refundId,
  inboxRow,
  refundRecord,
  auditData,
  loadingAudit,
  refundIntel,
  loadingIntel,
  formatNgn,
  decisionBusy,
  onApprove,
  onReject,
  onOpenSales,
}) {
  const loading = loadingAudit || (loadingIntel && !refundIntel);
  const refund = useMemo(() => {
    if (refundRecord) return normalizeRefund(refundRecord);
    if (!inboxRow) return null;
    return normalizeRefund({
      refundID: inboxRow.refund_id,
      customer: inboxRow.customer_name,
      quotationRef: inboxRow.quotation_ref,
      amountNgn: inboxRow.amount_ngn,
      reasonCategory: inboxRow.reason_category,
      status: 'Pending',
      requestedAtISO: inboxRow.requested_at_iso,
    });
  }, [refundRecord, inboxRow]);

  const sum = auditData?.summary;
  const lines = flattenQuotationLineItems(auditData?.quotation);
  const ledger = Array.isArray(auditData?.ledgerEntries) ? auditData.ledgerEntries : [];
  const otherRefunds = (Array.isArray(auditData?.refunds) ? auditData.refunds : []).filter(
    (r) => String(r.refund_id) !== String(refundId)
  );
  const totals = auditData?.totals || {};
  const cuttingLists = Array.isArray(auditData?.cuttingLists) ? auditData.cuttingLists : [];
  const productionLogs = Array.isArray(auditData?.productionLogs) ? auditData.productionLogs : [];
  const checks = Array.isArray(auditData?.conversionChecks) ? auditData.conversionChecks : [];
  const coils = Array.isArray(auditData?.jobCoils) ? auditData.jobCoils : [];
  const stageActors = auditData?.stageActors || {};
  const salesReceipts = Array.isArray(auditData?.salesReceipts) ? auditData.salesReceipts : [];
  const intelSum = refundIntel?.summary;
  const dataQuality = Array.isArray(refundIntel?.dataQualityIssues) ? refundIntel.dataQualityIssues : [];
  const calcLines = refund?.calculationLines || [];

  const checksByJob = useMemo(() => {
    const m = new Map();
    for (const c of checks) {
      const jid = String(c.job_id || '');
      if (!jid) continue;
      if (!m.has(jid)) m.set(jid, []);
      m.get(jid).push(c);
    }
    return m;
  }, [checks]);

  const coilsByJob = useMemo(() => {
    const m = new Map();
    for (const c of coils) {
      const jid = String(c.job_id || '');
      if (!jid) continue;
      if (!m.has(jid)) m.set(jid, []);
      m.get(jid).push(c);
    }
    return m;
  }, [coils]);

  const accLines = intelSum?.accessoriesSummary?.lines || [];
  const stone = intelSum?.stoneFlatsheetSummary;

  return (
    <div className="animate-in fade-in space-y-3 duration-200">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Refund approval</p>
          <h2 className="font-mono text-lg font-black leading-tight text-slate-900">{refundId}</h2>
          <p className="mt-0.5 truncate text-sm font-semibold text-slate-700">
            {formatPersonName(refund?.customer || inboxRow?.customer_name || '—')}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {refund?.quotationRef || inboxRow?.quotation_ref ? (
              <>
                Quote{' '}
                <span className="font-mono font-semibold text-slate-800">
                  {refund?.quotationRef || inboxRow?.quotation_ref}
                </span>
                {' · '}
              </>
            ) : null}
            {formatRefundReasonCategory(refund?.reasonCategory ?? inboxRow?.reason_category)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-bold uppercase text-slate-400">Requested</p>
          <p className="text-xl font-black tabular-nums text-rose-700">{formatNgn(refund?.amountNgn ?? inboxRow?.amount_ngn)}</p>
          <p className="text-[10px] text-slate-500">
            {(refund?.requestedAtISO || inboxRow?.requested_at_iso || '').slice(0, 16).replace('T', ' ') || '—'}
            {refund?.requestedBy && refund.requestedBy !== '—'
              ? ` · ${formatPersonName(refund.requestedBy)}`
              : ''}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-16">
          <RefreshCw className="animate-spin text-[#134e4a]" size={28} />
          <span className="text-[11px] font-semibold text-slate-500">Loading quotation & refund context…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Panel title="Quotation" hint="Order value, lines, and manager clearance on this quote.">
            {!auditData || auditData.ok === false ? (
              <p className="text-xs text-rose-600">{auditData?.error || 'Quotation audit unavailable.'}</p>
            ) : (
              <Fragment>
                {sum ? (
                  <div className="mb-3 grid grid-cols-3 gap-1.5">
                    <Stat label="Order total" value={formatNgn(sum.orderTotalNgn)} />
                    <Stat label="Paid in" value={formatNgn(sum.paidNgn)} accent />
                    <Stat label="Outstanding" value={formatNgn(sum.outstandingNgn)} />
                  </div>
                ) : null}
                {auditData.quotation?.projectName ? (
                  <p className="mb-2 text-[11px] text-slate-600">
                    <span className="font-bold text-slate-800">Project:</span> {auditData.quotation.projectName}
                  </p>
                ) : null}
                <div className="mb-2 space-y-0.5 rounded-lg border border-slate-100 bg-slate-50/80 px-2 py-1.5">
                  {[
                    formatStageActor(stageActors.quotation),
                    formatStageActor(stageActors.managerClear),
                    formatStageActor(stageActors.managerProduction),
                    formatStageActor(stageActors.managerFlag),
                    formatStageActor(stageActors.bmPriceException),
                    formatStageActor(stageActors.mdPriceException),
                  ]
                    .filter(Boolean)
                    .map((line) => (
                      <p key={line} className="text-[9px] leading-snug text-slate-600">
                        {line}
                      </p>
                    ))}
                  {![
                    stageActors.quotation?.by,
                    stageActors.managerClear?.by,
                    stageActors.managerProduction?.by,
                    stageActors.managerFlag?.by,
                    stageActors.bmPriceException?.by,
                    stageActors.mdPriceException?.by,
                    auditData.quotation?.handledBy,
                  ].some(Boolean) ? (
                    <p className="text-[9px] text-slate-400">No named actors on file for quote milestones.</p>
                  ) : null}
                </div>
                <p className="mb-1 text-[9px] font-black uppercase tracking-wide text-slate-400">
                  Order lines ({lines.length})
                </p>
                {lines.length === 0 ? (
                  <p className="text-xs text-slate-500">No structured lines — open Sales for full quote.</p>
                ) : (
                  <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
                    {lines.map((ln, idx) => (
                      <div key={`${ln.category}-${idx}`} className="flex flex-wrap items-baseline justify-between gap-2 px-2 py-1.5">
                        <div className="min-w-0">
                          <span className="mr-1.5 text-[8px] font-black uppercase text-slate-400">{ln.category}</span>
                          <span className="font-semibold text-slate-900">{ln.name}</span>
                          {ln.qty !== '' && ln.qty != null ? (
                            <span className="ml-1 text-slate-500">
                              {ln.qty}
                              {ln.unit ? ` ${ln.unit}` : ''}
                            </span>
                          ) : null}
                        </div>
                        <span className="shrink-0 tabular-nums text-slate-700">
                          {ln.lineTotal !== '' && ln.lineTotal != null
                            ? formatNgn(ln.lineTotal)
                            : ln.unitPrice
                              ? `@ ${formatNgn(ln.unitPrice)}`
                              : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Fragment>
            )}
          </Panel>

          <Panel title="Payments" hint="Ledger movements and cash booked on this quotation.">
            {intelSum ? (
              <div className="mb-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                <Stat label="Cash in (ledger)" value={formatNgn(intelSum.quotationCashInNgn)} accent />
                <Stat label="Booked on quote" value={formatNgn(intelSum.bookedOnQuotationNgn)} />
                <Stat label="Receipt cash" value={formatNgn(intelSum.receiptCashNgn)} />
                <Stat label="Overpay (ledger)" value={formatNgn(intelSum.overpayAdvanceNgn)} />
                <Stat label="Advance applied" value={formatNgn(intelSum.advanceAppliedNgn)} />
                <Stat label="Overpay applied" value={formatNgn(intelSum.overpayAppliedNgn)} />
              </div>
            ) : null}
            {salesReceipts.length > 0 ? (
              <Fragment>
                <p className="mb-1 text-[9px] font-black uppercase tracking-wide text-slate-400">
                  Sales receipts ({salesReceipts.length})
                </p>
                <div className="mb-3 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
                  {salesReceipts.map((rc) => (
                    <div key={rc.id} className="px-2 py-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] font-semibold text-slate-800">{rc.id}</span>
                        <span className="text-xs font-bold tabular-nums text-slate-900">{formatNgn(rc.amount_ngn)}</span>
                      </div>
                      <ActorCaption name={rc.handled_by} dateIso={rc.date_iso} />
                    </div>
                  ))}
                </div>
              </Fragment>
            ) : null}
            <p className="mb-1 text-[9px] font-black uppercase tracking-wide text-slate-400">
              Ledger ({ledger.length})
            </p>
            {ledger.length === 0 ? (
              <p className="text-xs text-slate-500">No ledger rows for this quotation.</p>
            ) : (
              <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
                {ledger.map((e, idx) => {
                  const hint = [e.payment_method, e.purpose, e.bank_reference, e.note].filter(Boolean).join(' · ');
                  return (
                    <div key={e.id || idx} className="px-2 py-1.5" title={hint || undefined}>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[7px] font-black uppercase ${ledgerTypeStyle(e.type, 'light')}`}
                        >
                          {(e.type || '—').slice(0, 14)}
                        </span>
                        <span className="text-xs font-bold tabular-nums text-slate-900">{formatNgn(e.amount_ngn)}</span>
                        <span className="shrink-0 font-mono text-[9px] text-slate-400">
                          {e.at_iso?.slice(0, 10) || '—'}
                        </span>
                      </div>
                      {(e.payment_method || e.purpose || e.note) && (
                        <p className="mt-0.5 truncate text-[10px] text-slate-500">{hint}</p>
                      )}
                      <ActorCaption name={e.created_by_name} dateIso={e.at_iso} />
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel
            title="Conversion & supply"
            hint="Metres, production jobs, cutting lists, accessories, and coil usage."
          >
            <div className="mb-3 grid grid-cols-3 gap-1.5">
              <Stat label="Cutting lists" value={`${Number(totals.cuttingListMetersSum || 0).toLocaleString()} m`} />
              <Stat
                label="Produced (done)"
                value={`${Number(totals.completedProductionMetersSum || 0).toLocaleString()} m`}
                accent
              />
              <Stat label="All job actuals" value={`${Number(totals.productionJobsMetersSum || 0).toLocaleString()} m`} />
            </div>
            {intelSum?.producedMeters != null ? (
              <p className="mb-2 text-[10px] text-slate-600">
                Effective output (intel): <strong>{Number(intelSum.producedMeters).toLocaleString()} m</strong>
              </p>
            ) : null}

            {dataQuality.length > 0 ? (
              <ul className="mb-3 space-y-1 rounded-lg border border-amber-200 bg-amber-50/80 p-2">
                {dataQuality.map((issue, i) => (
                  <li key={i} className="text-[10px] leading-snug text-amber-950">
                    {typeof issue === 'string' ? issue : issue?.message || issue?.code || JSON.stringify(issue)}
                  </li>
                ))}
              </ul>
            ) : null}

            {accLines.length > 0 ? (
              <Fragment>
                <p className="mb-1 text-[9px] font-black uppercase text-slate-400">Accessories</p>
                <ul className="mb-3 space-y-0.5 rounded-lg border border-slate-200 bg-slate-50/50 p-2">
                  {accLines.map((a, i) => (
                    <li key={i} className="flex justify-between gap-2 text-[10px]">
                      <span className="min-w-0 truncate font-medium text-slate-800">{a.label || a.name || '—'}</span>
                      <span className="shrink-0 tabular-nums text-slate-600">
                        {a.issuedQty != null ? `${a.issuedQty} issued` : ''}
                        {a.quotedQty != null ? ` / ${a.quotedQty} quoted` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </Fragment>
            ) : null}

            {stone && (stone.totalSuppliedM2 > 0 || stone.totalDeductionM2 > 0 || (stone.lines || []).length > 0) ? (
              <p className="mb-2 text-[10px] text-slate-600">
                Stone flatsheet: supplied <strong>{Number(stone.totalSuppliedM2 || 0).toLocaleString()} m²</strong>
                {stone.totalDeductionM2 ? ` · deduction ${Number(stone.totalDeductionM2).toLocaleString()} m²` : ''}
              </p>
            ) : null}

            <p className="mb-1 text-[9px] font-black uppercase text-slate-400">
              Cutting lists ({cuttingLists.length})
            </p>
            {cuttingLists.length === 0 ? (
              <p className="mb-3 text-xs text-slate-500">None linked.</p>
            ) : (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {cuttingLists.map((cl) => (
                  <div
                    key={cl.id}
                    className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-800"
                    title={`${cl.status || ''} · ${Number(cl.total_meters || 0).toLocaleString()} m`}
                  >
                    <span className="font-mono font-bold">
                      {cl.id} · {Number(cl.total_meters || 0).toLocaleString()} m
                    </span>
                    <ActorCaption name={cl.handled_by} dateIso={cl.date_iso} className="text-[8px] text-slate-500" />
                  </div>
                ))}
              </div>
            )}

            <p className="mb-1 text-[9px] font-black uppercase text-slate-400">
              Production ({productionLogs.length})
            </p>
            {productionLogs.length === 0 ? (
              <p className="text-xs text-slate-500">No production jobs.</p>
            ) : (
              <div className="space-y-2">
                {productionLogs.map((job) => {
                  const jobChecks = checksByJob.get(job.job_id) || [];
                  const jobCoils = coilsByJob.get(job.job_id) || [];
                  return (
                    <div key={job.job_id} className="rounded-lg border border-slate-200 bg-slate-50/60 p-2">
                      <div className="flex flex-wrap justify-between gap-1">
                        <span className="font-mono text-[10px] font-bold text-slate-900">{job.job_id}</span>
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[8px] font-black uppercase text-slate-700">
                          {job.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] font-semibold text-slate-800">{job.product_name || '—'}</p>
                      <ActorCaption name={job.operator_name} dateIso={job.completed_at_iso || job.created_at_iso} />
                      <p className="text-[10px] text-slate-500">
                        Planned {Number(job.planned_meters || 0).toLocaleString()} m · Actual{' '}
                        {Number(job.actual_meters || 0).toLocaleString()} m ·{' '}
                        {Number(job.actual_weight_kg || 0).toLocaleString()} kg
                      </p>
                      <p className="text-[9px] text-violet-800">
                        Conversion: {job.conversion_alert_state || '—'}
                        {job.manager_review_required ? ' · needs review' : ''}
                      </p>
                      {job.manager_review_signed_by_name ? (
                        <ActorCaption
                          name={job.manager_review_signed_by_name}
                          dateIso={job.manager_review_signed_at_iso}
                          className="text-[8px] font-semibold text-emerald-800"
                        />
                      ) : null}
                      {jobCoils.length > 0 ? (
                        <p className="mt-1 text-[9px] text-slate-600">
                          Coils:{' '}
                          {jobCoils
                            .map((c) => `${c.coil_no} (${Number(c.meters_produced || 0).toLocaleString()} m)`)
                            .join(', ')}
                        </p>
                      ) : null}
                      {jobChecks.length > 0 ? (
                        <ul className="mt-1 space-y-0.5 border-t border-slate-200/80 pt-1">
                          {jobChecks.map((ch, i) => (
                            <li key={i} className="text-[9px] text-slate-600">
                              <span className="font-mono">
                                {ch.coil_no} · {ch.alert_state}
                                {ch.actual_conversion_kg_per_m != null
                                  ? ` · ${Number(ch.actual_conversion_kg_per_m).toFixed(3)} kg/m`
                                  : ''}
                              </span>
                              <ActorCaption
                                name={job.operator_name}
                                dateIso={ch.checked_at_iso}
                                className="text-[8px] text-slate-500"
                              />
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel title="Refund request" hint="This approval: breakdown, payee, and prior refunds on the quote.">
            <DetailRow label="Refund ID" value={refund?.refundID || refundId} mono />
            <DetailRow label="Product / scope" value={refund?.product} />
            <DetailRow label="Categories" value={formatRefundReasonCategory(refund?.reasonCategory)} />
            <DetailRow label="Reason" value={refund?.reason} />
            <DetailRow
              label="Requested by"
              value={formatActorAttribution(refund?.requestedBy, refund?.requestedAtISO)}
            />
            {refund?.approvedBy ? (
              <DetailRow
                label="Approved by"
                value={formatActorAttribution(refund.approvedBy, refund.approvalDate)}
              />
            ) : null}
            {refund?.paidBy ? (
              <DetailRow label="Paid by" value={formatActorAttribution(refund.paidBy, refund.paidAtISO)} />
            ) : null}
            {refund?.cuttingListRef ? <DetailRow label="Cutting list" value={refund.cuttingListRef} mono /> : null}

            {calcLines.length > 0 ? (
              <Fragment>
                <p className="mb-1 mt-2 text-[9px] font-black uppercase text-slate-400">Amount breakdown</p>
                <div className="mb-2 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
                  {calcLines.map((ln, idx) => (
                    <div key={idx} className="flex justify-between gap-2 px-2 py-1.5">
                      <span className="min-w-0 text-[10px] text-slate-800">
                        {ln.label || ln.description || ln.category || `Line ${idx + 1}`}
                      </span>
                      <span className="shrink-0 font-bold tabular-nums text-slate-900">
                        {formatNgn(Number(ln.amountNgn ?? ln.amount_ngn) || 0)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between gap-2 bg-slate-50 px-2 py-1.5 font-bold">
                    <span className="text-[10px] text-slate-700">Total (lines)</span>
                    <span className="tabular-nums text-rose-800">{formatNgn(sumCalcLines(calcLines))}</span>
                  </div>
                </div>
              </Fragment>
            ) : null}

            {refund?.calculationNotes ? (
              <p className="mb-2 rounded-lg border border-slate-100 bg-slate-50 p-2 text-[10px] leading-snug text-slate-700">
                <span className="font-bold text-slate-500">Notes: </span>
                {refund.calculationNotes}
              </p>
            ) : null}

            {(refund?.payeeName || refund?.payeeAccountNo || refund?.payeeBankName) && (
              <div className="mb-2 rounded-lg border border-teal-200 bg-teal-50/50 p-2">
                <p className="text-[9px] font-black uppercase text-teal-800">Pay to</p>
                <p className="text-[11px] font-semibold text-slate-900">
                  {[formatPersonName(refund.payeeName), refund.payeeBankName].filter(Boolean).join(' · ') || '—'}
                </p>
                {refund.payeeAccountNo ? (
                  <p className="font-mono text-[10px] text-slate-600">{refund.payeeAccountNo}</p>
                ) : null}
              </div>
            )}

            {refund?.managerComments ? (
              <DetailRow label="Requester / prior manager note" value={refund.managerComments} />
            ) : null}

            {otherRefunds.length > 0 ? (
              <Fragment>
                <p className="mb-1 mt-3 text-[9px] font-black uppercase text-slate-400">
                  Other refunds on quote ({otherRefunds.length})
                </p>
                <div className="space-y-1.5">
                  {otherRefunds.map((r) => (
                    <div
                      key={r.refund_id}
                      className="rounded-lg border border-amber-200/80 bg-amber-50/60 px-2 py-1.5"
                    >
                      <div className="flex justify-between gap-2">
                        <span className="font-mono text-[10px] font-bold text-amber-950">{r.refund_id}</span>
                        <span className="font-bold tabular-nums text-amber-900">{formatNgn(r.amount_ngn)}</span>
                      </div>
                      <p className="text-[10px] text-slate-700">
                        {r.status} · {r.product || '—'}
                      </p>
                      <ActorCaption name={r.requested_by} dateIso={r.requested_at_iso} />
                      {r.approved_by ? (
                        <ActorCaption
                          name={r.approved_by}
                          dateIso={r.approval_date}
                          className="text-[8px] text-emerald-800"
                        />
                      ) : null}
                      {r.paid_by ? (
                        <ActorCaption name={r.paid_by} dateIso={r.paid_at_iso} className="text-[8px] text-teal-800" />
                      ) : null}
                    </div>
                  ))}
                </div>
              </Fragment>
            ) : (
              <p className="mt-2 text-[10px] text-slate-500">No other refund requests on this quotation.</p>
            )}
          </Panel>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#134e4a]">Decision</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={decisionBusy || loading}
            onClick={onApprove}
            className="flex flex-col items-center gap-1.5 rounded-xl bg-emerald-600 p-3.5 text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            <CheckCircle2 size={18} />
            <span className="text-[9px] font-black uppercase tracking-widest">Approve</span>
          </button>
          <button
            type="button"
            disabled={decisionBusy || loading}
            onClick={onReject}
            className="flex flex-col items-center gap-1.5 rounded-xl bg-rose-600 p-3.5 text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
          >
            <RotateCcw size={18} />
            <span className="text-[9px] font-black uppercase tracking-widest">Reject</span>
          </button>
        </div>
        {onOpenSales ? (
          <button
            type="button"
            disabled={decisionBusy}
            onClick={onOpenSales}
            className="mt-2 w-full py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 transition-colors hover:text-slate-700"
          >
            Open full refund flow in Sales
          </button>
        ) : null}
      </div>
    </div>
  );
}
