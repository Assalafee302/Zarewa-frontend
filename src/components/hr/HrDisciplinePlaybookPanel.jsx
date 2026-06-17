import React, { useState } from 'react';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { apiFetch } from '../../lib/apiBase';
import { HrCard, HrEmptyState } from './hrPageUi';

export default function HrDisciplinePlaybookPanel() {
  const [reference, setReference] = useState(null);
  const { loading, error } = useHrListLoad(async () => {
    const { ok, data: res } = await apiFetch('/api/hr/policy-reference');
    if (!ok || !res?.ok) {
      setReference(null);
      return { error: res?.error || 'Could not load discipline playbook.', hasData: false };
    }
    setReference(res.reference || null);
    return { hasData: true };
  }, []);

  const stages = reference?.disciplinePlaybook || [];
  const notes = reference?.disciplineNotes || [];

  if (loading) {
    return <p className="text-sm text-slate-500">Loading discipline guide…</p>;
  }
  if (error) {
    return <HrEmptyState title="Discipline guide unavailable" description={error} />;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Official four-stage ladder from board resolution. Use formal cases for written warnings and above.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {stages.map((stage) => (
          <HrCard key={stage.stage} className="!p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#134e4a] text-xs font-black text-white">
                {stage.stage}
              </span>
              <h3 className="text-sm font-bold text-[#134e4a]">{stage.title}</h3>
            </div>
            <p className="text-xs text-slate-500">
              <span className="font-semibold text-slate-600">Owner:</span> {stage.owner}
            </p>
            <p className="mt-2 text-xs text-slate-700">{stage.actions}</p>
          </HrCard>
        ))}
      </div>
      {notes.length ? (
        <HrCard title="Policy notes">
          <ul className="list-disc space-y-1.5 pl-4 text-xs text-slate-700">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </HrCard>
      ) : null}
    </div>
  );
}
