import React from 'react';
import { formatNgn } from '../../Data/mockData';

const TBL = 'w-full border-collapse table-fixed';
const TH =
  'px-1 py-0.5 text-left text-[7px] font-bold uppercase text-slate-600 border border-slate-300 print:text-[6.5pt] align-middle';
const THR = `${TH} text-right`;
const TD = 'px-1 py-0.5 text-ui-xs text-slate-800 border border-slate-300 print:text-[7.5pt] align-middle break-words';
const TDR = `${TD} text-right tabular-nums whitespace-nowrap`;
const TDM = `${TD} font-mono tabular-nums whitespace-nowrap`;
const TF = 'px-1 py-1 text-ui-xs font-bold text-slate-800 border border-slate-300 bg-slate-100 print:text-[7.5pt] align-middle';
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

function PaymentCells({ r }) {
  const highlight = r.poOutstandingNgn != null && Number(r.poOutstandingNgn) > 0;
  return (
    <>
      <td className={TDR}>{r.poPaidNgn != null ? fmtMoney(r.poPaidNgn) : '—'}</td>
      <td className={`${TDR}${highlight ? ' bg-amber-50 text-amber-900 font-semibold' : ''}`}>
        {r.poOutstandingNgn != null ? fmtMoney(r.poOutstandingNgn) : '—'}
      </td>
    </>
  );
}

function SummarySection({ summary }) {
  if (!summary) return null;
  const { byMaterial = [], byGauge = [], payments = {}, observations = [], recommendations = [] } = summary;

  return (
    <section className="mb-6 break-before-page break-inside-avoid border-t-2 border-slate-300 pt-4 mt-6">
      <h3 className="text-xs font-black uppercase text-zarewa-teal mb-2">Summary</h3>
      {payments.receivedValueNgn > 0 || payments.paidInPeriodNgn > 0 ? (
        <p className="text-ui-xs text-slate-700 mb-2">
          GRN value: {fmtMoney(payments.receivedValueNgn)} · Paid to suppliers (period):{' '}
          {fmtMoney(payments.paidInPeriodNgn)} · PO outstanding: {fmtMoney(payments.poOutstandingNgn)}
        </p>
      ) : null}
      {byMaterial.length > 0 ? (
        <table className={`${TBL} mb-3`}>
          <thead>
            <tr className="bg-slate-50">
              <th className={`${TH} w-[28%]`}>Material</th>
              <th className={`${THR} w-[12%]`}>Lines</th>
              <th className={`${THR} w-[22%]`}>Received</th>
              <th className={`${THR} w-[22%]`}>Value ₦</th>
            </tr>
          </thead>
          <tbody>
            {byMaterial.map((m) => (
              <tr key={m.key}>
                <td className={TD}>{m.label}</td>
                <td className={TDR}>{m.lineCount}</td>
                <td className={TDR}>
                  {fmtNum(m.received)} {m.receivedUnit}
                </td>
                <td className={TFR}>{m.totalValueNgn > 0 ? fmtMoney(m.totalValueNgn) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {byGauge.length > 0 ? (
        <table className={`${TBL} mb-3`}>
          <thead>
            <tr className="bg-slate-50">
              <th className={`${TH} w-[22%]`}>Material</th>
              <th className={`${TH} w-[18%]`}>Gauge / type</th>
              <th className={`${THR} w-[10%]`}>Lines</th>
              <th className={`${THR} w-[22%]`}>Received</th>
              <th className={`${THR} w-[22%]`}>Value ₦</th>
            </tr>
          </thead>
          <tbody>
            {byGauge.map((g, i) => (
              <tr key={`${g.material}-${g.gaugeLabel}-${i}`}>
                <td className={TD}>{g.material}</td>
                <td className={TD}>{g.gaugeLabel}</td>
                <td className={TDR}>{g.lineCount}</td>
                <td className={TDR}>
                  {fmtNum(g.received)} {g.receivedUnit}
                </td>
                <td className={TFR}>{g.totalValueNgn > 0 ? fmtMoney(g.totalValueNgn) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {observations.length > 0 ? (
        <div className="mb-2">
          <p className="text-ui-xs font-bold text-slate-700 mb-0.5">Observations</p>
          <ul className="text-ui-xs text-slate-700 list-disc pl-4 space-y-0.5">
            {observations.map((t, i) => (
              <li key={`o-${i}`}>{t}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {recommendations.length > 0 ? (
        <div className="mb-2">
          <p className="text-ui-xs font-bold text-slate-700 mb-0.5">Recommendations</p>
          <ul className="text-ui-xs text-slate-700 list-disc pl-4 space-y-0.5">
            {recommendations.map((t, i) => (
              <li key={`r-${i}`}>{t}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function CoilReceiptSection({ title, section }) {
  if (!section?.groups?.length) {
    return (
      <section className="mb-6 break-inside-avoid">
        <h3 className="text-xs font-black uppercase text-zarewa-teal mb-2">{title}</h3>
        <p className="text-[10px] text-slate-500 italic">No GRN receipts this period.</p>
      </section>
    );
  }
  return (
    <section className="mb-6">
      <h3 className="text-xs font-black uppercase text-zarewa-teal mb-2">{title}</h3>
      {section.groups.map((g) => (
        <div key={g.gaugeLabel} className="mb-4 break-inside-avoid">
          <p className="text-[10px] font-bold text-slate-800 mb-1">Gauge {g.gaugeLabel}</p>
          <table className={TBL}>
            <thead>
              <tr className="bg-slate-50">
                <th className={`${TH} w-[7%]`}>Date</th>
                <th className={`${TH} w-[14%]`}>Supplier</th>
                <th className={`${TH} w-[7%]`}>Coil</th>
                <th className={`${TH} w-[5%]`}>Col</th>
                <th className={`${TH} w-[6%]`}>PO</th>
                <th className={`${THR} w-[8%]`}>Recv kg</th>
                <th className={`${THR} w-[8%]`}>Order kg</th>
                <th className={`${THR} w-[8%]`}>₦/kg</th>
                <th className={`${THR} w-[10%]`}>Total ₦</th>
                <th className={`${THR} w-[9%]`}>Paid</th>
                <th className={`${THR} w-[9%]`}>Outst.</th>
                <th className={`${TH} w-[9%]`}>Remark</th>
              </tr>
            </thead>
            <tbody>
              {g.rows.map((r, i) => (
                <tr key={`${r.coilNo}-${i}`}>
                  <td className={TDM}>{r.txnDateDisplay || r.txnDate}</td>
                  <td className={`${TD} truncate`} title={r.supplier}>
                    {r.supplier}
                  </td>
                  <td className={TDM}>{r.coilNoDisplay}</td>
                  <td className={TD}>{r.colour}</td>
                  <td className={TDM}>{r.poIdDisplay}</td>
                  <td className={TDR}>{fmtNum(r.receivedKg)}</td>
                  <td className={TDR}>{r.orderKg != null ? fmtNum(r.orderKg) : '—'}</td>
                  <td className={TDR}>{r.kgAmountNgn != null ? fmtMoney(r.kgAmountNgn) : '—'}</td>
                  <td className={TFR}>{r.totalNgn > 0 ? fmtMoney(r.totalNgn) : '—'}</td>
                  <PaymentCells r={r} />
                  <td className={`${TD} text-[7.5px] leading-tight`}>{r.remark}</td>
                </tr>
              ))}
              <tr className="bg-slate-100/90">
                <td className={TF} colSpan={5}>
                  Subtotal ({g.subtotals.lineCount})
                </td>
                <td className={TFR}>{fmtNum(g.subtotals.totalReceived)}</td>
                <td className={TF} colSpan={2} />
                <td className={TFR}>{g.subtotals.totalValueNgn > 0 ? fmtMoney(g.subtotals.totalValueNgn) : '—'}</td>
                <td className={TF} colSpan={3} />
              </tr>
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
}

function QtyReceiptSection({ title, section, unitDefault }) {
  if (!section?.groups?.length) {
    return (
      <section className="mb-6 break-inside-avoid">
        <h3 className="text-xs font-black uppercase text-zarewa-teal mb-2">{title}</h3>
        <p className="text-[10px] text-slate-500 italic">No GRN receipts this period.</p>
      </section>
    );
  }
  const isAccessory = unitDefault === 'units';
  return (
    <section className="mb-6">
      <h3 className="text-xs font-black uppercase text-zarewa-teal mb-2">{title}</h3>
      {section.groups.map((g) => (
        <div key={g.gaugeLabel || g.typeKey} className="mb-4 break-inside-avoid">
          <p className="text-[10px] font-bold text-slate-800 mb-1">{g.gaugeLabel || g.typeLabel}</p>
          <table className={TBL}>
            <thead>
              <tr className="bg-slate-50">
                <th className={`${TH} w-[7%]`}>Date</th>
                <th className={`${TH} w-[14%]`}>Supplier</th>
                <th className={`${TH} w-[7%]`}>Ref</th>
                <th className={`${TH} w-[14%]`}>Item</th>
                <th className={`${TH} w-[6%]`}>PO</th>
                <th className={`${THR} w-[9%]`}>Received</th>
                <th className={`${THR} w-[9%]`}>Ordered</th>
                <th className={`${THR} w-[8%]`}>Unit ₦</th>
                <th className={`${THR} w-[10%]`}>Total ₦</th>
                <th className={`${THR} w-[8%]`}>Paid</th>
                <th className={`${THR} w-[8%]`}>Outst.</th>
                <th className={`${TH} w-[10%]`}>Remark</th>
              </tr>
            </thead>
            <tbody>
              {g.rows.map((r, i) => (
                <tr key={`${r.coilNo}-${i}`}>
                  <td className={TDM}>{r.txnDateDisplay || r.txnDate}</td>
                  <td className={`${TD} truncate`} title={r.supplier}>
                    {r.supplier}
                  </td>
                  <td className={TDM}>{r.coilNoDisplay}</td>
                  <td className={`${TD} truncate`} title={r.productName}>
                    {r.productName}
                  </td>
                  <td className={TDM}>{r.poIdDisplay}</td>
                  <td className={TDR}>
                    {fmtNum(r.receivedQty, isAccessory ? 0 : 2)} {r.unitLabel || unitDefault}
                  </td>
                  <td className={TDR}>
                    {r.orderQty != null
                      ? `${fmtNum(r.orderQty, isAccessory ? 0 : 2)} ${r.unitLabel || unitDefault}`
                      : '—'}
                  </td>
                  <td className={TDR}>{r.kgAmountNgn != null ? fmtMoney(r.kgAmountNgn) : '—'}</td>
                  <td className={TFR}>{r.totalNgn > 0 ? fmtMoney(r.totalNgn) : '—'}</td>
                  <PaymentCells r={r} />
                  <td className={`${TD} text-[7.5px] leading-tight`}>{r.remark}</td>
                </tr>
              ))}
              <tr className="bg-slate-100/90">
                <td className={TF} colSpan={5}>
                  Subtotal ({g.subtotals.lineCount})
                </td>
                <td className={TFR}>{fmtNum(g.subtotals.totalReceived, isAccessory ? 0 : 2)}</td>
                <td className={TF} colSpan={2} />
                <td className={TFR}>{g.subtotals.totalValueNgn > 0 ? fmtMoney(g.subtotals.totalValueNgn) : '—'}</td>
                <td className={TF} colSpan={3} />
              </tr>
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
}

export function PurchaseReportPrintContent({ report, branchLabel, periodLabel }) {
  if (!report) return null;

  return (
    <div className="text-slate-800 space-y-2">
      <div className="mb-4 border-b border-slate-200 pb-2">
        <p className="text-[10px] font-bold text-slate-600">{branchLabel}</p>
        <p className="text-[10px] text-slate-600">{periodLabel}</p>
        <p className="text-ui-xs text-slate-500 mt-1">
          Coil / PO = last 4–5 digits. Paid &amp; outstanding on first line per PO. Amber = balance due supplier.
        </p>
      </div>
      <CoilReceiptSection title="Aluminium purchases" section={report.aluminium} />
      <CoilReceiptSection title="Aluzinc purchases" section={report.aluzinc} />
      {report.unclassifiedCoil?.groups?.length ? (
        <CoilReceiptSection title="Coil (check material on GRN)" section={report.unclassifiedCoil} />
      ) : null}
      <QtyReceiptSection title="Stone-coated purchases" section={report.stoneCoated} unitDefault="m" />
      <QtyReceiptSection title="Accessory purchases" section={report.accessories} unitDefault="units" />
      <SummarySection summary={report.summary} />
    </div>
  );
}
