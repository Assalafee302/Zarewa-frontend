import HrCaseClosureChecklist from './HrCaseClosureChecklist';
import HrIncidentAuditPackPanel from './HrIncidentAuditPackPanel';
import HrCasePartyLettersPanel from './HrCasePartyLettersPanel';
import { HrCard } from './hrPageUi';

/** Phase 4 — closure checklist, audit export, timeline stays in parent. */
export default function HrCaseClosePhase({
  caseId,
  detail,
  canManage,
  canApprove,
  recoveryCount,
  onUpdated,
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-600 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
        When all checklist items are green, click <strong>Close case</strong>. Letters must be <em>issued</em> (not
        just approved) before a deduction case can close.
      </p>

      {(canManage || canApprove) && (detail.relatedLetters?.length || detail.relatedLetterIds?.length) ? (
        <HrCasePartyLettersPanel
          detail={detail}
          canManage={canManage}
          canApprove={canApprove}
          onUpdated={onUpdated}
        />
      ) : null}

      {canManage ? (
        <HrCard title="Close case" subtitle="Final checklist">
          <HrCaseClosureChecklist
            caseId={caseId}
            canManage={canManage}
            detail={detail}
            recoveryCount={recoveryCount}
            onUpdated={onUpdated}
            variant="close"
          />
        </HrCard>
      ) : null}

      {detail.registryId ? (
        <HrIncidentAuditPackPanel registryId={detail.registryId} caseId={caseId} />
      ) : (
        <p className="text-xs text-slate-500">No registry link — audit pack export is unavailable for this case.</p>
      )}
    </div>
  );
}
