import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Layers } from 'lucide-react';
import {
  buildStoneSpecBoardRows,
  buildTransitMByStoneSpec,
  filterStoneSpecBoardRows,
  summarizeStoneSpecBoard,
  DEFAULT_STONE_RESTOCK_MIN_M,
} from '../../lib/storeStoneSpecAggregate';
import { buildMetresBySpec, pickStoreHeroes, STORE_HERO_PERIODS } from '../../lib/storeHeroEngine';

/**
 * On-hand Stone Spec board — Design × Colour × Gauge (metres).
 */
export function StoneSpecBoardPanel({
  products = [],
  masterData = null,
  productionJobs = [],
  quotations = [],
  transitPurchaseOrders = [],
  isReceivablePo = () => true,
  restockMinM = DEFAULT_STONE_RESTOCK_MIN_M,
  initialFilter = 'all',
  onRequestRestock,
  onOpenSku,
}) {
  const [filter, setFilter] = useState(
    /** @type {'all'|'below_min'|'heroes'} */ (
      ['all', 'below_min', 'heroes'].includes(initialFilter) ? initialFilter : 'all'
    )
  );
  const [period, setPeriod] = useState(/** @type {'quarter'|'half_year'|'year'} */ ('quarter'));
  const [query, setQuery] = useState('');
  const [expandedKey, setExpandedKey] = useState('');

  const transitBySpec = useMemo(
    () => buildTransitMByStoneSpec(transitPurchaseOrders, masterData, isReceivablePo),
    [transitPurchaseOrders, masterData, isReceivablePo]
  );

  const heroPack = useMemo(() => {
    const metres = buildMetresBySpec({
      productionJobs,
      quotations,
      period,
      masterData,
      familyScope: 'stone',
    });
    return pickStoreHeroes(metres, undefined, { families: ['stone'] });
  }, [productionJobs, quotations, period, masterData]);

  const allRows = useMemo(
    () =>
      buildStoneSpecBoardRows(products, masterData, {
        restockMinM,
        transitBySpec,
      }).map((row) => {
        const metresRow = heroPack.metresByKey.get(row.key);
        const isHero = heroPack.heroKeys.has(row.key);
        return {
          ...row,
          isHero,
          heroRank: isHero ? heroPack.heroes.find((h) => h.key === row.key)?.heroRank : null,
          periodMetres: metresRow?.metres ?? 0,
        };
      }),
    [products, masterData, restockMinM, transitBySpec, heroPack]
  );

  const rows = useMemo(() => {
    let list = filterStoneSpecBoardRows(allRows, {
      filter: filter === 'heroes' ? 'all' : filter,
      query,
    });
    if (filter === 'heroes') list = list.filter((r) => r.isHero);
    return list;
  }, [allRows, filter, query]);

  const summary = useMemo(() => summarizeStoneSpecBoard(allRows), [allRows]);

  const chip = (id, label, active, onClick) => (
    <button
      key={id}
      type="button"
      onClick={onClick}
      className={`rounded-md px-2 py-1 text-ui-xs font-bold uppercase tracking-wide transition ${
        active
          ? 'bg-zarewa-teal text-white'
          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden mb-3">
      <header className="border-b border-slate-100 bg-slate-50/90 px-3 py-2.5 sm:px-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-xs font-black uppercase tracking-widest text-zarewa-teal flex items-center gap-1.5">
              <Layers size={14} aria-hidden />
              Stone Spec board
            </h3>
            <p className="mt-0.5 text-ui-xs font-medium text-slate-500">
              Design · Colour · Gauge · free m. Heroes = top metres ({period.replace('_', '-')}). Min{' '}
              {restockMinM.toLocaleString()} m includes in-transit.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-ui-xs font-semibold tabular-nums">
            <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-700">
              {summary.specCount} specs
            </span>
            <span className="rounded-md border border-teal-200 bg-teal-50 px-2 py-1 text-teal-950">
              {heroPack.heroes.length} heroes
            </span>
            <span
              className={`rounded-md border px-2 py-1 ${
                summary.belowMinCount
                  ? 'border-amber-200 bg-amber-50 text-amber-950'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              {summary.belowMinCount} below min
            </span>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
          {STORE_HERO_PERIODS.map((p) =>
            chip(p.id, p.label, period === p.id, () => setPeriod(/** @type {any} */ (p.id)))
          )}
        </div>

        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1">
            {chip('f-all', 'Any', filter === 'all', () => setFilter('all'))}
            {chip('f-heroes', 'Heroes', filter === 'heroes', () => setFilter('heroes'))}
            {chip('f-min', 'Below min', filter === 'below_min', () => setFilter('below_min'))}
          </div>
          <label className="relative min-w-0 w-full sm:max-w-xs">
            <span className="sr-only">Search stone specs</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. milano black 0.40"
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-xs font-medium text-slate-800 placeholder:text-slate-400"
            />
          </label>
        </div>
      </header>

      <div className="overflow-x-auto">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-ui-xs text-slate-500">
            {allRows.length === 0
              ? 'No stone metre specs on hand yet — receive a stone PO or add SKUs.'
              : 'No stone specs match this filter.'}
          </p>
        ) : (
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-[10px] font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 w-8" />
                <th className="px-2 py-2">Design</th>
                <th className="px-2 py-2">Colour</th>
                <th className="px-2 py-2">Gauge</th>
                <th className="px-2 py-2 text-right">Free m</th>
                <th className="px-2 py-2 text-right">In transit</th>
                <th className="px-2 py-2 text-right">Metres</th>
                <th className="px-2 py-2 text-right">vs min</th>
                <th className="px-2 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const open = expandedKey === row.key;
                return (
                  <React.Fragment key={row.key}>
                    <tr
                      className={`${row.belowMin ? 'bg-amber-50/40' : row.isHero ? 'bg-teal-50/30' : 'bg-white'} hover:bg-slate-50/80 cursor-pointer`}
                      onClick={() => setExpandedKey(open ? '' : row.key)}
                    >
                      <td className="px-3 py-2 text-slate-400">
                        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </td>
                      <td className="px-2 py-2 font-bold text-slate-900">
                        {row.design}
                        {row.isHero ? (
                          <span className="ml-1 text-[10px] font-black uppercase text-teal-800">
                            H{row.heroRank}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-2 py-2 font-semibold text-slate-800">{row.colour}</td>
                      <td className="px-2 py-2 font-mono tabular-nums text-slate-800">{row.gauge}</td>
                      <td className="px-2 py-2 text-right font-black tabular-nums text-zarewa-teal">
                        {Math.round(row.freeM).toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-sky-800">
                        {Math.round(row.inTransitM).toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-600">
                        {row.periodMetres > 0 ? Math.round(row.periodMetres).toLocaleString() : '—'}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {row.belowMin ? (
                          <span className="font-bold text-amber-900 tabular-nums">
                            −{Math.round(row.shortfallM).toLocaleString()}
                          </span>
                        ) : (
                          <span className="font-semibold text-emerald-800">OK</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {row.belowMin && onRequestRestock ? (
                          <button
                            type="button"
                            className="rounded-md border border-teal-200 bg-teal-50 px-2 py-1 text-[10px] font-black uppercase text-teal-950 hover:bg-teal-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRequestRestock({
                                colour: row.colour,
                                gauge: row.gauge,
                                materialType: `Stone · ${row.design}`,
                                requestedKg: Math.max(1, Math.ceil(Number(row.shortfallM) || 0)),
                                family: 'stone',
                                unit: 'm',
                                design: row.design,
                              });
                            }}
                          >
                            Request
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                    {open ? (
                      <tr className="bg-slate-50/60">
                        <td colSpan={9} className="px-3 py-2">
                          <ul className="space-y-1">
                            {row.skus.map((sku) => (
                              <li key={sku.productID} className="flex flex-wrap items-center justify-between gap-2">
                                <button
                                  type="button"
                                  className="text-left font-mono text-ui-xs font-semibold text-zarewa-teal hover:underline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenSku?.(sku);
                                  }}
                                >
                                  {sku.productID}
                                </button>
                                <span className="text-ui-xs text-slate-600 truncate max-w-[40%]">{sku.name}</span>
                                <span className="tabular-nums text-ui-xs font-bold text-slate-800">
                                  {Math.round(sku.freeM).toLocaleString()} m free
                                </span>
                              </li>
                            ))}
                            {row.skus.length === 0 ? (
                              <li className="text-ui-xs text-slate-500">In transit only — no on-hand SKU yet.</li>
                            ) : null}
                          </ul>
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default StoneSpecBoardPanel;
