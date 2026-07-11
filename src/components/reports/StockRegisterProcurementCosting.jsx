import React, { useEffect, useMemo, useRef, useState } from 'react';
import { formatNgn } from '../../Data/mockData';

function priceMissing(netQty, priceVal) {
  return Number(netQty) > 0 && !(Number(priceVal) > 0);
}

function GaugePriceTable({ title, rows, prices, onPriceChange, readOnly }) {
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
            const missing = priceMissing(r.netClosingKg, prices[r.gaugeLabel]);
            return (
              <tr key={r.gaugeLabel} className={`border-b border-slate-100 ${missing ? 'bg-amber-50/80' : ''}`}>
                <td className="p-2 font-medium">{r.gaugeLabel}</td>
                <td className="p-2 text-right tabular-nums">{r.grossClosingKg?.toLocaleString()}</td>
                <td className="p-2 text-right tabular-nums font-bold text-zarewa-teal">
                  {r.netClosingKg?.toLocaleString()}
                </td>
                <td className="p-2">
                  {readOnly ? (
                    <span className="block text-right tabular-nums">{uc > 0 ? uc.toLocaleString() : '—'}</span>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className={`z-input w-24 py-1 text-right ml-auto ${missing ? 'border-amber-400 ring-1 ring-amber-300' : ''}`}
                      placeholder="₦/kg"
                      value={prices[r.gaugeLabel] ?? ''}
                      onChange={(e) => onPriceChange(r.gaugeLabel, e.target.value)}
                      aria-invalid={missing}
                    />
                  )}
                  {missing && !readOnly ? (
                    <p className="text-[10px] font-semibold text-amber-800 text-right mt-0.5">Price required</p>
                  ) : null}
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

/** Returns missing price labels for validation (empty = ok). */
export function getProcurementPricingGaps(procurementSummary, pricing, accessoryBalance = 0) {
  const summary = procurementSummary || {};
  const p = pricing || {};
  const gaps = [];
  for (const r of summary.aluminium || []) {
    if (priceMissing(r.netClosingKg, p.aluminiumByGauge?.[r.gaugeLabel])) {
      gaps.push(`Aluminium ${r.gaugeLabel}`);
    }
  }
  for (const r of summary.aluzinc || []) {
    if (priceMissing(r.netClosingKg, p.aluzincByGauge?.[r.gaugeLabel])) {
      gaps.push(`Aluzinc ${r.gaugeLabel}`);
    }
  }
  const stoneM = Number(summary.stoneCoated?.totalRemainingM) || 0;
  if (priceMissing(stoneM, p.stoneUnitPriceNgnPerM)) gaps.push('Stone-coated ₦/m');
  if (priceMissing(accessoryBalance, p.accessoryUnitPriceNgn)) gaps.push('Accessories ₦/unit');
  return gaps;
}

/** Procurement: net kg by gauge + unit prices → closing stock value. */
export function StockRegisterProcurementCosting({
  procurementSummary,
  initialPricing,
  onChange,
  accessoryBalance = 0,
  readOnly = false,
}) {
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

  const pricingPayload = useMemo(
    () => ({
      aluminiumByGauge: aluPrices,
      aluzincByGauge: aluzPrices,
      stoneUnitPriceNgnPerM: stonePrice ? Number(stonePrice) : null,
      accessoryUnitPriceNgn: accPrice ? Number(accPrice) : null,
    }),
    [aluPrices, aluzPrices, stonePrice, accPrice]
  );

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    onChangeRef.current?.(pricingPayload);
  }, [pricingPayload]);

  const stoneM = Number(summary.stoneCoated?.totalRemainingM) || 0;
  const stoneVal = stonePrice && stoneM > 0 ? Math.round(stoneM * Number(stonePrice)) : 0;
  const accBal = Number(accessoryBalance) || 0;
  const accVal = accPrice && accBal > 0 ? Math.round(accBal * Number(accPrice)) : 0;

  let coilTotal = 0;
  for (const r of summary.aluminium || []) {
    const uc = Number(aluPrices[r.gaugeLabel]) || 0;
    coilTotal += uc > 0 ? Math.round(r.netClosingKg * uc) : 0;
  }
  for (const r of summary.aluzinc || []) {
    const uc = Number(aluzPrices[r.gaugeLabel]) || 0;
    coilTotal += uc > 0 ? Math.round(r.netClosingKg * uc) : 0;
  }

  const grandTotal = coilTotal + stoneVal + accVal;
  const stoneMissing = priceMissing(stoneM, stonePrice);
  const accMissing = priceMissing(accBal, accPrice);

  return (
    <div className="space-y-3 rounded-xl border border-teal-200/80 bg-teal-50/30 p-3 sm:p-4">
      <p className="text-xs text-slate-700 leading-relaxed">
        {readOnly
          ? 'Saved purchase costs (read-only). Capture & lock freezes this month.'
          : (
            <>
              Enter purchase cost per kg (by gauge). Closing value uses <strong>net kg</strong> after manager count
              alignment. Every gauge with net kg &gt; 0 needs a price.
            </>
          )}
      </p>
      <GaugePriceTable
        title="Aluminium — net kg by gauge"
        rows={summary.aluminium}
        prices={aluPrices}
        readOnly={readOnly}
        onPriceChange={(g, v) => setAluPrices((p) => ({ ...p, [g]: v === '' ? '' : Number(v) }))}
      />
      <GaugePriceTable
        title="Aluzinc — net kg by gauge"
        rows={summary.aluzinc}
        prices={aluzPrices}
        readOnly={readOnly}
        onPriceChange={(g, v) => setAluzPrices((p) => ({ ...p, [g]: v === '' ? '' : Number(v) }))}
      />
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Stone-coated ₦/m</span>
          <span className="text-xs text-slate-500 ml-1">({stoneM.toLocaleString()} m)</span>
          {readOnly ? (
            <p className="mt-1 text-sm tabular-nums font-semibold">{stonePrice ? Number(stonePrice).toLocaleString() : '—'}</p>
          ) : (
            <input
              type="number"
              min="0"
              className={`z-input w-full mt-1 ${stoneMissing ? 'border-amber-400 ring-1 ring-amber-300' : ''}`}
              value={stonePrice}
              onChange={(e) => setStonePrice(e.target.value)}
            />
          )}
          {stoneMissing && !readOnly ? (
            <p className="text-[10px] font-semibold text-amber-800 mt-0.5">Price required</p>
          ) : null}
          <p className="text-xs text-slate-600 mt-1">Value: {formatNgn(stoneVal)}</p>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Accessories ₦/unit (avg)</span>
          <span className="text-xs text-slate-500 ml-1">({accBal.toLocaleString()} units)</span>
          {readOnly ? (
            <p className="mt-1 text-sm tabular-nums font-semibold">{accPrice ? Number(accPrice).toLocaleString() : '—'}</p>
          ) : (
            <input
              type="number"
              min="0"
              className={`z-input w-full mt-1 ${accMissing ? 'border-amber-400 ring-1 ring-amber-300' : ''}`}
              value={accPrice}
              onChange={(e) => setAccPrice(e.target.value)}
            />
          )}
          {accMissing && !readOnly ? (
            <p className="text-[10px] font-semibold text-amber-800 mt-0.5">Price required</p>
          ) : null}
          <p className="text-xs text-slate-600 mt-1">Value: {formatNgn(accVal)}</p>
        </label>
      </div>
      <p className="text-sm font-black text-zarewa-teal pt-2 border-t border-teal-200">
        Total closing preview: {formatNgn(grandTotal)}
        <span className="font-semibold text-slate-600">
          {' '}
          (coils {formatNgn(coilTotal)}
          {stoneVal > 0 ? ` · stone ${formatNgn(stoneVal)}` : ''}
          {accVal > 0 ? ` · acc ${formatNgn(accVal)}` : ''})
        </span>
      </p>
    </div>
  );
}
