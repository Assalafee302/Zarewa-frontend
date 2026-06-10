import React from 'react';
import { ZAREWA_COMPANY_ACCOUNT_NAME } from '../../Data/companyQuotation';
import { fmtConv2 } from '../../lib/conversionKgPerM.js';
import { INCIDENT_TYPES, INCIDENT_STATUS_LABEL, RETURN_DISPOSITIONS } from '../../lib/materialIncidentConstants';

const TH = 'px-2 py-1.5 text-left text-[9px] font-bold uppercase tracking-wide text-slate-600 print:text-[8pt]';
const TD = 'px-2 py-1.5 align-top text-[11px] text-slate-800 print:text-[10pt]';

function typeLabel(id) {
  return INCIDENT_TYPES.find((t) => t.id === id)?.label || id || '—';
}

function dispositionLabel(id) {
  return RETURN_DISPOSITIONS.find((t) => t.id === id)?.label || id || '—';
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

      <header className="border-b-2 border-[#134e4a] pb-4 mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Material exception register</p>
            <h1 className="text-xl font-black text-[#134e4a]">{ZAREWA_COMPANY_ACCOUNT_NAME}</h1>
            <p className="text-sm font-semibold text-slate-700">{payload.branchName || payload.branchId}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Tracking reference</p>
            <p className="font-mono text-2xl font-black text-[#134e4a] tracking-tight">{payload.id}</p>
            <p className="text-[10px] text-slate-500 mt-1">Book ref · {payload.bookRef || payload.id}</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 text-sm mb-5 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
        <div className="space-y-1">
          <p>
            <span className="font-bold text-slate-500">Date</span> {payload.dateISO}
          </p>
          <p>
            <span className="font-bold text-slate-500">Type</span> {typeLabel(payload.incidentType)}
          </p>
          <p>
            <span className="font-bold text-slate-500">Status</span>{' '}
            {INCIDENT_STATUS_LABEL[payload.status] || payload.status}
          </p>
          <p>
            <span className="font-bold text-slate-500">Disposition</span> {dispositionLabel(payload.returnDisposition)}
          </p>
        </div>
        <div className="space-y-1">
          <p>
            <span className="font-bold text-slate-500">Gauge / colour</span> {payload.gaugeLabel || '—'} ·{' '}
            {payload.colour || '—'}
          </p>
          <p>
            <span className="font-bold text-slate-500">Coil</span> {payload.coilNo || '—'}
          </p>
          <p>
            <span className="font-bold text-slate-500">Product</span> {payload.productId || '—'}
          </p>
          {payload.productionJobId ? (
            <p>
              <span className="font-bold text-slate-500">Production job</span> {payload.productionJobId}
            </p>
          ) : null}
        </div>
      </div>

      <section className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#134e4a] mb-2 border-b border-slate-200 pb-1">
          Damaged sections
        </p>
        <table className="w-full border-collapse border border-slate-200 quotation-print-table">
          <thead>
            <tr className="bg-slate-50">
              <th className={TH}>#</th>
              <th className={TH}>Length (m)</th>
              <th className={TH}>Qty</th>
              <th className={TH}>Line (m)</th>
              <th className={TH}>Note</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={5} className={`${TD} text-center text-slate-500`}>
                  —
                </td>
              </tr>
            ) : (
              lines.map((ln, idx) => (
                <tr key={ln.id || idx} className="border-t border-slate-100 quotation-print-line">
                  <td className={TD}>{idx + 1}</td>
                  <td className={TD}>{ln.lengthM}</td>
                  <td className={TD}>{ln.quantity}</td>
                  <td className={`${TD} font-semibold`}>{ln.totalM}</td>
                  <td className={TD}>{ln.conditionNote || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 font-bold bg-slate-50">
              <td colSpan={3} className={TD}>
                Total metres
              </td>
              <td className={TD}>{payload.totalMeters}</td>
              <td className={TD} />
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="mb-5 grid grid-cols-2 gap-4 text-sm">
        <div className="rounded border border-slate-200 p-3">
          <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">Kg & conversion</p>
          <p>Before kg: {payload.beforeKg != null ? payload.beforeKg : '—'}</p>
          <p>After kg: {payload.afterKg != null ? payload.afterKg : '—'}</p>
          <p>Kg deducted: {payload.kgDeducted != null ? payload.kgDeducted : '—'}</p>
          <p>
            Conversion:{' '}
            {payload.conversionKgPerM != null
              ? `${fmtConv2(payload.conversionKgPerM)} kg/m (${payload.conversionSource || ''})`
              : '—'}
          </p>
          <p>Metres available (pool): {payload.metersAvailable ?? '—'}</p>
        </div>
        <div className="rounded border border-slate-200 p-3">
          <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">People</p>
          <p>Storekeeper: {payload.storekeeperDisplay || '—'}</p>
          <p>Operator: {payload.operatorDisplay || '—'}</p>
          <p>Approved: {payload.approvedAtIso ? payload.approvedAtIso.slice(0, 19) : '—'}</p>
        </div>
      </section>

      {Array.isArray(payload.issues) && payload.issues.length > 0 ? (
        <section className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Production deductions</p>
          <table className="w-full border-collapse border border-slate-200 text-[11px]">
            <thead>
              <tr className="bg-slate-50">
                <th className={TH}>Job / target</th>
                <th className={TH}>Metres</th>
                <th className={TH}>When</th>
              </tr>
            </thead>
            <tbody>
              {payload.issues.map((iss) => (
                <tr key={iss.id} className="border-t border-slate-100">
                  <td className={TD}>{iss.targetRef || iss.targetKind || '—'}</td>
                  <td className={TD}>{iss.meters}</td>
                  <td className={TD}>{iss.issuedAtIso ? iss.issuedAtIso.slice(0, 19).replace('T', ' ') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="mb-5 text-sm">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Audit trail</p>
        <p className="text-[11px] text-slate-600">Created: {payload.createdAtIso ? payload.createdAtIso.slice(0, 19).replace('T', ' ') : '—'}</p>
        <p className="text-[11px] text-slate-600">Updated: {payload.updatedAtIso ? payload.updatedAtIso.slice(0, 19).replace('T', ' ') : '—'}</p>
        {payload.approvedAtIso ? (
          <p className="text-[11px] text-slate-600">Approved: {payload.approvedAtIso.slice(0, 19).replace('T', ' ')}</p>
        ) : null}
        {payload.postedAtIso ? (
          <p className="text-[11px] text-slate-600">Posted: {payload.postedAtIso.slice(0, 19).replace('T', ' ')}</p>
        ) : null}
      </section>

      <section className="mb-6 text-sm rounded border border-amber-100 bg-amber-50/50 p-3">
        <p className="text-[10px] font-bold uppercase text-amber-900 mb-1">How to use this reference</p>
        <ul className="text-[11px] text-amber-950 list-disc pl-4 space-y-0.5">
          <li>
            <strong>Production:</strong> issue metres from incident <span className="font-mono">{payload.id}</span> when
            completing a job (offcut supply).
          </li>
          <li>
            <strong>Month-end stock:</strong> quote this ID on coil or finished-goods lines when physical count differs
            from system.
          </li>
          <li>
            <strong>Physical book:</strong> keep this printed copy with your offcut register.
          </li>
        </ul>
      </section>

      <section className="mb-8 text-sm">
        <p className="font-bold text-slate-500">Storekeeper remark</p>
        <p className="border border-slate-200 rounded p-2 min-h-[2.5rem]">{payload.storekeeperRemark || '—'}</p>
        <p className="font-bold text-slate-500 mt-3">Branch manager remark</p>
        <p className="border border-slate-200 rounded p-2 min-h-[2.5rem]">{payload.managerRemark || '—'}</p>
      </section>

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
