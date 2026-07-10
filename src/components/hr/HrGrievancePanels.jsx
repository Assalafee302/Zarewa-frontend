import React, { useCallback, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { HrCard, HrButton, HrAddButton } from './hrPageUi';
import { HR_FIELD_CLASS } from './hrFormStyles';

const GRIEVANCE_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'under_review', label: 'Under review' },
  { value: 'action_required', label: 'Action required' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'open', label: 'Open (legacy)' },
];

function statusLabel(status) {
  return GRIEVANCE_STATUSES.find((s) => s.value === status)?.label || status;
}

export function HrGrievanceForm() {
  const [form, setForm] = useState({ category: 'general', summary: '', details: '', anonymous: false });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { ok, data } = await apiFetch('/api/hr/grievances', {
      method: 'POST',
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not submit grievance.');
      return;
    }
    setMessage('Your grievance has been submitted to HR.');
    setForm({ category: 'general', summary: '', details: '', anonymous: false });
  };

  return (
    <HrCard title="Submit a grievance" subtitle="Raise workplace concerns — anonymous submission supported">
      {message ? <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{message}</div> : null}
      {error ? <div className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null}
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-xs font-semibold text-slate-600">
          Category
          <select className={HR_FIELD_CLASS} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="general">General</option>
            <option value="harassment">Harassment / bullying</option>
            <option value="payroll">Payroll / benefits</option>
            <option value="working_conditions">Working conditions</option>
            <option value="management">Management concern</option>
          </select>
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          Summary
          <input className={HR_FIELD_CLASS} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} required minLength={10} />
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          Details
          <textarea className={`${HR_FIELD_CLASS} min-h-[96px]`} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input type="checkbox" checked={form.anonymous} onChange={(e) => setForm({ ...form, anonymous: e.target.checked })} />
          Submit anonymously
        </label>
        <HrButton type="submit" disabled={busy} >{busy ? 'Submitting…' : 'Submit grievance'}</HrButton>
      </form>
    </HrCard>
  );
}

export function HrGrievanceQueue() {
  const [items, setItems] = useState([]);
  const [resolveModal, setResolveModal] = useState(null);
  const [resolveNote, setResolveNote] = useState('');
  const { loading, reload } = useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/grievances');
    if (!ok || !data?.ok) return { error: data?.error || 'Could not load grievances.', hasData: false };
    setItems(data.grievances || []);
    return { hasData: true };
  }, []);

  const resolve = useCallback(async (id, nextStatus) => {
    await apiFetch(`/api/hr/grievances/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus, resolutionNote: resolveNote.trim() }),
    });
    setResolveModal(null);
    setResolveNote('');
    await reload();
  }, [reload, resolveNote]);

  const updateStatus = useCallback(async (id, status) => {
    await apiFetch(`/api/hr/grievances/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await reload();
  }, [reload]);

  if (loading) return <p className="text-sm text-slate-500">Loading grievances…</p>;

  return (
    <HrCard title="Grievance queue" subtitle="Staff grievances requiring HR action">
      <ul className="space-y-2">
        {!items.length ? <li className="text-sm text-slate-500">No grievances on file.</li> : null}
        {items.map((g) => (
          <li key={g.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-bold text-slate-800">{g.summary}</p>
                <p className="text-slate-500 mt-0.5">
                  {g.category} · {g.submitterDisplayName} · {statusLabel(g.status)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="rounded-lg border border-slate-200 px-2 py-1 text-ui-xs font-semibold"
                  value={g.status}
                  onChange={(e) => updateStatus(g.id, e.target.value)}
                >
                  {GRIEVANCE_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                {!['resolved', 'closed', 'dismissed'].includes(g.status) ? (
                  <button type="button" onClick={() => { setResolveModal(g); setResolveNote(''); }} className="text-ui-xs font-bold uppercase text-zarewa-teal hover:underline">
                    Resolve…
                  </button>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {resolveModal ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-800">Resolve: {resolveModal.summary}</p>
          <textarea className={`${HR_FIELD_CLASS} min-h-[72px]`} value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} placeholder="Action taken / resolution note" />
          <div className="flex gap-2">
            <HrButton type="button" onClick={() => resolve(resolveModal.id, 'resolved')}>Mark resolved</HrButton>
            <button type="button" className="text-xs font-bold uppercase text-slate-500" onClick={() => setResolveModal(null)}>Cancel</button>
          </div>
        </div>
      ) : null}
    </HrCard>
  );
}
