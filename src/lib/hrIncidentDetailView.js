function pick(obj, ...keys) {
  if (!obj || typeof obj !== 'object') return null;
  for (const k of keys) {
    const v = obj[k];
    if (v != null && v !== '') return v;
  }
  return null;
}

function fmtNgn(n) {
  const v = Math.round(Number(n) || 0);
  return v > 0 ? `₦${v.toLocaleString()}` : null;
}

function parseMetric(raw) {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return {};
}

/** @returns {{ label: string, value: string }[]} */
export function formatIncidentDetailSections(registry, detail) {
  if (!detail) return [];
  const kind = registry?.incidentKind || '';

  if (kind === 'hr_discipline' || pick(detail, 'caseNumber', 'case_number')) {
    return [
      { label: 'Case number', value: pick(detail, 'caseNumber', 'case_number') },
      { label: 'Status', value: pick(detail, 'status') },
      { label: 'Case type', value: String(pick(detail, 'caseType', 'case_type') || '').replace(/_/g, ' ') },
      { label: 'Severity', value: pick(detail, 'severity') },
      { label: 'Employee', value: pick(detail, 'staffDisplayName', 'staff_display_name') },
      { label: 'Incident date', value: pick(detail, 'incidentDateIso', 'incident_date_iso') },
      { label: 'Loss value', value: fmtNgn(pick(detail, 'lossValueNgn', 'loss_value_ngn')) },
      { label: 'Asset', value: pick(detail, 'assetId', 'asset_id') },
      { label: 'Decision', value: pick(detail, 'decisionType', 'decision_type') },
      { label: 'Description', value: pick(detail, 'description', 'summary') },
    ].filter((r) => r.value);
  }

  if (kind === 'operational') {
    return [
      { label: 'Operational type', value: String(pick(detail, 'incident_type', 'incidentType') || '').replace(/_/g, ' ') },
      { label: 'Status', value: pick(detail, 'status') },
      { label: 'Severity', value: pick(detail, 'severity') },
      { label: 'Asset', value: pick(detail, 'asset_id', 'assetId') },
      { label: 'Machine', value: pick(detail, 'machine_id', 'machineId') },
      { label: 'Loss value', value: fmtNgn(pick(detail, 'loss_value_ngn', 'lossValueNgn')) },
      { label: 'Subject staff', value: pick(detail, 'subject_user_id', 'subjectUserId') },
      { label: 'Summary', value: pick(detail, 'summary', 'description') },
    ].filter((r) => r.value);
  }

  if (kind === 'material') {
    return [
      { label: 'Incident type', value: String(pick(detail, 'incidentType', 'incident_type') || '').replace(/_/g, ' ') },
      { label: 'Status', value: pick(detail, 'status') },
      { label: 'Coil / product', value: [pick(detail, 'coilNo', 'coil_no'), pick(detail, 'gaugeLabel', 'gauge_label'), pick(detail, 'colour')].filter(Boolean).join(' · ') },
      { label: 'Total metres', value: pick(detail, 'totalMeters', 'total_meters') },
      { label: 'Disposition', value: pick(detail, 'returnDisposition', 'return_disposition') },
      { label: 'Date', value: pick(detail, 'dateIso', 'date_iso') },
    ].filter((r) => r.value);
  }

  if (kind === 'performance') {
    const metric = parseMetric(pick(detail, 'metric', 'metric_json', 'metricJson'));
    return [
      { label: 'Staff', value: pick(detail, 'staffDisplayName', 'staff_display_name', 'userId', 'user_id') },
      { label: 'Summary', value: pick(detail, 'summary') },
      {
        label: 'Output above target',
        value: metric.outputAboveTargetPct != null ? `${metric.outputAboveTargetPct}%` : null,
      },
      {
        label: 'Bonus eligible',
        value:
          pick(detail, 'bonusEligible', 'bonus_eligible') != null
            ? pick(detail, 'bonusEligible', 'bonus_eligible')
              ? 'Yes'
              : 'No'
            : null,
      },
    ].filter((r) => r.value);
  }

  return Object.entries(detail)
    .slice(0, 12)
    .map(([k, v]) => ({
      label: k.replace(/_/g, ' '),
      value: typeof v === 'object' ? JSON.stringify(v) : String(v),
    }))
    .filter((r) => r.value && r.value !== 'null');
}
