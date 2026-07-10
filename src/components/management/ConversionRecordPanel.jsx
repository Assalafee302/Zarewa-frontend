import React, { useMemo } from 'react';
import {
  coilIntelRowsForJob,
  fmtConv,
  fmtKg,
  fmtM,
} from '../../lib/managementQuotationIntel';

function formatKgPerM(raw) {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n.toFixed(2) : '—';
}

/**
 * Four/five-reference conversion comparison (Act / Std / Sup / G hist / C hist).
 */
export function ConversionComparisonGrid({ check, className = '' }) {
  if (!check) return null;
  const cells = [
    ['Act', check.actual_conversion_kg_per_m ?? check.actualConversionKgPerM],
    ['Std', check.standard_conversion_kg_per_m ?? check.standardConversionKgPerM],
    ['Sup', check.supplier_conversion_kg_per_m ?? check.supplierConversionKgPerM],
    ['G', check.gauge_history_avg_kg_per_m ?? check.gaugeHistoryAvgKgPerM],
    ['C', check.coil_history_avg_kg_per_m ?? check.coilHistoryAvgKgPerM],
  ];
  return (
    <div className={`grid grid-cols-5 gap-1 ${className}`}>
      {cells.map(([label, val]) => (
        <div key={label} className="rounded-md border border-slate-200 bg-white px-1 py-1 text-center">
          <p className="text-ui-xs font-bold uppercase text-slate-400">{label}</p>
          <p className="text-ui-xs font-bold tabular-nums text-slate-800">{formatKgPerM(val)}</p>
        </div>
      ))}
    </div>
  );
}

function CoilConversionCard({ coilNo, coil, check }) {
  const purchaseConv =
    coil?.coil_supplier_conversion_kg_per_m ??
    check?.supplier_conversion_kg_per_m ??
    check?.supplierConversionKgPerM ??
    null;
  const actualConv =
    check?.actual_conversion_kg_per_m ??
    check?.actualConversionKgPerM ??
    coil?.actual_conversion_kg_per_m ??
    null;
  const standardConv = check?.standard_conversion_kg_per_m ?? check?.standardConversionKgPerM ?? null;
  const alert = check?.alert_state || check?.alertState || '';
  const alertOk = String(alert).toUpperCase() === 'OK';

  return (
    <li
      className={`rounded-lg border px-3 py-2.5 text-ui-xs ${
        alert && !alertOk
          ? 'border-amber-200 bg-amber-50/60'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-xs font-bold text-slate-900">Coil {coilNo}</p>
          <p className="mt-0.5 text-slate-600">
            {[
              coil?.coil_gauge_label || check?.gauge_label,
              coil?.coil_colour,
              coil?.coil_material_type || check?.material_type_name,
            ]
              .filter(Boolean)
              .join(' · ') || '—'}
          </p>
        </div>
        {alert ? (
          <span
            className={`shrink-0 rounded-md px-1.5 py-0.5 text-ui-xs font-black uppercase ${
              alertOk ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-950'
            }`}
          >
            {alert}
          </span>
        ) : null}
      </div>

      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-4">
        <div>
          <dt className="text-ui-xs font-bold uppercase text-slate-400">Before</dt>
          <dd className="font-semibold tabular-nums text-slate-800">{fmtKg(coil?.opening_weight_kg)}</dd>
        </div>
        <div>
          <dt className="text-ui-xs font-bold uppercase text-slate-400">After</dt>
          <dd className="font-semibold tabular-nums text-slate-800">{fmtKg(coil?.closing_weight_kg)}</dd>
        </div>
        <div>
          <dt className="text-ui-xs font-bold uppercase text-slate-400">Kg used</dt>
          <dd className="font-semibold tabular-nums text-slate-800">{fmtKg(coil?.consumed_weight_kg)}</dd>
        </div>
        <div>
          <dt className="text-ui-xs font-bold uppercase text-slate-400">Metres</dt>
          <dd className="font-semibold tabular-nums text-slate-800">{fmtM(coil?.meters_produced)}</dd>
        </div>
      </dl>

      <p className="mt-2 tabular-nums text-slate-700">
        Conversion: purchase {fmtConv(purchaseConv)} · standard {fmtConv(standardConv)} · actual{' '}
        <span className="font-bold text-zarewa-teal">{fmtConv(actualConv)}</span>
      </p>

      <div className="mt-2">
        <p className="mb-1 text-ui-xs font-bold uppercase tracking-wide text-slate-400">
          Conversion comparison
        </p>
        <ConversionComparisonGrid check={check || { actual_conversion_kg_per_m: actualConv, standard_conversion_kg_per_m: standardConv, supplier_conversion_kg_per_m: purchaseConv }} />
      </div>
    </li>
  );
}

function JobConversionBlock({ job, jobCoils, conversionChecks }) {
  const coilRows = coilIntelRowsForJob(job.job_id || job.jobId, jobCoils, conversionChecks);
  const alert = job.conversion_alert_state || job.conversionAlertState || '—';

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-xs font-bold text-slate-900">{job.job_id || job.jobId}</p>
          <p className="mt-0.5 text-ui-xs font-semibold text-slate-800">{job.product_name || job.productName || '—'}</p>
        </div>
        <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-ui-xs font-black uppercase text-slate-700">
          {job.status || '—'}
        </span>
      </div>
      <p className="mt-1.5 text-ui-xs tabular-nums text-slate-600">
        Planned {fmtM(job.planned_meters ?? job.plannedMeters)} · Actual{' '}
        {fmtM(job.actual_meters ?? job.actualMeters)} · {fmtKg(job.actual_weight_kg ?? job.actualWeightKg)}
      </p>
      <p className="mt-0.5 text-ui-xs text-slate-700">
        Job alert: <span className="font-semibold">{alert}</span>
        {job.manager_review_required || job.managerReviewRequired ? ' · needs manager review' : ''}
      </p>

      {coilRows.length === 0 ? (
        <p className="mt-2 text-ui-xs text-slate-500">No coil usage recorded for this job.</p>
      ) : (
        <ul className="mt-3 space-y-2 border-t border-slate-200/80 pt-3">
          {coilRows.map(({ coilNo, coil, check }) => (
            <CoilConversionCard key={coilNo} coilNo={coilNo} coil={coil} check={check} />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Shared conversion record for management / exec / office popups.
 * Shows coil used, before/after kg, kg used, metres, conversion, and Act/Std/Sup/G/C comparison.
 *
 * @param {object} props
 * @param {object|null} props.auditData - quotation audit payload (productionLogs, jobCoils, conversionChecks)
 * @param {string} [props.focusJobId] - when set, only that job is shown
 * @param {boolean} [props.showMeterTotals] - metre summary strip from audit totals
 * @param {string} [props.title]
 * @param {boolean} [props.loading]
 */
export function ConversionRecordPanel({
  auditData,
  focusJobId = '',
  showMeterTotals = true,
  title = 'Conversion record',
  loading = false,
  emptyMessage = 'No production conversion recorded for this quotation yet.',
  embedded = false,
}) {
  const productionLogs = useMemo(
    () => (Array.isArray(auditData?.productionLogs) ? auditData.productionLogs : []),
    [auditData?.productionLogs]
  );
  const jobCoils = useMemo(
    () => (Array.isArray(auditData?.jobCoils) ? auditData.jobCoils : []),
    [auditData?.jobCoils]
  );
  const conversionChecks = useMemo(
    () => (Array.isArray(auditData?.conversionChecks) ? auditData.conversionChecks : []),
    [auditData?.conversionChecks]
  );
  const totals = auditData?.totals || {};

  const jobs = useMemo(() => {
    const focus = String(focusJobId || '').trim();
    if (!focus) return productionLogs;
    const matched = productionLogs.filter((j) => String(j.job_id || j.jobId || '') === focus);
    if (matched.length) return matched;
    // Fallback shell when audit has coils/checks for the job but the log row is missing.
    if (
      jobCoils.some((c) => String(c.job_id) === focus) ||
      conversionChecks.some((c) => String(c.job_id) === focus)
    ) {
      return [
        {
          job_id: focus,
          status: '—',
          product_name: '',
          planned_meters: null,
          actual_meters: null,
          actual_weight_kg: null,
          conversion_alert_state: conversionChecks.find((c) => String(c.job_id) === focus)?.alert_state,
        },
      ];
    }
    return [];
  }, [productionLogs, focusJobId, jobCoils, conversionChecks]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-xs font-semibold text-slate-500">
        Loading conversion record…
      </div>
    );
  }

  if (!auditData || auditData.ok === false) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
        {auditData?.error || 'Conversion audit unavailable.'}
      </div>
    );
  }

  return (
    <section
      className={
        embedded
          ? 'space-y-3'
          : 'rounded-xl border border-slate-200 bg-white p-3 shadow-sm'
      }
    >
      {!embedded ? (
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-ui-xs font-black uppercase tracking-widest text-zarewa-teal">{title}</p>
            <p className="mt-0.5 text-ui-xs text-slate-500">
              Coil used, before/after weight, kg used, metres, and conversion comparison.
            </p>
          </div>
          {showMeterTotals ? (
            <div className="flex flex-wrap gap-2 text-ui-xs tabular-nums text-slate-600">
              <span className="rounded-md bg-slate-100 px-2 py-1">
                CL {Number(totals.cuttingListMetersSum || 0).toLocaleString()} m
              </span>
              <span className="rounded-md bg-teal-50 px-2 py-1 font-semibold text-teal-900">
                Produced {Number(totals.completedProductionMetersSum || 0).toLocaleString()} m
              </span>
            </div>
          ) : null}
        </div>
      ) : showMeterTotals ? (
        <div className="flex flex-wrap gap-2 text-ui-xs tabular-nums text-slate-600">
          <span className="rounded-md bg-slate-100 px-2 py-1">
            CL {Number(totals.cuttingListMetersSum || 0).toLocaleString()} m
          </span>
          <span className="rounded-md bg-teal-50 px-2 py-1 font-semibold text-teal-900">
            Produced {Number(totals.completedProductionMetersSum || 0).toLocaleString()} m
          </span>
        </div>
      ) : null}

      {jobs.length === 0 ? (
        <p className="text-xs text-slate-500">{emptyMessage}</p>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobConversionBlock
              key={job.job_id || job.jobId}
              job={job}
              jobCoils={jobCoils}
              conversionChecks={conversionChecks}
            />
          ))}
        </div>
      )}
    </section>
  );
}
