import React, { useEffect, useMemo, useState } from 'react';

function numOrEmpty(v) {
  if (v === '' || v == null) return '';
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : '';
}

/**
 * Branch manager physical count alignment — edit closing qty before procurement.
 */
export function StockRegisterBmAdjustEditor({ register, initialAdjustments, onChange }) {
  const [coilLines, setCoilLines] = useState([]);
  const [stoneLines, setStoneLines] = useState([]);
  const [accessoryLines, setAccessoryLines] = useState([]);

  const seedFromRegister = useMemo(() => {
    const coils = [];
    for (const family of ['aluminium', 'aluzinc']) {
      for (const g of register?.coilSections?.[family]?.groups || []) {
        for (const r of g.rows || []) {
          if (r.closingBlank || r.closingKg == null) continue;
          coils.push({
            coilNo: r.coilNo,
            family,
            gaugeLabel: g.gaugeLabel,
            colourAbbrev: r.colourAbbrev,
            systemClosingKg: r.closingKg,
            closingKg: r.closingKg,
            note: '',
          });
        }
      }
    }
    const stone = [];
    for (const g of register?.stoneCoated?.groups || []) {
      for (const r of g.rows || []) {
        stone.push({
          productID: r.productID,
          colourAbbrev: r.colourAbbrev,
          systemRemainingM: r.remainingM,
          remainingM: r.remainingM,
        });
      }
    }
    const acc = (register?.accessories?.rows || []).map((r) => ({
      typeKey: r.typeKey,
      unit: r.unit,
      typeLabel: r.typeLabel,
      systemBalance: r.balance,
      balance: r.balance,
    }));
    return { coils, stone, acc };
  }, [register]);

  useEffect(() => {
    const adj = initialAdjustments || {};
    const coilMap = new Map((adj.coilLines || []).map((l) => [l.coilNo, l]));
    setCoilLines(
      seedFromRegister.coils.map((c) => {
        const a = coilMap.get(c.coilNo);
        return a
          ? { ...c, closingKg: a.closingKg ?? c.closingKg, note: a.note || '' }
          : c;
      })
    );
    const stoneMap = new Map((adj.stoneLines || []).map((l) => [l.productID, l]));
    setStoneLines(
      seedFromRegister.stone.map((s) => {
        const a = stoneMap.get(s.productID);
        return a ? { ...s, remainingM: a.remainingM ?? s.remainingM } : s;
      })
    );
    const accMap = new Map((adj.accessoryLines || []).map((l) => [`${l.typeKey}|${l.unit}`, l]));
    setAccessoryLines(
      seedFromRegister.acc.map((a) => {
        const x = accMap.get(`${a.typeKey}|${a.unit}`);
        return x ? { ...a, balance: x.balance ?? a.balance } : a;
      })
    );
  }, [register, initialAdjustments, seedFromRegister]);

  useEffect(() => {
    onChange?.({
      coilLines: coilLines.map((c) => ({
        coilNo: c.coilNo,
        closingKg: Number(c.closingKg),
        note: c.note || '',
      })),
      stoneLines: stoneLines.map((s) => ({
        productID: s.productID,
        remainingM: Number(s.remainingM),
      })),
      accessoryLines: accessoryLines.map((a) => ({
        typeKey: a.typeKey,
        unit: a.unit,
        balance: Number(a.balance),
      })),
    });
  }, [coilLines, stoneLines, accessoryLines, onChange]);

  if (!register) return null;

  return (
    <div className="space-y-4 rounded-xl border border-amber-200/80 bg-amber-50/40 p-3 sm:p-4">
      <p className="text-xs font-semibold text-amber-950 leading-relaxed">
        Align physical count: change <strong>closing kg / remain m / balance</strong> where the floor count differs
        from system. Procurement will cost stock using your adjusted figures.
      </p>

      {coilLines.length ? (
        <div>
          <p className="text-ui-xs font-black uppercase tracking-wide text-slate-600 mb-2">Coil closing (kg)</p>
          <div className="max-h-48 overflow-y-auto custom-scrollbar border border-slate-200 rounded-lg bg-white">
            <table className="w-full text-ui-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="text-left p-1.5">Coil</th>
                  <th className="text-left p-1.5">Gauge</th>
                  <th className="text-right p-1.5">System</th>
                  <th className="text-right p-1.5">Counted</th>
                  <th className="text-left p-1.5">Note</th>
                </tr>
              </thead>
              <tbody>
                {coilLines.map((c, i) => (
                  <tr key={c.coilNo} className="border-t border-slate-100">
                    <td className="p-1 font-mono">{c.coilNo}</td>
                    <td className="p-1">{c.gaugeLabel}</td>
                    <td className="p-1 text-right tabular-nums text-slate-500">{c.systemClosingKg}</td>
                    <td className="p-1">
                      <input
                        type="number"
                        className="z-input w-20 py-0.5 text-right ml-auto"
                        value={numOrEmpty(c.closingKg)}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCoilLines((prev) =>
                            prev.map((row, j) =>
                              j === i ? { ...row, closingKg: v === '' ? '' : Number(v) } : row
                            )
                          );
                        }}
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="text"
                        className="z-input w-full py-0.5 min-w-[4rem]"
                        value={c.note}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCoilLines((prev) =>
                            prev.map((row, j) => (j === i ? { ...row, note: v } : row))
                          );
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {stoneLines.length ? (
        <div>
          <p className="text-ui-xs font-black uppercase tracking-wide text-slate-600 mb-2">Stone-coated (m)</p>
          <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg bg-white">
            <table className="w-full text-ui-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-1.5">Colour</th>
                  <th className="text-right p-1.5">System</th>
                  <th className="text-right p-1.5">Counted</th>
                </tr>
              </thead>
              <tbody>
                {stoneLines.map((s, i) => (
                  <tr key={s.productID} className="border-t border-slate-100">
                    <td className="p-1">{s.colourAbbrev}</td>
                    <td className="p-1 text-right tabular-nums text-slate-500">{s.systemRemainingM}</td>
                    <td className="p-1">
                      <input
                        type="number"
                        className="z-input w-20 py-0.5 text-right ml-auto"
                        value={numOrEmpty(s.remainingM)}
                        onChange={(e) => {
                          const v = e.target.value;
                          setStoneLines((prev) =>
                            prev.map((row, j) =>
                              j === i ? { ...row, remainingM: v === '' ? '' : Number(v) } : row
                            )
                          );
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {accessoryLines.length ? (
        <div>
          <p className="text-ui-xs font-black uppercase tracking-wide text-slate-600 mb-2">Accessories</p>
          <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg bg-white">
            <table className="w-full text-ui-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-1.5">Type</th>
                  <th className="text-right p-1.5">System</th>
                  <th className="text-right p-1.5">Counted</th>
                </tr>
              </thead>
              <tbody>
                {accessoryLines.map((a, i) => (
                  <tr key={`${a.typeKey}-${a.unit}`} className="border-t border-slate-100">
                    <td className="p-1">{a.typeLabel}</td>
                    <td className="p-1 text-right tabular-nums text-slate-500">{a.systemBalance}</td>
                    <td className="p-1">
                      <input
                        type="number"
                        className="z-input w-20 py-0.5 text-right ml-auto"
                        value={numOrEmpty(a.balance)}
                        onChange={(e) => {
                          const v = e.target.value;
                          setAccessoryLines((prev) =>
                            prev.map((row, j) =>
                              j === i ? { ...row, balance: v === '' ? '' : Number(v) } : row
                            )
                          );
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
