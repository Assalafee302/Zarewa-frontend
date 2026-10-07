import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { buildCoilLife, formatSignedKg } from '../../lib/coilExpectedLife';
import { countedCoilNos, readCoilCountSession } from '../../lib/coilCountSession';
import { CoilVarianceBadge } from './CoilVarianceBadge';
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

/**
 * Coil register: variance columns, filters, largest |variance| first.
 * Phone uses cards; wider screens use a scrolling table.
 */
export function CoilLifeList({
  lots = [],
  jobCoils = [],
  colourLabel = (c) => c || '—',
  preset = null,
}) {
  const navigate = useNavigate();
  const [status, setStatus] = useState(preset === 'HIGH' || preset === 'LOW' || preset === 'OK' ? preset : 'all');
  const [gauge, setGauge] = useState('all');
  const [colour, setColour] = useState('all');
  const [material, setMaterial] = useState('all');
  const [watchOnly, setWatchOnly] = useState(preset === 'watch' || preset === 'off');
  const [notCountedOnly, setNotCountedOnly] = useState(preset === 'notCounted');

  const counted = useMemo(() => countedCoilNos(readCoilCountSession()), [lots]);

  const jobsByCoil = useMemo(() => {
    const map = new Map();
    for (const row of jobCoils || []) {
      const key = String(row.coilNo || '').trim().toLowerCase();
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    }
    return map;
  }, [jobCoils]);

  const rows = useMemo(() => {
    return (lots || []).map((lot) => {
      const key = String(lot.coilNo || '').trim().toLowerCase();
      const life = buildCoilLife(lot, jobsByCoil.get(key) || []);
      const materialName = lot.materialTypeName || lot.productID || '—';
      const colourName = colourLabel(lot.colour) || '—';
      const gaugeName = lot.gaugeLabel || lot.gauge || '—';
      const onHand = life.erpKg > 0.05;
      const countedThis = counted.has(key);
      return {
        lot,
        life,
        materialName,
        colourName,
        gaugeName,
        location: lot.location || '—',
        bookStatus: lot.currentStatus || '—',
        notCounted: onHand && !countedThis,
      };
    });
  }, [lots, jobsByCoil, colourLabel, counted]);

  const gauges = unique(rows.map((r) => r.gaugeName));
  const colours = unique(rows.map((r) => r.colourName));
  const materials = unique(rows.map((r) => r.materialName));

  const visible = useMemo(() => {
    const filtered = rows.filter((r) => {
      if (status !== 'all' && r.life.status !== status) return false;
      if (gauge !== 'all' && r.gaugeName !== gauge) return false;
      if (colour !== 'all' && r.colourName !== colour) return false;
      if (material !== 'all' && r.materialName !== material) return false;
      if (watchOnly && !r.life.onWatchList) return false;
      if (notCountedOnly && !r.notCounted) return false;
      return true;
    });
    filtered.sort((a, b) => {
      const av = a.life.varianceKg == null ? -1 : Math.abs(a.life.varianceKg);
      const bv = b.life.varianceKg == null ? -1 : Math.abs(b.life.varianceKg);
      if (bv !== av) return bv - av;
      return String(a.lot.coilNo).localeCompare(String(b.lot.coilNo), undefined, { numeric: true });
    });
    return filtered;
  }, [rows, status, gauge, colour, material, watchOnly, notCountedOnly]);

  const open = (coilNo) => navigate(`/operations/coils/${encodeURIComponent(coilNo)}`);

  return (
    <div className="space-y-2" data-screen="coil-list">
      <div className="flex flex-wrap gap-1.5">
        {['all', 'OK', 'LOW', 'HIGH'].map((id) => (
          <button
            key={id}
            type="button"
            className={`${OPS_FILTER_CHIP} ${status === id ? OPS_FILTER_CHIP_ON : OPS_FILTER_CHIP_OFF}`}
            onClick={() => setStatus(id)}
          >
            {id === 'all' ? 'All' : id}
          </button>
        ))}
        <button
          type="button"
          className={`${OPS_FILTER_CHIP} ${watchOnly ? OPS_FILTER_CHIP_ON : OPS_FILTER_CHIP_OFF}`}
          onClick={() => setWatchOnly((v) => !v)}
        >
          Watch list
        </button>
        <button
          type="button"
          className={`${OPS_FILTER_CHIP} ${notCountedOnly ? OPS_FILTER_CHIP_ON : OPS_FILTER_CHIP_OFF}`}
          onClick={() => setNotCountedOnly((v) => !v)}
        >
          Not counted in last count
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <FilterSelect label="Gauge" value={gauge} onChange={setGauge} options={gauges} />
        <FilterSelect label="Colour" value={colour} onChange={setColour} options={colours} />
        <FilterSelect label="Material" value={material} onChange={setMaterial} options={materials} />
      </div>
      <p className="text-ui-xs text-slate-500">
        {visible.length} coil{visible.length === 1 ? '' : 's'} · largest difference first
      </p>

      <ul className="space-y-2 md:hidden">
        {visible.map((r) => (
          <li key={r.lot.coilNo}>
            <button
              type="button"
              onClick={() => open(r.lot.coilNo)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-sm font-bold text-zarewa-teal">{r.lot.coilNo}</span>
                <CoilVarianceBadge status={r.life.status} varianceLabel={formatSignedKg(r.life.varianceKg)} />
              </div>
              <p className="mt-1 text-ui-xs text-slate-600">
                {r.materialName} · {r.gaugeName} · {r.colourName}
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-ui-xs tabular-nums text-slate-700">
                <Stat k="Received" v={kg(r.life.receivedKg)} />
                <Stat k="Metres" v={kg(r.life.metres)} />
                <Stat k="Expected" v={kg(r.life.expectedKg)} />
                <Stat k="ERP" v={kg(r.life.erpKg)} />
              </dl>
              <p className="mt-1.5 text-ui-xs text-slate-500">
                {r.bookStatus} · {r.location}
              </p>
            </button>
          </li>
        ))}
      </ul>

      <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200/80 bg-white">
        <table className="min-w-[68rem] w-full text-left text-ui-xs">
          <thead className="bg-slate-100/95 text-slate-600">
            <tr>
              {[
                'Coil no.',
                'Material',
                'Gauge',
                'Colour',
                'Received kg',
                'Metres run',
                'Expected kg',
                'ERP kg',
                'Variance',
                'Status',
                'Location',
                '',
              ].map((h) => (
                <th key={h || 'open'} className="px-2 py-2 font-bold uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((r) => (
              <tr key={r.lot.coilNo} className="hover:bg-slate-50">
                <td className="px-2 py-2 font-mono font-bold text-zarewa-teal whitespace-nowrap">{r.lot.coilNo}</td>
                <td className="px-2 py-2 max-w-[8rem] truncate">{r.materialName}</td>
                <td className="px-2 py-2 tabular-nums">{r.gaugeName}</td>
                <td className="px-2 py-2 max-w-[7rem] truncate">{r.colourName}</td>
                <td className="px-2 py-2 tabular-nums text-right">{kg(r.life.receivedKg)}</td>
                <td className="px-2 py-2 tabular-nums text-right">{kg(r.life.metres)}</td>
                <td className="px-2 py-2 tabular-nums text-right">{kg(r.life.expectedKg)}</td>
                <td className="px-2 py-2 tabular-nums text-right">{kg(r.life.erpKg)}</td>
                <td className="px-2 py-2">
                  <CoilVarianceBadge status={r.life.status} varianceLabel={formatSignedKg(r.life.varianceKg)} />
                </td>
                <td className="px-2 py-2">{r.bookStatus}</td>
                <td className="px-2 py-2">{r.location}</td>
                <td className="px-2 py-2">
                  <button type="button" className="text-zarewa-teal" onClick={() => open(r.lot.coilNo)} aria-label={`Open ${r.lot.coilNo}`}>
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

function Stat({ k, v }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-slate-500">{k}</dt>
      <dd className="font-semibold">{v}</dd>
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
