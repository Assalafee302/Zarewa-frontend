import React from 'react';
import { ArrowRight } from 'lucide-react';
import { ExecPulseBar } from './ExecPulseBar';
import { ExecMdKpiRow } from './ExecMdKpiRow';
import { ExecWorkTrayPanel } from './ExecWorkTrayPanel';
import { EXEC_PRIMARY_BTN } from '../../lib/execPageUi';

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
          <button type="button" onClick={onOpenDecide} className={EXEC_PRIMARY_BTN}>
            Open full Decide queue
            <ArrowRight size={14} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
