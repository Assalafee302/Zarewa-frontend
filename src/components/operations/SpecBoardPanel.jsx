import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  buildCoilSpecBoardRows,
  buildTransitKgBySpec,
  filterCoilSpecBoardRows,
  summarizeCoilSpecBoard,
  DEFAULT_COIL_RESTOCK_MIN_KG,
} from '../../lib/storeSpecAggregate';
import { buildLastUsedByCoilNo } from '../../lib/storeIdle';
import { buildMetresBySpec, pickStoreHeroes, STORE_HERO_PERIODS } from '../../lib/storeHeroEngine';
import { GaugeStamp } from '../ui/MillColourChip.jsx';
import { SpecBoardCount, SpecBoardFilterChip, SpecHeroRank } from './SpecBoardChrome.jsx';

const FILTERS = ['all', 'below_min', 'thin', 'idle', 'heroes'];

/**
 * On-hand coil rack — colour × gauge. Store scans this like a colour card wall.
 */
export function SpecBoardPanel({
  coilLots = [],
  masterData = null,
  movements = [],
  productionJobs = [],
  quotations = [],
  transitPurchaseOrders = [],
  isReceivablePo = () => true,
  restockMinKg = DEFAULT_COIL_RESTOCK_MIN_KG,
  specMinOverrides = [],
  initialFilter = 'all',
  onOpenCoil,
  onRequestRestock,
}) {
  const [family, setFamily] = useState(/** @type {'all'|'aluminium'|'aluzinc'} */ ('all'));
  const [filter, setFilter] = useState(
    /** @type {'all'|'below_min'|'thin'|'idle'|'heroes'} */ (
      FILTERS.includes(initialFilter) ? initialFilter : 'all'
    )
  );
  const [period, setPeriod] = useState(/** @type {'quarter'|'half_year'|'year'} */ ('quarter'));
  const [query, setQuery] = useState('');
  const [expandedKey, setExpandedKey] = useState('');

  useEffect(() => {
    if (FILTERS.includes(initialFilter)) setFilter(initialFilter);
  }, [initialFilter]);

  const lastUsedByCoil = useMemo(() => buildLastUsedByCoilNo(movements), [movements]);

  const transitBySpec = useMemo(
    () => buildTransitKgBySpec(transitPurchaseOrders, masterData, isReceivablePo),
    [transitPurchaseOrders, masterData, isReceivablePo]
  );

  const heroPack = useMemo(() => {
    const metres = buildMetresBySpec({ productionJobs, quotations, period, masterData });
    return pickStoreHeroes(metres);
  }, [productionJobs, quotations, period, masterData]);

  const allRows = useMemo(
    () =>
      buildCoilSpecBoardRows(coilLots, masterData, {
        restockMinKg,
        specMinOverrides,
        transitBySpec,
        lastUsedByCoil,
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
    [coilLots, masterData, restockMinKg, specMinOverrides, transitBySpec, lastUsedByCoil, heroPack]
  );

  const rows = useMemo(() => {
    let list = filterCoilSpecBoardRows(allRows, {
      family,
      filter: filter === 'heroes' ? 'all' : filter,
      query,
    });
    if (filter === 'heroes') list = list.filter((r) => r.isHero);
    return list;
  }, [allRows, family, filter, query]);

  const summary = useMemo(() => summarizeCoilSpecBoard(allRows), [allRows]);

  return (
    <div className="rounded-md border border-slate-200 bg-white overflow-hidden mb-3" data-testid="ops-coil-spec-board">
      <header className="border-b border-slate-200 px-3 py-2.5 sm:px-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900">Colour × gauge</h3>
            <p className="mt-0.5 text-ui-xs text-slate-500">
              Free kg on the rack. In-transit counts toward the restock min ({restockMinKg.toLocaleString()} kg).
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
            <SpecBoardFilterChip label="All" active={family === 'all'} onClick={() => setFamily('all')} />
            <SpecBoardFilterChip
              label="Aluzinc"
              active={family === 'aluzinc'}
              onClick={() => setFamily('aluzinc')}
            />
            <SpecBoardFilterChip
              label="Aluminium"
              active={family === 'aluminium'}
              onClick={() => setFamily('aluminium')}
            />
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
            <SpecBoardFilterChip
              label="Thin (<85 kg)"
              active={filter === 'thin'}
              onClick={() => setFilter('thin')}
            />
            <SpecBoardFilterChip label="Idle" active={filter === 'idle'} onClick={() => setFilter('idle')} />
          </div>
          <label className="relative min-w-0 w-full sm:max-w-xs">
            <span className="sr-only">Search specs</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. 0.28 gray beige"
              className="w-full rounded-md border border-slate-200 bg-white py-1.5 px-2.5 text-xs font-medium text-slate-800 placeholder:text-slate-400"
            />
          </label>
        </div>
      </header>

      <div className="overflow-x-auto">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-ui-xs text-slate-500">
            {allRows.length === 0
              ? 'No coil specs on hand yet — receive GRN or register a lot.'
              : 'No specs match this filter.'}
          </p>
        ) : (
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-ui-xs font-medium text-slate-500">
              <tr>
                <th className="px-3 py-2 w-8" />
                <th className="px-2 py-2">Colour</th>
                <th className="px-2 py-2">Gauge</th>
                <th className="px-2 py-2">Material</th>
                <th className="px-2 py-2 text-right">Free kg</th>
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
                      <td className="px-2 py-2">
                        <span className="font-medium text-slate-900">
                          {row.colour}
                          <SpecHeroRank rank={row.heroRank} />
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <GaugeStamp gauge={row.gauge} />
                      </td>
                      <td className="px-2 py-2 text-slate-600">{row.familyLabel}</td>
                      <td className="px-2 py-2 text-right z-stencil tabular-nums text-slate-900">
                        {Math.round(row.freeKg).toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-600">
                        {Math.round(row.inTransitKg).toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-600">
                        {row.periodMetres > 0 ? Math.round(row.periodMetres).toLocaleString() : '—'}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {row.belowMin ? (
                          <span className="font-semibold text-amber-900 tabular-nums">
                            −{Math.round(row.shortfallKg).toLocaleString()}
                            {row.hasSpecMinOverride ? (
                              <span className="ml-1 text-[10px] font-medium text-slate-500">
                                min {Math.round(row.restockMinKg)}
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="font-medium text-slate-600">
                            OK
                            {row.hasSpecMinOverride ? (
                              <span className="ml-1 text-[10px] font-medium text-slate-500">
                                min {Math.round(row.restockMinKg)}
                              </span>
                            ) : null}
                          </span>
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
                                materialType: row.familyLabel,
                                requestedKg: Math.max(1, Math.ceil(Number(row.shortfallKg) || 0)),
                                family: row.family,
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
                          <p className="text-[11px] font-medium text-slate-500 mb-1.5">Lots — oldest first</p>
                          <ul className="space-y-1 max-h-40 overflow-y-auto">
                            {row.lots.map((lot) => (
                              <li key={lot.coilNo}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenCoil?.(lot.coilNo);
                                  }}
                                  className={`w-full flex flex-wrap items-center justify-between gap-2 rounded-sm border px-2 py-1.5 text-left text-ui-xs ${
                                    lot.thin
                                      ? 'border-rose-200 bg-rose-50/80'
                                      : 'border-slate-200 bg-white hover:border-slate-400'
                                  }`}
                                >
                                  <span className="z-stencil font-semibold text-slate-900">{lot.coilNo}</span>
                                  <span className="text-slate-500 tabular-nums">
                                    {lot.receivedAtISO ? String(lot.receivedAtISO).slice(0, 10) : '—'}
                                  </span>
                                  <span className="tabular-nums text-slate-800">
                                    {Math.round(lot.freeKg).toLocaleString()} kg free
                                    {lot.idleBand === 'critical' || lot.idleBand === 'warn'
                                      ? ` · idle ${lot.idleDays}d`
                                      : ''}
                                    {lot.thin ? ' · thin' : ''}
                                  </span>
                                </button>
                              </li>
                            ))}
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

export default SpecBoardPanel;
