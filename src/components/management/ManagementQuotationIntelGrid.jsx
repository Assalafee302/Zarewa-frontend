import React, { Fragment, useMemo } from 'react';
import { flattenQuotationLineItems, ledgerTypeStyle } from '../../lib/managerDashboardCore';
import { IntelPanel, IntelStat } from './managementIntelUi';

/**
 * Shared 3-panel grid: quotation, payments, conversion & supply.
 */
export function ManagementQuotationIntelGrid({ auditData, paymentIntel, formatNgn }) {
  const sum = auditData?.summary;
  const lines = flattenQuotationLineItems(auditData?.quotation);
  const ledger = Array.isArray(auditData?.ledgerEntries) ? auditData.ledgerEntries : [];
  const totals = auditData?.totals || {};
  const cuttingLists = Array.isArray(auditData?.cuttingLists) ? auditData.cuttingLists : [];
  const productionLogs = Array.isArray(auditData?.productionLogs) ? auditData.productionLogs : [];
  const checks = Array.isArray(auditData?.conversionChecks) ? auditData.conversionChecks : [];
  const coils = Array.isArray(auditData?.jobCoils) ? auditData.jobCoils : [];
  const intelSum = paymentIntel?.summary;
  const dataQuality = Array.isArray(paymentIntel?.dataQualityIssues) ? paymentIntel.dataQualityIssues : [];

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

  if (!auditData || auditData.ok === false) {
    return (
      <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
        {auditData?.error || 'Quotation audit unavailable.'}
      </p>
    );
  }

  return (
    <>
      <IntelPanel title="Quotation" hint="Order value, lines, and manager clearance on this quote.">
        {sum ? (
          <div className="mb-3 grid grid-cols-3 gap-1.5">
            <IntelStat label="Order total" value={formatNgn(sum.orderTotalNgn)} />
            <IntelStat label="Paid in" value={formatNgn(sum.paidNgn)} accent />
            <IntelStat label="Outstanding" value={formatNgn(sum.outstandingNgn)} />
          </div>
        ) : null}
        {auditData.quotation?.projectName ? (
          <p className="mb-2 text-[11px] text-slate-600">
            <span className="font-bold text-slate-800">Project:</span> {auditData.quotation.projectName}
          </p>
        ) : null}
        {(sum?.managerClearedAtIso || sum?.managerFlaggedAtIso || sum?.managerProductionApprovedAtIso) && (
          <p className="mb-2 text-[10px] text-slate-500">
            {sum.managerClearedAtIso ? `Cleared ${sum.managerClearedAtIso.slice(0, 10)}` : ''}
            {sum.managerProductionApprovedAtIso
              ? ` · Prod override ${sum.managerProductionApprovedAtIso.slice(0, 10)}`
              : ''}
            {sum.managerFlaggedAtIso ? (
              <span className="text-rose-600"> · Flagged {sum.managerFlaggedAtIso.slice(0, 10)}</span>
            ) : null}
          </p>
        )}
        <p className="mb-1 text-[9px] font-black uppercase tracking-wide text-slate-400">Order lines ({lines.length})</p>
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
      </IntelPanel>

      <IntelPanel title="Payments" hint="Ledger movements and cash booked on this quotation.">
        {intelSum ? (
          <div className="mb-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            <IntelStat label="Cash in (ledger)" value={formatNgn(intelSum.quotationCashInNgn)} accent />
            <IntelStat label="Booked on quote" value={formatNgn(intelSum.bookedOnQuotationNgn)} />
            <IntelStat label="Receipt cash" value={formatNgn(intelSum.receiptCashNgn)} />
            <IntelStat label="Overpay (ledger)" value={formatNgn(intelSum.overpayAdvanceNgn)} />
            <IntelStat label="Advance applied" value={formatNgn(intelSum.advanceAppliedNgn)} />
            <IntelStat label="Overpay applied" value={formatNgn(intelSum.overpayAppliedNgn)} />
          </div>
        ) : null}
        <p className="mb-1 text-[9px] font-black uppercase tracking-wide text-slate-400">Ledger ({ledger.length})</p>
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
                    <span className="shrink-0 font-mono text-[9px] text-slate-400">{e.at_iso?.slice(0, 10) || '—'}</span>
                  </div>
                  {(e.payment_method || e.purpose || e.note) && (
                    <p className="mt-0.5 truncate text-[10px] text-slate-500">{hint}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </IntelPanel>

      <IntelPanel
        title="Conversion & supply"
        hint="Metres, production jobs, cutting lists, accessories, and coil usage."
      >
        <div className="mb-3 grid grid-cols-3 gap-1.5">
          <IntelStat label="Cutting lists" value={`${Number(totals.cuttingListMetersSum || 0).toLocaleString()} m`} />
          <IntelStat
            label="Produced (done)"
            value={`${Number(totals.completedProductionMetersSum || 0).toLocaleString()} m`}
            accent
          />
          <IntelStat label="All job actuals" value={`${Number(totals.productionJobsMetersSum || 0).toLocaleString()} m`} />
        </div>
        {intelSum?.producedMeters != null ? (
          <p className="mb-2 text-[10px] text-slate-600">
            Effective output: <strong>{Number(intelSum.producedMeters).toLocaleString()} m</strong>
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
        <p className="mb-1 text-[9px] font-black uppercase text-slate-400">Cutting lists ({cuttingLists.length})</p>
        {cuttingLists.length === 0 ? (
          <p className="mb-3 text-xs text-slate-500">None linked.</p>
        ) : (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {cuttingLists.map((cl) => (
              <span
                key={cl.id}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-mono text-slate-800"
                title={`${cl.status || ''} · ${Number(cl.total_meters || 0).toLocaleString()} m`}
              >
                {cl.id} · {Number(cl.total_meters || 0).toLocaleString()} m
              </span>
            ))}
          </div>
        )}
        <p className="mb-1 text-[9px] font-black uppercase text-slate-400">Production ({productionLogs.length})</p>
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
                  <p className="text-[10px] text-slate-500">
                    Planned {Number(job.planned_meters || 0).toLocaleString()} m · Actual{' '}
                    {Number(job.actual_meters || 0).toLocaleString()} m ·{' '}
                    {Number(job.actual_weight_kg || 0).toLocaleString()} kg
                  </p>
                  <p className="text-[9px] text-violet-800">
                    Conversion: {job.conversion_alert_state || '—'}
                    {job.manager_review_required ? ' · needs review' : ''}
                  </p>
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
                        <li key={i} className="font-mono text-[9px] text-slate-600">
                          {ch.coil_no} · {ch.alert_state}
                          {ch.actual_conversion_kg_per_m != null
                            ? ` · ${Number(ch.actual_conversion_kg_per_m).toFixed(3)} kg/m`
                            : ''}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </IntelPanel>
    </>
  );
}
