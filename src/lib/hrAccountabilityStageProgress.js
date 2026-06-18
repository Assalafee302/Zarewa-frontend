/** Map free-text management decision to structured decision_type values. */
export function mapManagementDecisionToType(text) {
  const s = String(text || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (!s) return '';
  if (['deduction', 'salary_deduction', 'salary_recovery', 'recovery', 'deduct'].some((k) => s.includes(k))) {
    return 'deduction';
  }
  if (s.includes('warning')) return 'warning';
  if (s.includes('suspend')) return 'suspension';
  if (['termination', 'terminate', 'dismiss'].some((k) => s.includes(k))) return 'termination';
  if (['no_action', 'no action', 'none', 'closed'].some((k) => s.includes(k.replace(/_/g, ' ')) || s === k)) {
    return 'no_action';
  }
  return '';
}

export function accountabilityStageCompletion(detail, { responsibilityOk = false, recoveryCount = 0, closureOk = false } = {}) {
  const hasEmployeeResponse = Boolean(String(detail?.employeeResponse || '').trim());
  const hasFindings = Boolean(String(detail?.investigationFindings || '').trim());
  const hasHrRec = Boolean(String(detail?.hrRecommendation || '').trim());
  const hasMgmtDecision = Boolean(String(detail?.managementDecision || '').trim());
  const evidenceRows = Array.isArray(detail?.evidence) ? detail.evidence : [];
  const hasEvidence =
    evidenceRows.some((e) => String(e?.description || '').trim().length >= 2) ||
    (Array.isArray(detail?.witnesses) && detail.witnesses.length > 0);
  const hasAsset = Boolean(detail?.assetId || detail.machineId);
  const hasLoss = Math.round(Number(detail?.lossValueNgn) || 0) > 0;
  const hasDecision = Boolean(detail?.decisionType);
  const hasRecovery =
    recoveryCount > 0 || detail?.decisionType === 'no_action' || detail?.decisionType === 'warning';
  const isClosed = detail?.status === 'closed';

  return {
    report: true,
    investigate: hasFindings || (hasEmployeeResponse && hasHrRec) || hasMgmtDecision,
    evidence: hasEvidence,
    responsibility: responsibilityOk,
    asset: hasAsset || hasLoss,
    decision: hasDecision && (detail?.decisionType !== 'deduction' || hasRecovery),
    audit: Boolean(detail?.registryId),
    close: isClosed || closureOk,
  };
}

/** Pick the first incomplete stage so the case opens on actionable work. */
export function inferAccountabilityStage(detail, ctx = {}) {
  const done = accountabilityStageCompletion(detail, ctx);
  if (detail?.status === 'closed') return 'close';
  const order = ['investigate', 'evidence', 'responsibility', 'asset', 'decision', 'audit', 'close'];
  for (const id of order) {
    if (!done[id]) return id;
  }
  return 'close';
}
