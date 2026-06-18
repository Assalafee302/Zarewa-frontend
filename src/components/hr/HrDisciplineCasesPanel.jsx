import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { canManageHrDiscipline, canGenerateHrLetters, canApproveHrLetters } from '../../lib/hrAccess';
import { apiFetch } from '../../lib/apiBase';
import { navigateToHrLetter } from '../../lib/hrLetterDeepLink';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';
import {
  addDisciplineCaseEvidence,
  addDisciplineCaseWitness,
  createDisciplineCase,
  DISCIPLINE_CASE_STATUSES,
  DISCIPLINE_CASE_TYPES,
  DISCIPLINE_SEVERITIES,
  fetchDisciplineCase,
  fetchDisciplineCaseDashboard,
  fetchDisciplineCases,
  generateDisciplineCaseLetter,
  patchDisciplineCase,
  severityClass,
  statusMeta,
} from '../../lib/hrDisciplineCases';
import { HrAddFormButton, HrFormModal } from './HrFormModal';
import { HrCard } from './hrPageUi';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from './hrFormStyles';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../ui/AppDataTable';
import HrCaseResponsibilityPanel from './HrCaseResponsibilityPanel';
import HrCaseClosureChecklist from './HrCaseClosureChecklist';
import HrIncidentCreateWizard from './HrIncidentCreateWizard';
import HrIncidentAuditPackPanel from './HrIncidentAuditPackPanel';
import HrAssetCustodyPanel from './HrAssetCustodyPanel';
import HrAccountabilityStageBar from './HrAccountabilityStageBar';
import HrCaseAssetLinkPanel from './HrCaseAssetLinkPanel';
import HrCaseRecoveryPanel from './HrCaseRecoveryPanel';
import HrCaseAttendancePanel from './HrCaseAttendancePanel';
import HrCasePartyLettersPanel from './HrCasePartyLettersPanel';
import HrDisciplineCaseNextSteps from './HrDisciplineCaseNextSteps';
import { fetchCaseClosureCheck, fetchCaseResponsibility } from '../../lib/hrIncidents';
import { inferAccountabilityStage } from '../../lib/hrAccountabilityStageProgress';

function StatusPill({ status }) {
  const m = statusMeta(status);
  const tone =
    m.tone === 'emerald'
      ? 'bg-emerald-100 text-emerald-800'
      : m.tone === 'amber'
        ? 'bg-amber-100 text-amber-900'
        : m.tone === 'teal'
          ? 'bg-teal-100 text-teal-900'
          : m.tone === 'red'
            ? 'bg-red-100 text-red-800'
            : 'bg-slate-100 text-slate-700';
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>{m.label}</span>;
}

function CaseDetailModal({ caseId, onClose, onUpdated, canManage, canApprove, canLetter }) {
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [activeStage, setActiveStage] = useState('report');
  const [responsibilityOk, setResponsibilityOk] = useState(false);
  const [responsibleUserIds, setResponsibleUserIds] = useState([]);
  const [recoveryCount, setRecoveryCount] = useState(0);
  const [closureOk, setClosureOk] = useState(false);
  const [closureBlockers, setClosureBlockers] = useState([]);
  const [evidenceDesc, setEvidenceDesc] = useState('');
  const [witnessForm, setWitnessForm] = useState({ witnessName: '', witnessRole: '', statement: '' });
  const [workflow, setWorkflow] = useState({
    employeeResponse: '',
    investigationFindings: '',
    hrRecommendation: '',
    managementDecision: '',
    sanction: '',
  });
  const stageInitRef = useRef(false);

  const load = useCallback(async () => {
    if (!caseId) return;
    const { ok, data } = await fetchDisciplineCase(caseId);
    let nextDetail = null;
    if (ok && data?.ok) {
      nextDetail = data.case;
      setDetail(data.case);
    }
    let nextResponsibilityOk = false;
    let nextResponsibleUserIds = [];
    let nextClosureOk = false;
    let nextRecoveryCount = 0;
    const [resp, close] = await Promise.all([
      fetchCaseResponsibility(caseId),
      fetchCaseClosureCheck(caseId),
    ]);
    if (resp.ok && resp.data?.ok) {
      const parties = resp.data.parties || [];
      const sum = parties.reduce((s, p) => s + (Number(p.responsibilityWeight) || 0), 0);
      nextResponsibilityOk = parties.length > 0 && Math.abs(sum - 100) < 0.01;
      nextResponsibleUserIds = parties.map((p) => p.userId).filter(Boolean);
      setResponsibilityOk(nextResponsibilityOk);
      setResponsibleUserIds(nextResponsibleUserIds);
    }
    if (close.ok && close.data) {
      nextClosureOk = Boolean(close.data.ok);
      setClosureOk(nextClosureOk);
      setClosureBlockers(close.data.blockers || []);
    }
    const { ok: rsOk, data: rsData } = await apiFetch(`/api/hr/discipline-cases/${encodeURIComponent(caseId)}/recovery-schedules`);
    if (rsOk && rsData?.ok) {
      nextRecoveryCount = (rsData.schedules || []).length;
      setRecoveryCount(nextRecoveryCount);
    }
    if (nextDetail && !stageInitRef.current) {
      stageInitRef.current = true;
      setActiveStage(
        inferAccountabilityStage(nextDetail, {
          responsibilityOk: nextResponsibilityOk,
          recoveryCount: nextRecoveryCount,
          closureOk: nextClosureOk,
        })
      );
    }
  }, [caseId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!detail) return;
    setWorkflow({
      employeeResponse: detail.employeeResponse || '',
      investigationFindings: detail.investigationFindings || '',
      hrRecommendation: detail.hrRecommendation || '',
      managementDecision: detail.managementDecision || '',
      sanction: detail.sanction || '',
    });
  }, [
    detail?.id,
    detail?.employeeResponse,
    detail?.investigationFindings,
    detail?.hrRecommendation,
    detail?.managementDecision,
    detail?.sanction,
  ]);

  useEffect(() => {
    stageInitRef.current = false;
    setActiveStage('report');
  }, [caseId]);

  const runPatch = async (body) => {
    setBusy(true);
    setErr('');
    const { ok, data } = await patchDisciplineCase(caseId, body);
    setBusy(false);
    if (!ok || !data?.ok) {
      setErr(data?.error || 'Update failed.');
      return;
    }
    setDetail(data.case);
    onUpdated?.();
    return data.case;
  };

  const saveWorkflow = async () => {
    const body = {};
    if (workflow.employeeResponse.trim()) body.employeeResponse = workflow.employeeResponse.trim();
    if (workflow.investigationFindings.trim()) body.investigationFindings = workflow.investigationFindings.trim();
    if (workflow.hrRecommendation.trim()) body.hrRecommendation = workflow.hrRecommendation.trim();
    if (workflow.managementDecision.trim()) body.managementDecision = workflow.managementDecision.trim();
    if (workflow.sanction.trim()) body.sanction = workflow.sanction.trim();
    if (!Object.keys(body).length) {
      setErr('Enter at least one workflow field to save.');
      return;
    }
    await runPatch(body);
  };

  const recordManagementDecision = async () => {
    if (!workflow.managementDecision.trim()) {
      setErr('Enter a management decision before recording.');
      return;
    }
    await runPatch({
      managementDecision: workflow.managementDecision.trim(),
      sanction: workflow.sanction.trim(),
    });
  };

  const addEvidence = async () => {
    if (evidenceDesc.trim().length < 3) return;
    setBusy(true);
    const { ok, data } = await addDisciplineCaseEvidence(caseId, { description: evidenceDesc.trim() });
    setBusy(false);
    if (!ok || !data?.ok) {
      setErr(data?.error || 'Could not add evidence.');
      return;
    }
    setEvidenceDesc('');
    await load();
  };

  const addWitness = async () => {
    if (witnessForm.witnessName.trim().length < 2) return;
    setBusy(true);
    const { ok, data } = await addDisciplineCaseWitness(caseId, witnessForm);
    setBusy(false);
    if (!ok || !data?.ok) {
      setErr(data?.error || 'Could not add witness.');
      return;
    }
    setWitnessForm({ witnessName: '', witnessRole: '', statement: '' });
    await load();
  };

  const issueLetter = async (letterType) => {
    setBusy(true);
    const { ok, data } = await generateDisciplineCaseLetter(caseId, letterType, {
      caseNumber: detail?.caseNumber,
      incidentDescription: detail?.description,
      incidentDate: detail?.incidentDateIso,
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setErr(data?.error || 'Letter generation failed.');
      return;
    }
    await load();
    onUpdated?.();
  };

  if (!detail) {
    return (
      <HrFormModal isOpen title="Case details" onClose={onClose} size="xl">
        <p className="text-sm text-slate-600">Loading case…</p>
      </HrFormModal>
    );
  }

  return (
    <HrFormModal isOpen title={`Case ${detail.caseNumber || detail.id}`} onClose={onClose} size="xl">
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {err ? <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</div> : null}
        <div className="flex flex-wrap gap-2 items-center">
          <StatusPill status={detail.status} />
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${severityClass(detail.severity)}`}>
            {detail.severity}
          </span>
          <span className="text-xs text-slate-500">{detail.caseType?.replace(/_/g, ' ')}</span>
        </div>
        <p className="text-sm text-slate-700">{detail.description || detail.summary}</p>
        <div className="grid gap-3 sm:grid-cols-2 text-xs text-slate-600">
          <div><span className="font-semibold">Employee:</span> {detail.staffDisplayName}</div>
          <div><span className="font-semibold">Branch:</span> {detail.branchId}</div>
          <div><span className="font-semibold">Department:</span> {detail.department || '—'}</div>
          <div><span className="font-semibold">Incident:</span> {detail.incidentDateIso || '—'}</div>
          {detail.registryId ? (
            <div className="sm:col-span-2"><span className="font-semibold">Registry:</span> {detail.registryId}</div>
          ) : null}
          {detail.lossValueNgn ? (
            <div><span className="font-semibold">Loss:</span> ₦{Number(detail.lossValueNgn).toLocaleString()}</div>
          ) : null}
          {detail.assetId ? (
            <div><span className="font-semibold">Asset:</span> {detail.assetId}</div>
          ) : null}
        </div>

        <HrAccountabilityStageBar
          detail={detail}
          responsibilityOk={responsibilityOk}
          recoveryCount={recoveryCount}
          closureOk={closureOk}
          activeStage={activeStage}
          onStageClick={setActiveStage}
        />

        <HrDisciplineCaseNextSteps
          detail={detail}
          blockers={closureBlockers}
          canManage={canManage}
          canApprove={canApprove}
          onGoToClose={() => setActiveStage('close')}
        />

        {activeStage === 'report' ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-800 mb-1">Case summary</p>
            <p>
              Use the stage tabs above to work through investigation, evidence, responsibility, asset link, decision,
              and closure. The case opens on the first incomplete stage.
            </p>
            {detail.managementDecision ? (
              <p className="mt-2 text-xs">
                <span className="font-semibold">Management decision on file:</span> {detail.managementDecision}
                {detail.decisionType ? ` · structured type: ${detail.decisionType}` : ''}
              </p>
            ) : null}
          </div>
        ) : null}

        {activeStage === 'investigate' && canManage ? (
          <HrCard title="Workflow actions" subtitle="Advance the case through HR process">
            {(detail.appeals || []).length ? (
              <div className="mb-4 rounded-lg border border-violet-100 bg-violet-50/50 p-3 text-sm">
                <p className="text-xs font-bold uppercase text-violet-800 mb-2">Appeals</p>
                <ul className="space-y-2">
                  {(detail.appeals || []).map((a) => (
                    <li key={a.id} className="text-slate-800">
                      <span className="font-semibold capitalize">{a.status || 'pending'}</span>
                      {a.filedAtIso ? ` · ${a.filedAtIso.slice(0, 10)}` : ''}
                      <p className="text-slate-600 whitespace-pre-wrap mt-1">{a.grounds}</p>
                      {a.outcome ? <p className="text-xs text-violet-900 mt-1">Outcome: {a.outcome}</p> : null}
                    </li>
                  ))}
                </ul>
                {detail.appealStatus === 'pending' ? (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      type="button"
                      disabled={busy}
                      className={HR_BTN_SECONDARY}
                      onClick={() => runPatch({ action: 'resolve_appeal', appealOutcome: 'upheld' })}
                    >
                      Uphold appeal
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className={HR_BTN_SECONDARY}
                      onClick={() => runPatch({ action: 'resolve_appeal', appealOutcome: 'rejected' })}
                    >
                      Reject appeal
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
            <p className="mb-3 text-xs text-slate-600 rounded-lg bg-slate-50 border border-slate-100 p-2">
              <strong>Step 1 — narrative:</strong> Save investigation notes here.{' '}
              <strong>Step 2 — payroll:</strong> After management approves, go to stage <em>6. Decision</em> or{' '}
              <em>8. Close</em> and use <em>Apply decision</em> to create recovery schedules and letters. Recording
              management decision here alone does not trigger payroll.
            </p>
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-600">
                Employee response
                <textarea className={`${HR_FIELD_CLASS} min-h-[72px] mt-1`} value={workflow.employeeResponse} onChange={(e) => setWorkflow({ ...workflow, employeeResponse: e.target.value })} />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Investigation findings
                <textarea className={`${HR_FIELD_CLASS} min-h-[72px] mt-1`} value={workflow.investigationFindings} onChange={(e) => setWorkflow({ ...workflow, investigationFindings: e.target.value })} />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                HR recommendation
                <textarea className={`${HR_FIELD_CLASS} min-h-[72px] mt-1`} value={workflow.hrRecommendation} onChange={(e) => setWorkflow({ ...workflow, hrRecommendation: e.target.value })} />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Management decision
                <textarea className={`${HR_FIELD_CLASS} min-h-[72px] mt-1`} value={workflow.managementDecision} onChange={(e) => setWorkflow({ ...workflow, managementDecision: e.target.value })} placeholder="e.g. Salary deduction per responsibility map" />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Sanction
                <input className={HR_FIELD_CLASS} value={workflow.sanction} onChange={(e) => setWorkflow({ ...workflow, sanction: e.target.value })} placeholder="e.g. Written warning + recovery" />
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} className={HR_BTN_SECONDARY} onClick={() => runPatch({ action: 'request_employee_response' })}>Request response</button>
                <button type="button" disabled={busy} className={HR_BTN_SECONDARY} onClick={() => runPatch({ action: 'start_investigation' })}>Start investigation</button>
                <button type="button" disabled={busy} className={HR_BTN_SECONDARY} onClick={saveWorkflow}>Save workflow progress</button>
                <button type="button" disabled={busy || !workflow.managementDecision.trim()} className={HR_BTN_PRIMARY} onClick={recordManagementDecision}>Record management decision</button>
              </div>
            </div>
          </HrCard>
        ) : null}

        {activeStage === 'investigate' && detail.branchId && detail.incidentDateIso ? (
          <HrCaseAttendancePanel
            branchId={detail.branchId}
            dayIso={detail.incidentDateIso}
            userIds={[
              detail.userId,
              ...(detail.meta?.involvedStaffIds || []),
              ...responsibleUserIds,
            ].filter(Boolean)}
          />
        ) : null}

        {activeStage === 'responsibility' ? (
          <HrCaseResponsibilityPanel caseId={caseId} canManage={canManage} onSaved={load} />
        ) : null}

        {activeStage === 'asset' ? (
          <>
            <HrCaseAssetLinkPanel caseId={caseId} detail={detail} canManage={canManage} onSaved={load} />
            <HrAssetCustodyPanel assetId={detail.assetId} machineId={detail.machineId} canManage={canManage} />
          </>
        ) : null}

        {(activeStage === 'decision' || activeStage === 'close') && canManage ? (
          <HrCaseRecoveryPanel caseId={caseId} detail={detail} canManage={canManage} onUpdated={load} />
        ) : null}

        {(activeStage === 'decision' || activeStage === 'close' || activeStage === 'report') &&
        (canManage || canApprove) &&
        (detail.relatedLetters?.length || detail.relatedLetterIds?.length) ? (
          <HrCasePartyLettersPanel
            detail={detail}
            canManage={canManage}
            canApprove={canApprove}
            onUpdated={load}
          />
        ) : null}

        {(activeStage === 'decision' || activeStage === 'close') && canManage ? (
          <HrCaseClosureChecklist
            caseId={caseId}
            canManage={canManage}
            detail={detail}
            recoveryCount={recoveryCount}
            onUpdated={load}
          />
        ) : null}

        {activeStage === 'audit' ? (
          <HrIncidentAuditPackPanel registryId={detail.registryId} caseId={caseId} />
        ) : null}

        {(activeStage === 'evidence' || activeStage === 'investigate') && canManage ? (
          <>
            <HrCard title="Evidence" subtitle="Document links and descriptions">
              <ul className="mb-3 space-y-1 text-sm">
                {(detail.evidence || []).map((e) => (
                  <li key={e.id} className="text-slate-700">• {e.description}</li>
                ))}
              </ul>
              <div className="flex gap-2">
                <input className={HR_FIELD_CLASS} placeholder="Evidence description" value={evidenceDesc} onChange={(e) => setEvidenceDesc(e.target.value)} />
                <button type="button" disabled={busy} className={HR_BTN_SECONDARY} onClick={addEvidence}>Add</button>
              </div>
            </HrCard>
            <HrCard title="Witnesses" subtitle="Witness statements">
              <ul className="mb-3 space-y-1 text-sm">
                {(detail.witnesses || []).map((w) => (
                  <li key={w.id} className="text-slate-700"><strong>{w.witnessName}</strong> — {w.statement || w.witnessRole || '—'}</li>
                ))}
              </ul>
              <div className="grid gap-2 sm:grid-cols-3">
                <input className={HR_FIELD_CLASS} placeholder="Name" value={witnessForm.witnessName} onChange={(e) => setWitnessForm({ ...witnessForm, witnessName: e.target.value })} />
                <input className={HR_FIELD_CLASS} placeholder="Role" value={witnessForm.witnessRole} onChange={(e) => setWitnessForm({ ...witnessForm, witnessRole: e.target.value })} />
                <button type="button" disabled={busy} className={HR_BTN_SECONDARY} onClick={addWitness}>Add witness</button>
              </div>
            </HrCard>
          </>
        ) : null}

        <HrCard title="Timeline" subtitle="Audit events for this case">
          <ul className="space-y-2 text-sm">
            {(detail.events || []).map((ev) => (
              <li key={ev.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <div className="text-xs font-semibold text-teal-800">{ev.eventKind?.replace(/_/g, ' ')}</div>
                <div className="text-slate-700">{ev.note}</div>
                <div className="text-[11px] text-slate-500 mt-1">{ev.createdAtIso?.slice(0, 16)}</div>
              </li>
            ))}
          </ul>
        </HrCard>

        {canLetter ? (
          <HrCard title="Letters" subtitle="Generate linked discipline letters">
            <div className="flex flex-wrap gap-2">
              <button type="button" className={HR_BTN_SECONDARY} onClick={() => issueLetter('query')}>Query letter</button>
              <button type="button" className={HR_BTN_SECONDARY} onClick={() => issueLetter('warning')}>Warning</button>
              <button type="button" className={HR_BTN_SECONDARY} onClick={() => issueLetter('suspension')}>Suspension</button>
              <button type="button" className={HR_BTN_SECONDARY} onClick={() => navigateToHrLetter(navigate, { letterKind: 'dismissal', userId: detail.userId, sourceRecordKind: 'hr_discipline_case', sourceRecordId: detail.id })}>Dismissal (preview)</button>
            </div>
          </HrCard>
        ) : null}

        <div className="flex flex-wrap gap-2 text-sm">
          <Link to={`${HR_EMPLOYEES}/${encodeURIComponent(detail.userId)}`} className="text-teal-700 hover:underline">Staff profile</Link>
          <Link to={`/hr/documents?tab=reports&report=discipline-cases-history`} className="text-teal-700 hover:underline">Case reports</Link>
        </div>
      </div>
    </HrFormModal>
  );
}

export default function HrDisciplineCasesPanel() {
  const ws = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const perms = ws?.permissions || [];
  const canManage = canManageHrDiscipline(perms);
  const canApprove = canApproveHrLetters(perms);
  const canLetter = canGenerateHrLetters(perms);

  const [dashboard, setDashboard] = useState(null);
  const [cases, setCases] = useState([]);
  const [staff, setStaff] = useState([]);
  const [filters, setFilters] = useState({ status: '', caseType: '', severity: '' });
  const [createOpen, setCreateOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [detailId, setDetailId] = useState(searchParams.get('caseId') || '');
  const [form, setForm] = useState({
    userId: '',
    caseType: 'query',
    severity: 'medium',
    incidentDateIso: new Date().toISOString().slice(0, 10),
    description: '',
    payrollBlockFlags: { promotionBlocked: false, salaryChangeBlocked: false },
    lossValueNgn: '',
    assetId: '',
    location: '',
  });
  const [formErr, setFormErr] = useState('');
  const [busy, setBusy] = useState(false);

  useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/staff');
    if (ok && data?.ok) setStaff(data.staff || []);
    return { hasData: ok };
  }, []);

  const { loading, error, reload } = useHrListLoad(async () => {
    const [dashRes, casesRes] = await Promise.all([
      fetchDisciplineCaseDashboard(),
      fetchDisciplineCases(filters),
    ]);
    if (dashRes.ok && dashRes.data?.ok) setDashboard(dashRes.data.dashboard);
    if (!casesRes.ok || !casesRes.data?.ok) {
      setCases([]);
      return { error: casesRes.data?.error || 'Could not load cases.', hasData: false };
    }
    setCases(casesRes.data.cases || []);
    return { hasData: true };
  }, [filters.status, filters.caseType, filters.severity]);

  useEffect(() => {
    const id = searchParams.get('caseId');
    if (id) setDetailId(id);
  }, [searchParams]);

  const openDetail = (id) => {
    setDetailId(id);
    setSearchParams((p) => {
      const next = new URLSearchParams(p);
      next.set('caseId', id);
      return next;
    });
  };

  const closeDetail = () => {
    setDetailId('');
    setSearchParams((p) => {
      const next = new URLSearchParams(p);
      next.delete('caseId');
      return next;
    });
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    if (!canManage) return;
    if (form.description.trim().length < 10) {
      setFormErr('Description must be at least 10 characters.');
      return;
    }
    setBusy(true);
    setFormErr('');
    const { ok, data } = await createDisciplineCase({
      ...form,
      lossValueNgn: form.lossValueNgn ? Number(form.lossValueNgn) : undefined,
      assetId: form.assetId?.trim() || undefined,
      meta: form.location?.trim() ? { location: form.location.trim() } : undefined,
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setFormErr(data?.error || 'Could not create case.');
      return;
    }
    setCreateOpen(false);
    await reload();
    if (data.id) openDetail(data.id);
  };

  const dashCards = useMemo(
    () => [
      { label: 'Open cases', value: dashboard?.openCount ?? '—', tone: 'amber' },
      { label: 'Pending approval', value: dashboard?.pendingApproval ?? '—', tone: 'teal' },
      { label: 'Total cases', value: dashboard?.total ?? '—', tone: 'slate' },
    ],
    [dashboard],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {dashCards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{c.label}</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold text-slate-600">
          Status
          <select className={HR_FIELD_CLASS} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All</option>
            {DISCIPLINE_CASE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Type
          <select className={HR_FIELD_CLASS} value={filters.caseType} onChange={(e) => setFilters({ ...filters, caseType: e.target.value })}>
            <option value="">All</option>
            {DISCIPLINE_CASE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Severity
          <select className={HR_FIELD_CLASS} value={filters.severity} onChange={(e) => setFilters({ ...filters, severity: e.target.value })}>
            <option value="">All</option>
            {DISCIPLINE_SEVERITIES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
        {canManage ? (
          <>
            <HrAddFormButton onClick={() => setWizardOpen(true)}>New incident</HrAddFormButton>
            <HrAddFormButton onClick={() => setCreateOpen(true)}>Open case</HrAddFormButton>
          </>
        ) : null}
      </div>

      {error ? <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null}
      {loading && !cases.length ? <p className="text-sm text-slate-600">Loading cases…</p> : null}

      <div className="md:hidden space-y-3">
        {cases.map((c) => (
          <button key={c.id} type="button" onClick={() => openDetail(c.id)} className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm">
            <div className="flex justify-between gap-2">
              <span className="font-semibold text-slate-900">{c.caseNumber || c.id}</span>
              <StatusPill status={c.status} />
            </div>
            <div className="mt-1 text-sm text-slate-700">{c.staffDisplayName}</div>
            <div className="mt-2 flex gap-2 text-xs">
              <span className={`rounded-full px-2 py-0.5 font-semibold ${severityClass(c.severity)}`}>{c.severity}</span>
              <span className="text-slate-500">{c.caseType?.replace(/_/g, ' ')}</span>
            </div>
          </button>
        ))}
      </div>

      <AppTableWrap className="hidden md:block">
        <AppTable>
          <AppTableThead>
            <AppTableTh>Case No</AppTableTh>
              <AppTableTh>Employee</AppTableTh>
              <AppTableTh>Type</AppTableTh>
              <AppTableTh>Severity</AppTableTh>
              <AppTableTh>Status</AppTableTh>
              <AppTableTh>Reported</AppTableTh>
              <AppTableTh />
          </AppTableThead>
          <AppTableBody>
            {cases.map((c) => (
              <AppTableTr key={c.id}>
                <AppTableTd className="font-mono text-xs">{c.caseNumber || c.id}</AppTableTd>
                <AppTableTd>{c.staffDisplayName}</AppTableTd>
                <AppTableTd>{c.caseType?.replace(/_/g, ' ')}</AppTableTd>
                <AppTableTd><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${severityClass(c.severity)}`}>{c.severity}</span></AppTableTd>
                <AppTableTd><StatusPill status={c.status} /></AppTableTd>
                <AppTableTd>{(c.reportedDateIso || c.openedAtIso || '').slice(0, 10)}</AppTableTd>
                <AppTableTd>
                  <button type="button" className="text-teal-700 text-sm font-semibold hover:underline" onClick={() => openDetail(c.id)}>View</button>
                </AppTableTd>
              </AppTableTr>
            ))}
          </AppTableBody>
        </AppTable>
      </AppTableWrap>

      {createOpen ? (
        <HrFormModal isOpen={createOpen} title="Open discipline case" onClose={() => setCreateOpen(false)} size="lg">
          <form onSubmit={submitCreate} className="space-y-3">
            {formErr ? <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">{formErr}</div> : null}
            <label className="block text-xs font-semibold text-slate-600">
              Employee
              <select className={HR_FIELD_CLASS} required value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
                <option value="">Select staff…</option>
                {staff.map((s) => (
                  <option key={s.userId} value={s.userId}>{s.displayName || s.username}</option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-slate-600">
                Case type
                <select className={HR_FIELD_CLASS} value={form.caseType} onChange={(e) => setForm({ ...form, caseType: e.target.value })}>
                  {DISCIPLINE_CASE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Severity
                <select className={HR_FIELD_CLASS} value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                  {DISCIPLINE_SEVERITIES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-xs font-semibold text-slate-600">
              Incident date
              <input type="date" className={HR_FIELD_CLASS} value={form.incidentDateIso} onChange={(e) => setForm({ ...form, incidentDateIso: e.target.value })} />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Description / allegation
              <textarea className={`${HR_FIELD_CLASS} min-h-[120px]`} required minLength={10} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-slate-600">
                Asset ID
                <input className={HR_FIELD_CLASS} value={form.assetId} onChange={(e) => setForm({ ...form, assetId: e.target.value })} placeholder="PUMP-FACT-002" />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Loss value (NGN)
                <input type="number" className={HR_FIELD_CLASS} value={form.lossValueNgn} onChange={(e) => setForm({ ...form, lossValueNgn: e.target.value })} />
              </label>
              <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
                Location
                <input className={HR_FIELD_CLASS} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="factory store" />
              </label>
            </div>
            <fieldset className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
              <legend className="px-1 text-xs font-semibold text-amber-900">Payroll impact flags</legend>
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input type="checkbox" checked={form.payrollBlockFlags.promotionBlocked} onChange={(e) => setForm({ ...form, payrollBlockFlags: { ...form.payrollBlockFlags, promotionBlocked: e.target.checked } })} />
                Block promotion while case open
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-700 mt-1">
                <input type="checkbox" checked={form.payrollBlockFlags.salaryChangeBlocked} onChange={(e) => setForm({ ...form, payrollBlockFlags: { ...form.payrollBlockFlags, salaryChangeBlocked: e.target.checked } })} />
                Block salary changes while case open
              </label>
            </fieldset>
            <div className="flex gap-2 justify-end">
              <button type="button" className={HR_BTN_SECONDARY} onClick={() => setCreateOpen(false)}>Cancel</button>
              <button type="submit" disabled={busy} className={HR_BTN_PRIMARY}>{busy ? 'Saving…' : 'Create case'}</button>
            </div>
          </form>
        </HrFormModal>
      ) : null}

      {detailId ? (
        <CaseDetailModal
          caseId={detailId}
          onClose={closeDetail}
          onUpdated={reload}
          canManage={canManage}
          canApprove={canApprove}
          canLetter={canLetter}
        />
      ) : null}

      {wizardOpen ? (
        <HrIncidentCreateWizard
          open
          staff={staff}
          onClose={() => setWizardOpen(false)}
          onCreated={(row) => {
            setWizardOpen(false);
            reload();
            if (row?.caseId) setDetailId(row.caseId);
          }}
        />
      ) : null}
    </div>
  );
}
