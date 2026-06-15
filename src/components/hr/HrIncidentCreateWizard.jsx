import React, { useState } from 'react';
import { createIncident, INCIDENT_CATEGORIES } from '../../lib/hrIncidents';
import { HrFormModal } from './HrFormModal';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from './hrFormStyles';

export default function HrIncidentCreateWizard({ open, onClose, staff, onCreated }) {
  const [category, setCategory] = useState('hr');
  const [userId, setUserId] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [caseType, setCaseType] = useState('investigation');
  const [lossValueNgn, setLossValueNgn] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const body = {
      incidentCategory: category,
      userId,
      description,
      summary: description,
      severity,
      caseType,
      incidentType: category === 'operational' ? 'missing_asset' : undefined,
      lossValueNgn: lossValueNgn ? Number(lossValueNgn) : undefined,
    };
    const { ok, data } = await createIncident(body);
    setBusy(false);
    if (!ok || !data?.ok) {
      setErr(data?.error || 'Could not create incident.');
      return;
    }
    onCreated?.(data);
    onClose?.();
  };

  if (!open) return null;

  return (
    <HrFormModal title="New accountability incident" onClose={onClose}>
      <form className="space-y-3" onSubmit={submit}>
        <label className="block text-sm font-medium text-slate-700">
          Category
          <select className={`${HR_FIELD_CLASS} mt-1`} value={category} onChange={(e) => setCategory(e.target.value)}>
            {INCIDENT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        {(category === 'hr' || category === 'operational') && (
          <label className="block text-sm font-medium text-slate-700">
            Subject staff
            <select className={`${HR_FIELD_CLASS} mt-1`} value={userId} onChange={(e) => setUserId(e.target.value)} required>
              <option value="">Select…</option>
              {(staff || []).map((s) => (
                <option key={s.userId} value={s.userId}>
                  {s.displayName || s.userId}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block text-sm font-medium text-slate-700">
          Description
          <textarea
            className={`${HR_FIELD_CLASS} mt-1 min-h-[80px]`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            minLength={10}
          />
        </label>
        {category === 'hr' && (
          <>
            <label className="block text-sm font-medium text-slate-700">
              Case type
              <input className={`${HR_FIELD_CLASS} mt-1`} value={caseType} onChange={(e) => setCaseType(e.target.value)} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Loss value (NGN)
              <input
                type="number"
                className={`${HR_FIELD_CLASS} mt-1`}
                value={lossValueNgn}
                onChange={(e) => setLossValueNgn(e.target.value)}
              />
            </label>
          </>
        )}
        <label className="block text-sm font-medium text-slate-700">
          Severity
          <select className={`${HR_FIELD_CLASS} mt-1`} value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </label>
        {err ? <p className="text-sm text-red-700">{err}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" className={HR_BTN_SECONDARY} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={busy} className={HR_BTN_PRIMARY}>
            Create incident
          </button>
        </div>
      </form>
    </HrFormModal>
  );
}
