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
import { HrCard, HrEmptyState, HrListItemButton, HrPageBody, HrPageIntro, HrSplitWorkspace, HrStatusPill, HrButton, HrAddButton, HR_BTN_PRIMARY, HR_BTN_SECONDARY } from '../../components/hr/hrPageUi';
import { HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';

export default function HrEngagement({ embedded = false } = {}) {
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
    <HrPageBody>
      {!embedded ? (
        <HrPageIntro actions={canManage ? <HrAddFormButton onClick={() => setModalOpen(true)}>New survey</HrAddFormButton> : null} />
      ) : (
        canManage ? (
          <div className="flex justify-end pb-2">
            <HrAddFormButton onClick={() => setModalOpen(true)}>New survey</HrAddFormButton>
          </div>
        ) : null
      )}
      <HrSplitWorkspace
        sidebar={
          <HrCard title="Surveys">
            <div className="max-h-[min(52vh,480px)] space-y-2 overflow-y-auto">
              {surveys.length === 0 ? (
                <HrEmptyState title="No surveys yet" />
              ) : (
                surveys.map((s) => (
                  <HrListItemButton
                    key={s.id}
                    active={selectedId === s.id}
                    onClick={() => setSelectedId(s.id)}
                    title={s.title}
                    badge={<HrStatusPill status={s.status} />}
                  />
                ))
              )}
            </div>
          </HrCard>
        }
      >
        {selected ? (
          <HrCard title={selected.title} subtitle={`${summary?.responseCount ?? 0} responses`}>
            <div className="flex flex-wrap gap-2 mb-4">
              {canManage && selected.status === 'draft' ? (
                <button type="button" onClick={() => setStatus(selected.id, 'open')} className={HR_BTN_PRIMARY}>
                  Open for responses
                </button>
              ) : null}
              {canManage && selected.status === 'open' ? (
                <button type="button" onClick={() => setStatus(selected.id, 'closed')} className={HR_BTN_SECONDARY}>
                  Close survey
                </button>
              ) : (
                <HrStatusPill status={selected.status} />
              )}
            </div>
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
            ) : (
              <p className="text-sm text-slate-500">No rating questions in this survey.</p>
            )}
          </HrCard>
        ) : (
          <HrEmptyState title="Select a survey" description="Choose one from the list or create a new draft." />
        )}
      </HrSplitWorkspace>

      <HrFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New engagement survey">
        <form onSubmit={createSurvey} className="space-y-4">
          <label className="block text-xs font-semibold text-slate-600">
            Title
            <input className={HR_FIELD_CLASS} value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <p className="text-xs text-slate-500">Default questions: work clarity, recommend employer, manager support, open feedback.</p>
          <HrButton type="submit" disabled={busy} >
            {busy ? 'Creating…' : 'Create draft'}
          </HrButton>
        </form>
      </HrFormModal>
    </HrPageBody>
  );
}
