import React from 'react';
import { ACCOUNTABILITY_STAGES } from './hrAccountabilityStages';

/**
 * @param {{
 *   detail: object | null;
 *   responsibilityOk?: boolean;
 *   recoveryCount?: number;
 *   closureOk?: boolean;
 *   activeStage?: string;
 *   onStageClick?: (id: string) => void;
 * }} props
 */
export default function HrAccountabilityStageBar({
  detail,
  responsibilityOk = false,
  recoveryCount = 0,
  closureOk = false,
  activeStage,
  onStageClick,
}) {
  if (!detail) return null;

  const hasInvestigation =
    ['under_investigation', 'pending_hr_review', 'pending_management_decision', 'action_issued', 'closed'].includes(
      detail.status
    ) ||
    Boolean(detail.investigationFindings || detail.employeeResponse || detail.hrRecommendation);
  const hasEvidence = (detail.evidence?.length || 0) > 0 || (detail.witnesses?.length || 0) > 0;
  const hasAsset = Boolean(detail.assetId || detail.machineId);
  const hasDecision = Boolean(detail.decisionType);
  const hasRecovery = recoveryCount > 0 || detail.decisionType === 'no_action' || detail.decisionType === 'warning';
  const isClosed = detail.status === 'closed';

  const done = {
    report: true,
    investigate: hasInvestigation,
    evidence: hasEvidence,
    responsibility: responsibilityOk,
    asset: hasAsset,
    decision: hasDecision && (detail.decisionType !== 'deduction' || hasRecovery),
    audit: Boolean(detail.registryId),
    close: isClosed || closureOk,
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Accountability stages</p>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {ACCOUNTABILITY_STAGES.map((s) => {
          const complete = done[s.id];
          const active = activeStage === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onStageClick?.(s.id)}
              title={s.hint}
              className={`shrink-0 rounded-lg px-2 py-1.5 text-left text-[10px] font-semibold leading-tight transition-colors ${
                active
                  ? 'bg-teal-800 text-white'
                  : complete
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-teal-300'
              }`}
            >
              <span className="block">{complete && !active ? '✓ ' : ''}{s.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
