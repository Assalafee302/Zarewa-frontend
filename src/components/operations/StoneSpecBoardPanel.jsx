import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  buildStoneSpecBoardRows,
  buildTransitMByStoneSpec,
  filterStoneSpecBoardRows,
  summarizeStoneSpecBoard,
  DEFAULT_STONE_RESTOCK_MIN_M,
} from '../../lib/storeStoneSpecAggregate';
import { buildMetresBySpec, pickStoreHeroes, STORE_HERO_PERIODS } from '../../lib/storeHeroEngine';
import { GaugeStamp } from '../ui/MillColourChip.jsx';
import { SpecBoardCount, SpecBoardFilterChip, SpecHeroRank } from './SpecBoardChrome.jsx';

const FILTERS = ['all', 'below_min', 'heroes'];

/**
 * On-hand stone rack — design × colour × gauge in metres.
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
    /** @type {'all'|'below_min'|'heroes'} */ (FILTERS.includes(initialFilter) ? initialFilter : 'all')
  );
  const [period, setPeriod] = useState(/** @type {'quarter'|'half_year'|'year'} */ ('quarter'));
  const [query, setQuery] = useState('');
  const [expandedKey, setExpandedKey] = useState('');

  useEffect(() => {
    if (FILTERS.includes(initialFilter)) setFilter(initialFilter);
  }, [initialFilter]);

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

  return (
    <div className="rounded-md border border-slate-200 bg-white overflow-hidden mb-3" data-testid="ops-stone-spec-board">
      <header className="border-b border-slate-200 px-3 py-2.5 sm:px-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900">Stone colour × gauge</h3>
            <p className="mt-0.5 text-ui-xs text-slate-500">
              Free metres on the rack. In-transit counts toward the restock min ({restockMinM.toLocaleString()} m).
              Most produced uses {period.replace('_', '-')} metres.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <SpecBoardCount>{summary.specCount} specs</SpecBoardCount>
            <SpecBoardCount>{heroPack.heroes.length} most produced</SpecBoardCount>
            <SpecBoardCount tone={summary.belowMinCount ? 'warn' : 'default'}>
              {summary.belowMinCount} below min
            </SpecBoardCount>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
          {STORE_HERO_PERIODS.map((p) => (
            <SpecBoardFilterChip
              key={p.id}
              label={p.label}
              active={period === p.id}
              onClick={() => setPeriod(/** @type {any} */ (p.id))}
            />
          ))}
        </div>

        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1">
            <SpecBoardFilterChip label="Any" active={filter === 'all'} onClick={() => setFilter('all')} />
            <SpecBoardFilterChip
              label="Most produced"
              active={filter === 'heroes'}
              onClick={() => setFilter('heroes')}
            />
            <SpecBoardFilterChip
              label="Below min"
              active={filter === 'below_min'}
              onClick={() => setFilter('below_min')}
            />
          </div>
          <label className="relative min-w-0 w-full sm:max-w-xs">
            <span className="sr-only">Search stone specs</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. milano black 0.40"
              className="w-full rounded-md border border-slate-200 bg-white py-1.5 px-2.5 text-xs font-medium text-slate-800 placeholder:text-slate-400"
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
            <thead className="border-b border-slate-200 bg-slate-50 text-ui-xs font-medium text-slate-500">
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
                      className={`${row.belowMin ? 'bg-amber-50/50' : 'bg-white'} hover:bg-slate-50 cursor-pointer`}
                      onClick={() => setExpandedKey(open ? '' : row.key)}
                    >
                      <td className="px-3 py-2 text-slate-400">
                        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </td>
                      <td className="px-2 py-2 font-medium text-slate-900">
                        {row.design}
                        <SpecHeroRank rank={row.heroRank} />
                      </td>
                      <td className="px-2 py-2">
                        <span className="font-medium text-slate-800">{row.colour}</span>
                      </td>
                      <td className="px-2 py-2">
                        <GaugeStamp gauge={row.gauge} />
                      </td>
                      <td className="px-2 py-2 text-right z-stencil tabular-nums text-slate-900">
                        {Math.round(row.freeM).toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-600">
                        {Math.round(row.inTransitM).toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-600">
                        {row.periodMetres > 0 ? Math.round(row.periodMetres).toLocaleString() : '—'}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {row.belowMin ? (
                          <span className="font-semibold text-amber-900 tabular-nums">
                            −{Math.round(row.shortfallM).toLocaleString()}
                          </span>
                        ) : (
                          <span className="font-medium text-slate-600">OK</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {row.belowMin && onRequestRestock ? (
                          <button
                            type="button"
                            className="rounded-sm border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-800 hover:bg-slate-50"
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
                      <tr className="bg-slate-50">
                        <td colSpan={9} className="px-3 py-2">
                          <ul className="space-y-1">
                            {row.skus.map((sku) => (
                              <li key={sku.productID} className="flex flex-wrap items-center justify-between gap-2">
                                <button
                                  type="button"
                                  className="text-left z-stencil text-ui-xs font-semibold text-slate-800 hover:underline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenSku?.(sku);
                                  }}
                                >
                                  {sku.productID}
                                </button>
                                <span className="text-ui-xs text-slate-600 truncate max-w-[40%]">{sku.name}</span>
                                <span className="tabular-nums text-ui-xs text-slate-800">
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
