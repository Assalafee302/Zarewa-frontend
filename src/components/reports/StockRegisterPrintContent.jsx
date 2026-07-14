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

const TH = 'border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-left text-[10px] font-bold align-middle leading-none whitespace-nowrap overflow-hidden text-ellipsis';
const TD = 'border border-slate-300 px-1.5 py-0.5 text-[10px] text-slate-800 align-middle leading-none whitespace-nowrap overflow-hidden text-ellipsis';
const TDR = `${TD} text-right tabular-nums`;

function splitCoilRows(section) {
  const activeGroups = [];
  const finishedGroups = [];
  for (const g of section?.groups || []) {
    const activeRows = (g.rows || []).filter((r) => !r.finishedInPeriod);
    const finishedRows = (g.rows || []).filter((r) => r.finishedInPeriod);
    if (activeRows.length) {
      activeGroups.push({ ...g, rows: activeRows });
    }
    if (finishedRows.length) {
      finishedGroups.push({ ...g, rows: finishedRows });
    }
  }
  return { activeGroups, finishedGroups };
}

function CoilTable({ groups, showCountedBlank = true, blankSystemClose = false }) {
  if (!groups?.length) {
    return <p className="text-xs text-slate-500 italic">No lines this period.</p>;
  }
  return groups.map((g) => (
    <div key={g.gaugeLabel} className="mb-4 break-inside-avoid">
      <p className="text-xs font-bold text-slate-800 mb-1">{g.gaugeLabel}</p>
      <table className="statement-dense-table w-full border-collapse table-fixed">
        <thead>
          <tr className="bg-slate-50">
            <th className={TH}>Colour</th>
            <th className={TH}>Coil</th>
            <th className={`${TH} text-right`}>Open</th>
            <th className={`${TH} text-right`}>Rcvd</th>
            <th className={`${TH} text-right`}>Used m</th>
            <th className={`${TH} text-right`}>Used kg</th>
            <th className={`${TH} text-right`}>kg/m</th>
            <th className={`${TH} text-right`}>{blankSystemClose ? 'Sys' : 'Close'}</th>
            {showCountedBlank ? <th className={`${TH} text-center min-w-[3.5rem]`}>Counted</th> : null}
            <th className={TH}>Remark</th>
          </tr>
        </thead>
        <tbody>
          {g.rows.map((r) => (
            <tr key={r.coilNo}>
              <td className={TD}>{r.colourAbbrev}</td>
              <td className={`${TD} font-mono`}>{r.coilNoDisplay || r.coilNo}</td>
              <td className={TDR}>{fmtNum(r.openingKg, 0)}</td>
              <td className={TDR}>{fmtNum(r.receivedKg, 0)}</td>
              <td className={TDR}>{fmtNum(r.usedM)}</td>
              <td className={TDR}>{fmtNum(r.usedKg, 0)}</td>
              <td className={TDR}>{r.kgPerM != null ? fmtNum(r.kgPerM) : '—'}</td>
              <td className={TDR}>
                {blankSystemClose || r.closingBlank ? '—' : fmtNum(r.closingKg, 0)}
              </td>
              {showCountedBlank ? (
                <td className={`${TD} text-center text-slate-400 border-dashed`} aria-label="Counted (write-in)">
                  {' '}
                </td>
              ) : null}
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

function CoilSection({ title, section, blankSystemClose = false }) {
  const { activeGroups, finishedGroups } = splitCoilRows(section);
  return (
    <section className="break-inside-avoid">
      <h2 className="text-sm font-black uppercase tracking-wide text-zarewa-teal mb-2">{title}</h2>
      <CoilTable groups={activeGroups} blankSystemClose={blankSystemClose} />
      {finishedGroups.length ? (
        <div className="mt-4 pt-3 border-t border-dashed border-slate-300">
          <h3 className="text-xs font-black uppercase tracking-wide text-slate-700 mb-2">
            Finished coils (consumed this period)
          </h3>
          <CoilTable groups={finishedGroups} showCountedBlank={blankSystemClose} blankSystemClose={false} />
        </div>
      ) : null}
    </section>
  );
}

/** Shared register body for screen + print preview. */
export function StockRegisterPrintContent({ register, branchId, branchLabel, viewMode = 'store' }) {
  if (!register) return null;
  const bid = branchLabel || branchId || register.branchId || '—';
  const hideMoney = viewMode === 'store' || viewMode === 'manager';
  /** Physical count sheets: hide system closing so yard writes counted figures (blind count). */
  const blankSystemClose = hideMoney;
  const ps = register.procurementSummary;

  if (viewMode === 'procurement' && ps) {
    return (
      <div className="space-y-4 text-slate-800">
        <h2 className="text-sm font-black uppercase text-zarewa-teal">Procurement costing summary (net kg)</h2>
        {['aluminium', 'aluzinc'].map((fam) =>
          ps[fam]?.length ? (
            <div key={fam}>
              <p className="text-xs font-bold mb-1 capitalize">{fam}</p>
              <table className="statement-dense-table w-full border-collapse table-fixed border border-slate-300">
                <thead>
                  <tr className="bg-slate-50">
                    <th className={TH}>Gauge</th>
                    <th className={`${TH} text-right`}>Gross kg</th>
                    <th className={`${TH} text-right`}>Net kg</th>
                  </tr>
                </thead>
                <tbody>
                  {ps[fam].map((r) => (
                    <tr key={r.gaugeLabel}>
                      <td className={TD}>{r.gaugeLabel}</td>
                      <td className={TDR}>{fmtNum(r.grossClosingKg, 0)}</td>
                      <td className={TDR}>{fmtNum(r.netClosingKg, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null
        )}
        {register.summary ? (
          <p className="text-sm font-bold pt-2">
            Total closing: {formatNgn(register.summary.totalClosingValueNgn || 0)}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-5 text-slate-800">
      {blankSystemClose ? (
        <p className="no-print text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Count sheet: system closing kg is blank — write yard counts in <strong>Counted</strong>. Use landscape A4.
        </p>
      ) : null}
      <CoilSection
        title="A. Aluminium coils (gross kg)"
        section={register.coilSections?.aluminium}
        blankSystemClose={blankSystemClose}
      />
      <CoilSection
        title="B. Aluzinc coils (gross kg)"
        section={register.coilSections?.aluzinc}
        blankSystemClose={blankSystemClose}
      />

      {register.stoneCoated?.groups?.length ? (
        <section>
          <h2 className="text-sm font-black uppercase tracking-wide text-zarewa-teal mb-2">C. Stone-coated (metres)</h2>
          {register.stoneCoated.groups.map((g) => (
            <div key={g.gaugeLabel} className="mb-3 break-inside-avoid">
              <p className="text-xs font-bold mb-1">{g.gaugeLabel}</p>
              <table className="statement-dense-table w-full border-collapse table-fixed">
                <thead>
                  <tr className="bg-slate-50">
                    <th className={TH}>Colour</th>
                    <th className={`${TH} text-right`}>Open</th>
                    <th className={`${TH} text-right`}>Rcvd</th>
                    <th className={`${TH} text-right`}>Total</th>
                    <th className={`${TH} text-right`}>Used</th>
                    <th className={`${TH} text-right`}>{blankSystemClose ? 'Sys rem' : 'Remain'}</th>
                    {blankSystemClose ? <th className={`${TH} text-center min-w-[3.5rem]`}>Counted</th> : null}
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
                      <td className={TDR}>{blankSystemClose ? '—' : fmtNum(r.remainingM)}</td>
                      {blankSystemClose ? (
                        <td className={`${TD} text-center text-slate-400 border-dashed`}> </td>
                      ) : null}
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
          <h2 className="text-sm font-black uppercase tracking-wide text-zarewa-teal mb-2">D. Accessories</h2>
          <table className="statement-dense-table w-full border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-50">
                <th className={TH}>Item</th>
                <th className={TH}>Unit</th>
                <th className={`${TH} text-right`}>Open</th>
                <th className={`${TH} text-right`}>Rcvd</th>
                <th className={`${TH} text-right`}>Used</th>
                <th className={`${TH} text-right`}>{blankSystemClose ? 'Sys bal' : 'Bal'}</th>
                {blankSystemClose ? <th className={`${TH} text-center min-w-[3.5rem]`}>Counted</th> : null}
              </tr>
            </thead>
            <tbody>
              {register.accessories.rows.map((r) => (
                <tr key={r.productID || `${r.typeKey}-${r.unit}`}>
                  <td className={TD}>{r.itemName || r.typeLabel}</td>
                  <td className={TD}>{r.unit}</td>
                  <td className={TDR}>{fmtNum(r.opening)}</td>
                  <td className={TDR}>{fmtNum(r.received)}</td>
                  <td className={TDR}>{fmtNum(r.used)}</td>
                  <td className={TDR}>{blankSystemClose ? '—' : fmtNum(r.balance)}</td>
                  {blankSystemClose ? (
                    <td className={`${TD} text-center text-slate-400 border-dashed`}> </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {!hideMoney ? (
      <section className="break-inside-avoid">
        <h2 className="text-sm font-black uppercase tracking-wide text-zarewa-teal mb-2">E. Stock summary &amp; closing value</h2>
        <table className="statement-dense-table w-full border-collapse table-fixed">
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
                  {fmtNum(data?.grossClosingKg, 0)} {unit}
                </td>
                <td className={TDR}>{fmtNum(data?.spoolAdjustmentKg, 0)}</td>
                <td className={TDR}>
                  {fmtNum(data?.netClosingKg, 0)} {unit}
                </td>
                <td className={TDR}>{fmtPrice(data?.unitCostNgnPerKg, suffix)}</td>
                <td className={`${TD} text-right text-ui-xs text-slate-600`}>
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
              <td className={`${TD} text-right text-ui-xs text-slate-600`}>
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
              <td className={`${TD} text-right text-ui-xs text-slate-600`}>
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
      ) : (
      <section className="break-inside-avoid">
        <h2 className="text-sm font-black uppercase tracking-wide text-zarewa-teal mb-2">E. Stock summary (physical)</h2>
        <table className="statement-dense-table w-full max-w-md border-collapse table-fixed">
          <tbody>
            {[
              ['Aluminium net kg', register.summary?.aluminium?.netClosingKg],
              ['Aluzinc net kg', register.summary?.aluzinc?.netClosingKg],
              ['Stone remain m', register.summary?.stoneCoated?.totalRemainingM],
            ].map(([label, val]) => (
              <tr key={label}>
                <td className={TD}>{label}</td>
                <td className={TDR}>{fmtNum(val)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      )}

      {register.inTransit?.length ? (
        <section>
          <h2 className="text-sm font-black uppercase tracking-wide text-zarewa-teal mb-2">F. In transit (not stock)</h2>
          <table className="statement-dense-table w-full border-collapse table-fixed">
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
