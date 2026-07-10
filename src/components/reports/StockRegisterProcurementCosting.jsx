import React, { useEffect, useState } from 'react';
import { formatNgn } from '../../Data/mockData';

function GaugePriceTable({ title, rows, prices, onPriceChange }) {
  if (!rows?.length) return null;
  return (
    <div className="mb-4">
      <p className="text-ui-xs font-black uppercase tracking-wide text-zarewa-teal mb-2">{title}</p>
      <table className="w-full border-collapse border border-slate-200 text-xs bg-white rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-slate-50">
            <th className="text-left p-2 border-b border-slate-200">Gauge</th>
            <th className="text-right p-2 border-b border-slate-200">Gross kg</th>
            <th className="text-right p-2 border-b border-slate-200">Net kg</th>
            <th className="text-right p-2 border-b border-slate-200">₦/kg</th>
            <th className="text-right p-2 border-b border-slate-200">Value ₦</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const uc = Number(prices[r.gaugeLabel]) || 0;
            const value = uc > 0 ? Math.round((Number(r.netClosingKg) || 0) * uc) : 0;
            return (
              <tr key={r.gaugeLabel} className="border-b border-slate-100">
                <td className="p-2 font-medium">{r.gaugeLabel}</td>
                <td className="p-2 text-right tabular-nums">{r.grossClosingKg?.toLocaleString()}</td>
                <td className="p-2 text-right tabular-nums font-bold text-zarewa-teal">
                  {r.netClosingKg?.toLocaleString()}
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    className="z-input w-24 py-1 text-right ml-auto"
                    placeholder="₦/kg"
                    value={prices[r.gaugeLabel] ?? ''}
                    onChange={(e) => onPriceChange(r.gaugeLabel, e.target.value)}
                  />
                </td>
                <td className="p-2 text-right tabular-nums font-semibold">{formatNgn(value)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Procurement: net kg by gauge + unit prices → closing stock value. */
export function StockRegisterProcurementCosting({ procurementSummary, initialPricing, onChange }) {
  const summary = procurementSummary || {};
  const [aluPrices, setAluPrices] = useState({});
  const [aluzPrices, setAluzPrices] = useState({});
  const [stonePrice, setStonePrice] = useState('');
  const [accPrice, setAccPrice] = useState('');

  useEffect(() => {
    const p = initialPricing || {};
    setAluPrices(p.aluminiumByGauge || {});
    setAluzPrices(p.aluzincByGauge || {});
    setStonePrice(p.stoneUnitPriceNgnPerM != null ? String(p.stoneUnitPriceNgnPerM) : '');
    setAccPrice(p.accessoryUnitPriceNgn != null ? String(p.accessoryUnitPriceNgn) : '');
  }, [initialPricing]);

  useEffect(() => {
    onChange?.({
      aluminiumByGauge: aluPrices,
      aluzincByGauge: aluzPrices,
      stoneUnitPriceNgnPerM: stonePrice ? Number(stonePrice) : null,
      accessoryUnitPriceNgn: accPrice ? Number(accPrice) : null,
    });
  }, [aluPrices, aluzPrices, stonePrice, accPrice, onChange]);

  const stoneM = Number(summary.stoneCoated?.totalRemainingM) || 0;
  const stoneVal =
    stonePrice && stoneM > 0 ? Math.round(stoneM * Number(stonePrice)) : 0;

  let coilTotal = 0;
  for (const r of summary.aluminium || []) {
    const uc = Number(aluPrices[r.gaugeLabel]) || 0;
    coilTotal += uc > 0 ? Math.round(r.netClosingKg * uc) : 0;
  }
  for (const r of summary.aluzinc || []) {
    const uc = Number(aluzPrices[r.gaugeLabel]) || 0;
    coilTotal += uc > 0 ? Math.round(r.netClosingKg * uc) : 0;
  }

  return (
    <div className="space-y-3 rounded-xl border border-teal-200/80 bg-teal-50/30 p-3 sm:p-4">
      <p className="text-xs text-slate-700 leading-relaxed">
        Enter purchase cost per kg (by gauge). Closing value uses <strong>net kg</strong> after manager count
        alignment.
      </p>
      <GaugePriceTable
        title="Aluminium — net kg by gauge"
        rows={summary.aluminium}
        prices={aluPrices}
        onPriceChange={(g, v) => setAluPrices((p) => ({ ...p, [g]: v === '' ? '' : Number(v) }))}
      />
      <GaugePriceTable
        title="Aluzinc — net kg by gauge"
        rows={summary.aluzinc}
        prices={aluzPrices}
        onPriceChange={(g, v) => setAluzPrices((p) => ({ ...p, [g]: v === '' ? '' : Number(v) }))}
      />
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Stone-coated ₦/m</span>
          <span className="text-xs text-slate-500 ml-1">({stoneM.toLocaleString()} m)</span>
          <input
            type="number"
            className="z-input w-full mt-1"
            value={stonePrice}
            onChange={(e) => setStonePrice(e.target.value)}
          />
          <p className="text-xs text-slate-600 mt-1">Value: {formatNgn(stoneVal)}</p>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Accessories ₦/unit (avg)</span>
          <input
            type="number"
            className="z-input w-full mt-1"
            value={accPrice}
            onChange={(e) => setAccPrice(e.target.value)}
          />
        </label>
      </div>
      <p className="text-sm font-black text-zarewa-teal pt-2 border-t border-teal-200">
        Coil closing value (preview): {formatNgn(coilTotal)}
        {stoneVal > 0 ? ` · Stone: ${formatNgn(stoneVal)}` : ''}
      </p>
    </div>
  );
}
