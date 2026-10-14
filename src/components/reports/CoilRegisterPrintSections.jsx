import React from 'react';
import { formatNgn } from '../../Data/mockData';
import { displayTxnDateShort } from '../../lib/reportDisplayFormat';
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
const TD = STATEMENT_TD;
const TDR = STATEMENT_TD_NUM;
const TF = STATEMENT_TF;
const TFR = STATEMENT_TF_NUM;

const kg = (v) => (v == null || v === '' ? '—' : Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 }));
const money = (v) => (v == null || v === '' ? '—' : formatNgn(v));
const date = (v) => (v ? displayTxnDateShort(v) || v : '—');
const familyLabel = (f) => (f === 'aluminium' ? 'Aluminium' : f === 'aluzinc' ? 'Aluzinc' : 'Coil');

function StockTotalsRow({ label, t }) {
  return (
    <tr className="bg-slate-100/90">
      <td className={TF} colSpan={2}>
        {label} ({t.coilCount} coils)
      </td>
      <td className={TFR}>{kg(t.kgGross)}</td>
      <td className={TFR}>{kg(t.spoolKg)}</td>
      <td className={TFR}>{kg(t.kgNet)}</td>
      <td className={TF} />
      <td className={TFR}>{money(t.valueGrossNgn)}</td>
      <td className={TFR}>{money(t.spoolValueNgn)}</td>
      <td className={TFR}>{money(t.valueNetNgn)}</td>
      <td className={TF} />
    </tr>
  );
}

function CoilStockTable({ title, stock }) {
  if (!stock) return null;
  return (
    <div className="mb-4 break-inside-avoid">
      <p className={STATEMENT_SUB}>
        {title} — {date(stock.asAtISO)}
        {stock.withReceivedDateCorrections ? ' (with received-date corrections)' : ''}
      </p>
      <table className={TBL}>
        <thead>
          <tr className="bg-slate-50">
            <th className={TH}>Coil</th>
            <th className={TH}>Gauge / colour</th>
            <th className={THR}>Gross kg</th>
            <th className={THR}>Spool kg</th>
            <th className={THR}>Net kg</th>
            <th className={THR}>₦/kg</th>
            <th className={THR}>Gross value</th>
            <th className={THR}>Spool value</th>
            <th className={THR}>Net value</th>
            <th className={TH}>Note</th>
          </tr>
        </thead>
        <tbody>
          {stock.rows.map((r) => (
            <tr key={r.coilNo}>
              <td className={`${TD} font-mono`}>{r.coilNo}</td>
              <td className={TD}>
                {familyLabel(r.family)} {r.gaugeLabel} {r.colour}
              </td>
              <td className={TDR}>{kg(r.kgGross)}</td>
              <td className={TDR}>{kg(r.spoolKg)}</td>
              <td className={TDR}>{kg(r.kgNet)}</td>
              <td className={TDR}>{kg(r.unitCostNgnPerKg)}</td>
              <td className={TDR}>{money(r.valueGrossNgn)}</td>
              <td className={TDR}>{money(r.spoolValueNgn)}</td>
              <td className={TDR}>{money(r.valueNetNgn)}</td>
              <td className={`${TD} text-ui-xs`}>
                {[r.costSource !== 'coil' ? `Cost: ${r.costSource}` : '', r.receivedDateNote].filter(Boolean).join(' · ') || '—'}
              </td>
            </tr>
          ))}
          <StockTotalsRow label="Aluminium" t={stock.byFamily.aluminium} />
          <StockTotalsRow label="Aluzinc" t={stock.byFamily.aluzinc} />
          <StockTotalsRow label="Total" t={stock.totals} />
        </tbody>
      </table>
    </div>
  );
}

function SimpleTable({ title, columns, rows, empty = 'None.' }) {
  return (
    <div className="mb-4 break-inside-avoid">
      <p className={STATEMENT_SUB}>{title}</p>
      {rows.length ? (
        <table className={TBL}>
          <thead>
            <tr className="bg-slate-50">
              {columns.map((c) => (
                <th key={c.key} className={c.right ? THR : TH}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c.key} className={c.right ? TDR : `${TD}${c.small ? ' text-ui-xs' : ''}`}>
                    {c.fmt ? c.fmt(r[c.key], r) : r[c.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-[11px] italic text-slate-500">{empty}</p>
      )}
    </div>
  );
}

/** Coil register v2: stock at start/end (gross, spool, net), PO kg, consumption, exceptions, gap lines. */
export function CoilRegisterPrintSections({ coilRegister, gapLines = [] }) {
  if (!coilRegister) return null;
  const { stock, purchaseOrders = [], consumption, exceptions = {} } = coilRegister;
  const poLineRows = purchaseOrders.flatMap((p) =>
    p.lines.map((l, i) => ({
      poID: i === 0 ? p.poID : '',
      supplier: i === 0 ? p.supplierName : '',
      spec: `${l.gauge} ${l.colour}`,
      kgOrdered: l.kgOrdered,
      kgReceived: l.kgReceived,
      diffKg: l.diffKg,
      coils: l.coils.map((c) => `${c.coilNo} (${kg(c.weightKg)} kg)`).join(', ') || '—',
      grnValue: i === 0 ? p.grnInPeriodValueNgn : null,
    }))
  );
  const exceptionRows = [
    ...(exceptions.priceVsPo || []).map((e) => ({
      kind: 'Coil price differs from PO',
      ref: `${e.coilNo} · ${e.poID}`,
      note: `Coil ₦${kg(e.coilUnitCostNgnPerKg)}/kg vs PO ₦${kg(e.poPricePerKgReceivedNgn)}/kg received (${e.differencePct > 0 ? '+' : ''}${e.differencePct}%). ${e.note}`,
    })),
    ...(exceptions.bookedLate || []).map((e) => ({
      kind: 'Received but booked late',
      ref: `${e.coilNo} · ${e.poID}`,
      note: `Booked ${date(e.bookedISO)}${e.correctedReceivedISO ? `; received ${date(e.correctedReceivedISO)}` : ''}. ${e.note}`,
    })),
    ...(exceptions.grnDateMismatch || []).map((e) => ({
      kind: 'Received date ≠ GRN movement date',
      ref: `${e.coilNo} · ${e.poID}`,
      note: `Coil received ${date(e.coilReceivedISO)}, GRN movement ${date(e.grnMovementISO)} (${kg(e.kg)} kg). ${e.note}`,
    })),
    ...(exceptions.coilSpecDiffersFromPoLine || []).map((e) => ({ kind: 'Coil spec differs from PO line', ref: `${e.coilNo} · ${e.poID}`, note: e.note })),
    ...(exceptions.noUnitCost || []).map((e) => ({
      kind: 'Coil has no unit cost',
      ref: e.coilNo,
      note: `Valued at ₦${kg(e.unitCostNgnPerKg)}/kg — ${e.costSource}`,
    })),
  ];

  return (
    <section className="mb-6 break-before-page">
      <h3 className={STATEMENT_H3}>Coil stock (gross and net of spool)</h3>
      <p className="text-ui-xs text-slate-600 mb-2">
        Rolled back from current kg by movements dated after each date. Spool: Aluzinc (incl. PPGI) 65 kg, Aluminium 45 kg
        per coil; a coil lighter than its spool is nil net. Stock-check corrections from {date(coilRegister.stockCheckCorrectionsFromISO)} are
        treated as true at both dates.
      </p>
      <CoilStockTable title="Opening stock" stock={stock.opening} />
      {stock.openingWithCorrections ? <CoilStockTable title="Opening stock" stock={stock.openingWithCorrections} /> : null}
      <CoilStockTable title="Closing stock (ERP)" stock={stock.closing} />
      {stock.closingWithCorrections ? <CoilStockTable title="Closing stock" stock={stock.closingWithCorrections} /> : null}

      <h3 className={STATEMENT_H3}>Coil purchase orders — kg ordered vs received</h3>
      <SimpleTable
        title="Difference per coil should look like the spool (~40–70 kg)"
        columns={[
          { key: 'poID', label: 'PO' },
          { key: 'supplier', label: 'Supplier', small: true },
          { key: 'spec', label: 'Line' },
          { key: 'kgOrdered', label: 'Kg ordered', right: true, fmt: kg },
          { key: 'kgReceived', label: 'Kg received', right: true, fmt: kg },
          { key: 'diffKg', label: 'Difference', right: true, fmt: kg },
          { key: 'coils', label: 'Coils', small: true },
          { key: 'grnValue', label: 'GRN value in period', right: true, fmt: (v) => (v == null ? '' : money(v)) },
        ]}
        rows={poLineRows}
      />

      <h3 className={STATEMENT_H3}>Coil consumption in period (COIL_CONSUMPTION movements)</h3>
      <table className={`${TBL} mb-3`}>
        <tbody>
          <tr>
            <td className={TD}>Aluminium</td>
            <td className={TDR}>{kg(consumption.totals.aluminiumKg)} kg</td>
            <td className={TD}>Aluzinc</td>
            <td className={TDR}>{kg(consumption.totals.aluzincKg)} kg</td>
            <td className={TF}>Total</td>
            <td className={TFR}>{kg(consumption.totals.kg)} kg</td>
            <td className={TD}>Stone used</td>
            <td className={TDR}>{kg(consumption.stoneConsumedMetres)} m</td>
          </tr>
        </tbody>
      </table>
      <SimpleTable
        title="Completed jobs with metres but no coil consumption"
        columns={[
          { key: 'dateISO', label: 'Date', fmt: date },
          { key: 'jobID', label: 'Job' },
          { key: 'quotationRef', label: 'Quote' },
          { key: 'customerName', label: 'Customer', small: true },
          { key: 'metres', label: 'Metres', right: true, fmt: kg },
          { key: 'actualWeightKg', label: 'Kg recorded', right: true, fmt: kg },
          { key: 'note', label: 'Note', small: true },
        ]}
        rows={consumption.jobsWithoutCoilConsumption}
      />
      <SimpleTable
        title="Coil consumption with no job"
        columns={[
          { key: 'dateISO', label: 'Date', fmt: date },
          { key: 'coilNo', label: 'Coil' },
          { key: 'jobID', label: 'Ref' },
          { key: 'kg', label: 'Kg', right: true, fmt: kg },
          { key: 'detail', label: 'Detail', small: true },
        ]}
        rows={consumption.withoutJob}
      />

      <h3 className={STATEMENT_H3}>Coil exceptions</h3>
      <SimpleTable
        title="Report notes only — data is not changed"
        columns={[
          { key: 'kind', label: 'Exception' },
          { key: 'ref', label: 'Coil / PO' },
          { key: 'note', label: 'Note', small: true },
        ]}
        rows={exceptionRows}
      />
      <SimpleTable
        title="Balance gaps (before ≠ previous after on the same coil / stone)"
        columns={[
          { key: 'material', label: 'Material' },
          { key: 'gauge', label: 'Gauge' },
          { key: 'coilNo', label: 'Coil / stock' },
          { key: 'jobId', label: 'Job' },
          { key: 'txnDate', label: 'Date', fmt: date },
          { key: 'note', label: 'Gap', small: true },
        ]}
        rows={gapLines}
      />
    </section>
  );
}
