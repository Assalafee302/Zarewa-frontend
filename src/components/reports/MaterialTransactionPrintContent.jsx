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
const TH = `${STATEMENT_TH} whitespace-nowrap`;
const THR = `${STATEMENT_TH} text-right whitespace-nowrap`;
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

function SummarySection({ summary }) {
  if (!summary) return null;
  const { byMaterial = [], byGauge = [], notes = {}, observations = [], recommendations = [] } = summary;

  return (
    <section className="mb-6 break-before-page break-inside-avoid border-t-2 border-slate-300 pt-4 mt-6">
      <h3 className={STATEMENT_H3}>Summary</h3>

      {byMaterial.length > 0 ? (
        <>
          <p className={STATEMENT_SUB}>By material</p>
          <table className={`${TBL} mb-3`}>
            <thead>
              <tr className="bg-slate-50">
                <th className={TH}>Section</th>
                <th className={`${TH} text-right`}>Lines</th>
                <th className={`${TH} text-right`}>Kg used</th>
                <th className={`${TH} text-right`}>Metres</th>
                <th className={`${TH} text-right`}>Offcut kg</th>
                <th className={`${TH} text-right`}>Qty</th>
                <th className={`${TH} text-right`}>Paid (net)</th>
              </tr>
            </thead>
            <tbody>
              {byMaterial.map((m) => (
                <tr key={m.key}>
                  <td className={TD}>{m.label}</td>
                  <td className={TDR}>{m.lineCount}</td>
                  <td className={TDR}>{m.kgUsed != null ? fmtNum(m.kgUsed) : '—'}</td>
                  <td className={TDR}>{m.metres != null ? fmtNum(m.metres) : '—'}</td>
                  <td className={TDR}>{m.offcutKg != null && m.offcutKg > 0 ? fmtNum(m.offcutKg) : '—'}</td>
                  <td className={TDR}>{m.qtyIssued != null ? fmtNum(m.qtyIssued, 0) : '—'}</td>
                  <td className={TFR}>{m.paidNetNgn > 0 ? fmtMoney(m.paidNetNgn) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      {byGauge.length > 0 ? (
        <>
          <p className={STATEMENT_SUB}>By gauge</p>
          <table className={`${TBL} mb-3`}>
            <thead>
              <tr className="bg-slate-50">
                <th className={TH}>Material</th>
                <th className={TH}>Gauge</th>
                <th className={`${TH} text-right`}>Lines</th>
                <th className={`${TH} text-right`}>Kg</th>
                <th className={`${TH} text-right`}>Metres</th>
                <th className={`${TH} text-right`}>kg/m</th>
                <th className={`${TH} text-right`}>Stone m used</th>
              </tr>
            </thead>
            <tbody>
              {byGauge.map((g, i) => (
                <tr key={`${g.material}-${g.gaugeLabel}-${i}`}>
                  <td className={TD}>{g.material}</td>
                  <td className={TD}>{g.gaugeLabel}</td>
                  <td className={TDR}>{g.lineCount}</td>
                  <td className={TDR}>{g.kgUsed != null ? fmtNum(g.kgUsed) : '—'}</td>
                  <td className={TDR}>{g.metres != null ? fmtNum(g.metres) : '—'}</td>
                  <td className={TDR}>{g.avgKgM != null ? fmtNum(g.avgKgM) : '—'}</td>
                  <td className={TDR}>{g.metresUsed != null ? fmtNum(g.metresUsed) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      <p className="text-ui-xs text-slate-600 mb-2">
        {notes.balanceGapCount > 0 ? `Coil balance gaps: ${notes.balanceGapCount}. ` : ''}
        {notes.stoneGapCount > 0 ? `Stone gaps: ${notes.stoneGapCount}. ` : ''}
        {notes.notProducedCount > 0 ? `Not produced: ${notes.notProducedCount} job(s). ` : ''}
        {notes.cancelledCount > 0 ? `Cancelled: ${notes.cancelledCount}. ` : ''}
        {!notes.balanceGapCount && !notes.stoneGapCount && !notes.notProducedCount && !notes.cancelledCount
          ? 'No gaps or backlog flags in notes.'
          : null}
      </p>

      {observations.length > 0 ? (
        <div className="mb-2">
          <p className={STATEMENT_SUB}>Observations</p>
          <ul className="text-ui-xs text-slate-700 list-disc pl-4 space-y-0.5">
            {observations.map((t, i) => (
              <li key={`o-${i}`}>{t}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {recommendations.length > 0 ? (
        <div className="mb-2">
          <p className={STATEMENT_SUB}>Recommendations</p>
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
        <h3 className={STATEMENT_H3}>{title}</h3>
        <p className="text-[11px] italic text-slate-500">No production lines this period.</p>
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
                  <td
                    className={`${TDR}${r.balanceBreak ? ' bg-amber-50 text-amber-900 font-semibold' : ''}`}
                    title={r.balanceNote || undefined}
                  >
                    {fmtNum(r.beforeKg)}
                  </td>
                  <td className={TDR}>{fmtNum(r.afterKg)}</td>
                  <td className={TDR}>{fmtNum(r.kgUsed)}</td>
                  <td className={TD}>{r.design}</td>
                  <td className={TDR}>{fmtNum(r.meters)}</td>
                  <td className={TDR}>{r.conversionKgM != null ? fmtNum(r.conversionKgM) : '—'}</td>
                  <td className={TDR}>{r.offcutKg != null ? fmtNum(r.offcutKg) : '—'}</td>
                  <td className={`${TD} text-ui-xs`}>{r.remark || '—'}</td>
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
        <h3 className={STATEMENT_H3}>Stone-coated (metre stock)</h3>
        <p className="text-[11px] italic text-slate-500">No stone metre draws this period.</p>
      </section>
    );
  }
  return (
    <section className="mb-6">
      <h3 className={STATEMENT_H3}>Stone-coated (metre stock)</h3>
      {stone.groups.map((g) => (
        <div key={g.gaugeLabel} className="mb-4 break-inside-avoid">
          <p className={STATEMENT_SUB}>Gauge {g.gaugeLabel}</p>
          <table className={TBL}>
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
                  <td
                    className={`${TDR}${r.balanceBreak ? ' bg-amber-50 text-amber-900 font-semibold' : ''}`}
                    title={r.balanceNote || undefined}
                  >
                    {r.beforeM != null ? fmtNum(r.beforeM) : '—'}
                  </td>
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
        <h3 className={STATEMENT_H3}>Accessories</h3>
        <p className="text-[11px] italic text-slate-500">No accessory issues this period.</p>
      </section>
    );
  }
  return (
    <section className="mb-6">
      <h3 className={STATEMENT_H3}>Accessories</h3>
      {accessories.groups.map((g) => (
        <div key={g.typeKey} className="mb-3 break-inside-avoid">
          <p className={STATEMENT_SUB}>{g.typeLabel}</p>
          <table className={TBL}>
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

function ListedNotProducedSection({ section }) {
  const rows = section?.rows || [];
  if (!rows.length) {
    return (
      <section className="mb-6">
        <h3 className={STATEMENT_H3}>Listed for production — not produced</h3>
        <p className="text-[10px] text-slate-500 italic">None in period.</p>
      </section>
    );
  }
  return (
    <section className="mb-6 break-inside-avoid">
      <h3 className={STATEMENT_H3}>
        Listed for production — not produced ({rows.length})
      </h3>
      <p className="mb-2 text-[11px] text-slate-500">
        Registered on the production queue in this period but job not completed.
      </p>
      <table className={TBL}>
        <thead>
          <tr className="bg-slate-50">
            <th className={`${TH} w-[10%]`}>Listed</th>
            <th className={`${TH} w-[8%]`}>Qt</th>
            <th className={`${TH} w-[26%]`}>Customer / project</th>
            <th className={`${TH} w-[14%]`}>Design</th>
            <th className={`${TH} w-[12%]`}>Status</th>
            <th className={`${THR} w-[10%]`}>Planned m</th>
            <th className={`${TH} w-[14%]`}>Machine</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.jobId}-${i}`}>
              <td className={TDM}>{r.txnDateDisplay || r.txnDate}</td>
              <td className={TDM}>{r.qtNoDisplay}</td>
              <td className={TD}>{r.customerProject}</td>
              <td className={TD}>{r.design}</td>
              <td className={TD}>{r.status}</td>
              <td className={TDR}>{fmtNum(r.plannedMeters)}</td>
              <td className={TD}>{r.machineName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function CancelledSection({ cancelled }) {
  const n = cancelled?.totals?.lineCount || 0;
  if (!n) {
    return (
      <section className="mb-6">
        <h3 className={STATEMENT_H3}>Cancelled production</h3>
        <p className="text-[10px] text-slate-500 italic">None in period.</p>
      </section>
    );
  }
  const coil = cancelled.coil || [];
  return (
    <section className="mb-6 break-inside-avoid">
      <h3 className={STATEMENT_H3}>Cancelled production ({n} lines)</h3>
      {coil.length > 0 ? (
        <table className={TBL}>
          <thead>
            <tr className="bg-amber-50">
              <th className={`${TH} w-[10%]`}>Date</th>
              <th className={`${TH} w-[8%]`}>Qt</th>
              <th className={`${TH} w-[28%]`}>Customer</th>
              <th className={`${TH} w-[8%]`}>Coil</th>
              <th className={`${TH} w-[10%]`}>Gauge</th>
              <th className={`${TH} w-[12%]`}>Status</th>
            </tr>
          </thead>
          <tbody>
            {coil.map((r, i) => (
              <tr key={`c-${i}`}>
                <td className={TDM}>{r.txnDateDisplay || r.txnDate}</td>
                <td className={TDM}>{r.qtNoDisplay}</td>
                <td className={TD}>{r.customerProject}</td>
                <td className={TDM}>{r.coilNoDisplay}</td>
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

export function MaterialTransactionPrintContent({ report }) {
  if (!report) return null;

  return (
    <div className="space-y-2 text-slate-800">
      <CoilSection title="Aluminium" section={report.aluminium} />
      <CoilSection title="Aluzinc" section={report.aluzinc} />
      {report.unclassifiedCoil?.groups?.length ? (
        <CoilSection title="Coil (check material on GRN)" section={report.unclassifiedCoil} />
      ) : null}
      {report.offcutProduction?.rows?.length ? (
        <section className="mb-6 break-inside-avoid">
          <h3 className={STATEMENT_H3}>Offcut / no coil allocation</h3>
          <table className={TBL}>
            <thead>
              <tr className="bg-slate-50">
                <th className={`${TH} w-[10%]`}>Date</th>
                <th className={`${TH} w-[8%]`}>Qt</th>
                <th className={`${TH} w-[30%]`}>Customer / project</th>
                <th className={`${TH} w-[14%]`}>Design</th>
                <th className={`${THR} w-[12%]`}>Metres</th>
                <th className={`${THR} w-[12%]`}>Kg</th>
              </tr>
            </thead>
            <tbody>
              {report.offcutProduction.rows.map((r, i) => (
                <tr key={`${r.jobId}-${i}`}>
                  <td className={TDM}>{r.txnDateDisplay || r.txnDate}</td>
                  <td className={TDM}>{r.qtNoDisplay}</td>
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
      <ListedNotProducedSection section={report.listedNotProduced} />
      <CancelledSection cancelled={report.cancelled} />
      <SummarySection summary={report.summary} />
    </div>
  );
}
