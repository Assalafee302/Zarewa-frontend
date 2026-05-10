import React from 'react';
import { ZAREWA_COMPANY_ACCOUNT_NAME, ZAREWA_LOGO_SRC } from '../../Data/companyQuotation.js';
import { listPriceFromFloorAndCommission, premiumProfilePriceFromBase } from '../../lib/publishedPrice.js';

function formatNgn(n) {
  return `₦${Math.round(Number(n) || 0).toLocaleString('en-NG')}`;
}

function fmtConv2(v) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  return Number(v).toFixed(2);
}

function suggestedNgn(used, costKg, oh, pr) {
  const u = Number(used);
  const ck = Number(costKg);
  const o = Number(oh) || 0;
  const p = Number(pr) || 0;
  if (!Number.isFinite(u) || u <= 0 || !Number.isFinite(ck) || ck < 0) return null;
  return Math.round(u * ck + o + p);
}

function effectiveUsed(row, rv, isStone) {
  if (isStone) return null;
  const u = row?.conversionUsedKgPerM;
  if (u != null && Number.isFinite(Number(u)) && Number(u) > 0) return Number(u);
  const ru = rv?.used;
  if (ru != null && Number.isFinite(Number(ru)) && Number(ru) > 0) return Number(ru);
  return null;
}

function listPriceFromRow(row) {
  return listPriceFromFloorAndCommission(row?.minimumPricePerMeterNgn, row?.commissionNgnPerM);
}

function isWorkbookDesignKey(dk) {
  const s = String(dk ?? '').trim();
  return s === '' || s.startsWith('wb-');
}

function workbookRowsForSheet(sheet) {
  return (sheet.rows || [])
    .filter((r) => isWorkbookDesignKey(r.designKey))
    .sort((a, b) => {
      const ga = String(a.gaugeMm || '');
      const gb = String(b.gaugeMm || '');
      if (ga !== gb) return ga.localeCompare(gb, undefined, { numeric: true });
      return String(a.designKey || '').localeCompare(String(b.designKey || ''));
    });
}

/** Label shown on customer price list (marketing name); falls back to gauge mm */
export function customerGaugeDisplayLabel(row) {
  const lab = String(row?.gaugeCustomerLabel ?? '').trim();
  if (lab) return lab;
  return String(row?.gaugeMm ?? '');
}

const SECTION_META = [
  { key: 'alu', title: 'Aluminium' },
  { key: 'aluzinc', title: 'Aluzinc (PPGI)' },
  { key: 'stone-coated', title: 'Stone-coated' },
];

/**
 * Internal workbook print: full conversion and cost build-up (all materials).
 * @param {{
 *   sheets: Array<Record<string, unknown>>;
 *   branchName: string;
 *   effectiveDateLabel: string;
 *   lookbackDays: number;
 *   accessories: Array<{ name?: string; unit?: string; defaultUnitPriceNgn?: number }>;
 *   ridgeAddOns: Array<{ girthMm?: number | string; materialFamily?: string; addOnNgn?: number }>;
 * }} props
 */
export function MaterialWorkbookOfficialPrintView({ sheets, branchName, effectiveDateLabel, lookbackDays, accessories, ridgeAddOns }) {
  const accRows = (accessories || []).filter((a) => a && String(a.name || '').trim());
  const ridgeRows = ridgeAddOns || [];

  return (
    <div className="text-slate-900 text-[11px] leading-snug print:text-black">
      <style>{`
        @media print {
          .workbook-print-root { padding: 12px 16px; }
          .workbook-print-table th, .workbook-print-table td { border-color: #64748b !important; }
        }
      `}</style>
      <div className="workbook-print-root max-w-[1000px] mx-auto">
        <div className="flex items-center gap-3 border-b border-slate-300 pb-3 mb-3">
          <img src={ZAREWA_LOGO_SRC} alt="" className="h-12 w-auto object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-[#134e4a]">{ZAREWA_COMPANY_ACCOUNT_NAME}</p>
            <h1 className="text-base font-black text-[#134e4a] mt-0.5">Material pricing workbook — internal</h1>
            <p className="text-[10px] text-slate-600 mt-1">
              <strong>Branch:</strong> {branchName} · <strong>As of:</strong> {effectiveDateLabel}
            </p>
          </div>
        </div>
        <p className="text-[10px] text-slate-600 mb-4">
          Documentation: Std / Ref / Hist / Used (kg/m), costs, suggested ₦/m, floor, commission, published list (floor + commission,
          rounded). Purchase/production hints use the last {lookbackDays} days. Sync to price list writes the <strong>published list</strong>{' '}
          ₦/m.
        </p>

        {SECTION_META.map(({ key, title }) => {
          const sheet = sheets.find((s) => s?.materialKey === key);
          if (!sheet?.ok) return null;
          const isStone = Boolean(sheet.isStoneCoatedWorkbook);
          const wbRows = workbookRowsForSheet(sheet);
          return (
            <section key={key} className="mb-6 print:mb-4">
              <h2 className="text-sm font-black text-[#0f766e] mb-2">{title}</h2>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="workbook-print-table min-w-[980px] w-full border-collapse text-left">
                  <thead className="bg-slate-100 text-[8px] font-black uppercase tracking-wide text-slate-700">
                    <tr>
                      <th className="border border-slate-300 px-2 py-1.5">Gauge (mm)</th>
                      <th className="border border-slate-300 px-2 py-1.5">Customer label</th>
                      <th className="border border-slate-300 px-2 py-1.5 text-right">Std</th>
                      <th className="border border-slate-300 px-2 py-1.5 text-right">Ref</th>
                      <th className="border border-slate-300 px-2 py-1.5 text-right">Hist</th>
                      <th className="border border-slate-300 px-2 py-1.5 text-right">Used</th>
                      <th className="border border-slate-300 px-2 py-1.5 text-right">₦/kg</th>
                      <th className="border border-slate-300 px-2 py-1.5 text-right">OH/m</th>
                      <th className="border border-slate-300 px-2 py-1.5 text-right">Profit/m</th>
                      <th className="border border-slate-300 px-2 py-1.5 text-right">Suggested</th>
                      <th className="border border-slate-300 px-2 py-1.5 text-right">Floor</th>
                      <th className="border border-slate-300 px-2 py-1.5 text-right">Comm/m</th>
                      <th className="border border-slate-300 px-2 py-1.5 text-right">List ₦/m</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wbRows.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="border border-slate-200 px-2 py-2 text-slate-500">
                          No workbook lines for this material.
                        </td>
                      </tr>
                    ) : (
                      wbRows.map((row) => {
                      const g = String(row.gaugeMm || '');
                      const rv = sheet.resolvedByGauge?.[g] || {};
                      const used = effectiveUsed(row, rv, isStone);
                      const ck = row?.costPerKgNgn != null ? Number(row.costPerKgNgn) : null;
                      const oh = row?.overheadNgnPerM != null ? Number(row.overheadNgnPerM) : 0;
                      const pr = row?.profitNgnPerM != null ? Number(row.profitNgnPerM) : 0;
                      let sug = null;
                      if (!isStone && used != null && ck != null && ck >= 0) {
                        sug = suggestedNgn(used, ck, oh, pr);
                      }
                      const minimumNgn = Math.round(Number(row?.minimumPricePerMeterNgn) || 0);
                      const displaySug =
                        sug != null && sug > 0 ? sug : isStone && minimumNgn > 0 ? minimumNgn : null;
                      const comm = Math.max(0, Number(row?.commissionNgnPerM) || 0);
                      const listP = listPriceFromRow(row);
                      return (
                        <tr key={g}>
                          <td className="border border-slate-200 px-2 py-1 font-bold whitespace-nowrap">{g} mm</td>
                          <td className="border border-slate-200 px-2 py-1 text-right font-mono tabular-nums">{fmtConv2(rv.std)}</td>
                          <td className="border border-slate-200 px-2 py-1 text-right font-mono tabular-nums">{fmtConv2(rv.ref)}</td>
                          <td className="border border-slate-200 px-2 py-1 text-right font-mono tabular-nums">{fmtConv2(rv.hist)}</td>
                          <td className="border border-slate-200 px-2 py-1 text-right font-mono tabular-nums">{fmtConv2(used)}</td>
                          <td className="border border-slate-200 px-2 py-1 text-right font-mono tabular-nums">
                            {!isStone && ck != null && Number.isFinite(ck) && ck >= 0 ? formatNgn(ck) : '—'}
                          </td>
                          <td className="border border-slate-200 px-2 py-1 text-right font-mono tabular-nums">{formatNgn(oh)}</td>
                          <td className="border border-slate-200 px-2 py-1 text-right font-mono tabular-nums">{formatNgn(pr)}</td>
                          <td className="border border-slate-200 px-2 py-1 text-right font-mono font-semibold text-[#134e4a] tabular-nums">
                            {displaySug != null && displaySug > 0 ? formatNgn(displaySug) : '—'}
                          </td>
                          <td className="border border-slate-200 px-2 py-1 text-right font-mono tabular-nums">
                            {minimumNgn > 0 ? formatNgn(minimumNgn) : '—'}
                          </td>
                          <td className="border border-slate-200 px-2 py-1 text-right font-mono tabular-nums">
                            {comm > 0 ? formatNgn(comm) : '—'}
                          </td>
                          <td className="border border-slate-200 px-2 py-1 text-right font-mono font-semibold tabular-nums">
                            {listP > 0 ? formatNgn(listP) : '—'}
                          </td>
                        </tr>
                      );
                    })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}

        <section className="mb-6">
          <h2 className="text-sm font-black text-[#0f766e] mb-2">Ridge / flashing add-ons (₦/m)</h2>
          <table className="workbook-print-table w-full border-collapse text-left max-w-2xl">
            <thead className="bg-slate-100 text-[8px] font-black uppercase text-slate-700">
              <tr>
                <th className="border border-slate-300 px-2 py-1.5">Girth mm</th>
                <th className="border border-slate-300 px-2 py-1.5">Material family</th>
                <th className="border border-slate-300 px-2 py-1.5 text-right">Add-on</th>
              </tr>
            </thead>
            <tbody>
              {ridgeRows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="border border-slate-200 px-2 py-1 text-slate-500">
                    No ridge add-ons configured.
                  </td>
                </tr>
              ) : (
                ridgeRows.map((r, i) => (
                  <tr key={i}>
                    <td className="border border-slate-200 px-2 py-1">{r.girthMm}</td>
                    <td className="border border-slate-200 px-2 py-1">{r.materialFamily || '—'}</td>
                    <td className="border border-slate-200 px-2 py-1 text-right font-mono tabular-nums">{formatNgn(r.addOnNgn)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="text-sm font-black text-[#0f766e] mb-2">Accessories (reference)</h2>
          <table className="workbook-print-table w-full border-collapse text-left max-w-2xl">
            <thead className="bg-slate-100 text-[8px] font-black uppercase text-slate-700">
              <tr>
                <th className="border border-slate-300 px-2 py-1.5">Item</th>
                <th className="border border-slate-300 px-2 py-1.5">Unit</th>
                <th className="border border-slate-300 px-2 py-1.5 text-right">Default ₦</th>
              </tr>
            </thead>
            <tbody>
              {accRows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="border border-slate-200 px-2 py-1 text-slate-500">
                    No accessories in master data.
                  </td>
                </tr>
              ) : (
                accRows.map((a, i) => {
                  const up = Math.round(Number(a.defaultUnitPriceNgn) || 0);
                  return (
                    <tr key={i}>
                      <td className="border border-slate-200 px-2 py-1">{a.name}</td>
                      <td className="border border-slate-200 px-2 py-1">{a.unit || '—'}</td>
                      <td className="border border-slate-200 px-2 py-1 text-right font-mono tabular-nums">
                        {up > 0 ? formatNgn(up) : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>

        <p className="mt-6 text-[9px] text-slate-500 print:mt-4">
          Zarewa — internal pricing reference. Customer-facing sheet: use Print (customer price list). Quotations below published minima may
          require MD approval where applicable.
        </p>
      </div>
    </div>
  );
}

/**
 * Customer price list: gauge × Longspan × Metcoppo/Steptiles only (published amounts). Rows need a positive list price.
 */
export function MaterialWorkbookCustomerPrintView({ sheets, branchName, effectiveDateLabel, accessories, ridgeAddOns }) {
  const ridgeRows = ridgeAddOns || [];
  const accRows = (accessories || []).filter((a) => {
    const up = Math.round(Number(a?.defaultUnitPriceNgn) || 0);
    return a && String(a.name || '').trim() && up > 0;
  });

  const coilCustomerRows = (sheet) => {
    const out = [];
    for (const row of workbookRowsForSheet(sheet)) {
      const listBase = listPriceFromRow(row);
      if (!listBase || listBase <= 0) continue;
      const premium = premiumProfilePriceFromBase(listBase);
      out.push({
        gaugeLabel: customerGaugeDisplayLabel(row),
        longspan: listBase,
        metcoppo: premium,
      });
    }
    return out;
  };

  return (
    <div className="text-slate-900 text-[12px] leading-snug print:text-black">
      <div className="max-w-[920px] mx-auto">
        <div className="flex items-start gap-4 border-b-2 border-[#134e4a] pb-4 mb-4">
          <img src={ZAREWA_LOGO_SRC} alt="" className="h-16 w-auto object-contain shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <div className="flex-1">
            <p className="text-[11px] font-bold text-[#134e4a] tracking-wide">{ZAREWA_COMPANY_ACCOUNT_NAME}</p>
            <h1 className="text-xl font-black text-[#134e4a] mt-1">Price list — roofing sheet</h1>
            <p className="text-[11px] text-slate-600 mt-2">
              <strong>Effective:</strong> {effectiveDateLabel}
              {branchName ? (
                <>
                  {' '}
                  · <strong>Branch:</strong> {branchName}
                </>
              ) : null}
            </p>
            <p className="text-[10px] text-slate-500 mt-2">
              Rates in Naira per running metre. <strong>Longspan</strong> = published list rate (floor + commission, rounded).{' '}
              <strong>Metcoppo / Steptiles</strong> = Longspan + 3.5% with published rounding (premium profile).
            </p>
          </div>
        </div>

        {SECTION_META.map(({ key, title }) => {
          const sheet = sheets.find((s) => s?.materialKey === key);
          if (!sheet?.ok) return null;
          const rows = coilCustomerRows(sheet);
          if (rows.length === 0) return null;
          return (
            <section key={key} className="mb-8 print:mb-6">
              <h2 className="text-sm font-black text-[#0f766e] mb-2">{title}</h2>
              <table className="w-full border-collapse text-left">
                <thead className="bg-slate-100 text-[9px] font-black uppercase tracking-wide text-slate-700">
                  <tr>
                    <th className="border border-slate-400 px-3 py-2">Gauge / label</th>
                    <th className="border border-slate-400 px-3 py-2 text-right">Longspan ₦/m</th>
                    <th className="border border-slate-400 px-3 py-2 text-right">Metcoppo / Steptiles ₦/m</th>
                  </tr>
                </thead>
                <tbody className="font-mono tabular-nums text-[12px]">
                  {rows.map((r, idx) => (
                    <tr key={`${r.gaugeLabel}-${idx}`}>
                      <td className="border border-slate-300 px-3 py-2 font-sans font-bold">{r.gaugeLabel}</td>
                      <td className="border border-slate-300 px-3 py-2 text-right">{formatNgn(r.longspan)}</td>
                      <td className="border border-slate-300 px-3 py-2 text-right">{formatNgn(r.metcoppo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}

        {ridgeRows.length > 0 ? (
          <section className="mb-8">
            <h2 className="text-sm font-black text-[#0f766e] mb-2">Ridge / flashing add-ons (₦/m)</h2>
            <table className="w-full border-collapse text-left max-w-xl">
              <thead className="bg-slate-100 text-[9px] font-black uppercase text-slate-700">
                <tr>
                  <th className="border border-slate-400 px-3 py-2">Girth mm</th>
                  <th className="border border-slate-400 px-3 py-2">Material</th>
                  <th className="border border-slate-400 px-3 py-2 text-right">₦/m</th>
                </tr>
              </thead>
              <tbody className="text-[12px]">
                {ridgeRows.map((r, i) => (
                  <tr key={i}>
                    <td className="border border-slate-300 px-3 py-2">{r.girthMm}</td>
                    <td className="border border-slate-300 px-3 py-2">{r.materialFamily || '—'}</td>
                    <td className="border border-slate-300 px-3 py-2 text-right font-mono tabular-nums">{formatNgn(r.addOnNgn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        {accRows.length > 0 ? (
          <section className="mb-6">
            <h2 className="text-sm font-black text-[#0f766e] mb-2">Accessories</h2>
            <table className="w-full border-collapse text-left max-w-xl">
              <thead className="bg-slate-100 text-[9px] font-black uppercase text-slate-700">
                <tr>
                  <th className="border border-slate-400 px-3 py-2">Item</th>
                  <th className="border border-slate-400 px-3 py-2">Unit</th>
                  <th className="border border-slate-400 px-3 py-2 text-right">₦</th>
                </tr>
              </thead>
              <tbody className="text-[12px]">
                {accRows.map((a, i) => (
                  <tr key={i}>
                    <td className="border border-slate-300 px-3 py-2">{a.name}</td>
                    <td className="border border-slate-300 px-3 py-2">{a.unit || '—'}</td>
                    <td className="border border-slate-300 px-3 py-2 text-right font-mono tabular-nums">
                      {formatNgn(a.defaultUnitPriceNgn)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        <p className="text-[10px] text-slate-500 mt-6">
          Prices subject to change. Confirm availability before quoting. Below-list sales may require Managing Director approval.
        </p>
      </div>
    </div>
  );
}
