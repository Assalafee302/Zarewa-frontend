import React, { useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { INCIDENT_TYPES } from '../../lib/materialIncidentConstants';

function typeLabel(id) {
  return INCIDENT_TYPES.find((t) => t.id === id)?.label?.replace(/ \(.*\)/, '') || id || '';
}

/**
 * Pick posted material incidents for production offcut supply (shown on production only, not quotation).
 */
export default function OffcutIncidentPicker({ gaugeLabel, colour, value = [], onChange }) {
  const { materialIncidents, materialPoolSummary } = useInventory();
  const available = useMemo(() => {
    const fromPool = materialPoolSummary?.incidents ?? [];
    const fromList = (materialIncidents || []).filter(
      (i) => i.status === 'posted' && (Number(i.metersAvailable) || 0) > 0.001
    );
    const map = new Map();
    for (const i of [...fromPool, ...fromList]) {
      if (!i?.id) continue;
      if (gaugeLabel && i.gaugeLabel && i.gaugeLabel !== gaugeLabel) continue;
      if (colour && i.colour && i.colour !== colour) continue;
      map.set(i.id, i);
    }
    return [...map.values()].sort((a, b) => String(b.dateISO).localeCompare(String(a.dateISO)));
  }, [materialIncidents, materialPoolSummary, gaugeLabel, colour]);

  const selected = Array.isArray(value) ? value : [];

  const toggle = (id, metersAvailable) => {
    const exists = selected.find((s) => s.materialIncidentId === id);
    if (exists) {
      onChange(selected.filter((s) => s.materialIncidentId !== id));
      return;
    }
    const m = window.prompt(`Metres to issue from ${id}? (max ${Number(metersAvailable).toFixed(2)})`, String(metersAvailable));
    const num = Number(String(m || '').replace(/,/g, ''));
    if (!Number.isFinite(num) || num <= 0) return;
    onChange([...selected, { materialIncidentId: id, meters: num }]);
  };

  if (!available.length) {
    return (
      <p className="text-[9px] text-slate-500">
        No posted offcut incidents (MEX) match this gauge/colour. Record coil damage first — after approval the metres
        appear here for production deduction.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-[9px] font-bold uppercase text-slate-400">Reference incident ID when completing production</p>
      <ul className="space-y-1 max-h-40 overflow-y-auto">
        {available.map((inc) => {
          const sel = selected.find((s) => s.materialIncidentId === inc.id);
          return (
            <li key={inc.id} className="flex items-center justify-between gap-2 text-[10px] rounded-lg border border-slate-100 bg-white px-2 py-1.5">
              <button
                type="button"
                className={`text-left min-w-0 ${sel ? 'font-bold text-[#134e4a]' : 'text-slate-700'}`}
                onClick={() => toggle(inc.id, inc.metersAvailable)}
              >
                <span className="font-mono block">{inc.id}</span>
                <span className="text-[9px] text-slate-500">
                  {typeLabel(inc.incidentType)} · {Number(inc.metersAvailable).toFixed(2)} m avail
                </span>
              </button>
              {sel ? <span className="font-bold tabular-nums shrink-0">{sel.meters} m</span> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
