import React from 'react';
import { ArrowRight, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ExecPulseBar } from './ExecPulseBar';
import { ExecMdKpiRow } from './ExecMdKpiRow';
import { ExecWorkTrayPanel } from './ExecWorkTrayPanel';

export function ExecTodayTab({
  data,
  busy,
  readOnly,
  formatNgn,
  filteredWorkTrayItems,
  onReview,
  onOpenDecide,
}) {
  const kpis = data?.kpis || {};
  const mdOnly = data?.workTray?.summary?.mdOnly ?? 0;

  return (
    <div className="space-y-2 pb-10">
      {mdOnly > 0 ? (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-200 bg-violet-50/60 px-4 py-3 md:hidden">
          <p className="text-[11px] font-semibold text-violet-950">
            {mdOnly} item{mdOnly === 1 ? '' : 's'} need your sign-off
          </p>
          <Link
            to="/exec/m"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#134e4a] px-4 py-2 text-[10px] font-black uppercase text-white"
          >
            <Smartphone size={14} />
            Mobile Decide
          </Link>
        </div>
      ) : null}
      <ExecPulseBar pulses={data?.cockpit?.pulses} formatNgn={formatNgn} loading={busy && !data} />
      <ExecMdKpiRow
        mdOnlyCount={mdOnly}
        pendingActions={kpis.pendingExecutiveActions ?? 0}
        champion={data?.cockpit?.championCustomer}
        collectionsNgn={kpis.collectionsNgn}
        formatNgn={formatNgn}
        onOpenDecide={onOpenDecide}
      />
      <ExecWorkTrayPanel
        compact
        title="Needs your attention"
        subtitle={
          readOnly
            ? 'Read-only executive view.'
            : 'Top priority items — review and approve here without opening Sales, Finance, or HR.'
        }
        items={filteredWorkTrayItems}
        busy={busy}
        readOnly={readOnly}
        mdOnlyCount={mdOnly}
        sharedCount={data?.workTray?.summary?.shared ?? 0}
        onReview={onReview}
        formatNgn={formatNgn}
      />
      {(data?.workTray?.summary?.total ?? 0) > 7 ? (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={onOpenDecide}
            className="inline-flex items-center gap-2 rounded-xl bg-[#134e4a] px-5 py-2.5 text-[10px] font-black uppercase text-white shadow-sm hover:brightness-105"
          >
            Open full Decide queue
            <ArrowRight size={14} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
