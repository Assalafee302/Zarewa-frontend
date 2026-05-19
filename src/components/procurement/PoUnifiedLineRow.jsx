import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { PO_LINE_TYPE_LABELS, PO_LINE_TYPES } from '../../lib/poLineTypes.js';

const labelClass =
  'text-[8px] font-semibold text-slate-400 uppercase tracking-wide ml-0.5 mb-0.5 block';
const lineInputClass =
  'w-full bg-white border border-slate-200 rounded-md py-0.5 px-1.5 min-h-[1.625rem] h-[1.625rem] text-[10px] font-semibold text-[#134e4a] outline-none focus:ring-2 focus:ring-[#134e4a]/15 leading-none';

const MATERIAL_OPTS = [
  { value: 'aluminium', label: 'Aluminium' },
  { value: 'aluzinc', label: 'Aluzinc' },
];

export default function PoUnifiedLineRow({
  row,
  idx,
  lineTotal,
  colourOptions,
  gaugeOptions,
  stoneProfiles,
  accessoryProducts,
  onChange,
  onAdd,
  onRemove,
}) {
  const lt = row.lineType;

  return (
    <div className="rounded-lg border border-slate-200/90 bg-white p-2 shadow-sm space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
        <div className="sm:col-span-3">
          <label className={labelClass}>Line type</label>
          <select
            value={lt}
            onChange={(e) => onChange(idx, { lineType: e.target.value })}
            className={lineInputClass}
          >
            {PO_LINE_TYPES.map((t) => (
              <option key={t} value={t}>
                {PO_LINE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-9 flex justify-end items-end gap-1">
          <p className="text-[10px] font-bold text-[#134e4a] tabular-nums mr-auto">{formatNgn(lineTotal)}</p>
          <button
            type="button"
            onClick={onAdd}
            className="p-1 rounded-md border border-[#134e4a]/25 bg-teal-50 text-[#134e4a]"
            title="Add line"
          >
            <Plus size={14} />
          </button>
          <button
            type="button"
            onClick={() => onRemove(idx)}
            className="p-1 rounded-md border border-slate-200 text-slate-400 hover:text-rose-600"
            title="Remove"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {(lt === 'coil_kg' || lt === 'coil_meter') && (
        <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-end">
          <div className="sm:col-span-2">
            <label className={labelClass}>Material</label>
            <select
              value={row.materialKind}
              onChange={(e) => onChange(idx, { materialKind: e.target.value })}
              className={lineInputClass}
            >
              <option value="">—</option>
              {MATERIAL_OPTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Colour</label>
            <select value={row.color} onChange={(e) => onChange(idx, { color: e.target.value })} className={lineInputClass}>
              <option value="">—</option>
              {colourOptions.map((c) => (
                <option key={c.id || c.name} value={c.name}>
                  {c.label || c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Gauge</label>
            <select value={row.gauge} onChange={(e) => onChange(idx, { gauge: e.target.value })} className={lineInputClass}>
              <option value="">—</option>
              {gaugeOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          {lt === 'coil_kg' ? (
            <div className="sm:col-span-2">
              <label className={labelClass}>Kg</label>
              <input
                type="number"
                min="0"
                value={row.kg}
                onChange={(e) => onChange(idx, { kg: e.target.value })}
                className={`${lineInputClass} tabular-nums`}
              />
            </div>
          ) : (
            <div className="sm:col-span-2">
              <label className={labelClass}>Metres</label>
              <input
                type="number"
                min="0"
                value={row.meters}
                onChange={(e) => onChange(idx, { meters: e.target.value })}
                className={`${lineInputClass} tabular-nums`}
              />
            </div>
          )}
          {lt === 'coil_kg' && (
            <div className="sm:col-span-2">
              <label className={labelClass}>Metres (opt)</label>
              <input
                type="number"
                min="0"
                value={row.meters}
                onChange={(e) => onChange(idx, { meters: e.target.value })}
                className={`${lineInputClass} tabular-nums`}
              />
            </div>
          )}
          <div className="sm:col-span-2">
            <label className={labelClass}>{lt === 'coil_meter' ? '₦/m' : '₦/kg'}</label>
            <input
              type="number"
              min="0"
              value={row.pricePerKg}
              onChange={(e) => onChange(idx, { pricePerKg: e.target.value })}
              className={`${lineInputClass} tabular-nums`}
            />
          </div>
        </div>
      )}
      {lt === 'coil_meter' ? (
        <p className="text-[9px] font-semibold text-amber-800 leading-snug">
          Roll / metre order — weighed on receipt (enter kg at GRN). You can combine kg and metre lines on one PO.
        </p>
      ) : null}

      {lt === 'stone_meter' && (
        <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-end">
          <div className="sm:col-span-3">
            <label className={labelClass}>Design</label>
            <select
              value={row.designLabel}
              onChange={(e) => onChange(idx, { designLabel: e.target.value })}
              className={lineInputClass}
            >
              <option value="">—</option>
              {stoneProfiles.map((p) => (
                <option key={p.id || p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Colour</label>
            <select
              value={row.colourLabel}
              onChange={(e) => onChange(idx, { colourLabel: e.target.value })}
              className={lineInputClass}
            >
              <option value="">—</option>
              {colourOptions.map((c) => (
                <option key={c.id || c.name} value={c.name}>
                  {c.label || c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Gauge</label>
            <select
              value={row.gaugeLabel}
              onChange={(e) => onChange(idx, { gaugeLabel: e.target.value })}
              className={lineInputClass}
            >
              <option value="">—</option>
              {gaugeOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Metres</label>
            <input
              type="number"
              min="0"
              value={row.metres}
              onChange={(e) => onChange(idx, { metres: e.target.value })}
              className={`${lineInputClass} tabular-nums`}
            />
          </div>
          <div className="sm:col-span-3">
            <label className={labelClass}>₦/m</label>
            <input
              type="number"
              min="0"
              value={row.pricePerM}
              onChange={(e) => onChange(idx, { pricePerM: e.target.value })}
              className={`${lineInputClass} tabular-nums`}
            />
          </div>
        </div>
      )}

      {lt === 'stone_flatsheet' && (
        <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-end">
          <div className="sm:col-span-3">
            <label className={labelClass}>Colour</label>
            <select
              value={row.fsColour}
              onChange={(e) => onChange(idx, { fsColour: e.target.value })}
              className={lineInputClass}
            >
              <option value="">—</option>
              {colourOptions.map((c) => (
                <option key={c.id || c.name} value={c.name}>
                  {c.label || c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Length</label>
            <select
              value={row.fsLengthM}
              onChange={(e) => onChange(idx, { fsLengthM: e.target.value })}
              className={lineInputClass}
            >
              <option value="1.4">1.4 m</option>
              <option value="1.5">1.5 m</option>
              <option value="2">2 m</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Sheets</label>
            <input
              type="number"
              min="0"
              value={row.sheets}
              onChange={(e) => onChange(idx, { sheets: e.target.value })}
              className={`${lineInputClass} tabular-nums`}
            />
          </div>
          <div className="sm:col-span-3">
            <label className={labelClass}>₦/sheet</label>
            <input
              type="number"
              min="0"
              value={row.pricePerSheet}
              onChange={(e) => onChange(idx, { pricePerSheet: e.target.value })}
              className={`${lineInputClass} tabular-nums`}
            />
          </div>
        </div>
      )}

      {lt === 'accessory' && (
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
          <div className="sm:col-span-6">
            <label className={labelClass}>Accessory</label>
            <select
              value={row.productID}
              onChange={(e) => onChange(idx, { productID: e.target.value })}
              className={lineInputClass}
            >
              <option value="">—</option>
              {accessoryProducts.map((p) => (
                <option key={p.productID} value={p.productID}>
                  {p.productID} — {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Qty</label>
            <input
              type="number"
              min="0"
              value={row.qty}
              onChange={(e) => onChange(idx, { qty: e.target.value })}
              className={`${lineInputClass} tabular-nums`}
            />
          </div>
          <div className="sm:col-span-4">
            <label className={labelClass}>₦/unit</label>
            <input
              type="number"
              min="0"
              value={row.unitPrice}
              onChange={(e) => onChange(idx, { unitPrice: e.target.value })}
              className={`${lineInputClass} tabular-nums`}
            />
          </div>
        </div>
      )}

      {lt === 'coil_meter' && (
        <p className="text-[9px] text-slate-500">Weighed and coil-numbered at receipt in Operations.</p>
      )}
    </div>
  );
}





