import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import {
  freeCoilWeightKgForOverview,
  liveCoilWeightKgForOverview,
} from '../../lib/operationsProductionOverviewCore';
import { countedCoilNos, readCoilCountSession } from '../../lib/coilCountSession';
import { OPS_FILTER_CHIP, OPS_FILTER_CHIP_OFF, OPS_FILTER_CHIP_ON } from './operationsDeskUi';

function kg(n) {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function unique(values) {
  return [...new Set(values.map((v) => String(v || '').trim()).filter((v) => v && v !== '—'))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
}

function statusLabel(bookStatus, isReserved) {
  if (isReserved) return 'Held for a job';
  const s = String(bookStatus || '').trim().toLowerCase();
  if (s === 'available') return 'In stock';
  if (s === 'consumed' || s === 'finished') return bookStatus;
  return bookStatus || 'In stock';
}

/**
 * Simple in-stock coil list: one stock-left kg number.
 */
export function CoilLifeList({
  lots = [],
  jobCoils = [],
  colourLabel = (c) => c || '—',
  preset = null,
}) {
  const navigate = useNavigate();
  const [gauge, setGauge] = useState('all');
  const [colour, setColour] = useState('all');
  const [material, setMaterial] = useState('all');
  const [notCountedOnly, setNotCountedOnly] = useState(preset === 'notCounted');

  void jobCoils;

  const counted = useMemo(() => countedCoilNos(readCoilCountSession()), [lots]);

  const rows = useMemo(() => {
    return (lots || []).map((lot) => {
      const key = String(lot.coilNo || '').trim().toLowerCase();
      const stockLeftKg = liveCoilWeightKgForOverview(lot);
      const freeKg = freeCoilWeightKgForOverview(lot);
      const reservedKg = Math.max(0, Number(lot.qtyReserved) || 0);
      const materialName = lot.materialTypeName || lot.productID || '—';
      const colourName = colourLabel(lot.colour) || '—';
      const gaugeName = lot.gaugeLabel || lot.gauge || '—';
      const onHand = stockLeftKg > 0.05;
      return {
        lot,
        stockLeftKg,
        freeKg,
        reservedKg,
        materialName,
        colourName,
        gaugeName,
        location: lot.location || '—',
        statusText: statusLabel(lot.currentStatus, reservedKg > 0.0001),
        notCounted: onHand && !counted.has(key),
        isReserved: reservedKg > 0.0001,
      };
    });
  }, [lots, colourLabel, counted]);

  const gauges = unique(rows.map((r) => r.gaugeName));
  const colours = unique(rows.map((r) => r.colourName));
  const materials = unique(rows.map((r) => r.materialName));

  const visible = useMemo(() => {
    const filtered = rows.filter((r) => {
      if (gauge !== 'all' && r.gaugeName !== gauge) return false;
      if (colour !== 'all' && r.colourName !== colour) return false;
      if (material !== 'all' && r.materialName !== material) return false;
      if (notCountedOnly && !r.notCounted) return false;
      return true;
    });
    filtered.sort((a, b) => {
      if (b.stockLeftKg !== a.stockLeftKg) return b.stockLeftKg - a.stockLeftKg;
      return String(a.lot.coilNo).localeCompare(String(b.lot.coilNo), undefined, { numeric: true });
    });
    return filtered;
  }, [rows, gauge, colour, material, notCountedOnly]);

  const open = (coilNo, lot) =>
    navigate(`/operations/coils/${encodeURIComponent(coilNo)}`, {
      state: lot ? { coilLot: lot } : undefined,
    });

  return (
    <div className="space-y-2" data-screen="coil-list">
      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-ui-xs text-slate-700 leading-snug">
        <span className="font-bold text-slate-900">Stock left (kg)</span> = how much weight is still on that coil.
        If part is held for a job, you will see a small note under the number.
      </p>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          className={`${OPS_FILTER_CHIP} ${!notCountedOnly ? OPS_FILTER_CHIP_ON : OPS_FILTER_CHIP_OFF}`}
          onClick={() => setNotCountedOnly(false)}
        >
          All coils
        </button>
        <button
          type="button"
          className={`${OPS_FILTER_CHIP} ${notCountedOnly ? OPS_FILTER_CHIP_ON : OPS_FILTER_CHIP_OFF}`}
          onClick={() => setNotCountedOnly((v) => !v)}
        >
          Not counted yet
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <FilterSelect label="Gauge" value={gauge} onChange={setGauge} options={gauges} />
        <FilterSelect label="Colour" value={colour} onChange={setColour} options={colours} />
        <FilterSelect label="Material" value={material} onChange={setMaterial} options={materials} />
      </div>
      <p className="text-ui-xs text-slate-500">
        {visible.length} coil{visible.length === 1 ? '' : 's'} · tap a row to open it
      </p>

      <ul className="space-y-2 md:hidden">
        {visible.map((r) => (
          <li key={r.lot.coilNo}>
            <button
              type="button"
              onClick={() => open(r.lot.coilNo, r.lot)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-sm font-bold text-zarewa-teal">{r.lot.coilNo}</span>
                <span className="text-right shrink-0">
                  <span className="block text-sm font-black tabular-nums text-zarewa-teal">
                    {kg(r.stockLeftKg)} kg
                  </span>
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    stock left
                  </span>
                </span>
              </div>
              <p className="mt-1 text-ui-xs text-slate-600">
                {r.materialName} · {r.gaugeName} · {r.colourName}
              </p>
              {r.isReserved ? (
                <p className="mt-1 text-ui-xs font-semibold text-sky-800">
                  {kg(r.reservedKg)} kg held for a job · {kg(r.freeKg)} kg free to issue
                </p>
              ) : null}
              <p className="mt-1.5 text-ui-xs text-slate-500">
                {r.statusText} · {r.location}
              </p>
            </button>
          </li>
        ))}
      </ul>

      <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200/80 bg-white">
        <table className="min-w-[36rem] w-full text-left text-ui-xs">
          <thead className="bg-slate-100/95 text-slate-600">
            <tr>
              {['Coil no.', 'Material', 'Gauge', 'Colour', 'Stock left (kg)', 'Note', ''].map((h) => (
                <th key={h || 'open'} className="px-2 py-2 font-bold uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((r) => (
              <tr
                key={r.lot.coilNo}
                className="hover:bg-slate-50 cursor-pointer"
                onClick={() => open(r.lot.coilNo, r.lot)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    open(r.lot.coilNo, r.lot);
                  }
                }}
                tabIndex={0}
                role="link"
                aria-label={`Open coil ${r.lot.coilNo}`}
              >
                <td className="px-2 py-2 font-mono font-bold text-zarewa-teal whitespace-nowrap">{r.lot.coilNo}</td>
                <td className="px-2 py-2 max-w-[8rem] truncate">{r.materialName}</td>
                <td className="px-2 py-2 tabular-nums">{r.gaugeName}</td>
                <td className="px-2 py-2 max-w-[7rem] truncate">{r.colourName}</td>
                <td className="px-2 py-2 tabular-nums text-right font-bold text-zarewa-teal text-sm">
                  {kg(r.stockLeftKg)}
                </td>
                <td className="px-2 py-2 text-slate-600">
                  {r.isReserved
                    ? `${kg(r.reservedKg)} kg held for a job · ${kg(r.freeKg)} kg free`
                    : r.statusText}
                </td>
                <td className="px-2 py-2">
                  <button
                    type="button"
                    className="text-zarewa-teal"
                    onClick={(e) => {
                      e.stopPropagation();
                      open(r.lot.coilNo, r.lot);
                    }}
                    aria-label={`Open ${r.lot.coilNo}`}
                  >
                    <ChevronRight size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visible.length === 0 ? <p className="text-xs font-medium text-slate-400">No coils match these filters.</p> : null}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="block text-ui-xs font-semibold text-slate-600">
      <span className="mb-1 block">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-ui-xs font-semibold text-slate-800"
      >
        <option value="all">All</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}
