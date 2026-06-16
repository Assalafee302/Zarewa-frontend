import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { HrCard } from './hrPageUi';
import { HR_BTN_PRIMARY, HR_FIELD_CLASS } from './hrFormStyles';

export function HrSkillsMatrixPanel({ userId, canEdit = false }) {
  const [skills, setSkills] = useState([]);
  const [readiness, setReadiness] = useState(null);
  const [form, setForm] = useState({ skillName: '', proficiencyLevel: '3' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [s1, s2] = await Promise.all([
      apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}/skills`),
      apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}/promotion-readiness`),
    ]);
    if (s1.ok && s1.data?.ok) setSkills(s1.data.skills || []);
    if (s2.ok && s2.data?.ok) setReadiness(s2.data);
  }, [userId]);

  useEffect(() => {
    if (userId) load();
  }, [userId, load]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    await apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}/skills`, {
      method: 'PUT',
      body: JSON.stringify({ skillName: form.skillName, proficiencyLevel: Number(form.proficiencyLevel) }),
    });
    setBusy(false);
    setForm({ skillName: '', proficiencyLevel: '3' });
    await load();
  };

  return (
    <div className="space-y-4">
      {readiness ? (
        <HrCard title="Promotion readiness" subtitle={`${readiness.readinessPct}% overall score`}>
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${readiness.ready ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${readiness.readinessPct}%` }} />
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {readiness.checks?.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                <span>{c.label}</span>
                <span className={c.pass ? 'font-bold text-emerald-700' : 'font-bold text-amber-700'}>{c.value}</span>
              </li>
            ))}
          </ul>
        </HrCard>
      ) : null}
      <HrCard title="Skills matrix" subtitle="Competencies for career planning">
        <ul className="space-y-1 mb-4">
          {skills.map((s) => (
            <li key={s.id} className="flex justify-between rounded-lg border border-slate-100 px-3 py-2 text-xs">
              <span className="font-semibold">{s.skillName}</span>
              <span className="text-slate-500">Level {s.proficiencyLevel}</span>
            </li>
          ))}
        </ul>
        {canEdit ? (
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-3">
            <input className={HR_FIELD_CLASS} placeholder="Skill name" value={form.skillName} onChange={(e) => setForm({ ...form, skillName: e.target.value })} required />
            <select className={HR_FIELD_CLASS} value={form.proficiencyLevel} onChange={(e) => setForm({ ...form, proficiencyLevel: e.target.value })}>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Level {n}</option>)}
            </select>
            <button type="submit" disabled={busy} className={HR_BTN_PRIMARY}>{busy ? 'Saving…' : 'Add skill'}</button>
          </form>
        ) : null}
      </HrCard>
    </div>
  );
}
