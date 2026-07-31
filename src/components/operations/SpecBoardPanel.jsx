import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Disc3 } from 'lucide-react';
import {
  buildCoilSpecBoardRows,
  buildTransitKgBySpec,
  filterCoilSpecBoardRows,
  summarizeCoilSpecBoard,
  DEFAULT_COIL_RESTOCK_MIN_KG,
} from '../../lib/storeSpecAggregate';
import { buildLastUsedByCoilNo } from '../../lib/storeIdle';
import { buildMetresBySpec, pickStoreHeroes, STORE_HERO_PERIODS } from '../../lib/storeHeroEngine';

/**
 * On-hand Spec board — Colour × Gauge × Material (coils).
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
      ['all', 'below_min', 'thin', 'idle', 'heroes'].includes(initialFilter) ? initialFilter : 'all'
    )
  );
  const [period, setPeriod] = useState(/** @type {'quarter'|'half_year'|'year'} */ ('quarter'));
  const [query, setQuery] = useState('');
  const [expandedKey, setExpandedKey] = useState('');

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
              <Disc3 size={14} aria-hidden />
              Spec board
            </h3>
            <p className="mt-0.5 text-ui-xs font-medium text-slate-500">
              Colour · Gauge · free kg. Heroes = top metres produced ({period.replace('_', '-')}). Min{' '}
              {restockMinKg.toLocaleString()} kg includes in-transit.
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
            {chip('all', 'All', family === 'all', () => setFamily('all'))}
            {chip('aluzinc', 'Aluzinc', family === 'aluzinc', () => setFamily('aluzinc'))}
            {chip('aluminium', 'Aluminium', family === 'aluminium', () => setFamily('aluminium'))}
            <span className="mx-1 hidden sm:inline text-slate-300" aria-hidden>
              |
            </span>
            {chip('f-all', 'Any', filter === 'all', () => setFilter('all'))}
            {chip('f-heroes', 'Heroes', filter === 'heroes', () => setFilter('heroes'))}
            {chip('f-min', 'Below min', filter === 'below_min', () => setFilter('below_min'))}
            {chip('f-thin', 'Thin <85', filter === 'thin', () => setFilter('thin'))}
            {chip('f-idle', 'Idle', filter === 'idle', () => setFilter('idle'))}
          </div>
          <label className="relative min-w-0 w-full sm:max-w-xs">
            <span className="sr-only">Search specs</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. 0.28 gray beige"
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-xs font-medium text-slate-800 placeholder:text-slate-400"
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
            <thead className="bg-slate-50/80 text-[10px] font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 w-8" />
                <th className="px-2 py-2">Colour</th>
                <th className="px-2 py-2">Gauge</th>
                <th className="px-2 py-2">Material</th>
                <th className="px-2 py-2 text-right">Free</th>
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
                        {row.colour}
                        {row.isHero ? (
                          <span className="ml-1 text-[10px] font-black uppercase text-teal-800">
                            H{row.heroRank}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-2 py-2 font-mono tabular-nums text-slate-800">{row.gauge}</td>
                      <td className="px-2 py-2 text-slate-600">{row.familyLabel}</td>
                      <td className="px-2 py-2 text-right font-black tabular-nums text-zarewa-teal">
                        {Math.round(row.freeKg).toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-sky-800">
                        {Math.round(row.inTransitKg).toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-600">
                        {row.periodMetres > 0 ? Math.round(row.periodMetres).toLocaleString() : '—'}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {row.belowMin ? (
                          <span className="font-bold text-amber-900 tabular-nums">
                            −{Math.round(row.shortfallKg).toLocaleString()}
                            {row.hasSpecMinOverride ? (
                              <span className="ml-1 text-[9px] font-black uppercase text-slate-500">
                                min {Math.round(row.restockMinKg)}
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="font-semibold text-emerald-800">
                            OK
                            {row.hasSpecMinOverride ? (
                              <span className="ml-1 text-[9px] font-black uppercase text-slate-500">
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
                            className="rounded-md border border-teal-200 bg-teal-50 px-2 py-1 text-[10px] font-black uppercase text-teal-950 hover:bg-teal-100"
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
                      <tr className="bg-slate-50/90">
                        <td colSpan={9} className="px-3 py-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                            Lots (FIFO — oldest first)
                          </p>
                          <ul className="space-y-1 max-h-40 overflow-y-auto">
                            {row.lots.map((lot) => (
                              <li key={lot.coilNo}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenCoil?.(lot.coilNo);
                                  }}
                                  className={`w-full flex flex-wrap items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left text-ui-xs ${
                                    lot.thin
                                      ? 'border-rose-200 bg-rose-50/80'
                                      : 'border-slate-200 bg-white hover:border-teal-300'
                                  }`}
                                >
                                  <span className="font-mono font-bold text-zarewa-teal">{lot.coilNo}</span>
                                  <span className="text-slate-500 tabular-nums">
                                    {lot.receivedAtISO ? String(lot.receivedAtISO).slice(0, 10) : '—'}
                                  </span>
                                  <span className="font-black tabular-nums text-slate-800">
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
