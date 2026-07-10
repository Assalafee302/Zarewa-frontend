import { HrButton, HrAddButton } from '../../components/hr/hrPageUi';
import React, { useMemo, useState } from 'react';
import {
  createIncident,
  CONTRIBUTION_TYPES,
  INCIDENT_CATEGORIES,
  OPERATIONAL_INCIDENT_TYPES,
  RESPONSIBILITY_ROLES,
  splitResponsibilityEvenly,
} from '../../lib/hrIncidents';
import { DISCIPLINE_CASE_TYPES } from '../../lib/hrDisciplineCases';
import { HrFormModal } from './HrFormModal';
import { HR_FIELD_CLASS } from './hrFormStyles';

const EMPTY_PARTY = { userId: '', role: 'custodian', responsibilityWeight: 25, contributionType: 'negligence', note: '' };

export default function HrIncidentCreateWizard({ open, onClose, staff, onCreated }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [category, setCategory] = useState('hr');
  const [userId, setUserId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [incidentDateIso, setIncidentDateIso] = useState(new Date().toISOString().slice(0, 10));
  const [severity, setSeverity] = useState('medium');
  const [caseType, setCaseType] = useState('property_damage');
  const [incidentType, setIncidentType] = useState('missing_asset');
  const [lossValueNgn, setLossValueNgn] = useState('');
  const [assetId, setAssetId] = useState('');
  const [location, setLocation] = useState('');
  const [shift, setShift] = useState('');
  const [outputAboveTargetPct, setOutputAboveTargetPct] = useState('');
  const [involvedParties, setInvolvedParties] = useState([{ ...EMPTY_PARTY }]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const needsStaff = category === 'hr' || category === 'operational' || category === 'performance';
  const needsInvolvedStep = category === 'hr' || category === 'operational';
  const needsAssetStep = category === 'hr' || category === 'operational';

  const flowSteps = useMemo(() => {
    const steps = [
      { id: 'category', title: 'What type?', subtitle: 'HR discipline, operational, or performance' },
      { id: 'details', title: 'What happened?', subtitle: 'Staff, description, parties, asset & loss — all on one screen' },
      { id: 'review', title: 'Confirm', subtitle: 'Register the incident' },
    ];
    return steps;
  }, []);

  const step = flowSteps[stepIndex] || flowSteps[0];
  const isLastStep = stepIndex >= flowSteps.length - 1;

  const activeParties = useMemo(
    () => involvedParties.filter((p) => String(p.userId || '').trim()),
    [involvedParties]
  );

  const weightSum = useMemo(
    () => activeParties.reduce((s, p) => s + (Number(p.responsibilityWeight) || 0), 0),
    [activeParties]
  );

  const reviewSummary = useMemo(
    () => ({
      category: INCIDENT_CATEGORIES.find((c) => c.value === category)?.label || category,
      staff: (staff || []).find((s) => s.userId === userId)?.displayName || userId || '—',
      title: title || '—',
      description,
      incidentDateIso,
      severity,
      caseType,
      incidentType,
      lossValueNgn,
      assetId,
      location,
      shift,
      involvedParties: activeParties.length
        ? activeParties.map((p) => {
            const name = (staff || []).find((s) => s.userId === p.userId)?.displayName || p.userId;
            return `${name} (${p.role}, ${p.responsibilityWeight}%)`;
          }).join('; ')
        : '—',
    }),
    [category, staff, userId, title, description, incidentDateIso, severity, caseType, incidentType, lossValueNgn, assetId, location, shift, activeParties]
  );

  const reset = () => {
    setStepIndex(0);
    setInvolvedParties([{ ...EMPTY_PARTY }]);
    setErr('');
  };

  const close = () => {
    reset();
    onClose?.();
  };

  const validateStep = (currentStep) => {
    if (currentStep.id === 'category') return true;
    if (currentStep.id === 'details') {
      if (needsStaff && !userId) return 'Select the subject staff member.';
      if (description.trim().length < 10) return 'Description must be at least 10 characters.';
      if (category === 'hr' && caseType === 'theft_fraud') {
        if (!assetId.trim()) return 'Asset ID is required for theft/fraud.';
        if (!location.trim()) return 'Location is required for theft/fraud.';
      }
      if (activeParties.length && Math.abs(weightSum - 100) > 0.01) {
        return `Responsibility weights must sum to 100% (current: ${weightSum.toFixed(1)}%).`;
      }
      return true;
    }
    return true;
  };

  const next = () => {
    const v = validateStep(step);
    if (v !== true) {
      setErr(v);
      return;
    }
    setErr('');
    setStepIndex((i) => Math.min(flowSteps.length - 1, i + 1));
  };

  const back = () => {
    setErr('');
    setStepIndex((i) => Math.max(0, i - 1));
  };

  const addParty = () => {
    setInvolvedParties((prev) => [...prev, { ...EMPTY_PARTY, role: 'other' }]);
  };

  const splitEvenly = () => {
    setInvolvedParties((prev) => splitResponsibilityEvenly(prev.filter((p) => p.userId) || prev));
  };

  const submit = async () => {
    setErr('');
    setBusy(true);
    const partiesPayload = activeParties.length ? activeParties : undefined;
    const body = {
      incidentCategory: category,
      userId: needsStaff ? userId : undefined,
      title: title.trim() || undefined,
      description,
      summary: title.trim() ? `${title.trim()} — ${description}` : description,
      severity,
      incidentDateIso,
      caseType: category === 'hr' ? caseType : undefined,
      incidentType: category === 'operational' ? incidentType : category === 'performance' ? 'performance_excellence' : undefined,
      lossValueNgn: lossValueNgn ? Number(lossValueNgn) : undefined,
      assetId: assetId.trim() || undefined,
      location: location.trim() || undefined,
      shift: shift.trim() || undefined,
      outputAboveTargetPct: outputAboveTargetPct ? Number(outputAboveTargetPct) : undefined,
      involvedParties: partiesPayload,
      meta: location.trim() || shift.trim() || partiesPayload
        ? {
            location: location.trim() || null,
            shift: shift.trim() || null,
            involvedStaffIds: partiesPayload ? partiesPayload.map((p) => p.userId) : undefined,
          }
        : undefined,
    };
    const { ok, data } = await createIncident(body);
    setBusy(false);
    if (!ok || !data?.ok) {
      setErr(data?.error || 'Could not create incident.');
      return;
    }
    onCreated?.(data);
    close();
  };

  if (!open) return null;

  return (
    <HrFormModal title="New accountability incident" onClose={close} size="lg">
      <div className="mb-4 flex gap-1">
        {flowSteps.map((s, idx) => (
          <div
            key={s.id}
            className={`h-1 flex-1 rounded-full ${stepIndex >= idx ? 'bg-teal-700' : 'bg-slate-200'}`}
          />
        ))}
      </div>
      <p className="text-xs font-bold text-teal-900">{step.title}</p>
      <p className="text-xs text-slate-500 mb-4">{step.subtitle}</p>

      {step.id === 'category' ? (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Category
            <select className={`${HR_FIELD_CLASS} mt-1`} value={category} onChange={(e) => setCategory(e.target.value)}>
              {INCIDENT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </label>
          <p className="text-xs text-slate-500 rounded-lg bg-slate-50 p-3">
            {category === 'performance'
              ? 'Routes to recognition — not discipline.'
              : category === 'material'
                ? 'Creates a material exception for operations approval.'
                : category === 'operational'
                  ? 'Asset/custody incidents — also opens a discipline case when loss value is set.'
                  : 'Formal HR discipline case with full accountability workflow.'}
          </p>
        </div>
      ) : null}

      {step.id === 'details' ? (
        <div className="space-y-3">
          {needsStaff ? (
            <label className="block text-sm font-medium text-slate-700">
              Subject staff
              <select className={`${HR_FIELD_CLASS} mt-1`} value={userId} onChange={(e) => setUserId(e.target.value)} required>
                <option value="">Select…</option>
                {(staff || []).map((s) => (
                  <option key={s.userId} value={s.userId}>{s.displayName || s.userId}</option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="block text-sm font-medium text-slate-700">
            Title / short summary
            <input className={`${HR_FIELD_CLASS} mt-1`} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Missing factory pump" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Full description
            <textarea className={`${HR_FIELD_CLASS} mt-1 min-h-[80px]`} value={description} onChange={(e) => setDescription(e.target.value)} required minLength={10} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Incident date
              <input type="date" className={`${HR_FIELD_CLASS} mt-1`} value={incidentDateIso} onChange={(e) => setIncidentDateIso(e.target.value)} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Severity
              <select className={`${HR_FIELD_CLASS} mt-1`} value={severity} onChange={(e) => setSeverity(e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
          </div>
          {category === 'hr' ? (
            <label className="block text-sm font-medium text-slate-700">
              Case type
              <select className={`${HR_FIELD_CLASS} mt-1`} value={caseType} onChange={(e) => setCaseType(e.target.value)}>
                {DISCIPLINE_CASE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>
          ) : null}
          {category === 'operational' ? (
            <label className="block text-sm font-medium text-slate-700">
              Operational type
              <select className={`${HR_FIELD_CLASS} mt-1`} value={incidentType} onChange={(e) => setIncidentType(e.target.value)}>
                {OPERATIONAL_INCIDENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>
          ) : null}
          {category === 'performance' ? (
            <label className="block text-sm font-medium text-slate-700">
              Output above target (%)
              <input type="number" className={`${HR_FIELD_CLASS} mt-1`} value={outputAboveTargetPct} onChange={(e) => setOutputAboveTargetPct(e.target.value)} placeholder="e.g. 40" />
            </label>
          ) : null}

          {needsAssetStep ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 space-y-3">
              <p className="text-xs font-semibold text-slate-700">Asset & financial loss (optional)</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Asset ID
                  <input className={`${HR_FIELD_CLASS} mt-1`} value={assetId} onChange={(e) => setAssetId(e.target.value)} placeholder="PUMP-FACT-002" />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Loss value (NGN)
                  <input type="number" className={`${HR_FIELD_CLASS} mt-1`} value={lossValueNgn} onChange={(e) => setLossValueNgn(e.target.value)} placeholder="700000" />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Location
                  <input className={`${HR_FIELD_CLASS} mt-1`} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="factory store" />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Shift
                  <input className={`${HR_FIELD_CLASS} mt-1`} value={shift} onChange={(e) => setShift(e.target.value)} placeholder="night shift" />
                </label>
              </div>
            </div>
          ) : null}

          {needsInvolvedStep ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 space-y-3">
              <p className="text-xs font-semibold text-slate-700">Shared responsibility (optional — or assign later on the case)</p>
              <span className={`text-xs font-medium ${Math.abs(weightSum - 100) < 0.01 || !activeParties.length ? 'text-emerald-700' : 'text-amber-800'}`}>
                Total: {weightSum.toFixed(1)}% {activeParties.length ? '(must equal 100%)' : ''}
              </span>
              {involvedParties.map((p, idx) => (
                <div key={idx} className="grid gap-2 sm:grid-cols-4">
                  <select
                    className={HR_FIELD_CLASS}
                    value={p.userId}
                    onChange={(e) => {
                      const v = e.target.value;
                      setInvolvedParties((prev) => prev.map((x, i) => (i === idx ? { ...x, userId: v } : x)));
                    }}
                  >
                    <option value="">Select staff…</option>
                    {(staff || []).map((s) => (
                      <option key={s.userId} value={s.userId}>{s.displayName || s.userId}</option>
                    ))}
                  </select>
                  <select
                    className={HR_FIELD_CLASS}
                    value={p.role}
                    onChange={(e) => {
                      const v = e.target.value;
                      setInvolvedParties((prev) => prev.map((x, i) => (i === idx ? { ...x, role: v } : x)));
                    }}
                  >
                    {RESPONSIBILITY_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className={HR_FIELD_CLASS}
                    value={p.responsibilityWeight}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setInvolvedParties((prev) => prev.map((x, i) => (i === idx ? { ...x, responsibilityWeight: v } : x)));
                    }}
                    placeholder="Weight %"
                  />
                  <select
                    className={HR_FIELD_CLASS}
                    value={p.contributionType}
                    onChange={(e) => {
                      const v = e.target.value;
                      setInvolvedParties((prev) => prev.map((x, i) => (i === idx ? { ...x, contributionType: v } : x)));
                    }}
                  >
                    {CONTRIBUTION_TYPES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <HrButton type="button" variant="secondary" onClick={addParty}>Add party</HrButton>
                <HrButton type="button" variant="secondary" onClick={splitEvenly} disabled={!activeParties.length}>
                  Split evenly
                </HrButton>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {step.id === 'review' ? (
        <dl className="text-sm space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4">
          {Object.entries(reviewSummary).map(([k, v]) => (
            <div key={k} className="grid grid-cols-3 gap-2">
              <dt className="text-slate-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</dt>
              <dd className="col-span-2 text-slate-800">{String(v || '—')}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {err ? <p className="text-sm text-red-700 mt-3">{err}</p> : null}

      <div className="flex justify-between gap-2 mt-6">
        <div>
          {stepIndex > 0 ? (
            <HrButton type="button" variant="secondary" onClick={back}>Back</HrButton>
          ) : null}
        </div>
        <div className="flex gap-2">
          <HrButton type="button" variant="secondary" onClick={close}>Cancel</HrButton>
          {!isLastStep ? (
            <HrButton type="button" onClick={next}>Next</HrButton>
          ) : (
            <HrButton type="button" disabled={busy}  onClick={submit}>
              {busy ? 'Creating…' : 'Register incident'}
            </HrButton>
          )}
        </div>
      </div>
    </HrFormModal>
  );
}
