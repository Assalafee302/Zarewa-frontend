import React, { Fragment } from 'react';
import { RefreshCw } from 'lucide-react';
import { ManagementActivityTimeline } from './ManagementActivityTimeline';

function ui(appearance) {
  const L = appearance === 'light';
  return {
    spin: L ? 'text-[#134e4a]' : 'text-teal-400',
    err: L ? 'text-xs text-rose-600' : 'text-xs text-rose-300/90',
    sec: L ? 'mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500' : 'mb-2 text-[10px] font-black uppercase tracking-widest text-white/40',
    card: L ? 'rounded-lg border border-slate-200 bg-white px-2.5 py-2' : 'rounded-xl border border-white/10 bg-white/[0.07] p-3',
    line: L ? 'flex justify-between gap-2 text-[11px] text-slate-700 py-1 border-b border-slate-100' : 'flex justify-between gap-2 text-[11px] text-white/70 py-1 border-b border-white/10',
  };
}

export function ManagerPoAuditSections({ auditData, loadingAudit, formatNgn, appearance = 'dark' }) {
  const u = ui(appearance);

  if (loadingAudit && (!auditData || auditData.ok === false)) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className={`${u.spin} animate-spin`} size={28} />
      </div>
    );
  }
  if (!auditData || auditData.ok === false) {
    return <p className={u.err}>{auditData?.error || 'Could not load purchase order audit.'}</p>;
  }

  const po = auditData.purchaseOrder || {};
  const lines = Array.isArray(auditData.lines) ? auditData.lines : [];
  const treasury = Array.isArray(auditData.treasuryMovements) ? auditData.treasuryMovements : [];
  const timeline = Array.isArray(auditData.activityTimeline) ? auditData.activityTimeline : [];

  return (
    <Fragment>
      <section>
        <p className={u.sec}>Purchase order</p>
        <div className={u.card}>
          <p className="font-mono font-bold">{po.poID}</p>
          <p className="text-[11px] mt-1">
            {po.supplierName || 'Supplier'} · {po.status || '—'}
          </p>
          <p className="text-[10px] mt-1 tabular-nums">
            Supplier paid {formatNgn(po.supplierPaidNgn)} · Transport paid {formatNgn(po.transportPaidNgn)}
          </p>
        </div>
      </section>

      {lines.length > 0 ? (
        <section className="mt-4">
          <p className={u.sec}>Lines</p>
          <div className={u.card}>
            {lines.map((ln) => (
              <div key={ln.lineKey} className={u.line}>
                <span>{ln.productName}</span>
                <span className="tabular-nums font-bold">
                  {ln.qty} {ln.unit} · {formatNgn(ln.lineTotalNgn)}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {treasury.length > 0 ? (
        <section className="mt-4">
          <p className={u.sec}>Treasury movements</p>
          <div className={u.card}>
            {treasury.map((tm) => (
              <div key={tm.id} className={u.line}>
                <span>
                  {tm.direction} · {tm.accountName || 'Account'}
                </span>
                <span className="tabular-nums font-bold">{formatNgn(tm.amountNgn)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-4">
        <p className={u.sec}>Activity &amp; approvals</p>
        <ManagementActivityTimeline events={timeline} appearance={appearance} formatNgn={formatNgn} />
      </section>
    </Fragment>
  );
}
