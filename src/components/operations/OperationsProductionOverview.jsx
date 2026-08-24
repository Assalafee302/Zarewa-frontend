import React, { useMemo } from 'react';
import {
  Box,
  Disc3,
  Factory,
  Package,
  ShoppingCart,
} from 'lucide-react';
import {
  buildCoilPurchaseSuggestions,
  buildCoilStockOverview,
  buildPendingProductionsOverview,
  buildSkuStockOverview,
} from '../../lib/operationsProductionOverviewCore';
import { OperationsMachinesPanel } from './OperationsMachinesPanel';
import { ReportFaultPanel } from './ReportFaultPanel';
import { RequestDieselPanel } from './RequestDieselPanel';
import { RequestSuppliesPanel } from './RequestSuppliesPanel';
import { DeliveryPodPanel } from './DeliveryPodPanel';
import { OperationsInventoryAttentionPanel } from './OperationsInventoryAttentionPanel';
import { OperationsDeskSection } from './OperationsDeskSection';
import { OperationsDeskMetric } from './OperationsDeskMetric';
import { OPS_TEXT_LINK, OPS_TOOL_BTN, OPS_TOOL_BTN_PRIMARY } from './operationsDeskUi';

function CoilFamilyBlock({ label, data }) {
  return (
    <div className="rounded-md bg-[var(--z-surface-muted)]/70 px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-ui-xs font-semibold text-[var(--z-text)]">{label}</p>
        <p className="text-sm font-semibold tabular-nums text-zarewa-teal">
          {data.totalKg.toLocaleString()} <span className="text-ui-xs font-medium">kg</span>
        </p>
      </div>
      {data.lowCount > 0 ? (
        <p className="mb-2 text-ui-xs font-medium text-amber-900">
          {data.lowCount} thin coil{data.lowCount === 1 ? '' : 's'} under 85 kg
        </p>
      ) : null}
      {data.top.length === 0 ? (
        <p className="text-ui-xs text-[var(--z-text-muted)]">No active stock.</p>
      ) : (
        <ul className="space-y-1">
          {data.top.map((row) => (
            <li
              key={`${row.gauge}-${row.colour}`}
              className="flex justify-between gap-2 text-ui-xs tabular-nums"
            >
              <span className="truncate text-[var(--z-text)]">
                {row.gauge} mm · {row.colour}
                <span className="text-[var(--z-text-muted)]"> · {row.coilCount} coil(s)</span>
              </span>
              <span className="shrink-0 font-semibold text-zarewa-teal">{row.kg.toLocaleString()} kg</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SkuList({ overview, emptyLabel }) {
  if (!overview.totalSkus) {
    return <p className="text-ui-xs text-[var(--z-text-muted)]">{emptyLabel}</p>;
  }
  return (
    <ul className="custom-scrollbar max-h-[min(220px,32vh)] space-y-1.5 overflow-y-auto pr-1">
      {overview.rows.map((row) => (
        <li
          key={row.productID}
          className={`flex justify-between gap-2 rounded-md border px-2 py-1.5 ${
            row.low
              ? 'border-amber-200/80 bg-amber-50/50'
              : 'border-[var(--z-border)] bg-[var(--z-surface-muted)]/40'
          }`}
        >
          <span className="min-w-0 truncate font-medium text-[var(--z-text)]" title={row.name}>
            {row.name}
          </span>
          <span
            className={`shrink-0 tabular-nums font-semibold ${row.low ? 'text-amber-900' : 'text-zarewa-teal'}`}
          >
            {row.stock.toLocaleString()} {row.unit}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Store & production landing — pulse first, then stock, plant, and buy hints.
 */
export function OperationsProductionOverview({
  coilLots,
  inventoryRows,
  cuttingLists,
  productionQueueModel,
  conversionStats,
  productionQueueStats,
  hasWorkspaceData,
  masterData,
  onGoProduction,
  onGoInventory,
  onRequestCoils,
  onMonthEndStock,
  onOpenProductionTrace,
  onGoProcurement,
  inventoryAttention,
  roleKey = '',
  branchId = '',
  canMutate = true,
}) {
  const coilStock = useMemo(() => buildCoilStockOverview(coilLots, masterData), [coilLots, masterData]);
  const stoneStock = useMemo(() => buildSkuStockOverview(inventoryRows, 'stone'), [inventoryRows]);
  const accessoryStock = useMemo(() => buildSkuStockOverview(inventoryRows, 'accessory'), [inventoryRows]);

  const pendingProductions = useMemo(
    () =>
      buildPendingProductionsOverview({
        cuttingLists,
        productionQueueModel,
        hasWorkspaceData,
      }),
    [cuttingLists, productionQueueModel, hasWorkspaceData]
  );

  const buySuggestions = useMemo(
    () =>
      buildCoilPurchaseSuggestions({
        coilStock,
        pendingProductions,
        coilLots,
      }),
    [coilStock, pendingProductions, coilLots]
  );

  const workersBlocked = productionQueueStats.noCoil > 0;
  const attentionCount =
    Number(productionQueueStats.attention) ||
    (Number(productionQueueStats.needsReview) || 0) + (Number(productionQueueStats.overdue) || 0);
  const pendingRegistrations = pendingProductions.filter(
    (row) => !String(row.reason || '').toLowerCase().includes('coil')
  );
  const readOnlyTitle = 'Connect to the live workspace to make changes.';

  return (
    <div className="space-y-4">
      <div className="z-toolbar-shell flex flex-wrap items-center gap-2 px-3 py-2.5 sm:px-4">
        <button
          type="button"
          onClick={onRequestCoils}
          disabled={!canMutate}
          title={!canMutate ? readOnlyTitle : 'Request coils from procurement'}
          className={OPS_TOOL_BTN_PRIMARY}
        >
          Request coils
        </button>
        <ReportFaultPanel branchId={branchId} disabled={!canMutate} />
        <RequestDieselPanel branchId={branchId} disabled={!canMutate} />
        <RequestSuppliesPanel branchId={branchId} onGoInventory={onGoInventory} disabled={!canMutate} />
        {onMonthEndStock ? (
          <button
            type="button"
            onClick={onMonthEndStock}
            className={OPS_TOOL_BTN}
            title="Physical count for period end — print, then send to branch manager"
          >
            Month-end count
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <OperationsDeskMetric
          label="Coil kg"
          value={coilStock.totalKg.toLocaleString()}
        />
        <OperationsDeskMetric
          label="Low coils"
          value={coilStock.lowCoilsTotal}
          tone={coilStock.lowCoilsTotal > 0 ? 'danger' : 'ok'}
          onClick={() => onGoInventory?.('coil')}
        />
        <OperationsDeskMetric
          label="Jobs without coil"
          value={productionQueueStats.noCoil}
          tone={workersBlocked ? 'warn' : 'ok'}
          onClick={() => onGoProduction?.('no_coil')}
        />
        <OperationsDeskMetric
          label="Waiting"
          value={productionQueueStats.waiting}
          onClick={() => onGoProduction?.('planned')}
        />
        <OperationsDeskMetric
          label="Attention"
          value={attentionCount}
          tone={attentionCount > 0 ? 'danger' : 'default'}
          onClick={() => onGoProduction?.('attention')}
        />
      </div>

      {conversionStats.flagged > 0 ? (
        <button
          type="button"
          onClick={() => onGoProduction?.('attention')}
          className="text-left text-ui-xs font-medium text-amber-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/25 rounded-sm"
        >
          {conversionStats.flagged} conversion check{conversionStats.flagged === 1 ? '' : 's'} flagged for
          manager review.
        </button>
      ) : null}

      <OperationsInventoryAttentionPanel
        attention={inventoryAttention}
        hasWorkspaceData={hasWorkspaceData}
        onOpenProductionTrace={onOpenProductionTrace}
        onGoProcurement={onGoProcurement}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <OperationsDeskSection
          title="Coil stock"
          hint="Aluminium and aluzinc on the floor."
          icon={<Disc3 size={16} />}
          actions={
            <button type="button" onClick={() => onGoInventory?.('coil')} className={OPS_TEXT_LINK} aria-label="Open coil stock">
              Open
            </button>
          }
        >
          <div className="space-y-2">
            <CoilFamilyBlock label="Aluminium" data={coilStock.aluminium} />
            <CoilFamilyBlock label="Aluzinc" data={coilStock.aluzinc} />
          </div>
        </OperationsDeskSection>

        <OperationsDeskSection
          title="Stone-coated stock"
          hint="Metres and flatsheet are separate on-hand views."
          icon={<Package size={16} />}
          actions={
            <div className="flex flex-wrap justify-end gap-x-3">
              <button type="button" onClick={() => onGoInventory?.('stone_meter')} className={OPS_TEXT_LINK} aria-label="Open stone metres">
                Metres
              </button>
              <button type="button" onClick={() => onGoInventory?.('stone_flatsheet')} className={OPS_TEXT_LINK} aria-label="Open stone flatsheet">
                Flatsheet
              </button>
            </div>
          }
        >
          <SkuList overview={stoneStock} emptyLabel="No stone-coated SKUs in workspace." />
        </OperationsDeskSection>

        <OperationsDeskSection
          title="Accessories"
          icon={<Box size={16} />}
          actions={
            <button type="button" onClick={() => onGoInventory?.('accessory')} className={OPS_TEXT_LINK} aria-label="Open accessories stock">
              Open
            </button>
          }
        >
          <SkuList overview={accessoryStock} emptyLabel="No accessory SKUs in workspace." />
        </OperationsDeskSection>

        <OperationsDeskSection
          title="Pending registration"
          icon={<Factory size={16} />}
          actions={
            <button type="button" onClick={() => onGoProduction?.()} className={OPS_TEXT_LINK} aria-label="Open production register">
              Open
            </button>
          }
        >
          {pendingRegistrations.length === 0 ? (
            <p className="text-ui-xs text-[var(--z-text-muted)]">No cutting lists waiting to register.</p>
          ) : (
            <ul className="custom-scrollbar max-h-[min(280px,40vh)] space-y-2 overflow-y-auto pr-1">
              {pendingRegistrations.map((row) => (
                <li key={`${row.id}-${row.reason}`}>
                  <button
                    type="button"
                    onClick={() => onGoProduction?.()}
                    aria-label={`Open ${row.id}`}
                    className="w-full cursor-pointer rounded-md border border-[var(--z-border)] bg-[var(--z-surface-muted)]/40 px-3 py-2 text-left transition-colors hover:border-zarewa-teal/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/25"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="z-stencil text-ui-xs text-[var(--z-text)]">{row.id}</span>
                      <span className="text-ui-xs font-medium text-[var(--z-text-muted)]">{row.reason}</span>
                    </div>
                    <p className="mt-0.5 truncate text-ui-xs font-semibold text-[var(--z-text)]">{row.customer}</p>
                    <p className="truncate text-ui-xs text-[var(--z-text-muted)]">{row.label}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </OperationsDeskSection>
      </div>

      <OperationsDeskSection
        title="Suggested coil purchases"
        hint="From low kg on hand and jobs waiting for coil."
        icon={<ShoppingCart size={16} />}
      >
        {buySuggestions.length === 0 ? (
          <p className="text-ui-xs text-[var(--z-text-muted)]">
            No urgent coil gaps detected from current stock.
          </p>
        ) : (
          <ul className="custom-scrollbar max-h-[min(260px,38vh)] space-y-2 overflow-y-auto pr-1">
            {buySuggestions.map((s) => (
              <li
                key={s.key}
                className={`rounded-md border px-3 py-2 ${
                  s.priority === 'critical'
                    ? 'border-[var(--z-error)]/25 bg-[var(--z-surface)]'
                    : 'border-amber-200/70 bg-amber-50/35'
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold text-[var(--z-text)]">{s.family}</span>
                  {s.kgOnHand != null ? (
                    <span className="text-ui-xs font-semibold tabular-nums text-zarewa-teal">
                      {s.kgOnHand.toLocaleString()} kg on hand
                    </span>
                  ) : null}
                </div>
                {s.gauge !== '—' ? (
                  <p className="mt-0.5 text-ui-xs text-[var(--z-text)]">
                    {s.gauge} mm · {s.colour}
                    {s.coilCount ? ` · ${s.coilCount} coil(s)` : ''}
                  </p>
                ) : null}
                <p className="mt-1 text-ui-xs leading-snug text-[var(--z-text-muted)]">{s.note}</p>
              </li>
            ))}
          </ul>
        )}
      </OperationsDeskSection>

      <div id="operations-plant-register" className="grid gap-4" data-testid="operations-plant-register">
        <OperationsMachinesPanel roleKey={roleKey} />
      </div>

      <DeliveryPodPanel branchId={branchId} />
    </div>
  );
}
