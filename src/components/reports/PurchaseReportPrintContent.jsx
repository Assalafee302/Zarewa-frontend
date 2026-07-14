import React from 'react';
import { formatNgn } from '../../Data/mockData';
import {
  STATEMENT_TBL,
  STATEMENT_TH,
  STATEMENT_TD,
  STATEMENT_TD_NUM,
  STATEMENT_TF,
  STATEMENT_TF_NUM,
  STATEMENT_H3,
  STATEMENT_SUB,
} from './StatementStyleReportShell';

const TBL = `${STATEMENT_TBL} table-fixed`;
const TH = STATEMENT_TH;
const THR = `${STATEMENT_TH} text-right`;
const TD = `${STATEMENT_TD} break-words`;
const TDR = STATEMENT_TD_NUM;
const TDM = `${STATEMENT_TD_NUM} font-mono`;
const TF = STATEMENT_TF;
const TFR = STATEMENT_TF_NUM;

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
    <section className="mb-6 mt-6 break-before-page break-inside-avoid border-t border-slate-300 pt-4">
      <h3 className={STATEMENT_H3}>Summary</h3>
      {payments.receivedValueNgn > 0 || payments.paidInPeriodNgn > 0 ? (
        <p className="mb-2 text-[12px] text-slate-700" style={{ color: '#334155' }}>
          <strong>GRN value:</strong> {fmtMoney(payments.receivedValueNgn)} &nbsp;|&nbsp;{' '}
          <strong>Paid to suppliers:</strong> {fmtMoney(payments.paidInPeriodNgn)} &nbsp;|&nbsp;{' '}
          <strong>PO outstanding:</strong> {fmtMoney(payments.poOutstandingNgn)}
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
          <p className={STATEMENT_SUB}>Observations</p>
          <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-slate-700">
            {observations.map((t, i) => (
              <li key={`o-${i}`}>{t}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {recommendations.length > 0 ? (
        <div className="mb-2">
          <p className={STATEMENT_SUB}>Recommendations</p>
          <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-slate-700">
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
        <h3 className={STATEMENT_H3}>{title}</h3>
        <p className="text-[11px] italic text-slate-500">No GRN receipts this period.</p>
      </section>
    );
  }
  return (
    <section className="mb-6">
      <h3 className={STATEMENT_H3}>{title}</h3>
      {section.groups.map((g) => (
        <div key={g.gaugeLabel} className="mb-4 break-inside-avoid">
          <p className={STATEMENT_SUB}>Gauge {g.gaugeLabel}</p>
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
        <h3 className={STATEMENT_H3}>{title}</h3>
        <p className="text-[11px] italic text-slate-500">No GRN receipts this period.</p>
      </section>
    );
  }
  const isAccessory = unitDefault === 'units';
  return (
    <section className="mb-6">
      <h3 className={STATEMENT_H3}>{title}</h3>
      {section.groups.map((g) => (
        <div key={g.gaugeLabel || g.typeKey} className="mb-4 break-inside-avoid">
          <p className={STATEMENT_SUB}>{g.gaugeLabel || g.typeLabel}</p>
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

export function PurchaseReportPrintContent({ report }) {
  if (!report) return null;

  return (
    <div className="space-y-2 text-slate-800">
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
