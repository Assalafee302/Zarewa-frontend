import React from 'react';
import { Printer, X } from 'lucide-react';
import { PrintModalPortal } from '../layout/PrintModalPortal';
import { StatementStyleReportShell } from './StatementStyleReportShell';

const kg = (n) => (n == null || n === '' ? '' : Number(n).toLocaleString('en-NG', { maximumFractionDigits: 2 }));
const ngn = (n) => (n == null || n === '' ? '' : `₦${Math.round(Number(n)).toLocaleString('en-NG')}`);
const TH = 'border-b border-slate-300 px-1.5 py-1 text-left text-[9px] font-black uppercase text-slate-600';
const THR = `${TH} text-right`;
const TD = 'border-b border-slate-100 px-1.5 py-0.5 text-[10px]';
const TDR = `${TD} text-right tabular-nums`;

function TotalsRow({ label, t, strong = false }) {
  const cls = strong ? 'bg-slate-100 font-black' : 'bg-slate-50 font-bold';
  return (
    <tr className={cls}>
      <td className={TD} colSpan={3}>{label}</td>
      <td className={TDR}>{kg(t.grossKg)}</td>
      <td className={TDR}>{kg(t.spoolKg)}</td>
      <td className={TDR}>{kg(t.netKg)}</td>
      <td className={TDR}></td>
      <td className={TDR}>{ngn(t.valueNgn)}</td>
    </tr>
  );
}

/** Month-end coil stock: per coil Gross | Spool | Net | Rate | Value, subtotals by material and gauge, grand total. */
export function MonthEndStockPrintContent({ report }) {
  if (!report) return null;
  return (
    <div className="space-y-4">
      <p className="text-[10px] font-semibold text-slate-600">{report.note}</p>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={TH}>Coil</th>
            <th className={TH}>Gauge</th>
            <th className={TH}>Colour</th>
            <th className={THR}>Gross kg</th>
            <th className={THR}>Spool kg</th>
            <th className={THR}>Net kg</th>
            <th className={THR}>Rate ₦/kg</th>
            <th className={THR}>Value ₦</th>
          </tr>
        </thead>
        <tbody>
          {report.materials.map((m) => (
            <React.Fragment key={m.family}>
              <tr>
                <td className={`${TD} pt-2 font-black uppercase text-zarewa-teal`} colSpan={8}>{m.material}</td>
              </tr>
              {m.gauges.map((g) => (
                <React.Fragment key={`${m.family}-${g.gauge}`}>
                  {g.rows.map((r) => (
                    <tr key={r.coilNo}>
                      <td className={TD}>{r.coilNo}</td>
                      <td className={TD}>{r.gauge}</td>
                      <td className={TD}>{r.colour}</td>
                      <td className={TDR}>{kg(r.grossKg)}</td>
                      <td className={TDR}>{kg(r.spoolKg)}</td>
                      <td className={TDR}>{kg(r.netKg)}</td>
                      <td className={TDR}>{r.noRate ? '—' : kg(r.rateNgnPerKg)}</td>
                      <td className={TDR}>{ngn(r.valueNgn)}</td>
                    </tr>
                  ))}
                  <TotalsRow label={`${m.material} ${g.gauge} — ${g.subtotal.coilCount} coils`} t={g.subtotal} />
                </React.Fragment>
              ))}
              <TotalsRow label={`${m.material} total — ${m.subtotal.coilCount} coils`} t={m.subtotal} strong />
            </React.Fragment>
          ))}
          <TotalsRow label={`Grand total — ${report.grandTotal.coilCount} coils`} t={report.grandTotal} strong />
        </tbody>
      </table>
      {report.coilsWithoutRate.length ? (
        <p className="text-[10px] text-amber-700">No rate (valued ₦0): {report.coilsWithoutRate.join(', ')}</p>
      ) : null}
    </div>
  );
}

export function MonthEndStockPrintModal({ open, onClose, report, branchLabel }) {
  if (!open || !report) return null;
  const generated = new Date().toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
  return (
    <PrintModalPortal open={open} onClose={onClose}>
      <div className="mx-auto max-w-[210mm] pb-16">
        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="min-w-0">
            <p className="text-ui-xs font-black uppercase tracking-widest text-slate-400">Print preview</p>
            <p className="truncate text-sm font-bold text-zarewa-teal">Month-end coil stock</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => window.print()} className="z-btn-primary px-4 py-2.5">
              <Printer size={14} />
              Print
            </button>
            <button type="button" onClick={onClose} className="z-btn-secondary px-3 py-2.5" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="report-print-root quotation-print-preview-mode rounded-lg border border-slate-200 bg-white shadow-2xl print:rounded-none print:border-0 print:shadow-none">
          <StatementStyleReportShell
            title="Month-end coil stock"
            metaLines={[
              { label: 'Branch', value: branchLabel || '—' },
              { label: 'As at', value: report.asAtISO || '—' },
              { label: 'Printed', value: generated },
            ]}
          >
            <MonthEndStockPrintContent report={report} />
          </StatementStyleReportShell>
        </div>
      </div>
    </PrintModalPortal>
  );
}
