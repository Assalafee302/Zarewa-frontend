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
  if (s.includes('purchase_kg') || s.includes('po_kg')) return `${days}d kg PO/receipt (metre PO excluded)`;
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

const TABLE = 'register-print-table w-full table-fixed border-collapse border border-slate-300 text-left';
const TH =
  'px-2 py-1.5 text-[8px] font-bold uppercase tracking-wide text-slate-600 border border-slate-300 bg-slate-50 align-middle print:text-[7pt]';
const THR = `${TH} text-right`;
const TD = 'px-2 py-1 text-[10px] text-slate-800 border border-slate-300 align-middle print:text-[8.5pt]';
const TDR = `${TD} text-right tabular-nums`;
const TDL = `${TD} text-left`;

function RegisterTable({ columns, rows, rowKey }) {
  return (
    <table className={TABLE}>
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              className={col.align === 'right' ? THR : TH}
              style={col.width ? { width: col.width } : undefined}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={rowKey(row, i)}>
            {columns.map((col) => (
              <td key={col.key} className={col.align === 'right' ? TDR : TDL}>
                {col.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CoilTable({ section }) {
  if (!section?.groups?.length) {
    return <p className="text-xs text-slate-500 italic">No lines this period.</p>;
  }
  const columns = [
    { key: 'colour', label: 'Colour', align: 'left', width: '12%', render: (r) => r.colourAbbrev },
    { key: 'coil', label: 'Coil no.', align: 'left', width: '14%', render: (r) => r.coilNoDisplay || r.coilNo },
    {
      key: 'open',
      label: 'Open (kg)',
      align: 'right',
      width: '12%',
      render: (r) => fmtNum(r.openingKg),
    },
    {
      key: 'rcvd',
      label: 'Rcvd (kg)',
      align: 'right',
      width: '12%',
      render: (r) => fmtNum(r.receivedKg),
    },
    {
      key: 'used',
      label: 'Used (kg)',
      align: 'right',
      width: '12%',
      render: (r) => fmtNum(r.usedKg),
    },
    {
      key: 'close',
      label: 'Close (kg)',
      align: 'right',
      width: '12%',
      render: (r) => (r.closingBlank ? '—' : fmtNum(r.closingKg)),
    },
    {
      key: 'remark',
      label: 'Remark',
      align: 'left',
      width: '14%',
      render: (r) =>
        [r.remarkSuggested, r.stockForm === 'roll' ? 'ROLL' : ''].filter(Boolean).join(' · ') || '—',
    },
  ];
  return section.groups.map((g) => (
    <div key={g.gaugeLabel} className="mb-4 break-inside-avoid">
      <p className="text-xs font-bold text-slate-800 mb-1.5">{g.gaugeLabel}</p>
      <RegisterTable columns={columns} rows={g.rows} rowKey={(r) => r.coilNo} />
    </div>
  ));
}

/** Shared register body for screen + print preview. */
export function StockRegisterPrintContent({ register, branchId, branchLabel }) {
  if (!register) return null;
  const bid = branchLabel || branchId || register.branchId || '—';

  const stoneColumns = [
    {
      key: 'colour',
      label: 'Colour (full name)',
      align: 'left',
      width: '28%',
      render: (r) => r.colourDisplay || r.colour || r.colourAbbrev || '—',
    },
    {
      key: 'open',
      label: 'Open (m)',
      align: 'right',
      width: '14%',
      render: (r) => fmtNum(r.openingM),
    },
    {
      key: 'rcvd',
      label: 'Rcvd (m)',
      align: 'right',
      width: '14%',
      render: (r) => fmtNum(r.receivedM),
    },
    {
      key: 'total',
      label: 'Total (m)',
      align: 'right',
      width: '14%',
      render: (r) => fmtNum(r.totalM),
    },
    {
      key: 'used',
      label: 'Used (m)',
      align: 'right',
      width: '14%',
      render: (r) => fmtNum(r.usedM),
    },
    {
      key: 'remain',
      label: 'Remain (m)',
      align: 'right',
      width: '16%',
      render: (r) => fmtNum(r.remainingM),
    },
  ];

  const accessoryColumns = [
    {
      key: 'item',
      label: 'Item (as on PO / quotation)',
      align: 'left',
      width: '40%',
      render: (r) => r.itemName || r.typeLabel || '—',
    },
    { key: 'unit', label: 'Unit', align: 'left', width: '10%', render: (r) => r.unit || '—' },
    {
      key: 'open',
      label: 'Opening',
      align: 'right',
      width: '12%',
      render: (r) => fmtNum(r.opening),
    },
    {
      key: 'rcvd',
      label: 'Received',
      align: 'right',
      width: '12%',
      render: (r) => fmtNum(r.received),
    },
    {
      key: 'used',
      label: 'Used',
      align: 'right',
      width: '12%',
      render: (r) => fmtNum(r.used),
    },
    {
      key: 'bal',
      label: 'Balance',
      align: 'right',
      width: '14%',
      render: (r) => fmtNum(r.balance),
    },
  ];

  const summaryColumns = [
    { key: 'section', label: 'Section', align: 'left', width: '16%', render: (r) => r.label },
    {
      key: 'closingQty',
      label: 'Closing qty',
      align: 'right',
      width: '14%',
      render: (r) => r.closingQty,
    },
    {
      key: 'spool',
      label: 'Spool adj',
      align: 'right',
      width: '10%',
      render: (r) => r.spoolAdj,
    },
    {
      key: 'net',
      label: 'Net / remain',
      align: 'right',
      width: '12%',
      render: (r) => r.netQty,
    },
    {
      key: 'price',
      label: 'Unit price',
      align: 'right',
      width: '14%',
      render: (r) => r.unitPrice,
    },
    {
      key: 'basis',
      label: 'Price basis',
      align: 'left',
      width: '20%',
      render: (r) => r.priceBasis,
    },
    {
      key: 'value',
      label: 'Closing ₦',
      align: 'right',
      width: '14%',
      render: (r) => r.closingValue,
    },
  ];

  const summaryRows = [
    {
      label: 'Aluminium',
      closingQty: `${fmtNum(register.summary?.aluminium?.grossClosingKg)} kg`,
      spoolAdj: fmtNum(register.summary?.aluminium?.spoolAdjustmentKg),
      netQty: `${fmtNum(register.summary?.aluminium?.netClosingKg)} kg`,
      unitPrice: fmtPrice(register.summary?.aluminium?.unitCostNgnPerKg, '/kg'),
      priceBasis: priceSourceNote(
        register.summary?.aluminium?.priceSource,
        register.summary?.aluminium?.priceLookbackDays
      ),
      closingValue: formatNgn(register.summary?.aluminium?.valueNgn || 0),
    },
    {
      label: 'Aluzinc',
      closingQty: `${fmtNum(register.summary?.aluzinc?.grossClosingKg)} kg`,
      spoolAdj: fmtNum(register.summary?.aluzinc?.spoolAdjustmentKg),
      netQty: `${fmtNum(register.summary?.aluzinc?.netClosingKg)} kg`,
      unitPrice: fmtPrice(register.summary?.aluzinc?.unitCostNgnPerKg, '/kg'),
      priceBasis: priceSourceNote(
        register.summary?.aluzinc?.priceSource,
        register.summary?.aluzinc?.priceLookbackDays
      ),
      closingValue: formatNgn(register.summary?.aluzinc?.valueNgn || 0),
    },
    {
      label: 'Stone-coated',
      closingQty: `${fmtNum(register.summary?.stoneCoated?.totalRemainingM)} m`,
      spoolAdj: '—',
      netQty: `${fmtNum(register.summary?.stoneCoated?.totalRemainingM)} m`,
      unitPrice: fmtPrice(register.summary?.stoneCoated?.unitPriceNgnPerM, '/m'),
      priceBasis: priceSourceNote(
        register.summary?.stoneCoated?.priceSource,
        register.summary?.stoneCoated?.priceLookbackDays
      ),
      closingValue: formatNgn(register.summary?.stoneCoated?.valueNgn || 0),
    },
    {
      label: 'Accessories',
      closingQty: `${register.accessories?.rowCount ?? 0} item(s)`,
      spoolAdj: '—',
      netQty: '—',
      unitPrice: fmtPrice(register.summary?.accessories?.unitPriceNgn, '/unit'),
      priceBasis: priceSourceNote(
        register.summary?.accessories?.priceSource,
        register.summary?.accessories?.priceLookbackDays
      ),
      closingValue: formatNgn(register.summary?.accessories?.valueNgn || 0),
    },
  ];

  const inTransitColumns = [
    { key: 'ref', label: 'Reference', align: 'left', width: '18%', render: (r) => r.referenceNo || '—' },
    { key: 'item', label: 'Item', align: 'left', width: '42%', render: (r) => r.itemName || '—' },
    {
      key: 'qty',
      label: 'Qty expected',
      align: 'right',
      width: '20%',
      render: (r) => `${fmtNum(Math.max(0, r.qtyExpected))} ${r.unit || ''}`.trim(),
    },
    { key: 'eta', label: 'ETA', align: 'left', width: '20%', render: (r) => r.etaDateIso || '—' },
  ];

  return (
    <div className="space-y-5 text-slate-800 register-print-body">
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
            <div key={g.gaugeLabel} className="mb-4 break-inside-avoid">
              <p className="text-xs font-bold text-slate-800 mb-1.5">{g.gaugeLabel}</p>
              <RegisterTable columns={stoneColumns} rows={g.rows} rowKey={(r) => r.productID} />
            </div>
          ))}
        </section>
      ) : null}

      {register.accessories?.rows?.length ? (
        <section className="break-inside-avoid">
          <h2 className="text-sm font-black uppercase tracking-wide text-[#134e4a] mb-2">D. Accessories</h2>
          <RegisterTable
            columns={accessoryColumns}
            rows={register.accessories.rows}
            rowKey={(r) => r.productID || r.itemName}
          />
        </section>
      ) : null}

      <section className="break-inside-avoid">
        <h2 className="text-sm font-black uppercase tracking-wide text-[#134e4a] mb-2">
          E. Stock summary &amp; closing value
        </h2>
        <RegisterTable columns={summaryColumns} rows={summaryRows} rowKey={(r) => r.label} />
        <table className={`${TABLE} mt-0`}>
          <tbody>
            <tr className="bg-teal-50/60 font-bold">
              <td className={`${TDL} border border-slate-300`} colSpan={6}>
                Total closing stock value
              </td>
              <td className={`${TDR} border border-slate-300`}>
                {formatNgn(register.summary?.totalClosingValueNgn || 0)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {register.inTransit?.length ? (
        <section>
          <h2 className="text-sm font-black uppercase tracking-wide text-[#134e4a] mb-2">F. In transit (not stock)</h2>
          <RegisterTable
            columns={inTransitColumns}
            rows={register.inTransit}
            rowKey={(r, i) => `${r.referenceNo}-${i}`}
          />
        </section>
      ) : null}

      <p className="text-[10px] text-slate-500 pt-2 border-t border-slate-200 leading-relaxed">
        Branch: {bid} · Period {register.periodStart} → {register.periodEnd} ·{' '}
        {register.meta?.openingSource === 'previous_capture' ? 'Opening from prior capture' : 'Opening derived'} ·
        Business dates through period end (midnight cut-off).
        {register.meta?.coilValuationNote ? (
          <>
            <br />
            {register.meta.coilValuationNote}
          </>
        ) : null}
      </p>
    </div>
  );
}
