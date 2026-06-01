import React, { useMemo } from 'react';
import {
  AlertTriangle,
  Award,
  Box,
  ChevronRight,
  Disc3,
  Factory,
  Package,
  ShoppingCart,
  TrendingUp,
  ClipboardCheck,
} from 'lucide-react';
import {
  buildCoilPurchaseSuggestions,
  buildCoilStockOverview,
  buildPendingProductionsOverview,
  buildSkuStockOverview,
} from '../../lib/operationsProductionOverviewCore';

function OverviewCard({ title, hint, icon, children, className = '' }) {
  return (
    <section
      className={`flex flex-col rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden ${className}`}
    >
      <header className="shrink-0 border-b border-slate-100 bg-slate-50/90 px-4 py-3">
        <div className="flex items-start gap-2">
          {icon ? <span className="mt-0.5 text-[#134e4a]">{icon}</span> : null}
          <div className="min-w-0">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-[#134e4a]">{title}</h3>
            {hint ? <p className="mt-0.5 text-[10px] font-medium text-slate-500 leading-snug">{hint}</p> : null}
          </div>
        </div>
      </header>
      <div className="flex-1 p-4 text-[11px] text-slate-800">{children}</div>
    </section>
  );
}

function StatPill({ label, value, tone = 'default' }) {
  const tones = {
    default: 'border-slate-200 bg-slate-50 text-slate-800',
    warn: 'border-amber-200 bg-amber-50 text-amber-950',
    danger: 'border-rose-200 bg-rose-50 text-rose-950',
    ok: 'border-emerald-200 bg-emerald-50 text-emerald-950',
  };
  return (
    <div className={`rounded-lg border px-2.5 py-2 ${tones[tone] || tones.default}`}>
      <p className="text-[8px] font-bold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-0.5 text-sm font-black tabular-nums">{value}</p>
    </div>
  );
}

function CoilFamilyBlock({ label, data }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[10px] font-black uppercase tracking-wide text-slate-700">{label}</p>
        <p className="text-sm font-black tabular-nums text-[#134e4a]">
          {data.totalKg.toLocaleString()} <span className="text-[9px] font-semibold">kg</span>
        </p>
      </div>
      {data.lowCount > 0 ? (
        <p className="text-[10px] font-semibold text-amber-800 mb-2">
          {data.lowCount} coil(s) under 100 kg
        </p>
      ) : (
        <p className="text-[10px] text-slate-500 mb-2">No critically low coils in this family.</p>
      )}
      {data.top.length === 0 ? (
        <p className="text-[10px] text-slate-500">No active stock.</p>
      ) : (
        <ul className="space-y-1">
          {data.top.map((row) => (
            <li
              key={`${row.gauge}-${row.colour}`}
              className="flex justify-between gap-2 text-[10px] tabular-nums"
            >
              <span className="truncate text-slate-700">
                {row.gauge} mm · {row.colour}
                <span className="text-slate-400"> · {row.coilCount} coil(s)</span>
              </span>
              <span className="shrink-0 font-bold text-[#134e4a]">{row.kg.toLocaleString()} kg</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SkuList({ overview, emptyLabel }) {
  if (!overview.totalSkus) {
    return <p className="text-[10px] text-slate-500">{emptyLabel}</p>;
  }
  return (
    <>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <StatPill label="SKUs on hand" value={overview.totalSkus} />
        <StatPill
          label="Below reorder"
          value={overview.lowCount}
          tone={overview.lowCount > 0 ? 'warn' : 'ok'}
        />
      </div>
      <ul className="space-y-1.5 max-h-[min(220px,32vh)] overflow-y-auto pr-1 custom-scrollbar">
        {overview.rows.map((row) => (
          <li
            key={row.productID}
            className={`flex justify-between gap-2 rounded-lg border px-2 py-1.5 ${
              row.low ? 'border-amber-200 bg-amber-50/70' : 'border-slate-100 bg-slate-50/50'
            }`}
          >
            <span className="min-w-0 truncate font-medium text-slate-800" title={row.name}>
              {row.name}
            </span>
            <span className={`shrink-0 tabular-nums font-bold ${row.low ? 'text-amber-900' : 'text-[#134e4a]'}`}>
              {row.stock.toLocaleString()} {row.unit}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * Store & production landing dashboard — stock by family, pending jobs, performance, buy hints.
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

  return (
    <div className="space-y-4">
      {onMonthEndStock ? (
        <OverviewCard
          title="Month-end stock register"
          hint="Physical count for period end — print, then send to branch manager (no costing on store copy)."
          icon={<ClipboardCheck size={16} />}
          className="border-teal-200/90 bg-gradient-to-br from-teal-50/40 to-white"
        >
          <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
            Run the floor count register for month-end (or any period end date). Preview and print without
            prices; forward to management when the count is complete.
          </p>
          <button type="button" onClick={onMonthEndStock} className="z-btn-primary text-[11px]">
            Open month-end stock register
          </button>
        </OverviewCard>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <OverviewCard
          title="Coil stock"
          hint="Live aluminium and aluzinc on the floor (excludes consumed coils)."
          icon={<Disc3 size={16} />}
        >
          <div className="grid grid-cols-3 gap-2 mb-3">
            <StatPill label="Total coil kg" value={coilStock.totalKg.toLocaleString()} />
            <StatPill
              label="Low coils"
              value={coilStock.lowCoilsTotal}
              tone={coilStock.lowCoilsTotal > 0 ? 'danger' : 'ok'}
            />
            <StatPill
              label="Jobs w/o coil"
              value={productionQueueStats.noCoil}
              tone={productionQueueStats.noCoil > 0 ? 'warn' : 'ok'}
            />
          </div>
          <div className="space-y-2">
            <CoilFamilyBlock label="Aluminium" data={coilStock.aluminium} />
            <CoilFamilyBlock label="Aluzinc" data={coilStock.aluzinc} />
          </div>
          <button
            type="button"
            onClick={() => onGoInventory?.('coil')}
            className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#134e4a] hover:underline"
          >
            Open coil stock management <ChevronRight size={12} />
          </button>
        </OverviewCard>

        <OverviewCard
          title="Stone-coated stock"
          hint="Metre / sheet SKUs for stone-coated profiles."
          icon={<Package size={16} />}
        >
          <SkuList overview={stoneStock} emptyLabel="No stone-coated SKUs in workspace." />
          <button
            type="button"
            onClick={() => onGoInventory?.('stone')}
            className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#134e4a] hover:underline"
          >
            Manage stone stock <ChevronRight size={12} />
          </button>
        </OverviewCard>

        <OverviewCard
          title="Accessories stock"
          hint="Rivets, screws, silicone, and other issue items."
          icon={<Box size={16} />}
        >
          <SkuList overview={accessoryStock} emptyLabel="No accessory SKUs in workspace." />
          <button
            type="button"
            onClick={() => onGoInventory?.('accessory')}
            className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#134e4a] hover:underline"
          >
            Manage accessories <ChevronRight size={12} />
          </button>
        </OverviewCard>

        <OverviewCard
          title="Pending new production"
          hint="Lists waiting to register or jobs blocked before the line can run."
          icon={<Factory size={16} />}
        >
          {pendingProductions.length === 0 ? (
            <p className="text-[10px] text-slate-500">No pending registrations or blocked jobs right now.</p>
          ) : (
            <ul className="space-y-2 max-h-[min(280px,40vh)] overflow-y-auto pr-1 custom-scrollbar">
              {pendingProductions.map((row) => (
                <li
                  key={`${row.id}-${row.reason}`}
                  className={`rounded-lg border px-3 py-2 ${
                    row.severity === 'critical'
                      ? 'border-rose-200 bg-rose-50/80'
                      : row.severity === 'high'
                        ? 'border-amber-200 bg-amber-50/70'
                        : 'border-slate-200 bg-slate-50/60'
                  }`}
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold text-slate-900">{row.id}</span>
                    <span className="text-[9px] font-black uppercase text-slate-500">{row.reason}</span>
                  </div>
                  <p className="mt-0.5 text-[10px] font-semibold text-slate-800 truncate">{row.customer}</p>
                  <p className="text-[10px] text-slate-500 truncate">{row.label}</p>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={onGoProduction}
            className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#134e4a] hover:underline"
          >
            Open production line <ChevronRight size={12} />
          </button>
        </OverviewCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <OverviewCard
          title="Performance & material readiness"
          hint="Can shop floor run? Conversion health and queue pressure."
          icon={<TrendingUp size={16} />}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <StatPill
              label="Conversion OK"
              value={conversionStats.efficiencyPct != null ? `${conversionStats.efficiencyPct}%` : '—'}
            />
            <StatPill label="Waiting" value={productionQueueStats.waiting} />
            <StatPill label="Mgr review" value={productionQueueStats.needsReview} tone="warn" />
            <StatPill label="Overdue" value={productionQueueStats.overdue} tone="danger" />
          </div>
          <div
            className={`rounded-lg border px-3 py-2.5 ${
              workersBlocked
                ? 'border-rose-200 bg-rose-50/90 text-rose-950'
                : 'border-emerald-200 bg-emerald-50/80 text-emerald-950'
            }`}
          >
            <p className="text-[10px] font-black uppercase tracking-wide flex items-center gap-1.5">
              {workersBlocked ? <AlertTriangle size={12} /> : <Award size={12} />}
              Shop floor material
            </p>
            <p className="mt-1 text-[11px] font-medium leading-snug">
              {workersBlocked
                ? `${productionQueueStats.noCoil} job(s) have no coil allocated — workers cannot start until store issues or allocates coil.`
                : 'No planned jobs are waiting on coil allocation. Check coil families above before high-volume runs.'}
            </p>
          </div>
          {conversionStats.flagged > 0 ? (
            <p className="mt-2 text-[10px] font-semibold text-amber-900">
              {conversionStats.flagged} conversion check(s) flagged for manager review.
            </p>
          ) : null}
        </OverviewCard>

        <OverviewCard
          title="Suggested coil purchases"
          hint="By material family, gauge, and colour — based on low kg and blocked jobs."
          icon={<ShoppingCart size={16} />}
        >
          {buySuggestions.length === 0 ? (
            <p className="text-[10px] text-slate-500">No urgent coil gaps detected from current stock.</p>
          ) : (
            <ul className="space-y-2 max-h-[min(260px,38vh)] overflow-y-auto pr-1 custom-scrollbar">
              {buySuggestions.map((s) => (
                <li
                  key={s.key}
                  className={`rounded-lg border px-3 py-2 ${
                    s.priority === 'critical'
                      ? 'border-rose-200 bg-rose-50/80'
                      : 'border-amber-200/80 bg-amber-50/50'
                  }`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-bold text-slate-900">{s.family}</span>
                    {s.kgOnHand != null ? (
                      <span className="text-[10px] font-black tabular-nums text-[#134e4a]">
                        {s.kgOnHand.toLocaleString()} kg on hand
                      </span>
                    ) : null}
                  </div>
                  {s.gauge !== '—' ? (
                    <p className="mt-0.5 text-[10px] text-slate-700">
                      {s.gauge} mm · {s.colour}
                      {s.coilCount ? ` · ${s.coilCount} coil(s)` : ''}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[10px] text-slate-600 leading-snug">{s.note}</p>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={onRequestCoils} className="z-btn-primary text-[10px]">
              Request coils
            </button>
            <button
              type="button"
              onClick={() => onGoInventory?.('coil')}
              className="z-btn-secondary text-[10px]"
            >
              Receive / adjust stock
            </button>
          </div>
        </OverviewCard>
      </div>
    </div>
  );
}
