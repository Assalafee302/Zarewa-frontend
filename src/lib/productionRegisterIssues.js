import { coilDraftRowsWithData, countUnsavedCoilDraftRows } from './productionRegisterCoilDraft.js';

/**
 * @typedef {'error' | 'warning' | 'info'} ProductionRegisterIssueSeverity
 * @typedef {{
 *   id: string;
 *   severity: ProductionRegisterIssueSeverity;
 *   title: string;
 *   detail: string;
 *   actionLabel?: string;
 * }} ProductionRegisterIssue
 */

/**
 * Build a prioritized list of production-register issues for the current job.
 * @param {object} ctx
 * @returns {ProductionRegisterIssue[]}
 */
export function buildProductionRegisterIssues(ctx) {
  const issues = [];
  const {
    readOnly = false,
    usingCachedData = false,
    canMutate = true,
    jobStatus = '',
    isStoneMeterQuote = false,
    stonePureNoCoil = false,
    stoneCoilHybrid = false,
    completionUsesOffcutMode = false,
    unsavedCoilDraftCount = 0,
    savedCoilCount = 0,
    hasPersistedCoilAllocations = false,
    canEditPlannedAllocations = false,
    canCaptureRun = false,
    coilSpecMismatchPending = false,
    completionValidation = { canComplete: true, errors: [] },
    requiresManagerOverrunApproval = false,
    overProducedMeters = 0,
    stoneFlatsheetLinesMissingLength = [],
    stoneAllocAck = false,
    stoneFlatsheetPostedForJob = false,
    quotedStoneFlatsheetLinesCount = 0,
    canEditCompletedAccessoryCorrections = false,
  } = ctx;

  /** Pure stone = no coil UI. Hybrid and non-stone still nag about coils. */
  const skipCoilNag = Boolean(stonePureNoCoil) || (isStoneMeterQuote && !stoneCoilHybrid);

  const saveActionLabel =
    jobStatus === 'Planned' ? 'Save & start' : jobStatus === 'Running' ? 'Save while running' : 'Save';

  if (!canMutate) {
    issues.push({
      id: 'workspace-readonly',
      severity: 'error',
      title: usingCachedData ? 'Offline — cannot save production' : 'Server not connected',
      detail: usingCachedData
        ? 'Reconnect to the network and refresh before saving coils or completing this job.'
        : 'Start the API server or reconnect before saving production changes.',
    });
    return issues;
  }

  if (!readOnly && !skipCoilNag && !completionUsesOffcutMode && unsavedCoilDraftCount > 0) {
    const localCoilLines = countUnsavedCoilDraftRows(ctx.draftAllocations || []);
    issues.push({
      id: 'unsaved-coils',
      severity: 'error',
      title:
        savedCoilCount > 0
          ? `${localCoilLines} coil line(s) not saved to server`
          : `${localCoilLines} coil line(s) only on this device`,
      detail:
        savedCoilCount > 0
          ? `This screen shows ${savedCoilCount + localCoilLines} coil(s) but admin and manager only see ${savedCoilCount} on the server. Tap "${saveActionLabel}" to sync.`
          : `Other computers cannot see these coils until you tap "${saveActionLabel}".`,
      actionLabel: saveActionLabel,
    });
  }

  if (
    canCaptureRun &&
    !completionUsesOffcutMode &&
    !skipCoilNag &&
    Array.isArray(completionValidation.errors) &&
    completionValidation.errors.length > 0
  ) {
    for (const [index, message] of completionValidation.errors.slice(0, 3).entries()) {
      issues.push({
        id: `completion-${index}`,
        severity: 'error',
        title: 'Cannot complete yet',
        detail: message,
        actionLabel: 'Fix the coil run log below',
      });
    }
  }

  if (canEditPlannedAllocations && !hasPersistedCoilAllocations && !skipCoilNag && !completionUsesOffcutMode) {
    issues.push({
      id: 'no-coils-saved',
      severity: 'warning',
      title: 'No coils saved to server',
      detail: stoneCoilHybrid
        ? 'Pick a coil with opening kg for normal flatsheet (or switch to offcut), then tap Save & start.'
        : 'Pick at least one coil with opening kg, then tap Save & start so the run is visible to admin and manager.',
      actionLabel: 'Save & start',
    });
  }

  if (coilSpecMismatchPending) {
    issues.push({
      id: 'spec-mismatch',
      severity: 'warning',
      title: 'Coil spec exception — manager review',
      detail: 'One or more coils do not match the quotation gauge, colour, or material. Branch manager has been flagged.',
    });
  }

  if (canCaptureRun && requiresManagerOverrunApproval) {
    issues.push({
      id: 'meter-overrun',
      severity: 'warning',
      title: `Metres exceed plan by ${Number(overProducedMeters).toFixed(2)} m`,
      detail: 'A manager remark is required before this job can be completed.',
      actionLabel: 'Enter manager remark and complete',
    });
  }

  if (stoneFlatsheetLinesMissingLength.length > 0 && isStoneMeterQuote && !readOnly) {
    issues.push({
      id: 'stone-length-missing',
      severity: 'warning',
      title: 'Stone flatsheet length missing on quotation',
      detail: `Add length (1.4 m, 1.5 m, or 2 m) for: ${stoneFlatsheetLinesMissingLength.join(', ')}. Update the quotation, then refresh.`,
    });
  }

  if (canEditPlannedAllocations && isStoneMeterQuote && !stoneAllocAck) {
    issues.push({
      id: 'stone-start',
      severity: 'warning',
      title: stoneCoilHybrid ? 'Hybrid stone job not started' : 'Stone-coated job not started',
      detail: stoneCoilHybrid
        ? quotedStoneFlatsheetLinesCount > 0
          ? 'Tap Save & start. Allocate coil or offcut for normal flatsheet; enter stone flatsheet m² before completing.'
          : 'Tap Save & start, then allocate coil or offcut for normal flatsheet / gutter.'
        : quotedStoneFlatsheetLinesCount > 0
          ? 'Tap Save & start (no coils). Enter stone flatsheet m² before completing.'
          : 'Tap Save & start to begin the stone-coated run (no coil allocation).',
      actionLabel: 'Save & start',
    });
  }

  if (
    jobStatus === 'Completed' &&
    isStoneMeterQuote &&
    quotedStoneFlatsheetLinesCount > 0 &&
    !stoneFlatsheetPostedForJob &&
    canEditCompletedAccessoryCorrections
  ) {
    issues.push({
      id: 'stone-sf-missing',
      severity: 'warning',
      title: 'Stone flatsheet m² not recorded',
      detail: 'Enter supplied m² in the stone flatsheet section below, then Save stone flatsheet.',
      actionLabel: 'Save stone flatsheet',
    });
  }

  if (
    jobStatus === 'Running' &&
    !readOnly &&
    !skipCoilNag &&
    !completionUsesOffcutMode &&
    unsavedCoilDraftCount === 0
  ) {
    issues.push({
      id: 'running-next-step',
      severity: 'info',
      title: 'Production is running',
      detail: stoneCoilHybrid
        ? 'Enter closing kg and metres for flatsheet coils, plus stone metres for roofing. Save while running after each roll.'
        : 'Enter closing kg and metres per coil. Save while running after each roll or when adding another coil.',
      actionLabel: 'Save while running',
    });
  }

  return issues;
}

/** Human-readable coil sync summary for queue / header chips. */
export function productionCoilSyncSummary({ savedCoilCount = 0, unsavedCoilDraftCount = 0, isActiveJob = false }) {
  const saved = Number(savedCoilCount) || 0;
  const unsaved = Number(unsavedCoilDraftCount) || 0;
  if (isActiveJob && unsaved > 0) {
    return {
      label: saved > 0 ? `${saved} saved · +${unsaved} not synced` : `+${unsaved} not on server`,
      tone: 'amber',
    };
  }
  if (saved === 0) {
    return { label: 'No coils on server', tone: 'amber' };
  }
  return { label: `${saved} coil(s) on server`, tone: 'neutral' };
}

export function countSavedCoilsInDraft(draftAllocations) {
  return coilDraftRowsWithData(draftAllocations).filter((row) => !String(row.id ?? '').startsWith('draft-')).length;
}
