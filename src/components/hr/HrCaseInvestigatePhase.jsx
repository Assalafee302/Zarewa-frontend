import { HrCard } from './hrPageUi';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from './hrFormStyles';
import HrCaseResponsibilityPanel from './HrCaseResponsibilityPanel';
import HrCaseAssetLinkPanel from './HrCaseAssetLinkPanel';
import HrAssetCustodyPanel from './HrAssetCustodyPanel';
import HrCaseAttendancePanel from './HrCaseAttendancePanel';
import { investigatePhaseBlockers } from '../../lib/hrAccountabilityStageProgress';

/**
 * Phase 2 — everything needed before a sanction: narrative, proof, responsibility, asset.
 */
export default function HrCaseInvestigatePhase({
  caseId,
  detail,
  canManage,
  busy,
  workflow,
  setWorkflow,
  onSaveInvestigation,
  onRequestResponse,
  onStartInvestigation,
  evidenceDesc,
  setEvidenceDesc,
  onAddEvidence,
  witnessForm,
  setWitnessForm,
  onAddWitness,
  responsibilityOk,
  responsibleUserIds,
  onSaved,
  onResolveAppeal,
}) {
  const blockers = investigatePhaseBlockers(detail, { responsibilityOk });

  return (
    <div className="space-y-4">
      {blockers.length ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          <p className="font-semibold mb-1">Still needed before sanction:</p>
          <ul className="space-y-0.5">
            {blockers.map((b) => (
              <li key={b}>○ {b}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-emerald-800 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
          Investigation complete — go to <strong>3. Sanction</strong> to apply management decision.
        </p>
      )}

      {(detail.appeals || []).length ? (
        <HrCard title="Appeals" subtitle="Employee appeal against this case">
          <ul className="space-y-2 text-sm">
            {(detail.appeals || []).map((a) => (
              <li key={a.id} className="text-slate-800">
                <span className="font-semibold capitalize">{a.status || 'pending'}</span>
                {a.filedAtIso ? ` · ${a.filedAtIso.slice(0, 10)}` : ''}
                <p className="text-slate-600 whitespace-pre-wrap mt-1">{a.grounds}</p>
              </li>
            ))}
          </ul>
          {canManage && detail.appealStatus === 'pending' ? (
            <div className="flex flex-wrap gap-2 mt-3">
              <button type="button" disabled={busy} className={HR_BTN_SECONDARY} onClick={() => onResolveAppeal('upheld')}>
                Uphold appeal
              </button>
              <button type="button" disabled={busy} className={HR_BTN_SECONDARY} onClick={() => onResolveAppeal('rejected')}>
                Reject appeal
              </button>
            </div>
          ) : null}
        </HrCard>
      ) : null}

      {canManage ? (
        <HrCard title="Investigation notes" subtitle="Employee response, findings, and HR recommendation">
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-600">
              Employee response
              <textarea
                className={`${HR_FIELD_CLASS} min-h-[64px] mt-1`}
                value={workflow.employeeResponse}
                onChange={(e) => setWorkflow({ ...workflow, employeeResponse: e.target.value })}
              />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Investigation findings
              <textarea
                className={`${HR_FIELD_CLASS} min-h-[64px] mt-1`}
                value={workflow.investigationFindings}
                onChange={(e) => setWorkflow({ ...workflow, investigationFindings: e.target.value })}
              />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              HR recommendation
              <textarea
                className={`${HR_FIELD_CLASS} min-h-[64px] mt-1`}
                value={workflow.hrRecommendation}
                onChange={(e) => setWorkflow({ ...workflow, hrRecommendation: e.target.value })}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} className={HR_BTN_SECONDARY} onClick={onRequestResponse}>
                Request employee response
              </button>
              <button type="button" disabled={busy} className={HR_BTN_SECONDARY} onClick={onStartInvestigation}>
                Mark under investigation
              </button>
              <button type="button" disabled={busy} className={HR_BTN_PRIMARY} onClick={onSaveInvestigation}>
                {busy ? 'Saving…' : 'Save investigation'}
              </button>
            </div>
          </div>
        </HrCard>
      ) : null}

      {canManage ? (
        <HrCard title="Evidence & witnesses" subtitle="Optional but recommended for audit">
          <ul className="mb-3 space-y-1 text-sm">
            {(detail.evidence || []).map((e) => (
              <li key={e.id} className="text-slate-700">• {e.description}</li>
            ))}
          </ul>
          <div className="flex gap-2 mb-4">
            <input
              className={HR_FIELD_CLASS}
              placeholder="Evidence description"
              value={evidenceDesc}
              onChange={(e) => setEvidenceDesc(e.target.value)}
            />
            <button type="button" disabled={busy} className={HR_BTN_SECONDARY} onClick={onAddEvidence}>
              Add
            </button>
          </div>
          <ul className="mb-3 space-y-1 text-sm">
            {(detail.witnesses || []).map((w) => (
              <li key={w.id} className="text-slate-700">
                <strong>{w.witnessName}</strong> — {w.statement || w.witnessRole || '—'}
              </li>
            ))}
          </ul>
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              className={HR_FIELD_CLASS}
              placeholder="Witness name"
              value={witnessForm.witnessName}
              onChange={(e) => setWitnessForm({ ...witnessForm, witnessName: e.target.value })}
            />
            <input
              className={HR_FIELD_CLASS}
              placeholder="Role"
              value={witnessForm.witnessRole}
              onChange={(e) => setWitnessForm({ ...witnessForm, witnessRole: e.target.value })}
            />
            <button type="button" disabled={busy} className={HR_BTN_SECONDARY} onClick={onAddWitness}>
              Add witness
            </button>
          </div>
        </HrCard>
      ) : null}

      <HrCaseResponsibilityPanel caseId={caseId} canManage={canManage} onSaved={onSaved} />

      <HrCard title="Asset & financial loss" subtitle="Required when money or equipment is involved">
        <HrCaseAssetLinkPanel caseId={caseId} detail={detail} canManage={canManage} onSaved={onSaved} />
        {detail.assetId || detail.machineId ? (
          <HrAssetCustodyPanel assetId={detail.assetId} machineId={detail.machineId} canManage={canManage} />
        ) : null}
      </HrCard>

      {detail.branchId && detail.incidentDateIso ? (
        <HrCaseAttendancePanel
          branchId={detail.branchId}
          dayIso={detail.incidentDateIso}
          userIds={[detail.userId, ...(detail.meta?.involvedStaffIds || []), ...responsibleUserIds].filter(Boolean)}
        />
      ) : null}
    </div>
  );
}
