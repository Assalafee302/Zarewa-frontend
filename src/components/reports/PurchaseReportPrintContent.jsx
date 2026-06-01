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

function SummarySection({ summary }) {
  if (!summary) return null;
  const { byMaterial = [], byGauge = [], payments = {}, observations = [], recommendations = [] } = summary;

  return (
    <section className="mb-6 break-inside-avoid">
      <h3 className="text-xs font-black uppercase text-[#134e4a] mb-2">Summary</h3>
      {payments.receivedValueNgn > 0 || payments.paidInPeriodNgn > 0 ? (
        <p className="text-[9px] text-slate-700 mb-2">
          GRN value in period: {fmtMoney(payments.receivedValueNgn)} · Paid to suppliers:{' '}
          {fmtMoney(payments.paidInPeriodNgn)} · PO outstanding (listed): {fmtMoney(payments.poOutstandingNgn)}
        </p>
      ) : null}
      {byMaterial.length > 0 ? (
        <table className="w-full border-collapse mb-3">
          <thead>
            <tr className="bg-slate-50">
              <th className={TH}>Material</th>
              <th className={`${TH} text-right`}>Lines</th>
              <th className={`${TH} text-right`}>Received</th>
              <th className={`${TH} text-right`}>Value ₦</th>
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
        <table className="w-full border-collapse mb-3">
          <thead>
            <tr className="bg-slate-50">
              <th className={TH}>Material</th>
              <th className={TH}>Gauge / type</th>
              <th className={`${TH} text-right`}>Lines</th>
              <th className={`${TH} text-right`}>Received</th>
              <th className={`${TH} text-right`}>Value ₦</th>
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
          <p className="text-[9px] font-bold text-slate-700 mb-0.5">Observations</p>
          <ul className="text-[9px] text-slate-700 list-disc pl-4 space-y-0.5">
            {observations.map((t, i) => (
              <li key={`o-${i}`}>{t}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {recommendations.length > 0 ? (
        <div className="mb-2">
          <p className="text-[9px] font-bold text-slate-700 mb-0.5">Recommendations</p>
          <ul className="text-[9px] text-slate-700 list-disc pl-4 space-y-0.5">
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
        <h3 className="text-xs font-black uppercase text-[#134e4a] mb-2">{title}</h3>
        <p className="text-[10px] text-slate-500 italic">No GRN receipts this period.</p>
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
                <th className={TH}>Supplier</th>
                <th className={TH}>Coil</th>
                <th className={TH}>Col</th>
                <th className={TH}>PO</th>
                <th className={`${TH} text-right`}>Recv kg</th>
                <th className={`${TH} text-right`}>Order kg</th>
                <th className={`${TH} text-right`}>₦/kg</th>
                <th className={`${TH} text-right`}>Total ₦</th>
                <th className={TH}>Remark</th>
              </tr>
            </thead>
            <tbody>
              {g.rows.map((r, i) => (
                <tr key={`${r.coilNo}-${i}`}>
                  <td className={TD}>{r.txnDateDisplay || r.txnDate}</td>
                  <td className={TD}>{r.supplier}</td>
                  <td className={`${TD} font-mono`}>{r.coilNoDisplay}</td>
                  <td className={TD}>{r.colour}</td>
                  <td className={`${TD} font-mono`}>{r.poIdDisplay}</td>
                  <td className={TDR}>{fmtNum(r.receivedKg)}</td>
                  <td className={TDR}>{r.orderKg != null ? fmtNum(r.orderKg) : '—'}</td>
                  <td className={TDR}>{r.kgAmountNgn != null ? fmtMoney(r.kgAmountNgn) : '—'}</td>
                  <td className={TFR}>{r.totalNgn > 0 ? fmtMoney(r.totalNgn) : '—'}</td>
                  <td className={`${TD} text-[8px]`}>{r.remark}</td>
                </tr>
              ))}
              <tr className="bg-slate-100/90">
                <td className={TF} colSpan={5}>
                  Subtotal ({g.subtotals.lineCount} lines)
                </td>
                <td className={TFR}>{fmtNum(g.subtotals.totalReceived)}</td>
                <td className={TF} colSpan={2} />
                <td className={TFR}>{g.subtotals.totalValueNgn > 0 ? fmtMoney(g.subtotals.totalValueNgn) : '—'}</td>
                <td className={TF} />
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
        <h3 className="text-xs font-black uppercase text-[#134e4a] mb-2">{title}</h3>
        <p className="text-[10px] text-slate-500 italic">No GRN receipts this period.</p>
      </section>
    );
  }
  const isAccessory = unitDefault === 'units';
  return (
    <section className="mb-6">
      <h3 className="text-xs font-black uppercase text-[#134e4a] mb-2">{title}</h3>
      {section.groups.map((g) => (
        <div key={g.gaugeLabel || g.typeKey} className="mb-4 break-inside-avoid">
          <p className="text-[10px] font-bold text-slate-800 mb-1">{g.gaugeLabel || g.typeLabel}</p>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className={TH}>Date</th>
                <th className={TH}>Supplier</th>
                <th className={TH}>Ref</th>
                <th className={TH}>Item</th>
                <th className={TH}>PO</th>
                <th className={`${TH} text-right`}>Received</th>
                <th className={`${TH} text-right`}>Ordered</th>
                <th className={`${TH} text-right`}>Unit ₦</th>
                <th className={`${TH} text-right`}>Total ₦</th>
                <th className={TH}>Remark</th>
              </tr>
            </thead>
            <tbody>
              {g.rows.map((r, i) => (
                <tr key={`${r.coilNo}-${i}`}>
                  <td className={TD}>{r.txnDateDisplay || r.txnDate}</td>
                  <td className={TD}>{r.supplier}</td>
                  <td className={`${TD} font-mono text-[8px]`}>{r.coilNoDisplay}</td>
                  <td className={TD}>{r.productName}</td>
                  <td className={`${TD} font-mono`}>{r.poIdDisplay}</td>
                  <td className={TDR}>
                    {fmtNum(r.receivedQty, isAccessory ? 0 : 2)} {r.unitLabel || unitDefault}
                  </td>
                  <td className={TDR}>
                    {r.orderQty != null ? `${fmtNum(r.orderQty, isAccessory ? 0 : 2)} ${r.unitLabel || unitDefault}` : '—'}
                  </td>
                  <td className={TDR}>{r.kgAmountNgn != null ? fmtMoney(r.kgAmountNgn) : '—'}</td>
                  <td className={TFR}>{r.totalNgn > 0 ? fmtMoney(r.totalNgn) : '—'}</td>
                  <td className={`${TD} text-[8px]`}>{r.remark}</td>
                </tr>
              ))}
              <tr className="bg-slate-100/90">
                <td className={TF} colSpan={5}>
                  Subtotal ({g.subtotals.lineCount} lines)
                </td>
                <td className={TFR}>{fmtNum(g.subtotals.totalReceived, isAccessory ? 0 : 2)}</td>
                <td className={TF} colSpan={2} />
                <td className={TFR}>{g.subtotals.totalValueNgn > 0 ? fmtMoney(g.subtotals.totalValueNgn) : '—'}</td>
                <td className={TF} />
              </tr>
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
}

function PaymentsSection({ payments }) {
  const supplier = payments?.supplierPayments || [];
  const poBal = payments?.poBalances || [];
  if (!supplier.length && !poBal.length) return null;

  return (
    <section className="mb-6 break-inside-avoid">
      <h3 className="text-xs font-black uppercase text-slate-700 mb-2">Payments &amp; outstanding</h3>
      {supplier.length > 0 ? (
        <>
          <p className="text-[9px] font-bold text-slate-700 mb-1">Supplier payments in period</p>
          <table className="w-full border-collapse mb-3">
            <thead>
              <tr className="bg-slate-50">
                <th className={TH}>Date</th>
                <th className={TH}>Supplier</th>
                <th className={`${TH} text-right`}>Amount</th>
                <th className={TH}>PO / ref</th>
                <th className={TH}>Bank ref</th>
              </tr>
            </thead>
            <tbody>
              {supplier.map((p, i) => (
                <tr key={`${p.sourceIdFull}-${i}`}>
                  <td className={TD}>{p.paidDateISO?.slice(5).replace('-', '/') || p.paidDateISO}</td>
                  <td className={TD}>{p.supplier}</td>
                  <td className={TFR}>{fmtMoney(p.amountNgn)}</td>
                  <td className={TD}>{p.sourceIdDisplay}</td>
                  <td className={TD}>{p.reference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
      {poBal.length > 0 ? (
        <>
          <p className="text-[9px] font-bold text-slate-700 mb-1">PO supplier balance (orders with receipts in period)</p>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className={TH}>PO</th>
                <th className={TH}>Supplier</th>
                <th className={TH}>Status</th>
                <th className={`${TH} text-right`}>PO value</th>
                <th className={`${TH} text-right`}>Paid total</th>
                <th className={`${TH} text-right`}>Paid period</th>
                <th className={`${TH} text-right`}>Outstanding</th>
                <th className={TH}>Remark</th>
              </tr>
            </thead>
            <tbody>
              {poBal.map((p) => (
                <tr key={p.poId}>
                  <td className={`${TD} font-mono`}>{p.poIdDisplay}</td>
                  <td className={TD}>{p.supplier}</td>
                  <td className={TD}>{p.status}</td>
                  <td className={TFR}>{fmtMoney(p.poValueNgn)}</td>
                  <td className={TFR}>{fmtMoney(p.supplierPaidNgn)}</td>
                  <td className={TFR}>{p.paidInPeriodNgn > 0 ? fmtMoney(p.paidInPeriodNgn) : '—'}</td>
                  <td className={`${TFR}${p.outstandingNgn > 0 ? ' text-amber-900 font-semibold' : ''}`}>
                    {fmtMoney(p.outstandingNgn)}
                  </td>
                  <td className={`${TD} text-[8px]`}>{p.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
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
        <p className="text-[9px] text-slate-500 mt-1">
          Goods received (GRN) in period by material and gauge. Coil: kg and ₦/kg. Stone: metres. Accessories: units.
        </p>
      </div>
      <SummarySection summary={report.summary} />
      <CoilReceiptSection title="Aluminium purchases" section={report.aluminium} />
      <CoilReceiptSection title="Aluzinc purchases" section={report.aluzinc} />
      {report.unclassifiedCoil?.groups?.length ? (
        <CoilReceiptSection title="Coil (check material on GRN)" section={report.unclassifiedCoil} />
      ) : null}
      <QtyReceiptSection title="Stone-coated purchases" section={report.stoneCoated} unitDefault="m" />
      <QtyReceiptSection title="Accessory purchases" section={report.accessories} unitDefault="units" />
      <PaymentsSection payments={report.payments} />
    </div>
  );
}
