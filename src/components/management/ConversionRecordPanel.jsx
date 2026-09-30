import React, { useMemo } from 'react';
import { conversionVarianceReasonLabel } from '../../shared/productionConversionReasons.js';
import {
  coilIntelRowsForJob,
  fmtConv,
  fmtKg,
  fmtM,
} from '../../lib/managementQuotationIntel';
import {
  conversionAlertChipClass,
  conversionAlertCopy,
  conversionPrimaryDelta,
  conversionReferenceRows,
  pickJobId,
} from '../../lib/conversionReviewUi.js';
import { fmtConv2 } from '../../lib/conversionKgPerM.js';

function kgPerMLabel(raw) {
  return fmtConv2(raw, { suffix: 'kg/m' });
}

function ConversionCompareBar({ actual, reference }) {
  const a = Number(actual);
  const r = Number(reference);
  if (!Number.isFinite(a) || a <= 0 || !Number.isFinite(r) || r <= 0) return null;
  const max = Math.max(a, r);
  const actualPct = Math.max(8, Math.round((a / max) * 100));
  const refPct = Math.max(8, Math.round((r / max) * 100));
  const high = a > r;
  return (
    <div className="mt-3 space-y-1.5" aria-hidden="true">
      <div className="flex items-center gap-2">
        <span className="w-16 shrink-0 text-ui-xs font-bold uppercase tracking-wide text-slate-400">Actual</span>
        <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${high ? 'bg-rose-500' : 'bg-zarewa-teal'}`}
            style={{ width: `${actualPct}%` }}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-16 shrink-0 text-ui-xs font-bold uppercase tracking-wide text-slate-400">Standard</span>
        <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-slate-400" style={{ width: `${refPct}%` }} />
        </div>
      </div>
    </div>
  );
}

/**
 * Readable kg/m references (Actual vs Standard / Supplier / history).
 */
export function ConversionComparisonGrid({ check, coil = null, className = '' }) {
  const rows = conversionReferenceRows(check, coil);
  const actual = rows[0]?.actual;
  if (!check && actual == null) return null;
  return (
    <div className={className}>
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-ui-xs font-bold uppercase tracking-wide text-slate-500">
              <th className="px-2.5 py-1.5 font-bold">Compared with</th>
              <th className="px-2.5 py-1.5 text-right font-bold">kg/m</th>
              <th className="px-2.5 py-1.5 text-right font-bold">vs actual</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.key}
                className={`border-b border-slate-100 last:border-0 ${row.primary ? 'bg-teal-50/40' : 'bg-white'}`}
              >
                <td className="px-2.5 py-2">
                  <p className="font-semibold text-slate-800">{row.label}</p>
                  <p className="text-ui-xs text-slate-500">{row.hint}</p>
                </td>
                <td className="px-2.5 py-2 text-right font-semibold tabular-nums text-slate-900">
                  {kgPerMLabel(row.value).replace(' kg/m', '')}
                </td>
                <td
                  className={`px-2.5 py-2 text-right font-bold tabular-nums ${
                    row.pct != null && row.pct > 5
                      ? 'text-rose-700'
                      : row.pct != null && row.pct < -5
                        ? 'text-amber-800'
                        : 'text-slate-700'
                  }`}
                >
                  {row.pctLabel}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1.5 text-ui-xs text-slate-500">
        Actual this run: <span className="font-semibold tabular-nums text-slate-700">{fmtConv(actual)}</span>
      </p>
    </div>
  );
}

function CoilConversionCard({ coilNo, coil, check, suppressMaterialLine = false }) {
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
  const copy = conversionAlertCopy(alert);
  const delta = conversionPrimaryDelta(check, coil);
  const alertOk = String(alert).toUpperCase() === 'OK';
  const checkNote = String(check?.note || '').trim();

  return (
    <li
      className={`rounded-xl border px-3 py-3 ${
        alert && !alertOk ? 'border-amber-200 bg-white' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-xs font-bold text-slate-900">Coil {coilNo}</p>
          {!suppressMaterialLine ? (
            <p className="mt-0.5 text-ui-xs text-slate-600">
              {[
                coil?.coil_gauge_label || check?.gauge_label || check?.gaugeLabel,
                coil?.coil_colour,
                coil?.coil_material_type || check?.material_type_name || check?.materialTypeName,
              ]
                .filter(Boolean)
                .join(' · ') || '—'}
            </p>
          ) : null}
        </div>
        {alert ? (
          <span
            className={`shrink-0 rounded-md border px-1.5 py-0.5 text-ui-xs font-black uppercase ${conversionAlertChipClass(copy.tone)}`}
          >
            {copy.headline}
          </span>
        ) : null}
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-ui-xs font-bold uppercase tracking-widest text-slate-500">Actual conversion</p>
            <p className="mt-0.5 text-xl font-black tabular-nums text-slate-900">{fmtConv(actualConv)}</p>
          </div>
          {delta?.pct != null ? (
            <div className="text-right">
              <p className="text-ui-xs font-bold uppercase tracking-widest text-slate-500">vs standard</p>
              <p
                className={`mt-0.5 text-lg font-black tabular-nums ${
                  delta.pct > 5 ? 'text-rose-700' : delta.pct < -5 ? 'text-amber-800' : 'text-emerald-800'
                }`}
              >
                {delta.pctLabel}
              </p>
              <p className="text-ui-xs tabular-nums text-slate-500">{fmtConv(standardConv)}</p>
            </div>
          ) : (
            <p className="text-ui-xs text-slate-500">Standard {fmtConv(standardConv)}</p>
          )}
        </div>
        <ConversionCompareBar actual={actualConv} reference={standardConv} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {[
          ['Opening', fmtKg(coil?.opening_weight_kg)],
          ['Used', fmtKg(coil?.consumed_weight_kg)],
          ['Left', fmtKg(coil?.closing_weight_kg)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-center">
            <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-0.5 text-xs font-bold tabular-nums text-slate-800">{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-ui-xs tabular-nums text-slate-600">
        Produced {fmtM(coil?.meters_produced)}
        {purchaseConv != null ? ` · purchase ${fmtConv(purchaseConv)}` : ''}
      </p>

      <div className="mt-3">
        <ConversionComparisonGrid check={check || { actual_conversion_kg_per_m: actualConv, standard_conversion_kg_per_m: standardConv, supplier_conversion_kg_per_m: purchaseConv }} coil={coil} />
      </div>
      {checkNote ? (
        <p className="mt-2 rounded-md bg-slate-50 px-2 py-1.5 text-ui-xs leading-snug text-slate-600">{checkNote}</p>
      ) : null}
    </li>
  );
}

function JobConversionBlock({ job, jobCoils, conversionChecks, suppressMaterialLine = false, hideJobChrome = false }) {
  const coilRows = coilIntelRowsForJob(job.job_id || job.jobId || job.jobID, jobCoils, conversionChecks);
  const alert = job.conversion_alert_state || job.conversionAlertState || '—';
  const copy = conversionAlertCopy(alert);
  const reasonLabel = conversionVarianceReasonLabel(
    job.conversion_variance_reason_code || job.conversionVarianceReasonCode,
    job.conversion_variance_reason_text || job.conversionVarianceReasonText,
    job.conversion_variance_band || job.conversionVarianceBand || alert
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
      {hideJobChrome ? (
        <p className="text-ui-xs tabular-nums text-slate-600">
          Planned {fmtM(job.planned_meters ?? job.plannedMeters)} · Actual{' '}
          {fmtM(job.actual_meters ?? job.actualMeters)} · {fmtKg(job.actual_weight_kg ?? job.actualWeightKg)}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-xs font-bold text-slate-900">{job.job_id || job.jobId || job.jobID}</p>
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
        </>
      )}
      {hideJobChrome ? null : reasonLabel ? (
        <p className="mt-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs leading-snug text-slate-700">
          <span className="text-ui-xs font-bold uppercase tracking-wide text-slate-400">Storekeeper reason · </span>
          {reasonLabel}
        </p>
      ) : copy.key === 'High' || copy.key === 'Low' ? (
        <p className="mt-2 text-ui-xs text-slate-500">No storekeeper reason was recorded for this {copy.key.toLowerCase()} alert.</p>
      ) : null}

      {coilRows.length === 0 ? (
        <p className="mt-2 text-ui-xs text-slate-500">No coil usage recorded for this job.</p>
      ) : (
        <ul className="mt-3 space-y-3 border-t border-slate-200/80 pt-3">
          {coilRows.map(({ coilNo, coil, check }) => (
            <CoilConversionCard
              key={coilNo}
              coilNo={coilNo}
              coil={coil}
              check={check}
              suppressMaterialLine={suppressMaterialLine}
            />
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
  title = 'Coil conversion record',
  loading = false,
  emptyMessage = 'No production conversion recorded for this quotation yet.',
  embedded = false,
  suppressMaterialLine = false,
  hideJobChrome = false,
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
    const matched = productionLogs.filter((j) => pickJobId(j) === focus);
    if (matched.length) return matched;
    if (
      jobCoils.some((c) => pickJobId(c) === focus) ||
      conversionChecks.some((c) => pickJobId(c) === focus)
    ) {
      const check = conversionChecks.find((c) => pickJobId(c) === focus);
      return [
        {
          job_id: focus,
          status: '—',
          product_name: '',
          planned_meters: null,
          actual_meters: null,
          actual_weight_kg: null,
          conversion_alert_state: check?.alert_state || check?.alertState,
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
          : 'rounded-xl border border-slate-200 bg-white p-3'
      }
    >
      {!embedded ? (
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-ui-xs font-black uppercase tracking-widest text-zarewa-teal">{title}</p>
            <p className="mt-0.5 text-ui-xs leading-snug text-slate-500">
              Actual kg/m against standard, supplier, and history — plus opening, used, and leftover coil.
            </p>
          </div>
          {showMeterTotals ? (
            <div className="flex flex-wrap gap-2 text-ui-xs tabular-nums text-slate-600">
              <span className="rounded-md bg-slate-100 px-2 py-1">
                Cutting list {Number(totals.cuttingListMetersSum || 0).toLocaleString()} m
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
            Cutting list {Number(totals.cuttingListMetersSum || 0).toLocaleString()} m
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
              key={job.job_id || job.jobId || job.jobID}
              job={job}
              jobCoils={jobCoils}
              conversionChecks={conversionChecks}
              suppressMaterialLine={suppressMaterialLine}
              hideJobChrome={hideJobChrome}
            />
          ))}
        </div>
      )}
    </section>
  );
}
