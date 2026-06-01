import React from 'react';
import { formatNgn } from '../../Data/mockData';

const TH =
  'px-1 py-0.5 text-left text-[7px] font-bold uppercase text-slate-600 border border-slate-300 print:text-[6.5pt] whitespace-nowrap';
const TD = 'px-1 py-0.5 text-[9px] text-slate-800 border border-slate-300 print:text-[7.5pt]';
const TDR = `${TD} text-right tabular-nums`;
const TF = 'px-1 py-1 text-[9px] font-bold text-slate-800 border border-slate-300 bg-slate-100 print:text-[7.5pt]';
const TFR = `${TF} text-right tabular-nums`;

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

function SubtotalRow({ sub }) {
  return (
    <tr className="bg-slate-100/90">
      <td className={TF} colSpan={5}>
        Subtotal ({sub.lineCount} lines)
      </td>
      <td className={TF} />
      <td className={TF} />
      <td className={TFR}>{fmtNum(sub.totalKgUsed)}</td>
      <td className={TF} />
      <td className={TFR}>{fmtNum(sub.totalMeters)}</td>
      <td className={TFR}>{sub.weightedConversionKgM != null ? fmtNum(sub.weightedConversionKgM) : '—'}</td>
      <td className={TFR}>{sub.totalOffcutKg > 0 ? fmtNum(sub.totalOffcutKg) : '—'}</td>
      <td className={TF} />
      <td className={TFR}>{sub.totalPaidNetNgn > 0 ? fmtMoney(sub.totalPaidNetNgn) : '—'}</td>
    </tr>
  );
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
          <p className="text-[10px] font-bold text-slate-800 mb-1">Gauge {g.gaugeLabel}</p>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className={TH}>Date</th>
                <th className={TH}>Qt</th>
                <th className={TH}>Customer / project</th>
                <th className={TH}>Col</th>
                <th className={TH}>Coil</th>
                <th className={`${TH} text-right`}>Before</th>
                <th className={`${TH} text-right`}>After</th>
                <th className={`${TH} text-right`}>Kg used</th>
                <th className={TH}>Design</th>
                <th className={`${TH} text-right`}>Metres</th>
                <th className={`${TH} text-right`}>kg/m</th>
                <th className={`${TH} text-right`}>Offcut</th>
                <th className={TH}>Remark</th>
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
                  <td className={`${TD} text-[8px]`}>{r.remark || '—'}</td>
                  <td className={TDR}>{r.amountNetNgn != null ? fmtMoney(r.amountNetNgn) : '—'}</td>
                </tr>
              ))}
              <SubtotalRow sub={g.subtotals} />
            </tbody>
          </table>
        </div>
      ))}
      {section.totals ? (
        <p className="text-[10px] font-bold text-slate-700 border-t border-slate-300 pt-2">
          {title} total: {fmtNum(section.totals.totalKgUsed)} kg · {fmtNum(section.totals.totalMeters)} m
          {section.totals.weightedConversionKgM != null
            ? ` · avg ${fmtNum(section.totals.weightedConversionKgM)} kg/m`
            : ''}
        </p>
      ) : null}
    </section>
  );
}

function StoneSection({ stone }) {
  if (!stone?.groups?.length) {
    return (
      <section className="mb-6">
        <h3 className="text-xs font-black uppercase text-[#134e4a] mb-2">Stone-coated (metre stock)</h3>
        <p className="text-[10px] text-slate-500 italic">No stone metre draws this period.</p>
      </section>
    );
  }
  return (
    <section className="mb-6">
      <h3 className="text-xs font-black uppercase text-[#134e4a] mb-2">Stone-coated (metre stock)</h3>
      {stone.groups.map((g) => (
        <div key={g.gaugeLabel} className="mb-4 break-inside-avoid">
          <p className="text-[10px] font-bold text-slate-800 mb-1">Gauge {g.gaugeLabel}</p>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className={TH}>Date</th>
                <th className={TH}>Qt</th>
                <th className={TH}>Customer / project</th>
                <th className={TH}>Col</th>
                <th className={TH}>Design</th>
                <th className={`${TH} text-right`}>Before m</th>
                <th className={`${TH} text-right`}>Used m</th>
                <th className={`${TH} text-right`}>After m</th>
                <th className={`${TH} text-right`}>Paid (net)</th>
              </tr>
            </thead>
            <tbody>
              {g.rows.map((r, i) => (
                <tr key={`${r.jobId}-${i}`}>
                  <td className={TD}>{r.txnDateDisplay || r.txnDate}</td>
                  <td className={`${TD} font-mono`}>{r.qtNoDisplay}</td>
                  <td className={TD}>{r.customerProject}</td>
                  <td className={TD}>{r.colour}</td>
                  <td className={TD}>{r.design}</td>
                  <td className={TDR}>{r.beforeM != null ? fmtNum(r.beforeM) : '—'}</td>
                  <td className={TDR}>{fmtNum(r.metresUsed)}</td>
                  <td className={TDR}>{r.afterM != null ? fmtNum(r.afterM) : '—'}</td>
                  <td className={TDR}>{fmtMoney(r.amountNetNgn)}</td>
                </tr>
              ))}
              <tr className="bg-slate-100/90">
                <td className={TF} colSpan={6}>
                  Subtotal ({g.subtotals.lineCount} lines)
                </td>
                <td className={TF} />
                <td className={TFR}>{fmtNum(g.subtotals.totalMetresUsed)}</td>
                <td className={TF} />
                <td className={TFR}>{g.subtotals.totalPaidNetNgn > 0 ? fmtMoney(g.subtotals.totalPaidNetNgn) : '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}
      {stone.totals ? (
        <p className="text-[10px] font-bold text-slate-700 border-t border-slate-300 pt-2">
          Stone total: {fmtNum(stone.totals.totalMetresUsed)} m used
        </p>
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
              <tr className="bg-slate-100/90">
                <td className={TF} colSpan={4}>
                  Subtotal ({g.subtotals.lineCount} lines)
                </td>
                <td className={TFR}>{fmtNum(g.subtotals.totalQtyUsed, 0)}</td>
                <td className={TF} />
              </tr>
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
                <td className={TD}>{r.txnDateDisplay || r.txnDate}</td>
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
    </section>
  );
}

export function MaterialTransactionPrintContent({ report, branchLabel, periodLabel }) {
  if (!report) return null;

  return (
    <div className="text-slate-800 space-y-2">
      <div className="mb-4 border-b border-slate-200 pb-2">
        <p className="text-[10px] font-bold text-slate-600">{branchLabel}</p>
        <p className="text-[10px] text-slate-600">{periodLabel}</p>
        <p className="text-[9px] text-slate-500 mt-1">
          DD/MM dates; Qt and coil = last 4 digits. Design from quotation (Metra, Indus 6, Metcoppo, Flatsheet).
          Remark: new coil / roll at start, finished when coil cleared.
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
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className={TH}>Date</th>
                <th className={TH}>Qt</th>
                <th className={TH}>Customer / project</th>
                <th className={TH}>Design</th>
                <th className={`${TH} text-right`}>Metres</th>
                <th className={`${TH} text-right`}>Kg</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
      <StoneSection stone={report.stoneCoated} />
      <AccessorySection accessories={report.accessories} />
      <CancelledSection cancelled={report.cancelled} />
    </div>
  );
}
