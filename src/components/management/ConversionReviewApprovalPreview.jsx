import React, { useMemo } from 'react';
import { formatPersonName as formatPersonNameUtil } from '../../lib/formatPersonName';
import { conversionVarianceReasonLabel } from '../../shared/productionConversionReasons.js';
import {
  conversionAlertBandClass,
  conversionAlertChipClass,
  conversionAlertCopy,
  conversionPrimaryDelta,
  pickJobId,
} from '../../lib/conversionReviewUi.js';
import { ConversionRecordPanel } from './ConversionRecordPanel';
import { DecisionChip } from './DecisionSurface';

/**
 * Branch-manager / exec body for Floor conversion-check confirmation.
 */
export function ConversionReviewApprovalPreview({
  jobId,
  inboxRow = null,
  auditData = null,
  loading = false,
  unifiedWorkItem = null,
  formatPersonName,
}) {
  const asPersonName = typeof formatPersonName === 'function' ? formatPersonName : formatPersonNameUtil;
  const focus = String(jobId || '').trim();
  const logs = Array.isArray(auditData?.productionLogs) ? auditData.productionLogs : [];
  const checks = Array.isArray(auditData?.conversionChecks) ? auditData.conversionChecks : [];
  const job = logs.find((j) => pickJobId(j) === focus) || null;
  const row = inboxRow || {};
  const alert =
    job?.conversion_alert_state ||
    job?.conversionAlertState ||
    row.conversion_alert_state ||
    row.conversionAlertState ||
    checks.find((c) => pickJobId(c) === focus)?.alert_state ||
    checks.find((c) => pickJobId(c) === focus)?.alertState ||
    '';
  const copy = conversionAlertCopy(alert);
  const customer = asPersonName(row.customer_name || row.customerName || job?.customer_name || '');
  const quoteRef = row.quotation_ref || row.quotationRef || '';
  const product = row.product_name || row.productName || job?.product_name || job?.productName || '';
  const completedAt = row.completed_at_iso || row.completedAtISO || job?.completed_at_iso;
  const reasonLabel = conversionVarianceReasonLabel(
    job?.conversion_variance_reason_code || job?.conversionVarianceReasonCode || row.conversion_variance_reason_code,
    job?.conversion_variance_reason_text || job?.conversionVarianceReasonText || row.conversion_variance_reason_text,
    job?.conversion_variance_band || job?.conversionVarianceBand || alert
  );

  const primaryDelta = useMemo(() => {
    const check = checks.find((c) => pickJobId(c) === focus) || null;
    const coil = (Array.isArray(auditData?.jobCoils) ? auditData.jobCoils : []).find(
      (c) => pickJobId(c) === focus
    );
    return conversionPrimaryDelta(check, coil);
  }, [auditData?.jobCoils, checks, focus]);

  return (
    <div className="animate-in fade-in space-y-3 duration-200 text-slate-700">
      <div className={`rounded-xl border border-l-4 px-4 py-3 ${conversionAlertBandClass(copy.tone)}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-ui-xs font-black uppercase tracking-widest text-slate-500">Floor conversion check</p>
            <h2 className="mt-0.5 font-mono text-lg font-black leading-tight text-slate-900">{focus || '—'}</h2>
            {customer ? <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">{customer}</p> : null}
            {quoteRef ? <p className="mt-0.5 font-mono text-xs font-bold text-teal-800">{quoteRef}</p> : null}
            {product ? <p className="mt-0.5 text-ui-xs text-slate-600">{product}</p> : null}
          </div>
          <div className="shrink-0 text-right">
            <span
              className={`inline-flex rounded-md border px-2 py-1 text-ui-xs font-black uppercase ${conversionAlertChipClass(copy.tone)}`}
            >
              {copy.headline}
            </span>
            {primaryDelta?.pct != null ? (
              <p
                className={`mt-2 text-2xl font-black tabular-nums ${
                  primaryDelta.pct > 5 ? 'text-rose-700' : primaryDelta.pct < -5 ? 'text-amber-800' : 'text-emerald-800'
                }`}
              >
                {primaryDelta.pctLabel}
              </p>
            ) : null}
            <p className="text-ui-xs text-slate-500">vs standard kg/m</p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-800">{copy.meaning}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">{copy.next}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {row.manager_review_required || job?.manager_review_required ? (
            <DecisionChip tone="amber">Needs your review</DecisionChip>
          ) : null}
          {completedAt ? (
            <DecisionChip tone="slate">{new Date(completedAt).toLocaleString()}</DecisionChip>
          ) : null}
        </div>
        {reasonLabel ? (
          <p className="mt-3 rounded-lg border border-white/80 bg-white/80 px-3 py-2 text-xs leading-snug text-slate-800">
            <span className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Storekeeper · </span>
            {reasonLabel}
          </p>
        ) : null}
        {(unifiedWorkItem?.referenceNo || unifiedWorkItem?.id) && (
          <p className="mt-2 font-mono text-ui-xs text-slate-500">
            Record {unifiedWorkItem.referenceNo || unifiedWorkItem.id}
            {unifiedWorkItem.keyDecisionSummary ? ` · ${unifiedWorkItem.keyDecisionSummary}` : ''}
          </p>
        )}
      </div>

      <ConversionRecordPanel
        auditData={auditData}
        loading={loading}
        focusJobId={focus}
        title="Coil record"
        emptyMessage="No coil or conversion check found for this job yet. Refresh or open Production QC."
        hideJobChrome
      />
    </div>
  );
}
