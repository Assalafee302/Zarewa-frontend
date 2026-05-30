import React from 'react';
import { formatNgn } from '../../Data/mockData';

function fmtNum(v, digits = 2) {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function priceSourceNote(source, lookbackDays) {
  const s = String(source || '').toLowerCase();
  const days = lookbackDays ?? 31;
  if (s.includes('purchase_') || s === 'purchase_avg') return `${days}d purchase avg ₦/kg`;
  if (s === 'coil_lots_all') return 'All received coil lots avg ₦/kg';
  if (s === 'receipt_avg') return `${days}d GRN receipt avg`;
  if (s === 'none') return 'No price on file';
  return source || '—';
}

function fmtPrice(v, suffix = '') {
  if (v == null || v === '' || Number(v) <= 0) return '—';
  return `${formatNgn(v)}${suffix}`;
}

const TH = 'px-1.5 py-1 text-left text-[8px] font-bold uppercase text-slate-600 border border-slate-300 print:text-[7pt]';
const TD = 'px-1.5 py-0.5 text-[10px] text-slate-800 border border-slate-300 print:text-[8.5pt]';
const TDR = `${TD} text-right tabular-nums`;

function CoilTable({ section }) {
  if (!section?.groups?.length) {
    return <p className="text-xs text-slate-500 italic">No lines this period.</p>;
  }
  return section.groups.map((g) => (
    <div key={g.gaugeLabel} className="mb-4 break-inside-avoid">
      <p className="text-xs font-bold text-slate-800 mb-1">{g.gaugeLabel}</p>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-50">
            <th className={TH}>Colour</th>
            <th className={TH}>Coil</th>
            <th className={`${TH} text-right`}>Open kg</th>
            <th className={`${TH} text-right`}>Rcvd kg</th>
            <th className={`${TH} text-right`}>Used kg</th>
            <th className={`${TH} text-right`}>Close kg</th>
            <th className={TH}>Remark</th>
          </tr>
        </thead>
        <tbody>
          {g.rows.map((r) => (
            <tr key={r.coilNo}>
              <td className={TD}>{r.colourAbbrev}</td>
              <td className={`${TD} font-mono`}>{r.coilNoDisplay || r.coilNo}</td>
              <td className={TDR}>{fmtNum(r.openingKg)}</td>
              <td className={TDR}>{fmtNum(r.receivedKg)}</td>
              <td className={TDR}>{fmtNum(r.usedKg)}</td>
              <td className={TDR}>{r.closingBlank ? '—' : fmtNum(r.closingKg)}</td>
              <td className={`${TD} text-slate-600`}>
                {[r.remarkSuggested, r.stockForm === 'roll' ? 'ROLL' : ''].filter(Boolean).join(' · ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ));
}

/** Shared register body for screen + print preview. */
export function StockRegisterPrintContent({ register, branchId, branchLabel }) {
  if (!register) return null;
  const bid = branchLabel || branchId || register.branchId || '—';

  return (
    <div className="space-y-5 text-slate-800">
      <section className="break-inside-avoid">
        <h2 className="text-sm font-black uppercase tracking-wide text-[#134e4a] mb-2">A. Aluminium coils (gross kg)</h2>
        <CoilTable section={register.coilSections?.aluminium} />
      </section>

      <section className="break-inside-avoid">
        <h2 className="text-sm font-black uppercase tracking-wide text-[#134e4a] mb-2">B. Aluzinc coils (gross kg)</h2>
        <CoilTable section={register.coilSections?.aluzinc} />
      </section>

      {register.stoneCoated?.groups?.length ? (
        <section>
          <h2 className="text-sm font-black uppercase tracking-wide text-[#134e4a] mb-2">C. Stone-coated (metres)</h2>
          {register.stoneCoated.groups.map((g) => (
            <div key={g.gaugeLabel} className="mb-3 break-inside-avoid">
              <p className="text-xs font-bold mb-1">{g.gaugeLabel}</p>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className={TH}>Colour</th>
                    <th className={`${TH} text-right`}>Open</th>
                    <th className={`${TH} text-right`}>Rcvd</th>
                    <th className={`${TH} text-right`}>Total</th>
                    <th className={`${TH} text-right`}>Used</th>
                    <th className={`${TH} text-right`}>Remain</th>
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((r) => (
                    <tr key={r.productID}>
                      <td className={TD}>{r.colourAbbrev}</td>
                      <td className={TDR}>{fmtNum(r.openingM)}</td>
                      <td className={TDR}>{fmtNum(r.receivedM)}</td>
                      <td className={TDR}>{fmtNum(r.totalM)}</td>
                      <td className={TDR}>{fmtNum(r.usedM)}</td>
                      <td className={TDR}>{fmtNum(r.remainingM)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      ) : null}

      {register.accessories?.rows?.length ? (
        <section className="break-inside-avoid">
          <h2 className="text-sm font-black uppercase tracking-wide text-[#134e4a] mb-2">D. Accessories</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className={TH}>Type</th>
                <th className={TH}>Unit</th>
                <th className={`${TH} text-right`}>Open</th>
                <th className={`${TH} text-right`}>Rcvd</th>
                <th className={`${TH} text-right`}>Used</th>
                <th className={`${TH} text-right`}>Bal</th>
              </tr>
            </thead>
            <tbody>
              {register.accessories.rows.map((r) => (
                <tr key={`${r.typeKey}-${r.unit}`}>
                  <td className={TD}>{r.typeLabel}</td>
                  <td className={TD}>{r.unit}</td>
                  <td className={TDR}>{fmtNum(r.opening)}</td>
                  <td className={TDR}>{fmtNum(r.received)}</td>
                  <td className={TDR}>{fmtNum(r.used)}</td>
                  <td className={TDR}>{fmtNum(r.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="break-inside-avoid">
        <h2 className="text-sm font-black uppercase tracking-wide text-[#134e4a] mb-2">E. Stock summary &amp; closing value</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className={TH}>Section</th>
              <th className={`${TH} text-right`}>Closing qty</th>
              <th className={`${TH} text-right`}>Spool adj (kg)</th>
              <th className={`${TH} text-right`}>Net kg / qty</th>
              <th className={`${TH} text-right`}>Unit price</th>
              <th className={`${TH} text-right`}>Price basis</th>
              <th className={`${TH} text-right`}>Closing ₦</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Aluminium', register.summary?.aluminium, 'kg', '/kg'],
              ['Aluzinc', register.summary?.aluzinc, 'kg', '/kg'],
            ].map(([label, data, unit, suffix]) => (
              <tr key={label}>
                <td className={TD}>{label}</td>
                <td className={TDR}>
                  {fmtNum(data?.grossClosingKg)} {unit}
                </td>
                <td className={TDR}>{fmtNum(data?.spoolAdjustmentKg)}</td>
                <td className={TDR}>
                  {fmtNum(data?.netClosingKg)} {unit}
                </td>
                <td className={TDR}>{fmtPrice(data?.unitCostNgnPerKg, suffix)}</td>
                <td className={`${TD} text-right text-[9px] text-slate-600`}>
                  {priceSourceNote(data?.priceSource, data?.priceLookbackDays)}
                </td>
                <td className={TDR}>{formatNgn(data?.valueNgn || 0)}</td>
              </tr>
            ))}
            <tr>
              <td className={TD}>Stone-coated</td>
              <td className={TDR} colSpan={2}>
                {fmtNum(register.summary?.stoneCoated?.totalRemainingM)} m remaining
              </td>
              <td className={TDR}>{fmtNum(register.summary?.stoneCoated?.totalRemainingM)} m</td>
              <td className={TDR}>{fmtPrice(register.summary?.stoneCoated?.unitPriceNgnPerM, '/m')}</td>
              <td className={`${TD} text-right text-[9px] text-slate-600`}>
                {priceSourceNote(register.summary?.stoneCoated?.priceSource, register.summary?.stoneCoated?.priceLookbackDays)}
              </td>
              <td className={TDR}>{formatNgn(register.summary?.stoneCoated?.valueNgn || 0)}</td>
            </tr>
            <tr>
              <td className={TD}>Accessories</td>
              <td className={TDR} colSpan={2}>
                {register.accessories?.rowCount ?? 0} type(s)
              </td>
              <td className={TDR}>—</td>
              <td className={TDR}>{fmtPrice(register.summary?.accessories?.unitPriceNgn, '/unit')}</td>
              <td className={`${TD} text-right text-[9px] text-slate-600`}>
                {priceSourceNote(register.summary?.accessories?.priceSource, register.summary?.accessories?.priceLookbackDays)}
              </td>
              <td className={TDR}>{formatNgn(register.summary?.accessories?.valueNgn || 0)}</td>
            </tr>
            <tr className="bg-teal-50/60 font-bold">
              <td className={TD} colSpan={6}>
                Total closing stock value
              </td>
              <td className={TDR}>{formatNgn(register.summary?.totalClosingValueNgn || 0)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {register.inTransit?.length ? (
        <section>
          <h2 className="text-sm font-black uppercase tracking-wide text-[#134e4a] mb-2">F. In transit (not stock)</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className={TH}>Ref</th>
                <th className={TH}>Item</th>
                <th className={`${TH} text-right`}>Qty</th>
                <th className={TH}>ETA</th>
              </tr>
            </thead>
            <tbody>
              {register.inTransit.map((r, i) => (
                <tr key={`${r.referenceNo}-${i}`}>
                  <td className={TD}>{r.referenceNo}</td>
                  <td className={TD}>{r.itemName}</td>
                  <td className={TDR}>
                    {fmtNum(Math.max(0, r.qtyExpected))} {r.unit}
                  </td>
                  <td className={TD}>{r.etaDateIso || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <p className="text-[10px] text-slate-500 pt-2 border-t border-slate-200">
        Branch: {bid} · Period {register.periodStart} → {register.periodEnd} ·{' '}
        {register.meta?.openingSource === 'previous_capture' ? 'Opening from prior capture' : 'Opening derived'} ·
        Business dates through period end (midnight cut-off).
      </p>
    </div>
  );
}
