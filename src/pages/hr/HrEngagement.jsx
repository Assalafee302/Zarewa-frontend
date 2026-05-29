import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { hrHasPermission } from '../../lib/hrAccess';
import {
  createHrEngagementSurvey,
  fetchHrEngagementSummary,
  fetchHrEngagementSurveys,
  patchHrEngagementSurvey,
} from '../../lib/hrEngagement';
import { HrAddFormButton, HrFormModal } from '../../components/hr/HrFormModal';
import { HR_BTN_PRIMARY, HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';

export default function HrEngagement() {
  const ws = useWorkspace();
  const canManage = hrHasPermission(ws?.permissions, 'hr.staff.manage');
  const [surveys, setSurveys] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [summary, setSummary] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const { reload } = useHrListLoad(async () => {
    const { ok, data } = await fetchHrEngagementSurveys();
    if (!ok || !data?.ok) {
      setSurveys([]);
      return { error: data?.error || 'Could not load surveys.', hasData: false };
    }
    setSurveys(data.surveys || []);
    setSelectedId((prev) => prev || data.surveys?.[0]?.id || '');
    return { hasData: true };
  }, []);

  const loadSummary = async (id) => {
    if (!id) {
      setSummary(null);
      return;
    }
    const { ok, data } = await fetchHrEngagementSummary(id);
    if (ok && data?.ok) setSummary(data);
    else setSummary(null);
  };

  useHrListLoad(async () => {
    await loadSummary(selectedId);
    return { hasData: true };
  }, [selectedId]);

  const createSurvey = async (e) => {
    e.preventDefault();
    if (!canManage) return;
    setBusy(true);
    const { ok, data } = await createHrEngagementSurvey({ title, status: 'draft' });
    setBusy(false);
    if (ok && data?.ok) {
      setModalOpen(false);
      setTitle('');
      await reload();
    }
  };

  const setStatus = async (id, status) => {
    const { ok, data } = await patchHrEngagementSurvey(id, { status });
    if (ok && data?.ok) {
      await reload();
      if (id === selectedId) await loadSummary(id);
    }
  };

  const selected = surveys.find((s) => s.id === selectedId);

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Pulse surveys for staff engagement. Open a survey for employees to respond in My Profile.
      </p>
      {canManage ? <HrAddFormButton onClick={() => setModalOpen(true)}>New survey</HrAddFormButton> : null}
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <ul className="space-y-2">
          {surveys.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                  selectedId === s.id ? 'border-[#134e4a] bg-teal-50/50' : 'border-slate-100 bg-white'
                }`}
              >
                <span className="font-semibold">{s.title}</span>
                <span className="ml-2 text-[10px] uppercase text-slate-500">{s.status}</span>
              </button>
            </li>
          ))}
        </ul>
        {selected ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap gap-2">
              {canManage && selected.status === 'draft' ? (
                <button type="button" onClick={() => setStatus(selected.id, 'open')} className={HR_BTN_PRIMARY}>
                  Open for responses
                </button>
              ) : null}
              {canManage && selected.status === 'open' ? (
                <button
                  type="button"
                  onClick={() => setStatus(selected.id, 'closed')}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold uppercase"
                >
                  Close survey
                </button>
              ) : null}
            </div>
            <p className="text-sm text-slate-600">
              Responses: <strong>{summary?.responseCount ?? 0}</strong>
            </p>
            {summary?.aggregates ? (
              <ul className="space-y-2 text-sm">
                {(summary.survey?.questions || [])
                  .filter((q) => q.type === 'rating')
                  .map((q) => (
                    <li key={q.id} className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="font-medium text-slate-800">{q.text}</p>
                      <p className="text-xs text-slate-500">
                        Avg: {summary.aggregates[q.id]?.avg ?? '—'} / {q.scale || 5} (
                        {summary.aggregates[q.id]?.count ?? 0} responses)
                      </p>
                    </li>
                  ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-600">Create a survey to get started.</p>
        )}
      </div>

      <HrFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New engagement survey">
        <form onSubmit={createSurvey} className="space-y-4">
          <label className="block text-xs font-semibold text-slate-600">
            Title
            <input className={HR_FIELD_CLASS} value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <p className="text-xs text-slate-500">Default questions: work clarity, recommend employer, manager support, open feedback.</p>
          <button type="submit" disabled={busy} className={HR_BTN_PRIMARY}>
            {busy ? 'Creating…' : 'Create draft'}
          </button>
        </form>
      </HrFormModal>
    </div>
  );
}
