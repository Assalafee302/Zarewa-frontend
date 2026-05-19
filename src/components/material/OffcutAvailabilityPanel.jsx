import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useInventory } from '../../context/InventoryContext';

/** Read-only offcut guidance for sales at quotation time (production decides actual use). */
export default function OffcutAvailabilityPanel({ gaugeLabel, colour, minMeters = 0 }) {
  const { materialPoolSummary } = useInventory();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const g = String(gaugeLabel || '').trim();
    const c = String(colour || '').trim();
    if (!g || !c) {
      setRows([]);
      return;
    }
    const q = new URLSearchParams({ gauge: g, colour: c, minMeters: String(minMeters || 0), status: 'posted' });
    void apiFetch(`/api/material-incidents?${q}`).then(({ ok, data }) => {
      if (ok && Array.isArray(data?.rows)) setRows(data.rows.filter((r) => (r.metersAvailable ?? 0) > 0));
      else {
        const pool = materialPoolSummary?.incidents ?? [];
        setRows(
          pool.filter(
            (i) =>
              (!g || i.gaugeLabel === g) &&
              (!c || i.colour === c) &&
              (Number(i.metersAvailable) || 0) >= (Number(minMeters) || 0)
          )
        );
      }
    });
  }, [gaugeLabel, colour, minMeters, materialPoolSummary]);

  if (!gaugeLabel || !colour) return null;
  if (!rows.length) {
    return (
      <p className="text-[10px] text-slate-500 mt-2">
        No matching offcut pool stock for {gaugeLabel} / {colour}.
      </p>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-[#134e4a] mb-2">Offcut availability (guidance)</p>
      <ul className="space-y-1 text-[10px] text-slate-700">
        {rows.slice(0, 8).map((r) => (
          <li key={r.id} className="flex justify-between gap-2">
            <span className="font-mono font-semibold">{r.id}</span>
            <span className="tabular-nums">{Number(r.metersAvailable).toFixed(2)} m</span>
          </li>
        ))}
      </ul>
      <p className="text-[9px] text-slate-500 mt-2">Production will confirm offcut use when the job runs.</p>
    </div>
  );
}
