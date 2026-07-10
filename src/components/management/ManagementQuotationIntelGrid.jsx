import React, { Fragment } from 'react';
import { formatStageActor } from '../../lib/actorAttribution';
import { flattenQuotationLineItems, ledgerTypeStyle } from '../../lib/managerDashboardCore';
import {
  lineMaterialSubtitle,
  quotationHasMaterialSpec,
  quotationMaterialSpecLine,
} from '../../lib/managementQuotationIntel';
import { ConversionRecordPanel } from './ConversionRecordPanel';
import { IntelPanel, IntelStat, SectionActorFooter } from './managementIntelUi';

function isAccessoryOrServiceCategory(cat) {
  const c = String(cat || '').toLowerCase();
  return c.includes('accessor') || c.includes('service');
}

/**
 * Lean quote / money / ops panels for management decision popups.
 * Money totals live in the case strip — not repeated here.
 */
export function ManagementQuotationIntelGrid({
  auditData,
  paymentIntel,
  formatNgn,
  refunds: refundsProp,
  showQuoteMoney = false,
}) {
  const sum = auditData?.summary;
  const lines = flattenQuotationLineItems(auditData?.quotation);
  const ledger = Array.isArray(auditData?.ledgerEntries) ? auditData.ledgerEntries : [];
  const totals = auditData?.totals || {};
  const cuttingLists = Array.isArray(auditData?.cuttingLists) ? auditData.cuttingLists : [];
  const refunds = Array.isArray(refundsProp)
    ? refundsProp
    : Array.isArray(auditData?.refunds)
      ? auditData.refunds
      : [];
  const intelSum = paymentIntel?.summary;
  const dataQuality = Array.isArray(paymentIntel?.dataQualityIssues) ? paymentIntel.dataQualityIssues : [];
  const stageActors = auditData?.stageActors || {};
  const accLines = intelSum?.accessoriesSummary?.lines || [];
  const stone = intelSum?.stoneFlatsheetSummary;
  const hasQuoteMaterial = quotationHasMaterialSpec(auditData);
  const materialLine = quotationMaterialSpecLine(auditData);

  const productLines = lines.filter((ln) => !isAccessoryOrServiceCategory(ln.category));
  const accessoryLines = lines.filter((ln) => String(ln.category || '').toLowerCase().includes('accessor'));
  const serviceLines = lines.filter((ln) => String(ln.category || '').toLowerCase().includes('service'));

  if (!auditData || auditData.ok === false) {
    return (
      <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
        {auditData?.error || 'Quotation audit unavailable.'}
      </p>
    );
  }

  const quoteActors = [formatStageActor(stageActors.quotation)].filter(Boolean);
  const moneyActors = ledger
    .slice(0, 1)
    .map((e) => (e.created_by_name ? `Last receipt · ${e.created_by_name}` : null))
    .filter(Boolean);
  const opsActors = [
    formatStageActor(stageActors.managerProduction),
    cuttingLists[0]?.handled_by ? `Cutting · ${cuttingLists[0].handled_by}` : null,
  ].filter(Boolean);

  function renderLineRow(ln, idx, { showMaterial = false } = {}) {
    const material = showMaterial && !hasQuoteMaterial ? lineMaterialSubtitle(ln) : '';
    return (
      <div key={`${ln.category}-${idx}`} className="flex flex-wrap items-baseline justify-between gap-2 px-2 py-1.5">
        <div className="min-w-0">
          <span className="font-semibold text-slate-900">{ln.name}</span>
          {ln.qty !== '' && ln.qty != null ? (
            <span className="ml-1.5 text-slate-500">
              {ln.qty}
              {ln.unit ? ` ${ln.unit}` : ''}
            </span>
          ) : null}
          {material ? <p className="mt-0.5 text-ui-xs text-slate-500">{material}</p> : null}
        </div>
        <span className="shrink-0 tabular-nums text-slate-700">
          {ln.lineTotal !== '' && ln.lineTotal != null
            ? formatNgn(ln.lineTotal)
            : ln.unitPrice
              ? `@ ${formatNgn(ln.unitPrice)}`
              : '—'}
        </span>
      </div>
    );
  }

  return (
    <>
      <IntelPanel title="Quote" compact>
        {auditData.quotation?.projectName ? (
          <p className="mb-2 text-xs text-slate-600">{auditData.quotation.projectName}</p>
        ) : null}
        {materialLine ? (
          <p className="mb-2 text-sm font-semibold leading-snug text-slate-800">{materialLine}</p>
        ) : (
          <p className="mb-2 rounded-lg border border-amber-200/80 bg-amber-50/60 px-2 py-1.5 text-ui-xs leading-snug text-amber-800">
            Gauge, colour, and design are not recorded on this quotation.
          </p>
        )}
        {showQuoteMoney && sum ? (
          <div className="mb-2 grid grid-cols-3 gap-1.5">
            <IntelStat label="Order" value={formatNgn(sum.orderTotalNgn)} />
            <IntelStat label="Paid" value={formatNgn(sum.paidNgn)} accent />
            <IntelStat label="Out" value={formatNgn(sum.outstandingNgn)} />
          </div>
        ) : null}
        {productLines.length === 0 && accessoryLines.length === 0 && serviceLines.length === 0 ? (
          <p className="text-xs text-slate-500">No structured lines — open Sales for full quote.</p>
        ) : (
          <div className="space-y-2">
            {productLines.length > 0 ? (
              <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
                {productLines.map((ln, idx) => renderLineRow(ln, idx))}
              </div>
            ) : null}
            {accessoryLines.length > 0 ? (
              <div>
                <p className="mb-1 text-ui-xs font-black uppercase tracking-wide text-slate-400">Accessories</p>
                <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
                  {accessoryLines.map((ln, idx) => renderLineRow(ln, idx))}
                </div>
              </div>
            ) : null}
            {serviceLines.length > 0 ? (
              <div>
                <p className="mb-1 text-ui-xs font-black uppercase tracking-wide text-slate-400">Services</p>
                <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
                  {serviceLines.map((ln, idx) => renderLineRow(ln, idx))}
                </div>
              </div>
            ) : null}
          </div>
        )}
        <SectionActorFooter lines={quoteActors} />
      </IntelPanel>

      <IntelPanel title="Money" compact>
        {intelSum ? (
          <div className="mb-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            <IntelStat label="Cash in" value={formatNgn(intelSum.quotationCashInNgn)} accent />
            <IntelStat label="Booked" value={formatNgn(intelSum.bookedOnQuotationNgn)} />
            <IntelStat label="Receipts" value={formatNgn(intelSum.receiptCashNgn)} />
            {Number(intelSum.overpayAdvanceNgn) > 0 ? (
              <IntelStat label="Overpay" value={formatNgn(intelSum.overpayAdvanceNgn)} />
            ) : null}
            {Number(intelSum.advanceAppliedNgn) > 0 ? (
              <IntelStat label="Advance applied" value={formatNgn(intelSum.advanceAppliedNgn)} />
            ) : null}
            {Number(intelSum.overpayAppliedNgn) > 0 ? (
              <IntelStat label="Overpay applied" value={formatNgn(intelSum.overpayAppliedNgn)} />
            ) : null}
          </div>
        ) : sum ? (
          <div className="mb-2 grid grid-cols-2 gap-1.5">
            <IntelStat label="Paid" value={formatNgn(sum.paidNgn)} accent />
            <IntelStat label="Outstanding" value={formatNgn(sum.outstandingNgn)} />
          </div>
        ) : null}
        {ledger.length > 0 ? (
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
                    <span className="shrink-0 font-mono text-ui-xs text-slate-400">{e.at_iso?.slice(0, 10) || '—'}</span>
                  </div>
                  {e.created_by_name ? (
                    <p className="mt-0.5 truncate text-ui-xs text-slate-500">{e.created_by_name}</p>
                  ) : hint ? (
                    <p className="mt-0.5 truncate text-ui-xs text-slate-500">{hint}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-500">No ledger rows yet.</p>
        )}
        {refunds.length > 0 ? (
          <Fragment>
            <p className="mb-1 mt-3 text-ui-xs font-black uppercase text-slate-400">Refunds ({refunds.length})</p>
            <div className="space-y-1.5">
              {refunds.map((r) => (
                <div
                  key={r.refund_id}
                  className="rounded-lg border border-amber-200/80 bg-amber-50/60 px-2 py-1.5"
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-mono text-ui-xs font-bold text-amber-950">{r.refund_id}</span>
                    <span className="font-bold tabular-nums text-amber-900">{formatNgn(r.amount_ngn)}</span>
                  </div>
                  <p className="text-ui-xs text-slate-700">
                    {r.status}
                    {r.requested_by ? ` · ${r.requested_by}` : ''}
                    {r.product ? ` · ${r.product}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </Fragment>
        ) : null}
        <SectionActorFooter lines={moneyActors} />
      </IntelPanel>

      <IntelPanel title="Production, conversion & supply" className="lg:col-span-2" compact>
        <div className="mb-2 grid grid-cols-3 gap-1.5">
          <IntelStat label="Cutting" value={`${Number(totals.cuttingListMetersSum || 0).toLocaleString()} m`} />
          <IntelStat
            label="Produced"
            value={`${Number(totals.completedProductionMetersSum || 0).toLocaleString()} m`}
            accent
          />
          <IntelStat label="Job actuals" value={`${Number(totals.productionJobsMetersSum || 0).toLocaleString()} m`} />
        </div>
        {intelSum?.producedMeters != null ? (
          <p className="mb-2 text-ui-xs text-slate-600">
            Effective output: <strong>{Number(intelSum.producedMeters).toLocaleString()} m</strong>
          </p>
        ) : null}
        {dataQuality.length > 0 ? (
          <ul className="mb-2 space-y-1 rounded-lg border border-amber-200 bg-amber-50/80 p-2">
            {dataQuality.map((issue, i) => (
              <li key={i} className="text-ui-xs leading-snug text-amber-950">
                {typeof issue === 'string' ? issue : issue?.message || issue?.code || JSON.stringify(issue)}
              </li>
            ))}
          </ul>
        ) : null}
        {accLines.length > 0 ? (
          <ul className="mb-2 space-y-0.5 rounded-lg border border-slate-200 bg-slate-50/50 p-2">
            {accLines.map((a, i) => (
              <li key={i} className="flex justify-between gap-2 text-ui-xs">
                <span className="min-w-0 truncate font-medium text-slate-800">{a.label || a.name || '—'}</span>
                <span className="shrink-0 tabular-nums text-slate-600">
                  {a.issuedQty != null ? `${a.issuedQty} issued` : ''}
                  {a.quotedQty != null ? ` / ${a.quotedQty} quoted` : ''}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {stone && (stone.totalSuppliedM2 > 0 || stone.totalDeductionM2 > 0 || (stone.lines || []).length > 0) ? (
          <p className="mb-2 text-ui-xs text-slate-600">
            Stone flatsheet: supplied <strong>{Number(stone.totalSuppliedM2 || 0).toLocaleString()} m²</strong>
            {stone.totalDeductionM2 ? ` · deduction ${Number(stone.totalDeductionM2).toLocaleString()} m²` : ''}
          </p>
        ) : null}
        {cuttingLists.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {cuttingLists.map((cl) => (
              <span
                key={cl.id}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-ui-xs text-slate-800"
                title={`${cl.status || ''} · ${Number(cl.total_meters || 0).toLocaleString()} m${cl.handled_by ? ` · ${cl.handled_by}` : ''}`}
              >
                {cl.id} · {Number(cl.total_meters || 0).toLocaleString()} m
                {cl.handled_by ? ` · ${cl.handled_by}` : ''}
              </span>
            ))}
          </div>
        ) : null}
        <ConversionRecordPanel
          auditData={auditData}
          showMeterTotals={false}
          embedded
          suppressMaterialLine={hasQuoteMaterial}
          emptyMessage="No production jobs or coil usage on this quotation."
        />
        <SectionActorFooter lines={opsActors} />
      </IntelPanel>
    </>
  );
}
