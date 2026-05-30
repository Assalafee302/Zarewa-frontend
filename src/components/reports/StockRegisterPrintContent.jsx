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
  if (s.includes('purchase_grn') || s.includes('purchase_31d')) return `${days}d GRN receipt avg ₦/kg`;
  if (s.includes('purchase_kg')) return `${days}d PO kg price`;
  if (s.includes('purchase_metre')) return `${days}d PO metre → ₦/kg`;
  if (s === 'coil_lots_all') return 'All received coil lots avg ₦/kg';
  if (s === 'receipt_avg') return `${days}d GRN receipt avg`;
  if (s === 'none') return 'No price on file';
  return source || '—';
}

function fmtPrice(v, suffix = '') {
  if (v == null || v === '' || Number(v) <= 0) return '—';
  return `${formatNgn(v)}${suffix}`;
}

const TABLE = 'w-full table-fixed border-collapse text-[10px] print:text-[8.5pt]';
const TH =
  'px-2 py-1.5 text-[8px] font-bold uppercase tracking-wide text-slate-600 border border-slate-300 bg-slate-50 print:text-[7pt]';
const THR = `${TH} text-right`;
const TD = 'px-2 py-1 align-middle text-slate-800 border border-slate-300 break-words';
const TDR = `${TD} text-right tabular-nums`;
const TD_MUTED = `${TD} text-slate-400 text-center`;

/** Shared 7-column movement layout: description | ref | open | rcvd | total | used | balance */
const COLS = [
  { key: 'desc', head: 'Description', className: 'w-[28%] text-left' },
  { key: 'ref', head: 'Ref / unit', className: 'w-[12%] text-left' },
  { key: 'open', head: 'Opening', className: 'w-[12%] text-right' },
  { key: 'rcvd', head: 'Received', className: 'w-[12%] text-right' },
  { key: 'total', head: 'Total', className: 'w-[12%] text-right' },
  { key: 'used', head: 'Used', className: 'w-[12%] text-right' },
  { key: 'bal', head: 'Balance', className: 'w-[12%] text-right' },
];

function RegisterTable({ rows, emptyLabel = 'No lines this period.' }) {
  if (!rows?.length) {
    return <p className="text-xs text-slate-500 italic">{emptyLabel}</p>;
  }
  return (
    <table className={TABLE}>
      <thead>
        <tr>
          {COLS.map((c) => (
            <th key={c.key} className={c.className.includes('text-right') ? `${THR} ${c.className}` : `${TH} ${c.className}`}>
              {c.head}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <td className={TD}>{row.desc}</td>
            <td className={row.refMuted ? TD_MUTED : TD}>{row.ref ?? '—'}</td>
            <td className={TDR}>{row.open}</td>
            <td className={TDR}>{row.rcvd}</td>
            <td className={TDR}>{row.total}</td>
            <td className={TDR}>{row.used}</td>
            <td className={TDR}>{row.bal}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CoilSection({ title, section, unitLabel = 'kg' }) {
  if (!section?.groups?.length) {
    return (
      <section className="break-inside-avoid">
        <h2 className="text-sm font-black uppercase tracking-wide text-[#134e4a] mb-2">{title}</h2>
        <RegisterTable rows={[]} />
      </section>
    );
  }
  return (
    <section className="break-inside-avoid">
      <h2 className="text-sm font-black uppercase tracking-wide text-[#134e4a] mb-2">{title}</h2>
      {section.groups.map((g) => {
        const rows = g.rows.map((r) => ({
          key: r.coilNo,
          desc: r.colourAbbrev,
          ref: r.coilNoDisplay || r.coilNo,
          open: fmtNum(r.openingKg),
          rcvd: fmtNum(r.receivedKg),
          total: fmtNum((Number(r.openingKg) || 0) + (Number(r.receivedKg) || 0)),
          used: fmtNum(r.usedKg),
          bal: r.closingBlank ? '—' : fmtNum(r.closingKg),
          remark: [r.remarkSuggested, r.stockForm === 'roll' ? 'ROLL' : ''].filter(Boolean).join(' · '),
        }));
        return (
          <div key={g.gaugeLabel} className="mb-4">
            <p className="text-xs font-bold text-slate-800 mb-1.5">{g.gaugeLabel}</p>
            <RegisterTable rows={rows} />
            {rows.some((r) => r.remark) ? (
              <p className="text-[9px] text-slate-500 mt-1">
                Remarks: {rows.filter((r) => r.remark).map((r) => `${r.ref}: ${r.remark}`).join(' · ')}
              </p>
            ) : null}
          </div>
        );
      })}
      <p className="text-[9px] text-slate-500 mt-1">Quantities in {unitLabel} (gross). Rolls marked in remarks.</p>
    </section>
  );
}

/** Shared register body for screen + print preview. */
export function StockRegisterPrintContent({ register, branchId, branchLabel }) {
  if (!register) return null;
  const bid = branchLabel || branchId || register.branchId || '—';

  const stoneRows =
    register.stoneCoated?.groups?.flatMap((g) =>
      g.rows.map((r) => ({
        key: r.productID,
        desc: r.colourDisplay || r.colour || r.colourAbbrev,
        ref: g.gaugeLabel !== '—' ? g.gaugeLabel : 'm',
        refMuted: false,
        open: fmtNum(r.openingM),
        rcvd: fmtNum(r.receivedM),
        total: fmtNum(r.totalM),
        used: fmtNum(r.usedM),
        bal: fmtNum(r.remainingM),
      }))
    ) || [];

  const accessoryRows =
    register.accessories?.rows?.map((r) => ({
      key: r.productID,
      desc: r.itemName || r.typeLabel || r.productID,
      ref: r.unit || '—',
      open: fmtNum(r.opening),
      rcvd: fmtNum(r.received),
      total: fmtNum(r.total ?? (Number(r.opening) || 0) + (Number(r.received) || 0)),
      used: fmtNum(r.used),
      bal: fmtNum(r.balance),
    })) || [];

  const inTransitRows =
    register.inTransit?.map((r, i) => ({
      key: `${r.referenceNo}-${i}`,
      desc: r.itemName || '—',
      ref: r.referenceNo || '—',
      open: '—',
      rcvd: '—',
      total: `${fmtNum(Math.max(0, r.qtyExpected))} ${r.unit || ''}`.trim(),
      used: '—',
      bal: r.etaDateIso || '—',
    })) || [];

  return (
    <div className="space-y-5 text-slate-800">
      <CoilSection title="A. Aluminium coils" section={register.coilSections?.aluminium} />
      <CoilSection title="B. Aluzinc coils" section={register.coilSections?.aluzinc} />

      {stoneRows.length ? (
        <section className="break-inside-avoid">
          <h2 className="text-sm font-black uppercase tracking-wide text-[#134e4a] mb-2">C. Stone-coated (metres)</h2>
          <RegisterTable rows={stoneRows} />
          <p className="text-[9px] text-slate-500 mt-1">Colour names shown in full. Quantities in metres.</p>
        </section>
      ) : null}

      {accessoryRows.length ? (
        <section className="break-inside-avoid">
          <h2 className="text-sm font-black uppercase tracking-wide text-[#134e4a] mb-2">D. Accessories</h2>
          <RegisterTable rows={accessoryRows} />
          <p className="text-[9px] text-slate-500 mt-1">Item names match purchase order / product catalog.</p>
        </section>
      ) : null}

      <section className="break-inside-avoid">
        <h2 className="text-sm font-black uppercase tracking-wide text-[#134e4a] mb-2">E. Stock summary &amp; closing value</h2>
        <table className={TABLE}>
          <thead>
            <tr>
              <th className={`${TH} w-[14%]`}>Section</th>
              <th className={`${THR} w-[12%]`}>Closing qty</th>
              <th className={`${THR} w-[10%]`}>Spool adj</th>
              <th className={`${THR} w-[12%]`}>Net qty</th>
              <th className={`${THR} w-[14%]`}>Unit price</th>
              <th className={`${TH} w-[22%] text-right`}>Price basis</th>
              <th className={`${THR} w-[16%]`}>Closing ₦</th>
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
                {fmtNum(register.summary?.stoneCoated?.totalRemainingM)} m
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
                {register.accessories?.rowCount ?? 0} item(s)
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
        <p className="text-[9px] text-slate-500 mt-2 leading-relaxed">
          {register.summary?.aluminium?.pricingNote ||
            'Coil purchases may be ordered per kg or per metre; aluminium and aluzinc closing stock is valued at ₦/kg on net weight (after spool adjustment).'}
        </p>
      </section>

      {inTransitRows.length ? (
        <section>
          <h2 className="text-sm font-black uppercase tracking-wide text-[#134e4a] mb-2">F. In transit (not stock)</h2>
          <RegisterTable rows={inTransitRows} emptyLabel="" />
          <p className="text-[9px] text-slate-500 mt-1">
            Total column = qty in transit · Balance column = ETA. Not included in closing stock until received.
          </p>
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
