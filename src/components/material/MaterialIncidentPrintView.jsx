import React from 'react';
import { ZAREWA_COMPANY_ACCOUNT_NAME } from '../../Data/companyQuotation';
import { INCIDENT_TYPES, INCIDENT_STATUS_LABEL } from '../../lib/materialIncidentConstants';

const TH = 'px-2 py-1.5 text-left text-[9px] font-bold uppercase tracking-wide text-slate-600 print:text-[8pt]';
const TD = 'px-2 py-1.5 align-top text-[11px] text-slate-800 print:text-[10pt]';

function typeLabel(id) {
  return INCIDENT_TYPES.find((t) => t.id === id)?.label || id || '—';
}

export default function MaterialIncidentPrintView({ payload }) {
  if (!payload) return null;
  const watermark = payload.watermark || (payload.status === 'posted' ? 'OFFICIAL' : 'DRAFT — PENDING APPROVAL');
  const lines = Array.isArray(payload.lines) ? payload.lines : [];

  return (
    <div className="quotation-print-root relative bg-white p-8 text-slate-900 print:p-6">
      {watermark !== 'OFFICIAL' ? (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.12] print:opacity-[0.15]"
          aria-hidden
        >
          <span className="rotate-[-24deg] text-5xl font-black uppercase tracking-widest text-rose-700 print:text-6xl">
            {watermark}
          </span>
        </div>
      ) : null}

      <header className="border-b-2 border-[#134e4a] pb-4 mb-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Material exception register</p>
        <h1 className="text-xl font-black text-[#134e4a]">{ZAREWA_COMPANY_ACCOUNT_NAME}</h1>
        <p className="text-sm font-semibold text-slate-700">{payload.branchName || payload.branchId}</p>
      </header>

      <div className="grid grid-cols-2 gap-4 text-sm mb-6">
        <div>
          <p>
            <span className="font-bold text-slate-500">Incident no.</span>{' '}
            <span className="font-mono font-bold">{payload.id}</span>
          </p>
          <p>
            <span className="font-bold text-slate-500">Book ref.</span> {payload.bookRef || payload.id}
          </p>
          <p>
            <span className="font-bold text-slate-500">Date.</span> {payload.dateISO}
          </p>
          <p>
            <span className="font-bold text-slate-500">Type.</span> {typeLabel(payload.incidentType)}
          </p>
          <p>
            <span className="font-bold text-slate-500">Status.</span>{' '}
            {INCIDENT_STATUS_LABEL[payload.status] || payload.status}
          </p>
        </div>
        <div>
          <p>
            <span className="font-bold text-slate-500">Gauge / colour.</span> {payload.gaugeLabel} · {payload.colour}
          </p>
          <p>
            <span className="font-bold text-slate-500">Coil.</span> {payload.coilNo || '—'}
          </p>
          <p>
            <span className="font-bold text-slate-500">Quotation.</span> {payload.quotationRef || '—'}
          </p>
          <p>
            <span className="font-bold text-slate-500">Production job.</span> {payload.productionJobId || '—'}
          </p>
          <p>
            <span className="font-bold text-slate-500">Customer.</span> {payload.customerLabel || '—'}
          </p>
        </div>
      </div>

      <section className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Quantity detail</p>
        <table className="w-full border-collapse border border-slate-200">
          <thead>
            <tr className="bg-slate-50">
              <th className={TH}>Length (m)</th>
              <th className={TH}>Qty</th>
              <th className={TH}>Total (m)</th>
              <th className={TH}>Condition</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={4} className={`${TD} text-center text-slate-500`}>
                  —
                </td>
              </tr>
            ) : (
              lines.map((ln) => (
                <tr key={ln.id} className="border-t border-slate-100">
                  <td className={TD}>{ln.lengthM}</td>
                  <td className={TD}>{ln.quantity}</td>
                  <td className={TD}>{ln.totalM}</td>
                  <td className={TD}>{ln.conditionNote || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 font-bold">
              <td colSpan={2} className={TD}>
                Total metres
              </td>
              <td className={TD}>{payload.totalMeters}</td>
              <td className={TD} />
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="mb-6 grid grid-cols-2 gap-4 text-sm">
        <div className="rounded border border-slate-200 p-3">
          <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">Kg & conversion</p>
          <p>Before kg: {payload.beforeKg != null ? payload.beforeKg : '—'}</p>
          <p>After kg: {payload.afterKg != null ? payload.afterKg : '—'}</p>
          <p>Kg deducted: {payload.kgDeducted != null ? payload.kgDeducted : '—'}</p>
          <p>
            Conversion:{' '}
            {payload.conversionKgPerM != null ? `${payload.conversionKgPerM} kg/m (${payload.conversionSource || ''})` : '—'}
          </p>
          <p>Metres available (pool): {payload.metersAvailable}</p>
        </div>
        <div className="rounded border border-slate-200 p-3">
          <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">People</p>
          <p>Storekeeper: {payload.storekeeperDisplay || '—'}</p>
          <p>Operator: {payload.operatorDisplay || '—'}</p>
          <p>Approved: {payload.approvedAtIso ? payload.approvedAtIso.slice(0, 19) : '—'}</p>
        </div>
      </section>

      <section className="mb-8 text-sm">
        <p className="font-bold text-slate-500">Storekeeper remark</p>
        <p className="border border-slate-200 rounded p-2 min-h-[2.5rem]">{payload.storekeeperRemark || '—'}</p>
        <p className="font-bold text-slate-500 mt-3">Branch manager remark</p>
        <p className="border border-slate-200 rounded p-2 min-h-[2.5rem]">{payload.managerRemark || '—'}</p>
        {payload.reasonText ? (
          <>
            <p className="font-bold text-slate-500 mt-3">Reason</p>
            <p className="border border-slate-200 rounded p-2">{payload.reasonText}</p>
          </>
        ) : null}
      </section>

      {Array.isArray(payload.attachments) && payload.attachments.length > 0 ? (
        <section className="mb-6 text-xs">
          <p className="font-bold uppercase text-slate-500">Evidence files</p>
          <ul className="list-disc pl-5">
            {payload.attachments.map((a) => (
              <li key={a.id}>
                {a.fileName} ({a.mimeType})
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="mt-12 grid grid-cols-2 gap-12 text-sm print:mt-16">
        <div>
          <p className="border-t border-slate-400 pt-2 mt-16">Storekeeper signature</p>
        </div>
        <div>
          <p className="border-t border-slate-400 pt-2 mt-16">Branch manager signature</p>
        </div>
      </footer>

      <p className="mt-6 text-[9px] text-slate-400 print:text-[8pt]">
        Printed {new Date().toISOString().slice(0, 19).replace('T', ' ')} · {payload.id}
      </p>
    </div>
  );
}
