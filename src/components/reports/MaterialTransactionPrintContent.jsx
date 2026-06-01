import React from 'react';
import { formatNgn } from '../../Data/mockData';

const TH =
  'px-1 py-0.5 text-left text-[7px] font-bold uppercase text-slate-600 border border-slate-300 print:text-[6.5pt] whitespace-nowrap';
const TD = 'px-1 py-0.5 text-[9px] text-slate-800 border border-slate-300 print:text-[7.5pt]';
const TDR = `${TD} text-right tabular-nums`;

function fmtNum(v, d = 2) {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d > 0 ? 0 : undefined });
}

function fmtMoney(v) {
  if (v == null || v === '') return '—';
  return formatNgn(v);
}

function CoilSection({ title, section }) {
  if (!section?.groups?.length) {
    return (
      <section className="mb-6 break-inside-avoid">
        <h3 className="text-xs font-black uppercase text-[#134e4a] mb-2">{title}</h3>
        <p className="text-[10px] text-slate-500 italic">No production lines this period.</p>
      </section>
    );
  }
  return (
    <section className="mb-6">
      <h3 className="text-xs font-black uppercase text-[#134e4a] mb-2">{title}</h3>
      {section.groups.map((g) => (
        <div key={g.gaugeLabel} className="mb-4 break-inside-avoid">
          <p className="text-[10px] font-bold text-slate-800 mb-1">
            Gauge {g.gaugeLabel}
            <span className="font-normal text-slate-600 ml-2">
              · {g.subtotals.lineCount} lines · {fmtNum(g.subtotals.totalKgUsed)} kg · {fmtNum(g.subtotals.totalMeters)}{' '}
              m
              {g.subtotals.weightedConversionKgM != null
                ? ` · conv ${fmtNum(g.subtotals.weightedConversionKgM)} kg/m`
                : ''}
            </span>
          </p>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className={TH}>Date</th>
                <th className={TH}>Qt</th>
                <th className={TH}>Customer / project</th>
                <th className={TH}>Colour</th>
                <th className={TH}>Coil</th>
                <th className={`${TH} text-right`}>Before</th>
                <th className={`${TH} text-right`}>After</th>
                <th className={`${TH} text-right`}>Kg used</th>
                <th className={TH}>Design</th>
                <th className={`${TH} text-right`}>Metres</th>
                <th className={`${TH} text-right`}>kg/m</th>
                <th className={`${TH} text-right`}>Offcut</th>
                <th className={`${TH} text-right`}>Paid (net)</th>
              </tr>
            </thead>
            <tbody>
              {g.rows.map((r, i) => (
                <tr key={`${r.jobId}-${r.coilNo}-${i}`}>
                  <td className={TD}>{r.txnDateDisplay || r.txnDate}</td>
                  <td className={`${TD} font-mono`}>{r.qtNoDisplay}</td>
                  <td className={TD}>{r.customerProject}</td>
                  <td className={TD}>{r.colour}</td>
                  <td className={`${TD} font-mono`}>{r.coilNoDisplay}</td>
                  <td className={TDR}>{fmtNum(r.beforeKg)}</td>
                  <td className={TDR}>{fmtNum(r.afterKg)}</td>
                  <td className={TDR}>{fmtNum(r.kgUsed)}</td>
                  <td className={TD}>{r.design}</td>
                  <td className={TDR}>{fmtNum(r.meters)}</td>
                  <td className={TDR}>{r.conversionKgM != null ? fmtNum(r.conversionKgM) : '—'}</td>
                  <td className={TDR}>{r.offcutKg != null ? fmtNum(r.offcutKg) : '—'}</td>
                  <td className={TDR}>{r.amountNetNgn != null ? fmtMoney(r.amountNetNgn) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {section.totals ? (
        <p className="text-[10px] font-bold text-slate-700">
          Family total: {fmtNum(section.totals.totalKgUsed)} kg · {fmtNum(section.totals.totalMeters)} m
          {section.totals.weightedConversionKgM != null
            ? ` · avg ${fmtNum(section.totals.weightedConversionKgM)} kg/m`
            : ''}
          {section.totals.totalPaidNetNgn > 0 ? ` · paid (net) ${fmtMoney(section.totals.totalPaidNetNgn)}` : ''}
        </p>
      ) : null}
    </section>
  );
}

function StoneSection({ stone }) {
  const hasMeter = stone?.meterRows?.length > 0;
  const hasFlat = stone?.flatsheetRows?.length > 0;
  if (!hasMeter && !hasFlat) {
    return (
      <section className="mb-6">
        <h3 className="text-xs font-black uppercase text-[#134e4a] mb-2">Stone-coated</h3>
        <p className="text-[10px] text-slate-500 italic">No stone-coated usage this period.</p>
      </section>
    );
  }
  return (
    <section className="mb-6">
      <h3 className="text-xs font-black uppercase text-[#134e4a] mb-2">Stone-coated</h3>
      {hasMeter ? (
        <div className="mb-4 break-inside-avoid">
          <p className="text-[10px] font-bold text-slate-800 mb-1">Metre stock (raw stone draw)</p>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className={TH}>Date</th>
                <th className={TH}>Qt</th>
                <th className={TH}>Customer / project</th>
                <th className={TH}>Colour</th>
                <th className={TH}>Product</th>
                <th className={`${TH} text-right`}>m used</th>
                <th className={`${TH} text-right`}>Paid (net)</th>
              </tr>
            </thead>
            <tbody>
              {stone.meterRows.map((r, i) => (
                <tr key={`${r.jobId}-${i}`}>
                  <td className={TD}>{r.txnDateDisplay || r.txnDate}</td>
                  <td className={`${TD} font-mono`}>{r.qtNoDisplay}</td>
                  <td className={TD}>{r.customerProject}</td>
                  <td className={TD}>{r.colour}</td>
                  <td className={TD}>{r.productLabel}</td>
                  <td className={TDR}>{fmtNum(r.qtyUsed)}</td>
                  <td className={TDR}>{fmtMoney(r.amountNetNgn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-slate-600 mt-1">
            Total {fmtNum(stone.meterTotals?.totalMeters)} m · {stone.meterRows.length} jobs
          </p>
        </div>
      ) : null}
      {hasFlat ? (
        <div className="break-inside-avoid">
          <p className="text-[10px] font-bold text-slate-800 mb-1">Flatsheet m² deductions</p>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className={TH}>Date</th>
                <th className={TH}>Qt</th>
                <th className={TH}>Customer / project</th>
                <th className={TH}>Line</th>
                <th className={`${TH} text-right`}>Length m</th>
                <th className={`${TH} text-right`}>Supplied m²</th>
                <th className={`${TH} text-right`}>Deduction m²</th>
              </tr>
            </thead>
            <tbody>
              {stone.flatsheetRows.map((r, i) => (
                <tr key={`${r.jobId}-${i}`}>
                  <td className={TD}>{r.txnDateDisplay || r.txnDate}</td>
                  <td className={`${TD} font-mono`}>{r.qtNoDisplay}</td>
                  <td className={TD}>{r.customerProject}</td>
                  <td className={TD}>{r.itemName}</td>
                  <td className={TDR}>{fmtNum(r.lengthM)}</td>
                  <td className={TDR}>{fmtNum(r.suppliedM2)}</td>
                  <td className={TDR}>{fmtNum(r.deductionM2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-slate-600 mt-1">
            Supplied {fmtNum(stone.flatsheetTotals?.totalSuppliedM2)} m² · deducted{' '}
            {fmtNum(stone.flatsheetTotals?.totalDeductionM2)} m²
          </p>
        </div>
      ) : null}
    </section>
  );
}

function AccessorySection({ accessories }) {
  if (!accessories?.groups?.length) {
    return (
      <section className="mb-6">
        <h3 className="text-xs font-black uppercase text-[#134e4a] mb-2">Accessories</h3>
        <p className="text-[10px] text-slate-500 italic">No accessory issues this period.</p>
      </section>
    );
  }
  return (
    <section className="mb-6">
      <h3 className="text-xs font-black uppercase text-[#134e4a] mb-2">Accessories</h3>
      {accessories.groups.map((g) => (
        <div key={g.typeKey} className="mb-3 break-inside-avoid">
          <p className="text-[10px] font-bold text-slate-800 mb-1">{g.typeLabel}</p>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className={TH}>Date</th>
                <th className={TH}>Qt</th>
                <th className={TH}>Customer / project</th>
                <th className={TH}>Item</th>
                <th className={`${TH} text-right`}>Qty issued</th>
                <th className={TH}>Unit</th>
              </tr>
            </thead>
            <tbody>
              {g.rows.map((r, i) => (
                <tr key={`${r.jobId}-${i}`}>
                  <td className={TD}>{r.txnDateDisplay || r.txnDate}</td>
                  <td className={`${TD} font-mono`}>{r.qtNoDisplay}</td>
                  <td className={TD}>{r.customerProject}</td>
                  <td className={TD}>{r.itemName}</td>
                  <td className={TDR}>{fmtNum(r.qtyUsed, 0)}</td>
                  <td className={TD}>{r.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
}

function CancelledSection({ cancelled }) {
  const n = cancelled?.totals?.lineCount || 0;
  if (!n) {
    return (
      <section className="mb-6">
        <h3 className="text-xs font-black uppercase text-amber-900 mb-2">Cancelled production</h3>
        <p className="text-[10px] text-slate-500 italic">None in period.</p>
      </section>
    );
  }
  const coil = cancelled.coil || [];
  return (
    <section className="mb-6 break-inside-avoid">
      <h3 className="text-xs font-black uppercase text-amber-900 mb-2">Cancelled production ({n} lines)</h3>
      {coil.length > 0 ? (
        <table className="w-full border-collapse mb-3">
          <thead>
            <tr className="bg-amber-50">
              <th className={TH}>Date</th>
              <th className={TH}>Qt</th>
              <th className={TH}>Customer</th>
              <th className={TH}>Coil</th>
              <th className={TH}>Gauge</th>
              <th className={TH}>Status</th>
            </tr>
          </thead>
          <tbody>
            {coil.map((r, i) => (
              <tr key={`c-${i}`}>
                <td className={TD}>{r.txnDate}</td>
                <td className={TD}>{r.qtNoDisplay}</td>
                <td className={TD}>{r.customerProject}</td>
                <td className={TD}>{r.coilNoDisplay}</td>
                <td className={TD}>{r.gauge}</td>
                <td className={TD}>Cancelled</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <p className="text-[9px] text-slate-500">
        Includes cancelled jobs dated in this period (coil reservations released; quantities may be zero).
      </p>
    </section>
  );
}

function OtherMovementsSection({ other, label }) {
  const rows = other || [];
  if (!rows.length) return null;
  return (
    <div className="mb-4 break-inside-avoid">
      <p className="text-[10px] font-bold text-slate-800 mb-1">{label}</p>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-50">
            <th className={TH}>Date</th>
            <th className={TH}>Type</th>
            <th className={TH}>Ref</th>
            <th className={TH}>Product</th>
            <th className={`${TH} text-right`}>Qty Δ</th>
            <th className={TH}>Unit</th>
            <th className={TH}>Detail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.ref}-${i}`}>
              <td className={TD}>{r.txnDate}</td>
              <td className={TD}>{r.movementType}</td>
              <td className={`${TD} font-mono text-[8px]`}>{r.ref}</td>
              <td className={TD}>{r.productName}</td>
              <td className={TDR}>{fmtNum(r.qtyDelta)}</td>
              <td className={TD}>{r.unit}</td>
              <td className={`${TD} text-[8px]`}>{r.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MaterialTransactionPrintContent({ report, branchLabel, periodLabel }) {
  if (!report) return null;
  const other = report.otherMovements || {};
  const hasOther =
    (other.aluminium?.length || 0) +
      (other.aluzinc?.length || 0) +
      (other.stoneCoated?.length || 0) +
      (other.accessories?.length || 0) +
      (other.other?.length || 0) >
    0;

  return (
    <div className="text-slate-800 space-y-2">
      <div className="mb-4 border-b border-slate-200 pb-2">
        <p className="text-[10px] font-bold text-slate-600">{branchLabel}</p>
        <p className="text-[10px] text-slate-600">{periodLabel}</p>
        <p className="text-[9px] text-slate-500 mt-1">
          Dates as DD/MM; Qt and coil show last 4 digits. Offcut column is coil weight variance only (≥1 kg). Stone
          and accessories are separate sections — not mixed into coil gauges.
        </p>
      </div>
      <CoilSection title="Aluminium" section={report.aluminium} />
      <CoilSection title="Aluzinc" section={report.aluzinc} />
      {report.unclassifiedCoil?.groups?.length ? (
        <CoilSection title="Coil (check material on GRN)" section={report.unclassifiedCoil} />
      ) : null}
      {report.offcutProduction?.rows?.length ? (
        <section className="mb-6 break-inside-avoid">
          <h3 className="text-xs font-black uppercase text-[#134e4a] mb-2">Offcut / no coil allocation</h3>
          <p className="text-[9px] text-slate-500 mb-2">
            Production completed from offcut or without coil lines — not coil offcut variance.
          </p>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className={TH}>Date</th>
                <th className={TH}>Qt</th>
                <th className={TH}>Customer / project</th>
                <th className={TH}>Design</th>
                <th className={`${TH} text-right`}>Metres</th>
                <th className={`${TH} text-right`}>Kg</th>
                <th className={`${TH} text-right`}>Paid (net)</th>
              </tr>
            </thead>
            <tbody>
              {report.offcutProduction.rows.map((r, i) => (
                <tr key={`${r.jobId}-${i}`}>
                  <td className={TD}>{r.txnDateDisplay || r.txnDate}</td>
                  <td className={`${TD} font-mono`}>{r.qtNoDisplay}</td>
                  <td className={TD}>{r.customerProject}</td>
                  <td className={TD}>{r.design}</td>
                  <td className={TDR}>{fmtNum(r.metres)}</td>
                  <td className={TDR}>{fmtNum(r.kgUsed)}</td>
                  <td className={TDR}>{fmtMoney(r.amountNetNgn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
      <StoneSection stone={report.stoneCoated} />
      <AccessorySection accessories={report.accessories} />
      <CancelledSection cancelled={report.cancelled} />
      {hasOther ? (
        <section className="mb-6">
          <h3 className="text-xs font-black uppercase text-[#134e4a] mb-2">Other stock movements</h3>
          <p className="text-[9px] text-slate-500 mb-2">
            GRNs, adjustments, transfers, and sales issues not already listed under production above.
          </p>
          <OtherMovementsSection other={other.aluminium} label="Aluminium / coil SKU" />
          <OtherMovementsSection other={other.aluzinc} label="Aluzinc / coil SKU" />
          <OtherMovementsSection other={other.stoneCoated} label="Stone-coated products" />
          <OtherMovementsSection other={other.accessories} label="Accessories" />
          <OtherMovementsSection other={other.other} label="Other" />
        </section>
      ) : null}
    </div>
  );
}
