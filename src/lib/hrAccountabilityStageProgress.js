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

function investigationSignals(detail) {
  const hasEmployeeResponse = Boolean(String(detail?.employeeResponse || '').trim());
  const hasFindings = Boolean(String(detail?.investigationFindings || '').trim());
  const hasHrRec = Boolean(String(detail?.hrRecommendation || '').trim());
  const evidenceRows = Array.isArray(detail?.evidence) ? detail.evidence : [];
  const hasEvidence =
    evidenceRows.some((e) => String(e?.description || '').trim().length >= 2) ||
    (Array.isArray(detail?.witnesses) && detail.witnesses.length > 0);
  const hasAsset = Boolean(detail?.assetId || detail?.machineId);
  const hasLoss = Math.round(Number(detail?.lossValueNgn) || 0) > 0;
  const financialCase =
    hasLoss ||
    ['property_damage', 'theft_fraud', 'missing_asset', 'asset_damage'].includes(String(detail?.caseType || ''));

  return { hasEmployeeResponse, hasFindings, hasHrRec, hasEvidence, hasAsset, hasLoss, financialCase };
}

export function accountabilityPhaseCompletion(
  detail,
  { responsibilityOk = false, recoveryCount = 0, closureOk = false } = {}
) {
  const {
    hasEmployeeResponse,
    hasFindings,
    hasHrRec,
    hasAsset,
    hasLoss,
    financialCase,
  } = investigationSignals(detail);
  const hasDecision = Boolean(detail?.decisionType);
  const hasRecovery =
    recoveryCount > 0 || detail?.decisionType === 'no_action' || detail?.decisionType === 'warning';
  const isClosed = detail?.status === 'closed';
  const letters = Array.isArray(detail?.relatedLetters) ? detail.relatedLetters : [];
  const recoveryLetters = letters.filter((l) => l.letterKind === 'salary_recovery');
  const lettersReady =
    detail?.decisionType !== 'deduction' ||
    !recoveryLetters.length ||
    recoveryLetters.every((l) => String(l.status) === 'issued');

  const narrativeDone = hasFindings || (hasEmployeeResponse && hasHrRec);
  const assetDone = !financialCase || hasAsset || hasLoss;
  const investigateDone = responsibilityOk && narrativeDone && assetDone;

  return {
    intake: true,
    investigate: investigateDone,
    sanction: hasDecision && (detail?.decisionType !== 'deduction' || hasRecovery),
    close: isClosed || (closureOk && lettersReady),
  };
}

/** @deprecated alias */
export function accountabilityStageCompletion(detail, ctx) {
  return accountabilityPhaseCompletion(detail, ctx);
}

/** Pick the first incomplete phase so the case opens on actionable work. */
export function inferAccountabilityPhase(detail, ctx = {}) {
  const done = accountabilityPhaseCompletion(detail, ctx);
  if (detail?.status === 'closed') return 'close';
  const order = ['investigate', 'sanction', 'close'];
  for (const id of order) {
    if (!done[id]) return id;
  }
  return 'close';
}

/** @deprecated */
export function inferAccountabilityStage(detail, ctx) {
  return inferAccountabilityPhase(detail, ctx);
}

/** Human checklist for what is still missing in the investigate phase. */
export function investigatePhaseBlockers(detail, { responsibilityOk = false } = {}) {
  const {
    hasEmployeeResponse,
    hasFindings,
    hasHrRec,
    hasAsset,
    hasLoss,
    financialCase,
  } = investigationSignals(detail);
  const blockers = [];
  if (!hasFindings && !(hasEmployeeResponse && hasHrRec)) {
    blockers.push('Add investigation findings, or employee response + HR recommendation.');
  }
  if (!responsibilityOk) blockers.push('Responsibility map must total 100% across all parties.');
  if (financialCase && !hasAsset && !hasLoss) {
    blockers.push('Link an asset or enter a loss value for financial incidents.');
  }
  return blockers;
}
