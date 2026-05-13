import React from 'react';
import { ZAREWA_COMPANY_ACCOUNT_NAME, ZAREWA_LOGO_SRC, ZAREWA_QUOTATION_BRANDING } from '../../Data/companyQuotation.js';
import {
  listPriceFromFloorAndCommission,
  premiumProfilePriceFromBase,
  roundPublishedPrice,
} from '../../lib/publishedPrice.js';

function formatNgn(n) {
  return `₦${Math.round(Number(n) || 0).toLocaleString('en-NG')}`;
}

/** Published customer list add-on; optional override over internal add-on. */
function customerRidgeListAddOnNgn(r) {
  if (r?.listAddOnNgn != null && r.listAddOnNgn !== '' && Number.isFinite(Number(r.listAddOnNgn))) {
    return Math.max(0, Math.round(Number(r.listAddOnNgn)));
  }
  return Math.max(0, Math.round(Number(r?.addOnNgn) || 0));
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
  return s === '' || s.startsWith('wb-') || s.startsWith('wb_');
}

/** Legacy letterhead column titles (match printed price list). */
const PROFILE_COL_LONGSPAN = 'Industrial 6 & Metral 1,000';
const PROFILE_COL_PREMIUM = 'Metcoppo & Steptiles';
const RIDGE_GIRTH_HEADERS_MM = [150, 300, 400, 600];

function ridgeMatchedPolicyRowPrint(ridgeAddOns, materialKeyValue, girthMm) {
  const ridges = ridgeAddOns || [];
  const g = Number(girthMm);
  if (!Number.isFinite(g)) return null;
  const rows = ridges.filter((r) => Math.abs(Number(r?.girthMm) - g) < 0.001);
  if (!rows.length) return null;
  const mk = String(materialKeyValue || '').trim().toLowerCase();
  const exact = rows.find((r) => String(r?.materialFamily || '').trim().toLowerCase() === mk);
  if (exact) return exact;
  const familyHint = rows.find((r) => {
    const mf = String(r?.materialFamily || '').trim().toLowerCase();
    return (mk === 'alu' && mf.includes('alu')) || (mk === 'aluzinc' && (mf.includes('zinc') || mf.includes('ppgi')));
  });
  if (familyHint) return familyHint;
  return rows.find((r) => !String(r?.materialFamily || '').trim()) || null;
}

/** Customer-facing ridge ₦/m for one gauge × girth (split + published list add-on). */
function ridgeCustomerGridCellNgn(listBaseNgn, materialKey, girthMm, ridgeAddOns) {
  const base = Math.max(0, Math.round(Number(listBaseNgn) || 0));
  if (!base) return 0;
  const divisor = 1200 / Number(girthMm || 0);
  if (!Number.isFinite(divisor) || divisor <= 0) return 0;
  const r = ridgeMatchedPolicyRowPrint(ridgeAddOns, materialKey, girthMm);
  const add = r ? customerRidgeListAddOnNgn(r) : 0;
  return roundPublishedPrice(base / divisor + add);
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
// eslint-disable-next-line react-refresh/only-export-components
export function customerGaugeDisplayLabel(row) {
  const lab = String(row?.gaugeCustomerLabel ?? '').trim();
  if (lab) return lab;
  return String(row?.gaugeMm ?? '');
}

/** One row per gauge mm: max published list + display label from row with that max. */
function aggregatePublishedCoilByGauge(sheet) {
  if (!sheet?.ok) return [];
  const by = new Map();
  for (const row of workbookRowsForSheet(sheet)) {
    const listBase = listPriceFromRow(row);
    if (!listBase || listBase <= 0) continue;
    const g = String(row.gaugeMm || '').trim();
    if (!g) continue;
    const cur = by.get(g);
    const label = customerGaugeDisplayLabel(row);
    if (!cur || listBase > cur.listBase) {
      by.set(g, { gaugeMm: g, gaugeLabel: label, listBase });
    } else if (listBase === cur.listBase) {
      const prefer = label.length > String(cur.gaugeLabel || '').length ? label : cur.gaugeLabel;
      by.set(g, { ...cur, gaugeLabel: prefer });
    }
  }
  return Array.from(by.values()).sort((a, b) =>
    String(a.gaugeMm).localeCompare(String(b.gaugeMm), undefined, { numeric: true })
  );
}

const SECTION_META = [
  { key: 'alu', title: 'Aluminium' },
  { key: 'aluzinc', title: 'Aluzinc (PPGI)' },
  { key: 'stone-coated', title: 'Stone-coated' },
];

const COIL_SECTION_KEYS = ['alu', 'aluzinc'];

/**
 * Internal workbook print: full conversion and cost build-up (all materials).
 * @param {{
 *   sheets: Array<Record<string, unknown>>;
 *   branchName: string;
 *   effectiveDateLabel: string;
 *   lookbackDays: number;
 *   accessories: Array<{ name?: string; unit?: string; defaultUnitPriceNgn?: number }>;
 *   ridgeAddOns: Array<{ girthMm?: number | string; materialFamily?: string; addOnNgn?: number; listAddOnNgn?: number | null }>;
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
                            {displaySug != null && displaySug > 0 ? formatNgn(roundPublishedPrice(displaySug)) : '—'}
                          </td>
                          <td className="border border-slate-200 px-2 py-1 text-right font-mono tabular-nums">
                            {minimumNgn > 0 ? formatNgn(roundPublishedPrice(minimumNgn)) : '—'}
                          </td>
                          <td className="border border-slate-200 px-2 py-1 text-right font-mono tabular-nums">
                            {comm > 0 ? formatNgn(roundPublishedPrice(comm)) : '—'}
                          </td>
                          <td className="border border-slate-200 px-2 py-1 text-right font-mono font-semibold tabular-nums">
                            {listP > 0 ? formatNgn(roundPublishedPrice(listP)) : '—'}
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
                    <td className="border border-slate-200 px-2 py-1 text-right font-mono tabular-nums">
                      {formatNgn(roundPublishedPrice(r.addOnNgn))}
                    </td>
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
 * Customer price list — classic letterhead + Profiles / Ridges & flashing / Accessories (matches legacy printed layout).
 */
export function MaterialWorkbookCustomerPrintView({ sheets, branchName, effectiveDateLabel, accessories, ridgeAddOns }) {
  const branding = ZAREWA_QUOTATION_BRANDING;
  const hq = branding.branches?.[0];
  const factoryBranches = (branding.branches || []).slice(1);

  const accRows = (accessories || []).filter((a) => {
    const up = Math.round(Number(a?.defaultUnitPriceNgn) || 0);
    return a && String(a.name || '').trim() && up > 0;
  });

  const aluSheet = sheets.find((s) => s?.materialKey === 'alu');
  const aluzSheet = sheets.find((s) => s?.materialKey === 'aluzinc');
  const stoneSheet = sheets.find((s) => s?.materialKey === 'stone-coated');

  const aluProfiles = aggregatePublishedCoilByGauge(aluSheet || {});
  const aluzProfiles = aggregatePublishedCoilByGauge(aluzSheet || {});
  const stoneProfiles = aggregatePublishedCoilByGauge(stoneSheet || {});

  const hasCoilProfiles = aluProfiles.length > 0 || aluzProfiles.length > 0;
  const hasRidgeGrid = aluProfiles.length > 0 || aluzProfiles.length > 0;

  const renderProfileGroupRows = (materialKey, rows) =>
    rows.map((r) => {
      const prem = premiumProfilePriceFromBase(r.listBase);
      return (
        <tr key={`${materialKey}-${r.gaugeMm}`}>
          <td className="border border-black px-2 py-1 text-left font-semibold print:px-1 print:py-0.5">{r.gaugeLabel}</td>
          <td className="border border-black px-2 py-1 text-right font-mono tabular-nums print:px-1 print:py-0.5">
            {formatNgn(roundPublishedPrice(r.listBase))}
          </td>
          <td className="border border-black px-2 py-1 text-right font-mono tabular-nums print:px-1 print:py-0.5">
            {formatNgn(roundPublishedPrice(prem))}
          </td>
        </tr>
      );
    });

  const renderRidgeGroupRows = (materialKey, rows) =>
    rows.map((r) => (
      <tr key={`ridge-${materialKey}-${r.gaugeMm}`}>
        <td className="border border-black px-2 py-1 font-semibold print:px-1 print:py-0.5">{r.gaugeLabel}</td>
        {RIDGE_GIRTH_HEADERS_MM.map((gth) => {
          const v = ridgeCustomerGridCellNgn(r.listBase, materialKey, gth, ridgeAddOns);
          return (
            <td key={gth} className="border border-black px-2 py-1 text-right font-mono tabular-nums print:px-1 print:py-0.5">
              {v > 0 ? formatNgn(roundPublishedPrice(v)) : '—'}
            </td>
          );
        })}
      </tr>
    ));

  return (
    <div className="customer-price-list-print h-full text-black text-[11px] leading-snug print:text-[7.5pt] print:leading-[1.18] print:text-black">
      <style>{`
        .customer-a4-sheet {
          box-sizing: border-box;
          width: 100%;
          min-height: 297mm;
          padding: 12mm 10mm 10mm;
          margin: 0 auto;
        }
        @media print {
          .customer-a4-sheet {
            min-height: 0 !important;
            padding: 2.5mm 3.5mm 3mm !important;
          }
        }
      `}</style>
      <div className="customer-a4-sheet">
        <h1 className="cpl-title text-center text-[18px] font-black uppercase tracking-tight leading-tight w-full mb-2 text-black print:text-[13pt] print:mb-1.5 print:leading-tight">
          {ZAREWA_COMPANY_ACCOUNT_NAME}
        </h1>
        <div className="flex gap-3 border-b-2 border-black pb-2 mb-0.5 print:gap-2 print:pb-1 print:mb-0">
          <img
            src={ZAREWA_LOGO_SRC}
            alt=""
            className="cpl-header-logo h-20 w-20 shrink-0 object-contain print:h-14 print:w-14"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="flex-1 min-w-0">
            {hq ? (
              <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-900 print:mt-0.5 print:text-[7.5pt]">
                {hq.title}
              </p>
            ) : null}
            {(hq?.lines || []).map((line) => (
              <p key={line} className="text-[10px] leading-snug text-slate-900 print:text-[7pt] print:leading-tight">
                {line}
              </p>
            ))}
            <p className="mt-1 text-[10px] leading-snug text-slate-900 print:mt-0.5 print:text-[7pt] print:leading-tight">
              {branding.poBox}
              {branding.email ? ` · Email: ${branding.email}` : ''}
              {branding.website ? ` · ${branding.website}` : ''}
            </p>
          </div>
        </div>

        <h2 className="text-center text-[12px] font-black uppercase mt-3 mb-0 tracking-wide print:mt-2 print:text-[9pt]">
          Price list effective from {effectiveDateLabel}
        </h2>
        <p className="text-center text-[10px] font-bold uppercase tracking-wide text-slate-900 print:text-[7pt]">
          All rates are in Naira per running metre
        </p>
        {branchName ? (
          <p className="text-center text-[9px] text-slate-700 mb-2 print:mb-1 print:text-[6.5pt]">Branch: {branchName}</p>
        ) : (
          <div className="mb-2 print:mb-1" aria-hidden />
        )}

        <h3 className="text-center text-[11px] font-black uppercase tracking-[0.2em] mb-0.5 print:text-[8pt]">Profiles</h3>
        <table className="cpl-table w-full border-collapse text-[11px] mb-0.5 print:mb-0 print:text-[7.25pt]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-black px-2 py-1 text-left text-[9px] font-black uppercase print:px-1 print:py-0.5 print:text-[6.5pt]">
                Material gauge
              </th>
              <th className="border border-black px-2 py-1 text-right text-[8px] font-black uppercase leading-tight max-w-[140px] print:px-1 print:py-0.5 print:text-[6pt]">
                {PROFILE_COL_LONGSPAN}
              </th>
              <th className="border border-black px-2 py-1 text-right text-[8px] font-black uppercase leading-tight max-w-[120px] print:px-1 print:py-0.5 print:text-[6pt]">
                {PROFILE_COL_PREMIUM}
              </th>
            </tr>
          </thead>
          <tbody>
            {!hasCoilProfiles ? (
              <tr>
                <td colSpan={3} className="border border-black px-2 py-3 text-center text-slate-600">
                  No published coil prices yet. Sync workbook lines to the price list for this branch, then print again.
                </td>
              </tr>
            ) : (
              <>
                {aluProfiles.length > 0 ? (
                  <>
                    <tr>
                      <td
                        colSpan={3}
                        className="border border-black bg-slate-200 px-2 py-1 text-[10px] font-black uppercase tracking-wide print:px-1 print:py-0.5 print:text-[7pt]"
                      >
                        Aluminium coloured
                      </td>
                    </tr>
                    {renderProfileGroupRows('alu', aluProfiles)}
                  </>
                ) : null}
                {aluzProfiles.length > 0 ? (
                  <>
                    <tr>
                      <td
                        colSpan={3}
                        className="border border-black bg-slate-200 px-2 py-1 text-[10px] font-black uppercase tracking-wide print:px-1 print:py-0.5 print:text-[7pt]"
                      >
                        Aluzinc coloured
                      </td>
                    </tr>
                    {renderProfileGroupRows('aluzinc', aluzProfiles)}
                  </>
                ) : null}
              </>
            )}
          </tbody>
        </table>

        {stoneProfiles.length > 0 ? (
          <section className="mb-3 print:mb-1">
            <h3 className="text-center text-[11px] font-black uppercase tracking-[0.2em] mb-0.5 print:text-[8pt] print:mb-0">
              Stone-coated
            </h3>
            <table className="cpl-table w-full border-collapse text-[11px] print:text-[7.25pt]">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-black px-2 py-1 text-left text-[9px] font-black uppercase print:px-1 print:py-0.5 print:text-[6.5pt]">
                    Material gauge
                  </th>
                  <th className="border border-black px-2 py-1 text-right text-[9px] font-black uppercase print:px-1 print:py-0.5 print:text-[6.5pt]">
                    ₦/m
                  </th>
                </tr>
              </thead>
              <tbody>
                {stoneProfiles.map((r) => (
                  <tr key={`stone-${r.gaugeMm}`}>
                    <td className="border border-black px-2 py-1 font-semibold print:px-1 print:py-0.5">{r.gaugeLabel}</td>
                    <td className="border border-black px-2 py-1 text-right font-mono tabular-nums print:px-1 print:py-0.5">
                      {formatNgn(roundPublishedPrice(r.listBase))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        <h3 className="text-center text-[11px] font-black uppercase tracking-[0.2em] mb-0.5 mt-0.5 print:text-[8pt] print:mt-0 print:mb-0">
          Ridges &amp; flashing
        </h3>
        <table className="cpl-table w-full border-collapse text-[11px] mb-3 print:mb-1 print:text-[7.25pt]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-black px-2 py-1 text-left text-[9px] font-black uppercase print:px-1 print:py-0.5 print:text-[6.5pt]">
                Materials gauge
              </th>
              {RIDGE_GIRTH_HEADERS_MM.map((gth) => (
                <th
                  key={gth}
                  className="border border-black px-2 py-1 text-right text-[9px] font-black uppercase print:px-1 print:py-0.5 print:text-[6.5pt]"
                >
                  {gth}mm
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!hasRidgeGrid ? (
              <tr>
                <td colSpan={5} className="border border-black px-2 py-3 text-center text-slate-600">
                  Add published coil prices above to show ridge / flashing rates. Configure ridge add-ons under pricing policy if needed.
                </td>
              </tr>
            ) : (
              <>
                {aluProfiles.length > 0 ? (
                  <>
                    <tr>
                      <td
                        colSpan={5}
                        className="border border-black bg-slate-200 px-2 py-1 text-[10px] font-black uppercase tracking-wide print:px-1 print:py-0.5 print:text-[7pt]"
                      >
                        Aluminium coloured
                      </td>
                    </tr>
                    {renderRidgeGroupRows('alu', aluProfiles)}
                  </>
                ) : null}
                {aluzProfiles.length > 0 ? (
                  <>
                    <tr>
                      <td
                        colSpan={5}
                        className="border border-black bg-slate-200 px-2 py-1 text-[10px] font-black uppercase tracking-wide print:px-1 print:py-0.5 print:text-[7pt]"
                      >
                        Aluzinc
                      </td>
                    </tr>
                    {renderRidgeGroupRows('aluzinc', aluzProfiles)}
                  </>
                ) : null}
              </>
            )}
          </tbody>
        </table>

        {accRows.length > 0 ? (
          <section className="mb-2 print:mb-1">
            <h3 className="text-center text-[11px] font-black uppercase tracking-[0.2em] mb-0.5 print:text-[8pt] print:mb-0">
              Accessories
            </h3>
            <table className="cpl-table w-full border-collapse text-[11px] print:text-[7pt]">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-black px-2 py-1 text-left text-[9px] font-black uppercase w-10 print:px-1 print:py-0.5 print:text-[6.5pt]">
                    S/No
                  </th>
                  <th className="border border-black px-2 py-1 text-left text-[9px] font-black uppercase print:px-1 print:py-0.5 print:text-[6.5pt]">
                    Item
                  </th>
                  <th className="border border-black px-2 py-1 text-left text-[9px] font-black uppercase print:px-1 print:py-0.5 print:text-[6.5pt]">
                    Quantity
                  </th>
                  <th className="border border-black px-2 py-1 text-right text-[9px] font-black uppercase print:px-1 print:py-0.5 print:text-[6.5pt]">
                    Price in Naira
                  </th>
                </tr>
              </thead>
              <tbody>
                {accRows.map((a, i) => (
                  <tr key={i}>
                    <td className="border border-black px-2 py-1 text-center font-mono tabular-nums print:px-1 print:py-0.5">
                      {i + 1}
                    </td>
                    <td className="border border-black px-2 py-1 print:px-1 print:py-0.5">{a.name}</td>
                    <td className="border border-black px-2 py-1 print:px-1 print:py-0.5">{a.unit || '—'}</td>
                    <td className="border border-black px-2 py-1 text-right font-mono tabular-nums print:px-1 print:py-0.5">
                      {formatNgn(a.defaultUnitPriceNgn)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        <section className="mt-2 text-[10px] text-slate-900 leading-relaxed print:mt-1 print:text-[6.5pt] print:leading-snug">
          <p className="font-black uppercase mb-0.5 print:mb-0 print:text-[7pt]">Notes</p>
          <ol className="list-decimal pl-5 space-y-1 print:space-y-0 print:pl-4">
            <li>Prices are subject to change without prior notice.</li>
            <li>Confirm material availability before confirming orders.</li>
            <li>The company is not liable for loss or damage to goods in transit when transport is arranged by the customer.</li>
            <li>Below-list sales may require Managing Director approval where applicable.</li>
          </ol>
        </section>

        {factoryBranches.length > 0 ? (
          <div className="mt-3 pt-2 border-t-2 border-black flex flex-col sm:flex-row gap-4 text-[9px] leading-snug text-slate-900 print:mt-2 print:pt-1 print:gap-2 print:text-[6.5pt] print:leading-tight">
            {factoryBranches.map((b) => (
              <div key={b.title} className="flex-1 min-w-0">
                <p className="font-black uppercase mb-0.5 print:mb-0 print:text-[6.5pt]">{b.title}</p>
                {(b.lines || []).map((ln) => (
                  <p key={ln}>{ln}</p>
                ))}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
