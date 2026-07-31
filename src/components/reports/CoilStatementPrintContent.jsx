import React from 'react';
import {
  STATEMENT_TBL,
  STATEMENT_TH,
  STATEMENT_TD,
  STATEMENT_TD_NUM,
  STATEMENT_TF,
  STATEMENT_TF_NUM,
  STATEMENT_H3,
} from './StatementStyleReportShell';

const TBL = `${STATEMENT_TBL} table-fixed`;
const TH = `${STATEMENT_TH} whitespace-nowrap`;
const TD = STATEMENT_TD;
const TDR = STATEMENT_TD_NUM;
const TF = STATEMENT_TF;
const TFR = STATEMENT_TF_NUM;

function fmtNum(v, digits = 1) {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function MasterGrid({ statement }) {
  const cells = [
    ['Colour', statement.colour],
    ['Gauge', statement.gaugeLabel],
    ['Material', statement.materialTypeName],
    ['Product', statement.productID],
    ['Supplier', statement.supplierName],
    ['PO', statement.poID],
    ['Status', statement.status],
    ['Location', statement.location],
    ['Parent coil', statement.parentCoilNo],
    ['Stock form', statement.stockForm],
    ['Received', statement.receivedAt],
    ['Supplier kg/m', statement.supplierConversionKgPerM],
  ];
  if (statement.supplierExpectedMeters != null) {
    cells.push(['Supplier expected m', fmtNum(statement.supplierExpectedMeters, 1)]);
  }

  return (
    <section className="mb-4 break-inside-avoid">
      <h3 className={STATEMENT_H3}>Coil details</h3>
      <table className={TBL}>
        <tbody>
          {Array.from({ length: Math.ceil(cells.length / 2) }, (_, rowIdx) => {
            const left = cells[rowIdx * 2];
            const right = cells[rowIdx * 2 + 1];
            return (
              <tr key={rowIdx}>
                <td className={`${TF} w-[14%]`}>{left?.[0]}</td>
                <td className={TD}>{left?.[1] ?? '—'}</td>
                <td className={`${TF} w-[14%]`}>{right?.[0] || ''}</td>
                <td className={TD}>{right ? right[1] : ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {statement.materialOriginNote ? (
        <p className="mt-1.5 text-[10px] text-slate-600">Origin note: {statement.materialOriginNote}</p>
      ) : null}
    </section>
  );
}

function BalancesSection({ statement }) {
  const b = statement.balanceLabels || {};
  const totals = statement.totals || {};
  return (
    <section className="mb-4 break-inside-avoid">
      <h3 className={STATEMENT_H3}>Stock balances (kg)</h3>
      <table className={TBL}>
        <thead>
          <tr className="bg-slate-50">
            <th className={TH}>Received</th>
            <th className={`${TH} text-right`}>Prod used</th>
            <th className={`${TH} text-right`}>Incident/scrap</th>
            <th className={`${TH} text-right`}>Book used</th>
            <th className={`${TH} text-right`}>On-hand</th>
            <th className={`${TH} text-right`}>Reserved</th>
            <th className={`${TH} text-right`}>Free</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={TDR}>{b.received}</td>
            <td className={TDR}>{b.productionUsed}</td>
            <td className={TDR}>{b.incidentScrap}</td>
            <td className={TDR}>{b.used}</td>
            <td className={TDR}>{b.onHand}</td>
            <td className={TDR}>{b.reserved}</td>
            <td className={TFR}>{b.free}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-1.5 text-[10px] text-slate-600 tabular-nums">
        Book: received {b.received} − used {b.used} = on-hand {b.onHand}
        {' · '}
        on-hand {b.onHand} − reserved {b.reserved} = free {b.free}
        {totals.jobsConsumedKgSum != null ? (
          <>
            {' · '}
            Job consumed sum {fmtNum(totals.jobsConsumedKgSum, 2)}
            {totals.gapKg != null && Math.abs(totals.gapKg) > 0.05
              ? ` · Gap vs book ${fmtNum(Math.abs(totals.gapKg), 2)}`
              : ' · Aligned with book'}
          </>
        ) : null}
      </p>
    </section>
  );
}

function ConversionSummary({ statement }) {
  const c = statement.conversionSummary || {};
  return (
    <section className="mb-4 break-inside-avoid">
      <h3 className={STATEMENT_H3}>Conversion (kg/m)</h3>
      <table className={TBL}>
        <thead>
          <tr className="bg-slate-50">
            <th className={TH}>Purchase / supplier</th>
            <th className={`${TH} text-right`}>Avg actual</th>
            <th className={`${TH} text-right`}>Avg standard</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={TD}>{c.purchase}</td>
            <td className={TDR}>{c.averageActual}</td>
            <td className={TDR}>{c.averageStandard}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function ProductionSection({ statement }) {
  const rows = statement.productionRows || [];
  const totals = statement.totals || {};
  return (
    <section className="mb-4">
      <h3 className={STATEMENT_H3}>Production on this coil</h3>
      {rows.length === 0 ? (
        <p className="text-[11px] text-slate-500 italic">No production jobs linked to this coil.</p>
      ) : (
        <table className={TBL}>
          <thead>
            <tr className="bg-slate-50">
              <th className={`${TH} w-[7%]`}>Date</th>
              <th className={`${TH} w-[9%]`}>Cutting list</th>
              <th className={`${TH} w-[8%]`}>Job</th>
              <th className={`${TH} w-[8%]`}>Quotation</th>
              <th className={`${TH} w-[12%]`}>Customer</th>
              <th className={`${TH} w-[8%]`}>Status</th>
              <th className={`${TH} text-right w-[7%]`}>Open kg</th>
              <th className={`${TH} text-right w-[7%]`}>Close kg</th>
              <th className={`${TH} text-right w-[7%]`}>Used kg</th>
              <th className={`${TH} text-right w-[7%]`}>Metres</th>
              <th className={`${TH} text-right w-[6%]`}>kg/m</th>
              <th className={`${TH} w-[8%]`}>Alert</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.jobID}-${r.cuttingListId}-${i}`}>
                <td className={TD}>{r.date}</td>
                <td className={`${TD} font-mono`}>{r.cuttingListId}</td>
                <td className={`${TD} font-mono`}>{r.jobID}</td>
                <td className={`${TD} font-mono`}>{r.quotationRef}</td>
                <td className={TD} title={r.customer}>
                  {r.customer}
                </td>
                <td className={TD}>{r.jobStatus}</td>
                <td className={TDR}>{fmtNum(r.openingKg, 1)}</td>
                <td className={TDR}>{fmtNum(r.closingKg, 1)}</td>
                <td className={TDR}>{fmtNum(r.kgUsed, 2)}</td>
                <td className={TDR}>{fmtNum(r.meters, 1)}</td>
                <td className={TDR}>{r.conversion}</td>
                <td className={TD}>{r.alertState}</td>
              </tr>
            ))}
            <tr className="bg-slate-100/90">
              <td className={TF} colSpan={8}>
                Totals ({totals.productionLineCount || rows.length} job
                {(totals.productionLineCount || rows.length) === 1 ? '' : 's'})
              </td>
              <td className={TFR}>{fmtNum(totals.totalKgUsedOnJobs, 2)}</td>
              <td className={TFR}>{fmtNum(totals.totalMeters, 1)}</td>
              <td className={TF} colSpan={2} />
            </tr>
          </tbody>
        </table>
      )}
    </section>
  );
}

function ConversionHistorySection({ statement }) {
  const rows = statement.conversionRows || [];
  if (!rows.length) return null;
  return (
    <section className="mb-4 break-inside-avoid">
      <h3 className={STATEMENT_H3}>Conversion checks</h3>
      <table className={TBL}>
        <thead>
          <tr className="bg-slate-50">
            <th className={TH}>When</th>
            <th className={TH}>Ref</th>
            <th className={`${TH} text-right`}>Actual</th>
            <th className={`${TH} text-right`}>Standard</th>
            <th className={`${TH} text-right`}>Purchase</th>
            <th className={TH}>Alert</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.ref}-${i}`}>
              <td className={TD}>{r.date}</td>
              <td className={`${TD} font-mono`}>{r.ref}</td>
              <td className={TDR}>{r.actual}</td>
              <td className={TDR}>{r.standard}</td>
              <td className={TDR}>{r.purchase}</td>
              <td className={TD}>{r.alertState}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function MovementSection({ statement }) {
  const rows = statement.movementRows || [];
  if (!rows.length) return null;
  return (
    <section className="mb-2">
      <h3 className={STATEMENT_H3}>Movement history</h3>
      <table className={TBL}>
        <thead>
          <tr className="bg-slate-50">
            <th className={`${TH} w-[12%]`}>When</th>
            <th className={`${TH} w-[14%]`}>Type</th>
            <th className={TH}>Detail</th>
            <th className={`${TH} w-[12%]`}>Ref</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.date}-${i}`}>
              <td className={TD}>{r.date}</td>
              <td className={TD}>{r.title}</td>
              <td className={TD} title={r.detail}>
                {r.detail}
              </td>
              <td className={`${TD} font-mono`}>{r.ref}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** Printable body for a single-coil statement. */
export function CoilStatementPrintContent({ statement }) {
  if (!statement) return null;
  return (
    <div className="space-y-1 text-slate-800">
      <MasterGrid statement={statement} />
      <BalancesSection statement={statement} />
      <ConversionSummary statement={statement} />
      <ProductionSection statement={statement} />
      <ConversionHistorySection statement={statement} />
      <MovementSection statement={statement} />
    </div>
  );
}
