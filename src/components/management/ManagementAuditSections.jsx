import React, { Fragment, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { formatActorAttribution, formatStageActor } from '../../lib/actorAttribution';
import { flattenQuotationLineItems, ledgerTypeStyle } from '../../lib/managerDashboardCore';
import {
  quotationHasMaterialSpec,
  quotationMaterialSpecLine,
  lineMaterialSubtitle,
} from '../../lib/managementQuotationIntel';
import { ManagementActivityTimeline } from './ManagementActivityTimeline';
import { ConversionRecordPanel } from './ConversionRecordPanel';
import { SectionActorFooter } from './managementIntelUi';

function auditUi(appearance) {
  const L = appearance === 'light';
  return {
    L,
    spin: L ? 'text-zarewa-teal' : 'text-teal-400',
    err: L ? 'text-xs text-rose-600' : 'text-xs text-rose-300/90',
    sec: L
      ? 'mb-2 text-ui-xs font-black uppercase tracking-widest text-slate-500'
      : 'mb-2 text-ui-xs font-black uppercase tracking-widest text-white/40',
    secTeal: L
      ? 'mb-2 text-ui-xs font-black uppercase tracking-widest text-zarewa-teal'
      : 'mb-2 text-ui-xs font-black uppercase tracking-widest text-teal-300/90',
    card: L
      ? 'rounded-lg border border-slate-200 bg-white px-2.5 py-2 shadow-sm'
      : 'rounded-xl border border-white/10 bg-white/[0.07] p-3',
    cardSoft: L
      ? 'rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2'
      : 'rounded-xl border border-white/10 bg-white/[0.06] p-3',
    divide: L
      ? 'divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden bg-white'
      : 'divide-y divide-white/10 rounded-xl border border-white/10 overflow-hidden',
    lineRow: 'flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-xs',
    name: L ? 'font-semibold text-slate-900' : 'font-semibold text-white',
    qty: L ? 'ml-1.5 text-slate-500' : 'ml-1.5 text-white/45',
    amt: L ? 'shrink-0 text-right tabular-nums text-slate-700' : 'shrink-0 text-right tabular-nums text-white/80',
    empty: L ? 'py-2 text-xs text-slate-500' : 'py-2 text-xs text-white/35',
    meterPaid: L
      ? 'rounded-lg border border-emerald-200 bg-emerald-50/60 px-2.5 py-2'
      : 'rounded-xl border border-teal-500/20 bg-teal-500/10 p-3',
    meterLabel: L
      ? 'text-ui-xs font-bold uppercase text-emerald-900/80'
      : 'text-ui-xs font-bold uppercase text-teal-200/80',
    meterValue: L
      ? 'mt-0.5 text-sm font-bold tabular-nums text-slate-900'
      : 'mt-1 text-lg font-black tabular-nums text-white',
    meterNeutral: L
      ? 'rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2'
      : 'rounded-xl border border-white/10 bg-white/[0.06] p-3',
    meterLabelN: L
      ? 'text-ui-xs font-bold uppercase text-slate-500'
      : 'text-ui-xs font-bold uppercase text-white/35',
    meterValueN: L
      ? 'mt-0.5 text-sm font-bold tabular-nums text-slate-800'
      : 'mt-1 text-lg font-black tabular-nums text-white/90',
    refundCard: L
      ? 'rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs'
      : 'rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs',
    refundId: L ? 'font-mono font-bold text-amber-950' : 'font-mono font-bold text-amber-100',
    refundAmt: L ? 'font-black tabular-nums text-amber-900' : 'font-black tabular-nums text-amber-200',
    refundMeta: L ? 'mt-1 text-slate-700' : 'mt-1 text-white/60',
    materialLine: L
      ? 'mb-2 text-sm font-semibold leading-snug text-slate-800'
      : 'mb-2 text-sm font-semibold leading-snug text-white',
    actorMuted: L ? 'text-slate-500' : 'text-white/40',
    historyBtn: L
      ? 'text-ui-xs font-bold uppercase tracking-wide text-zarewa-teal hover:underline'
      : 'text-ui-xs font-bold uppercase tracking-wide text-teal-300 hover:underline',
  };
}

function isAccessoryOrServiceCategory(cat) {
  const c = String(cat || '').toLowerCase();
  return c.includes('accessor') || c.includes('service');
}

/**
 * Lean quotation audit body — no duplicate order/balance, order lines, or second conversion stack.
 */
export function ManagementAuditSections({ auditData, loadingAudit, formatNgn, appearance = 'dark' }) {
  const u = auditUi(appearance);
  const ledgerTheme = u.L ? 'light' : 'dark';
  const [showHistory, setShowHistory] = useState(false);

  if (loadingAudit && (!auditData || auditData.ok === false)) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className={`${u.spin} animate-spin`} size={28} />
      </div>
    );
  }
  if (!auditData || auditData.ok === false) {
    return <p className={u.err}>{auditData?.error || 'Could not load quotation audit.'}</p>;
  }

  const sum = auditData.summary;
  const lines = flattenQuotationLineItems(auditData.quotation);
  const ledger = Array.isArray(auditData.ledgerEntries) ? auditData.ledgerEntries : [];
  const refunds = Array.isArray(auditData.refunds) ? auditData.refunds : [];
  const totals = auditData.totals || {};
  const cuttingLists = Array.isArray(auditData.cuttingLists) ? auditData.cuttingLists : [];
  const stageActors = auditData.stageActors || {};
  const materialLine = quotationMaterialSpecLine(auditData);
  const hasQuoteMaterial = quotationHasMaterialSpec(auditData);

  const productLines = lines.filter((ln) => !isAccessoryOrServiceCategory(ln.category));
  const accessoryLines = lines.filter((ln) => String(ln.category || '').toLowerCase().includes('accessor'));
  const serviceLines = lines.filter((ln) => String(ln.category || '').toLowerCase().includes('service'));

  const quoteActors = [formatStageActor(stageActors.quotation)].filter(Boolean);
  const caseActors = [
    formatStageActor(stageActors.managerClear),
    formatStageActor(stageActors.managerFlag),
    formatStageActor(stageActors.managerProduction),
  ].filter(Boolean);

  function renderLines(list) {
    if (!list.length) return null;
    return (
      <div className={u.divide}>
        {list.map((ln, idx) => {
          const material = !hasQuoteMaterial ? lineMaterialSubtitle(ln) : '';
          return (
            <div key={`${ln.category}-${idx}`} className={u.lineRow}>
              <div className="min-w-0">
                <span className={u.name}>{ln.name}</span>
                <span className={u.qty}>
                  {ln.qty !== '' && ln.qty != null ? `${ln.qty}${ln.unit ? ` ${ln.unit}` : ''}` : ''}
                </span>
                {material ? (
                  <p className={`mt-0.5 text-ui-xs ${u.actorMuted}`}>{material}</p>
                ) : null}
              </div>
              <div className={u.amt}>
                {ln.lineTotal !== '' && ln.lineTotal != null
                  ? formatNgn(ln.lineTotal)
                  : ln.unitPrice
                    ? `@ ${formatNgn(ln.unitPrice)}`
                    : '—'}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Fragment>
      {sum ? (
        <section className={u.card}>
          <div className={`grid grid-cols-3 ${u.L ? 'gap-1.5' : 'gap-2'}`}>
            <div>
              <p className={u.meterLabelN}>Order</p>
              <p className={u.meterValueN}>{formatNgn(sum.orderTotalNgn)}</p>
            </div>
            <div className={u.meterPaid}>
              <p className={u.meterLabel}>Paid</p>
              <p className={u.meterValue}>{formatNgn(sum.paidNgn)}</p>
              {sum.percentPaid != null ? (
                <p className={`text-ui-xs tabular-nums ${u.actorMuted}`}>{sum.percentPaid}%</p>
              ) : null}
            </div>
            <div>
              <p className={u.meterLabelN}>Out</p>
              <p className={u.meterValueN}>{formatNgn(sum.outstandingNgn)}</p>
            </div>
          </div>
          <SectionActorFooter lines={caseActors} />
        </section>
      ) : null}

      <section>
        <p className={u.sec}>Quote</p>
        {auditData.quotation?.projectName ? (
          <p className={`mb-1 text-xs ${u.L ? 'text-slate-600' : 'text-white/50'}`}>
            {auditData.quotation.projectName}
          </p>
        ) : null}
        {materialLine ? <p className={u.materialLine}>{materialLine}</p> : null}
        {productLines.length || accessoryLines.length || serviceLines.length ? (
          <div className="space-y-2">
            {renderLines(productLines)}
            {accessoryLines.length > 0 ? (
              <div>
                <p className={u.sec}>Accessories</p>
                {renderLines(accessoryLines)}
              </div>
            ) : null}
            {serviceLines.length > 0 ? (
              <div>
                <p className={u.sec}>Services</p>
                {renderLines(serviceLines)}
              </div>
            ) : null}
          </div>
        ) : (
          <p className={u.empty}>No structured line items on file.</p>
        )}
        <SectionActorFooter lines={quoteActors} />
      </section>

      <section>
        <p className={u.sec}>Money</p>
        <div className="custom-scrollbar max-h-[min(40vh,280px)] overflow-y-auto pr-1">
          {ledger.length === 0 ? (
            <p className={u.empty}>No ledger rows for this quotation.</p>
          ) : (
            <div className={u.divide}>
              {ledger.map((e, idx) => (
                <div key={e.id || idx} className="px-2.5 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[7px] font-black uppercase ${ledgerTypeStyle(e.type, ledgerTheme)}`}
                    >
                      {(e.type || '—').slice(0, 12)}
                    </span>
                    <p className={`min-w-0 flex-1 truncate text-right text-xs font-semibold tabular-nums ${u.name}`}>
                      {formatNgn(e.amount_ngn)}
                    </p>
                    <span className={`shrink-0 font-mono text-ui-xs ${u.actorMuted}`}>
                      {e.at_iso?.slice(0, 10) || '—'}
                    </span>
                  </div>
                  {formatActorAttribution(e.created_by_name, e.at_iso) ? (
                    <p className={`mt-0.5 text-ui-xs ${u.actorMuted}`}>
                      {formatActorAttribution(e.created_by_name, e.at_iso)}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {refunds.length ? (
        <section>
          <p className={u.sec}>Refunds</p>
          <div className="space-y-2">
            {refunds.map((r) => (
              <div key={r.refund_id} className={u.refundCard}>
                <div className="flex justify-between gap-2">
                  <span className={u.refundId}>{r.refund_id}</span>
                  <span className={u.refundAmt}>{formatNgn(r.amount_ngn)}</span>
                </div>
                <p className={u.refundMeta}>
                  {r.status}
                  {r.requested_by ? ` · ${r.requested_by}` : ''}
                  {r.product ? ` · ${r.product}` : ''}
                </p>
                {r.approved_by ? (
                  <p className={`text-ui-xs ${u.L ? 'text-emerald-800' : 'text-emerald-300/90'}`}>
                    Approved by {formatActorAttribution(r.approved_by, r.approval_date)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <p className={u.secTeal}>Production, conversion &amp; supply</p>
        <div className={`mb-2 grid grid-cols-3 ${u.L ? 'gap-1.5' : 'gap-2'}`}>
          <div className={u.meterPaid}>
            <p className={u.meterLabel}>Cutting</p>
            <p className={u.meterValue}>{Number(totals.cuttingListMetersSum || 0).toLocaleString()} m</p>
          </div>
          <div className={u.meterPaid}>
            <p className={u.meterLabel}>Produced</p>
            <p className={u.meterValue}>{Number(totals.completedProductionMetersSum || 0).toLocaleString()} m</p>
          </div>
          <div className={u.meterNeutral}>
            <p className={u.meterLabelN}>Job actuals</p>
            <p className={u.meterValueN}>{Number(totals.productionJobsMetersSum || 0).toLocaleString()} m</p>
          </div>
        </div>
        {cuttingLists.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {cuttingLists.map((cl, idx) => (
              <span key={cl.id || idx} className={u.cardSoft}>
                <span className={u.name}>{cl.id}</span>
                <span className={`ml-1 tabular-nums ${u.actorMuted}`}>
                  {Number(cl.total_meters || 0).toLocaleString()} m
                </span>
                {cl.handled_by ? (
                  <span className={`ml-1 text-ui-xs ${u.actorMuted}`}>· {cl.handled_by}</span>
                ) : null}
              </span>
            ))}
          </div>
        ) : null}
        <ConversionRecordPanel
          auditData={auditData}
          showMeterTotals={false}
          embedded
          suppressMaterialLine={hasQuoteMaterial}
          emptyMessage="No production jobs for this quotation."
        />
        <SectionActorFooter
          lines={[
            formatStageActor(stageActors.managerProduction),
            cuttingLists[0]?.handled_by ? `Cutting · ${cuttingLists[0].handled_by}` : null,
          ].filter(Boolean)}
        />
      </section>

      {Array.isArray(auditData.editApprovals) && auditData.editApprovals.length > 0 ? (
        <section>
          <p className={u.sec}>Edit approvals</p>
          <div className={u.divide}>
            {auditData.editApprovals.map((ea) => (
              <div key={ea.id} className={u.lineRow}>
                <span className={u.name}>{ea.status}</span>
                <span className={u.amt}>
                  {ea.requestedByDisplay || '—'} · {String(ea.requestedAtISO || '').slice(0, 10)}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {Array.isArray(auditData.activityTimeline) && auditData.activityTimeline.length > 0 ? (
        <section className="mt-2">
          <button type="button" className={u.historyBtn} onClick={() => setShowHistory((v) => !v)}>
            {showHistory ? 'Hide full history' : 'Full history'}
          </button>
          {showHistory ? (
            <div className="mt-2">
              <ManagementActivityTimeline
                events={auditData.activityTimeline}
                appearance={appearance}
                formatNgn={formatNgn}
              />
            </div>
          ) : null}
        </section>
      ) : null}
    </Fragment>
  );
}
