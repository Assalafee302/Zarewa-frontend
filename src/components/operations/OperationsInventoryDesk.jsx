import React from 'react';
import {
  Box,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Plus,
  Scale,
  Search,
  Truck,
} from 'lucide-react';
import { OperationsStockKindSwitch } from './OperationsStockKindSwitch';
import { OperationsDeskMetric } from './OperationsDeskMetric';
import { OPS_SECTION_TITLE, OPS_TOOL_BTN, OPS_TOOL_BTN_PRIMARY } from './operationsDeskUi';
import { procurementKindFromPo } from '../../lib/procurementPoKind';
import { poLineIsOpenForReceiving, poLineOpenQtyForReceiving } from '../../lib/poLineTypes.js';
import { liveCoilWeightKgForOverview as liveCoilWeightKg } from '../../lib/operationsProductionOverviewCore.js';

/**
 * On-hand desk: stock-kind switch, receive/GRN, live lots, KPIs, and stock tools.
 */

function CoilReceiptSortTh({ label, sortKey: columnKey, sort, onToggle, className = '' }) {
  const active = sort.key === columnKey;
  const Icon = !active ? null : sort.dir === 'asc' ? ChevronUp : ChevronDown;
  return (
    <button
      type="button"
      onClick={() => onToggle(columnKey)}
      className={`inline-flex min-w-0 max-w-full items-center gap-0.5 text-left text-ui-xs font-bold uppercase tracking-wide hover:text-zarewa-teal ${active ? 'text-zarewa-teal' : 'text-slate-600'} ${className}`}
    >
      <span className="truncate">{label}</span>
      {Icon ? <Icon size={14} className="shrink-0 opacity-90" aria-hidden /> : null}
    </button>
  );
}

export function OperationsInventoryDesk({
  stockReceiveKind,
  setStockReceiveKind,
  coilRestockMinKg,
  navigate,
  openRequestStock,
  stoneRestockMinM,
  anyReceivablePo,
  inTransitLoads,
  transitOrdersSortedFiltered,
  transitSearch,
  setTransitSearch,
  transitSort,
  setTransitSort,
  transitOrders,
  expandedReceivePoId,
  setExpandedReceivePoId,
  setReceiveDraft,
  receiveDraft,
  canReceiveInventory,
  setGrnLines,
  grnLines,
  applyTransitReceipt,
  grnSubmitting,
  grnConversionOverride,
  setGrnConversionOverride,
  ws,
  coilLiveSearch,
  setCoilLiveSearch,
  coilLotsReceiptSorted,
  hasCoilReceiptSearch,
  canRegisterCoil,
  setShowRegisterCoil,
  coilLotsByReceipt,
  coilSearchRemoteLoading,
  coilReceiptIncludesArchived,
  coilReceiptSort,
  toggleCoilReceiptSort,
  coilLotsByReceiptCapped,
  coilReceiptListTruncated,
  coilListLimit,
  coilColourLabel,
  skuProductsLiveSorted,
  skuProductsReceiptFiltered,
  skuReceiptTruncated,
  skuListLimit,
  skuProductsByReceipt,
  setProductMovementModal,
  canAdjustInventory,
  setStockAdjustMaterialFamily,
  setShowStockAdjust,
  coilSpecBelowMinCount,
  stoneSpecBelowMinCount,
  inventoryStats,
}) {
  return (
    <>
        <div className="col-span-full mb-3 order-1 space-y-3">
          <div className="z-toolbar-shell flex flex-col gap-3 px-3 py-2.5 sm:px-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => openRequestStock()}
                disabled={!ws?.canMutate}
                title={!ws?.canMutate ? 'Connect to the live workspace to request stock' : undefined}
                className={OPS_TOOL_BTN_PRIMARY}
              >
                <Plus size={14} aria-hidden /> Request stock
              </button>
              {canRegisterCoil && stockReceiveKind === 'coil' ? (
                <button
                  type="button"
                  disabled={!ws?.canMutate}
                  title={
                    !ws?.canMutate
                      ? 'Connect to the live workspace to register a coil'
                      : 'Add a single coil missed on bulk import'
                  }
                  onClick={() => setShowRegisterCoil(true)}
                  className={OPS_TOOL_BTN}
                >
                  <Plus size={14} aria-hidden /> Register coil
                </button>
              ) : null}
              {canAdjustInventory ? (
                <button
                  type="button"
                  disabled={!ws?.canMutate}
                  title={
                    !ws?.canMutate
                      ? 'Connect to the live workspace to adjust stock'
                      : 'Post a book stock adjustment (SKU qty)'
                  }
                  onClick={() => {
                    setStockAdjustMaterialFamily(null);
                    setShowStockAdjust(true);
                  }}
                  className={OPS_TOOL_BTN}
                >
                  <Box size={14} aria-hidden /> Adjust stock
                </button>
              ) : null}
              <div className="w-full min-w-0 sm:ml-auto sm:w-auto">
                <OperationsStockKindSwitch value={stockReceiveKind} onChange={setStockReceiveKind} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <OperationsDeskMetric
                label="Below min"
                value={coilSpecBelowMinCount + stoneSpecBelowMinCount}
                hint={`Coils < ${coilRestockMinKg.toLocaleString()} kg · Stone < ${stoneRestockMinM.toLocaleString()} m`}
                tone={coilSpecBelowMinCount + stoneSpecBelowMinCount > 0 ? 'warn' : 'ok'}
              />
              <OperationsDeskMetric
                label="Thin coils"
                value={inventoryStats.lowStock}
                hint="Coils under 85 kg"
                tone={inventoryStats.lowStock > 0 ? 'danger' : 'ok'}
              />
            </div>
          </div>
        </div>

        <div className="col-span-full w-full order-2">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8 lg:items-start">
            <section className="z-soft-panel overflow-hidden w-full min-w-0 flex flex-col lg:col-span-1">
            <div className="p-3 sm:p-4 flex flex-col">
              <h3 className={`${OPS_SECTION_TITLE} mb-2 flex items-center gap-2`}>
                <Truck size={14} className="text-zarewa-teal" aria-hidden />
                Receive
              </h3>
              {!anyReceivablePo && inTransitLoads.length === 0 ? (
                <p className="text-ui-xs font-medium text-slate-400">Nothing on road or loading.</p>
              ) : transitOrdersSortedFiltered.length === 0 ? (
                <p className="text-ui-xs font-medium text-slate-400">
                  {transitSearch.trim()
                    ? 'No purchase orders match your search.'
                    : 'No purchase orders in receivable status — check Procurement.'}
                </p>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-1.5 mb-1.5 shrink-0">
                    <label className="relative min-w-0 w-full flex-1 sm:min-w-[140px]">
                      <span className="sr-only">Search purchase orders</span>
                      <Search
                        size={12}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        aria-hidden
                      />
                      <input
                        type="search"
                        value={transitSearch}
                        onChange={(e) => setTransitSearch(e.target.value)}
                        placeholder="PO, supplier, product…"
                        className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-2 text-ui-xs font-semibold text-slate-800 placeholder:text-slate-400"
                      />
                    </label>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-ui-xs font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                        Sort
                      </span>
                      <select
                        value={transitSort}
                        onChange={(e) => setTransitSort(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-ui-xs font-semibold text-slate-700 min-w-0 max-w-full"
                      >
                        <option value="orderDesc">Newest order</option>
                        <option value="orderAsc">Oldest order</option>
                        <option value="etaAsc">ETA (soonest)</option>
                        <option value="etaDesc">ETA (latest)</option>
                        <option value="supplierAsc">Supplier A–Z</option>
                        <option value="poAsc">PO no.</option>
                        <option value="statusAsc">Status</option>
                      </select>
                    </div>
                  </div>
                  <ul className="space-y-1.5 max-h-[min(70vh,520px)] overflow-y-auto lg:max-h-none lg:overflow-visible">
                  {transitOrders.map((p) => {
                    const pk = procurementKindFromPo(p);
                    const openQty = p.lines.reduce((sum, l) => sum + poLineOpenQtyForReceiving(l), 0);
                    const openLineCount = (p.lines || []).filter((l) => poLineIsOpenForReceiving(l)).length;
                    const openLabel =
                      pk === 'mixed'
                        ? `${openLineCount} open line(s)`
                        : pk === 'stone'
                          ? `${openQty.toLocaleString()} m open`
                          : pk === 'accessory'
                            ? `${openQty.toLocaleString()} units open`
                            : `${openQty.toLocaleString()} kg open`;
                    const meta2 = [
                      p.status,
                      p.transportAgentName || null,
                      p.expectedDeliveryISO ? `ETA ${p.expectedDeliveryISO}` : null,
                      `${p.lines.length} line(s)`,
                      openLabel,
                    ]
                      .filter(Boolean)
                      .join(' · ');
                    return (
                    <li
                      key={p.poID}
                      className="rounded-md border border-[var(--z-border)] bg-white py-1 px-2"
                    >
                      <div className="min-w-0 leading-tight">
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <p className="z-stencil truncate text-xs font-semibold text-zarewa-teal">
                            {p.poID}
                            <span className="font-semibold text-[var(--z-text)]"> · {p.supplierName}</span>
                          </p>
                          {expandedReceivePoId !== p.poID ? (
                            <button
                              type="button"
                              disabled={!canReceiveInventory}
                              aria-expanded="false"
                              title={
                                canReceiveInventory
                                  ? 'Enter receipt quantities'
                                  : 'Store, operations, or branch manager role required to receive into stock'
                              }
                              onClick={() => {
                                setExpandedReceivePoId(p.poID);
                                setReceiveDraft((d) => ({ ...d, poID: p.poID }));
                              }}
                              className={`${OPS_TOOL_BTN_PRIMARY} shrink-0 px-2.5 py-1 text-ui-xs`}
                            >
                              Receive
                            </button>
                          ) : (
                            <button
                              type="button"
                              aria-expanded="true"
                              onClick={() => {
                                setExpandedReceivePoId(null);
                                setReceiveDraft({ poID: '', location: '' });
                                setGrnLines([]);
                              }}
                              className={`${OPS_TOOL_BTN} shrink-0 px-2.5 py-1 text-ui-xs`}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                        <p
                          className="text-ui-xs font-semibold text-slate-600 mt-0.5 leading-snug line-clamp-2"
                          title={meta2}
                        >
                          {meta2}
                        </p>
                      </div>
                      {expandedReceivePoId === p.poID ? (
                        <form
                          noValidate
                          className="mt-1.5 space-y-2 border-t border-dashed border-slate-200 pt-1.5"
                          onSubmit={applyTransitReceipt}
                        >
                          <fieldset
                            disabled={!canReceiveInventory}
                            className="border-0 p-0 m-0 min-w-0 space-y-2 disabled:opacity-60"
                          >
                          <input
                            value={receiveDraft.location}
                            onChange={(e) =>
                              setReceiveDraft((s) => ({ ...s, location: e.target.value }))
                            }
                            placeholder="Location (optional)"
                            aria-label="Storage location"
                            className="w-full rounded-lg border border-slate-200 py-1.5 px-2 text-xs font-semibold text-slate-800"
                          />
                          {grnLines.length === 0 ? (
                            <p className="text-ui-xs text-amber-700">No open lines on this order.</p>
                          ) : (
                            grnLines.map((row, idx) => {
                              const maxU =
                                row.grnKind === 'stone'
                                  ? 'm'
                                  : row.grnKind === 'stone_flatsheet'
                                    ? 'sheets'
                                    : row.grnKind === 'accessory'
                                      ? 'units'
                                      : row.meterBasis
                                        ? 'm'
                                        : 'kg';
                              const gaugeS = String(row.gauge ?? '').trim() || '—';
                              const colourS = String(row.color ?? '').trim() || '—';
                              return (
                              <div
                                key={row.lineKey || idx}
                                className="rounded-md border border-slate-200/90 bg-white p-2 space-y-1.5"
                              >
                                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 min-w-0">
                                  <p className="text-xs font-black text-zarewa-teal leading-snug min-w-0 flex-1">
                                    {row.productName}
                                  </p>
                                  <span
                                    className="text-ui-xs font-black tabular-nums text-slate-700 shrink-0"
                                    title="Open on PO; you can post more if the delivery was heavier than ordered."
                                  >
                                    Open{' '}
                                    {row.remaining.toLocaleString()}
                                    {maxU === 'm'
                                      ? ' m'
                                      : maxU === 'units'
                                        ? ' u'
                                        : maxU === 'sheets'
                                          ? ' sheets'
                                          : ' kg'}
                                  </span>
                                </div>
                                <p className="text-ui-xs font-bold text-slate-800 leading-tight">
                                  <span className="font-black text-slate-950">{gaugeS}</span>
                                  <span className="text-slate-400 font-semibold"> · </span>
                                  <span className="font-black text-slate-950">{colourS}</span>
                                </p>
                                {row.grnKind === 'stone' ||
                                row.grnKind === 'accessory' ||
                                row.grnKind === 'stone_flatsheet' ? (
                                  <div className="space-y-1.5">
                                    <div>
                                      <label className="sr-only">
                                        {row.grnKind === 'stone'
                                          ? 'Metres received'
                                          : row.grnKind === 'stone_flatsheet'
                                            ? 'Sheets received'
                                            : 'Units received'}
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        step={row.grnKind === 'stone' ? '0.01' : '1'}
                                        value={row.qtyReceived}
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          setGrnLines((prev) =>
                                            prev.map((r, i) => (i === idx ? { ...r, qtyReceived: v } : r))
                                          );
                                        }}
                                        placeholder={
                                          row.grnKind === 'stone'
                                            ? 'Metres'
                                            : row.grnKind === 'stone_flatsheet'
                                              ? 'Sheets'
                                              : 'Units'
                                        }
                                        className="w-full rounded border border-slate-200 py-1.5 px-2 text-xs font-black text-zarewa-teal"
                                      />
                                      {row.grnKind === 'stone_flatsheet' ? (
                                        <p className="mt-1 text-ui-xs font-semibold text-slate-600">
                                          Posted to stock as m² (sheets × length × 1.2 m width).
                                        </p>
                                      ) : null}
                                    </div>
                                    <div>
                                      <label className="block text-ui-xs font-bold text-slate-500 uppercase mb-0.5">
                                        Date of receival
                                      </label>
                                      <input
                                        type="date"
                                        value={row.receivedAtISO || ''}
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          setGrnLines((prev) =>
                                            prev.map((r, i) => (i === idx ? { ...r, receivedAtISO: v } : r))
                                          );
                                        }}
                                        required
                                        className="w-full rounded border border-slate-200 py-1.5 px-2 text-xs font-black text-zarewa-teal"
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    <div>
                                      <label className="sr-only">
                                        {row.meterBasis ? 'Metres received' : 'Kilograms received'}
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        value={row.qtyReceived}
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          setGrnLines((prev) =>
                                            prev.map((r, i) => (i === idx ? { ...r, qtyReceived: v } : r))
                                          );
                                        }}
                                        placeholder={row.meterBasis ? 'Metres' : 'Kg'}
                                        className="w-full rounded border border-slate-200 py-1.5 px-2 text-xs font-black text-zarewa-teal"
                                      />
                                    </div>
                                    <div>
                                      <label className="sr-only">
                                        {row.meterBasis ? 'Weight in kg (required)' : 'Weight in kg (optional)'}
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={row.weightKg ?? ''}
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          setGrnLines((prev) =>
                                            prev.map((r, i) => (i === idx ? { ...r, weightKg: v } : r))
                                          );
                                        }}
                                        placeholder={row.meterBasis ? 'Weight kg *' : 'Weight kg (optional)'}
                                        className="w-full rounded border border-slate-200 py-1.5 px-2 text-xs font-black text-zarewa-teal"
                                      />
                                    </div>
                                    <div className="sm:col-span-2">
                                      <label className="sr-only">Coil number</label>
                                      <input
                                        value={row.coilNo}
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          setGrnLines((prev) =>
                                            prev.map((r, i) => (i === idx ? { ...r, coilNo: v } : r))
                                          );
                                        }}
                                        placeholder="Coil #"
                                        title="Suggested from register; edit if tag differs."
                                        className="w-full rounded border border-slate-200 py-1.5 px-2 text-xs font-black font-mono text-slate-900"
                                      />
                                    </div>
                                    <div className="sm:col-span-2">
                                      <label className="block text-ui-xs font-bold text-slate-500 uppercase mb-0.5">
                                        Date of receival
                                      </label>
                                      <input
                                        type="date"
                                        value={row.receivedAtISO || ''}
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          setGrnLines((prev) =>
                                            prev.map((r, i) => (i === idx ? { ...r, receivedAtISO: v } : r))
                                          );
                                        }}
                                        required
                                        className="w-full rounded border border-slate-200 py-1.5 px-2 text-xs font-black text-zarewa-teal"
                                      />
                                    </div>
                                    {row.meterBasis ? (
                                      <p className="sm:col-span-2 text-ui-xs font-semibold text-amber-700">
                                        Metre-basis PO line: enter metres received and actual kg weight.
                                      </p>
                                    ) : null}
                                  </div>
                                )}
                              </div>
                              );
                            })
                          )}
                          {grnLines.length > 0 &&
                          grnLines.some((r) => r.grnKind === 'coil') &&
                          ws?.hasPermission?.('purchase_orders.manage') ? (
                            <label className="flex cursor-pointer items-start gap-2 rounded-md border border-amber-200 bg-amber-50/90 p-2 text-ui-xs font-bold text-amber-950">
                              <input
                                type="checkbox"
                                checked={grnConversionOverride}
                                onChange={(e) => setGrnConversionOverride(e.target.checked)}
                                className="mt-0.5 h-3.5 w-3.5 rounded border-amber-400"
                              />
                              <span>Override conversion checks (audited).</span>
                            </label>
                          ) : null}
                          </fieldset>
                          {grnLines.length > 0 ? (
                            <button
                              type="submit"
                              disabled={!canReceiveInventory || grnSubmitting}
                              className={`${OPS_TOOL_BTN_PRIMARY} w-full`}
                            >
                              {grnSubmitting ? 'Posting…' : 'Confirm receipt'}
                            </button>
                          ) : null}
                        </form>
                      ) : null}
                    </li>
                    );
                  })}
                </ul>
                </>
              )}
            </div>
          </section>

            <section className="z-soft-panel overflow-hidden w-full min-w-0 flex flex-col lg:col-span-2">
              <div className="p-3 sm:p-4 flex flex-col">
                <h3 className={`${OPS_SECTION_TITLE} mb-2 flex items-center gap-2`}>
                  <Scale size={16} className="text-zarewa-teal" aria-hidden />
                  {stockReceiveKind === 'coil'
                    ? 'Received coils — live weight'
                    : stockReceiveKind === 'stone_meter'
                      ? 'Stone-coated trim — live metres (STONE-* SKUs, not flatsheet)'
                      : stockReceiveKind === 'stone_flatsheet'
                        ? 'Stone flatsheet — live m² (STONE-FS-* SKUs)'
                        : 'Received accessories — live qty'}
                </h3>
                {stockReceiveKind === 'coil' ? (
                  <>
                    <div className="flex flex-col gap-1.5 mb-2 shrink-0">
                      <label className="relative min-w-0 w-full">
                        <span className="sr-only">Search received coils</span>
                        <Search
                          size={14}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                          aria-hidden
                        />
                        <input
                          type="search"
                          value={coilLiveSearch}
                          onChange={(e) => setCoilLiveSearch(e.target.value)}
                          placeholder="Coil no. e.g. 2043 or CL-26-2043 · colour gauge · po:…"
                          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-2.5 text-xs font-medium text-slate-800 placeholder:text-slate-400"
                        />
                      </label>
                      <p className="text-ui-xs text-slate-500 leading-snug pl-0.5">
                        Example:{' '}
                        <span className="font-mono text-slate-600">2043</span> or{' '}
                        <span className="font-mono text-slate-600">bush green 0.20</span> — tap column titles to sort.
                        Search also finds consumed coils not shown in the live list.
                      </p>
                    </div>
                    {coilLotsReceiptSorted.length === 0 && !hasCoilReceiptSearch ? (
                      <p className="text-xs font-medium text-slate-400">
                        No coils yet — confirm a receipt in the panel on the left
                        {canRegisterCoil ? (
                          <>
                            {' '}
                            or{' '}
                            <button
                              type="button"
                              className="font-semibold text-zarewa-teal underline-offset-2 hover:underline"
                              onClick={() => setShowRegisterCoil(true)}
                            >
                              register a coil
                            </button>{' '}
                            you forgot to add.
                          </>
                        ) : (
                          '.'
                        )}
                      </p>
                    ) : coilLotsByReceipt.length === 0 ? (
                      <p className="text-xs font-medium text-slate-400">
                        {coilSearchRemoteLoading
                          ? 'Searching coils…'
                          : hasCoilReceiptSearch
                            ? 'No coils match your search — check the coil was GRN-posted for this branch.'
                            : 'No coils in the live list.'}
                      </p>
                    ) : (
                      <>
                        {coilReceiptIncludesArchived ? (
                          <p className="text-ui-xs text-amber-800 bg-amber-50 border border-amber-200/80 rounded-md px-2 py-1 mb-2">
                            Some matches are consumed or finished — shown for lookup only.
                          </p>
                        ) : null}
                      <div className="-mx-0.5 overflow-x-auto rounded-lg border border-slate-200/80 bg-white/40 sm:mx-0">
                        <div className="min-w-[34rem] flex flex-col max-h-[min(26rem,52vh)] lg:max-h-none">
                          <div
                            className="grid grid-cols-[4.75rem_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,3.5rem)_minmax(0,1fr)_3.5rem_2rem] gap-x-1.5 px-2 py-2 border-b border-slate-200/80 bg-slate-100/95 shrink-0 items-end"
                            role="row"
                          >
                            <CoilReceiptSortTh
                              label="Rcvd"
                              sortKey="received"
                              sort={coilReceiptSort}
                              onToggle={toggleCoilReceiptSort}
                            />
                            <CoilReceiptSortTh
                              label="Coil no."
                              sortKey="coilNo"
                              sort={coilReceiptSort}
                              onToggle={toggleCoilReceiptSort}
                            />
                            <CoilReceiptSortTh
                              label="Colour"
                              sortKey="colour"
                              sort={coilReceiptSort}
                              onToggle={toggleCoilReceiptSort}
                            />
                            <CoilReceiptSortTh
                              label="Gauge"
                              sortKey="gauge"
                              sort={coilReceiptSort}
                              onToggle={toggleCoilReceiptSort}
                            />
                            <CoilReceiptSortTh
                              label="Material"
                              sortKey="material"
                              sort={coilReceiptSort}
                              onToggle={toggleCoilReceiptSort}
                            />
                            <CoilReceiptSortTh
                              label="Live kg"
                              sortKey="kg"
                              sort={coilReceiptSort}
                              onToggle={toggleCoilReceiptSort}
                              className="justify-end text-right w-full"
                            />
                            <span className="sr-only">Open profile</span>
                          </div>
                          <ul className="overflow-y-auto divide-y divide-slate-200/60">
                            {coilLotsByReceiptCapped.map((c) => {
                              const live = liveCoilWeightKg(c);
                              const reserved = Math.max(0, Number(c.qtyReserved) || 0);
                              const isDone = c.currentStatus === 'Consumed' || c.currentStatus === 'Finished';
                              const isReserved = !isDone && reserved > 0.0001;
                              const material = c.materialTypeName || c.productID || '—';
                              const rcvd = c.receivedAtISO ? String(c.receivedAtISO).slice(0, 10) : '—';
                              const rowTitle = [
                                c.poID && `PO ${c.poID}`,
                                c.currentStatus,
                                isReserved
                                  ? `${reserved.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg reserved, ${Math.max(0, live - reserved).toLocaleString(undefined, { maximumFractionDigits: 2 })} kg free`
                                  : null,
                                c.supplierName,
                                c.location,
                              ]
                                .filter(Boolean)
                                .join(' · ');
                              return (
                                <li key={`${c.coilNo}-${c.poID || ''}-${c.lineKey || ''}`}>
                                  <button
                                    type="button"
                                    title={rowTitle || undefined}
                                    onClick={() => navigate(`/operations/coils/${encodeURIComponent(c.coilNo)}`)}
                                    className="grid grid-cols-[4.75rem_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,3.5rem)_minmax(0,1fr)_3.5rem_2rem] gap-x-1.5 w-full text-left px-2 py-2 hover:bg-white/85 transition-colors group items-center"
                                  >
                                    <span className="text-ui-xs text-slate-600 tabular-nums">{rcvd}</span>
                                    <span className="text-xs font-bold text-zarewa-teal truncate font-mono">
                                      {c.coilNo}
                                      {isDone ? (
                                        <span className="ml-1 text-ui-xs font-bold uppercase text-amber-700">
                                          {c.currentStatus}
                                        </span>
                                      ) : isReserved ? (
                                        <span className="ml-1 text-ui-xs font-bold uppercase text-sky-700">
                                          Reserved
                                        </span>
                                      ) : null}
                                    </span>
                                    <span className="text-ui-xs text-slate-800 truncate" title={coilColourLabel(c.colour)}>
                                      {coilColourLabel(c.colour)}
                                    </span>
                                    <span className="text-ui-xs text-slate-800 truncate tabular-nums">
                                      {c.gaugeLabel || '—'}
                                    </span>
                                    <span className="text-ui-xs text-slate-700 truncate" title={material}>
                                      {material}
                                    </span>
                                    <span className="text-xs font-bold text-zarewa-teal tabular-nums text-right">
                                      {live.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </span>
                                    <span className="flex justify-center text-slate-400 group-hover:text-zarewa-teal">
                                      <ChevronRight size={16} aria-hidden />
                                    </span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                          {coilReceiptListTruncated ? (
                            <p className="px-2 py-1.5 text-ui-xs text-slate-500 border-t border-slate-100">
                              Showing {coilListLimit} of {coilLotsByReceipt.length} coils. Search to find more.
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </>
                    )}
                  </>
                ) : (
                  <>
                    {skuProductsLiveSorted.length === 0 ? (
                      <p className="text-xs font-medium text-slate-400">
                        No{' '}
                        {stockReceiveKind === 'stone_meter'
                          ? 'stone-coated metre'
                          : stockReceiveKind === 'stone_flatsheet'
                            ? 'stone flatsheet'
                            : 'accessory'}{' '}
                        SKUs in catalog yet — create a PO or receipt in Procurement.
                      </p>
                    ) : skuProductsReceiptFiltered.length === 0 ? (
                      <p className="text-xs font-medium text-slate-400">No rows match your search.</p>
                    ) : (
                      <>
                        <h4 className={`${OPS_SECTION_TITLE} mb-2`}>
                          {stockReceiveKind === 'stone_meter' ? 'Stone SKUs' : 'SKU lots'}
                        </h4>
                        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-2 mb-2 shrink-0">
                          <label className="relative min-w-0 w-full flex-1 sm:min-w-[140px]">
                            <span className="sr-only">Search on-hand SKUs</span>
                            <Search
                              size={14}
                              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                              aria-hidden
                            />
                            <input
                              type="search"
                              value={coilLiveSearch}
                              onChange={(e) => setCoilLiveSearch(e.target.value)}
                              placeholder="Search SKU or name…"
                              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-2.5 text-xs font-medium text-slate-800 placeholder:text-slate-400"
                            />
                          </label>
                        </div>
                        {skuReceiptTruncated ? (
                          <p className="text-ui-xs text-slate-500 mb-1.5">
                            Showing {skuListLimit} of {skuProductsReceiptFiltered.length}. Search for more
                            SKUs.
                          </p>
                        ) : null}
                        <ul className="space-y-1.5">
                          {skuProductsByReceipt.map((p) => {
                            const live = Number(p.stockLevel) || 0;
                            const u =
                              String(p.unit || '').trim() ||
                              (stockReceiveKind === 'stone_meter'
                                ? 'm'
                                : stockReceiveKind === 'stone_flatsheet'
                                  ? 'm²'
                                  : 'u');
                            const label = String(p.name || p.productID || '—').trim();
                            const meta2 = `${p.productID} · tap for movements`;
                            return (
                              <li key={p.productID}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setProductMovementModal({
                                      productID: p.productID,
                                      name: label,
                                      unit: u,
                                    })
                                  }
                                  className="w-full text-left rounded-lg border border-slate-200/60 bg-white/40 py-1.5 px-2.5 shadow-sm backdrop-blur-md hover:bg-white/70 transition-colors group"
                                >
                                  <div className="min-w-0 leading-tight">
                                    <div className="flex items-center justify-between gap-2 min-w-0">
                                      <p
                                        className="text-xs font-bold text-zarewa-teal truncate min-w-0"
                                        title={label}
                                      >
                                        {label}
                                      </p>
                                      <span className="text-xs font-black text-zarewa-teal tabular-nums shrink-0">
                                        {live.toLocaleString()} {u}
                                      </span>
                                    </div>
                                    <p
                                      className="text-ui-xs text-slate-500 mt-0.5 leading-snug line-clamp-1 font-mono"
                                      title={meta2}
                                    >
                                      {meta2}
                                    </p>
                                  </div>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </>
                    )}
                  </>
                )}
              </div>
            </section>
          </div>
        </div>
    </>
  );
}
