import React from 'react';
import { Award, ClipboardList, Shield, Wallet } from 'lucide-react';
import { CommandMetricCard } from '../layout/CommandMetricCard';
import { COMMAND_METRIC_GRID } from '../../lib/execPageUi';

/**
 * KPI row for MD Today — overview metric cards; primary tile opens Approvals.
 */
export function ExecMdKpiRow({
  mdOnlyCount,
  pendingActions,
  champion,
  collectionsNgn,
  formatNgn,
  onOpenDecide,
}) {
  const collections =
    typeof formatNgn === 'function' ? formatNgn(collectionsNgn ?? 0) : '—';
  const championPaid =
    champion?.paidNgn != null && typeof formatNgn === 'function'
      ? `${formatNgn(champion.paidNgn)} collected`
      : 'Top payer this period';

  return (
    <div className={`mb-6 ${COMMAND_METRIC_GRID}`}>
      <CommandMetricCard
        label="Needs your approval"
        value={mdOnlyCount ?? 0}
        meta={`MD-only · ${pendingActions ?? 0} in the full queue`}
        icon={Shield}
        iconTone="primary"
        badge={mdOnlyCount > 0 ? 'Action' : 'Clear'}
        onClick={onOpenDecide}
      />
      <CommandMetricCard
        label="Champion customer"
        value={champion?.customerName ?? '—'}
        meta={championPaid}
        icon={Award}
        iconTone="secondary"
        valueClassName="text-base sm:text-lg font-semibold font-sans normal-nums tracking-normal line-clamp-2"
      />
      <CommandMetricCard
        label="Collections"
        value={collections}
        meta="Receipts in period"
        icon={Wallet}
        iconTone="tertiary"
      />
      <CommandMetricCard
        label="Pending approvals"
        value={pendingActions ?? 0}
        meta="Full work tray, including shared items"
        icon={ClipboardList}
        iconTone="neutral"
        badge={`${pendingActions ?? 0} total`}
      />
    </div>
  );
}
