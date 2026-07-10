import { HrButton, HrAddButton } from '../../components/hr/hrPageUi';
import { useState } from 'react';
import { DISCIPLINE_CASE_TYPES, DISCIPLINE_SEVERITIES } from '../../lib/hrDisciplineCases';
import { escalateHrIncident } from '../../lib/hrExtended';
import { HrFormModal } from './HrFormModal';
import { HR_FIELD_CLASS } from './hrFormStyles';

export default function HrIncidentMemoEscalateModal({ memo, open, onClose, onEscalated }) {
  const [caseType, setCaseType] = useState('investigation');
  const [severity, setSeverity] = useState('medium');
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (!open || !memo) return null;

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const body = {
      caseType,
      severity,
      summary: summary.trim() || memo.summary,
    };
    const { ok, data } = await escalateHrIncident(memo.id, body);
    setBusy(false);
    if (!ok || !data?.ok) {
      setErr(data?.error || 'Escalation failed.');
      return;
    }
    onEscalated?.(data);
    onClose?.();
  };

  return (
    <HrFormModal isOpen={open} title="Escalate to accountability case" onClose={onClose} size="md">
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-slate-600">
          Creates a formal discipline case and registry entry from memo for{' '}
          <strong>{memo.staffDisplayName}</strong> ({memo.incidentDateIso}).
        </p>
        <label className="block text-xs font-semibold text-slate-600">
          Case type
          <select className={`${HR_FIELD_CLASS} mt-1`} value={caseType} onChange={(e) => setCaseType(e.target.value)}>
            {DISCIPLINE_CASE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          Severity
          <select className={`${HR_FIELD_CLASS} mt-1`} value={severity} onChange={(e) => setSeverity(e.target.value)}>
            {DISCIPLINE_SEVERITIES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          Case description (optional override)
          <textarea
            className={`${HR_FIELD_CLASS} mt-1 min-h-[72px]`}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={memo.summary}
          />
        </label>
        {err ? <p className="text-sm text-red-700">{err}</p> : null}
        <div className="flex justify-end gap-2">
          <HrButton type="button" variant="secondary" onClick={onClose}>Cancel</HrButton>
          <HrButton type="submit" disabled={busy} >
            {busy ? 'Escalating…' : 'Create accountability case'}
          </HrButton>
        </div>
      </form>
    </HrFormModal>
  );
}
