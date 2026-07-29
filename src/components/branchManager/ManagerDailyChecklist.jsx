import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckSquare, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import {
  MANAGER_CHECKLIST_ITEMS,
  checklistCompletionPct,
  loadManagerChecklist,
  saveManagerChecklist,
  ymdLocal,
} from '../../lib/managerDailyChecklist';
import { TEAM_HR_ATTENDANCE_PATH } from '../../lib/managerPageTabs';

/**
 * Opening/closing discipline checklist — local ticks, with durable shift notes for security handover.
 */
export function ManagerDailyChecklist({ branchId, actorName = 'Manager' }) {
  const dayIso = ymdLocal();
  const [state, setState] = useState(() => loadManagerChecklist(branchId, dayIso));
  const [shiftNotes, setShiftNotes] = useState([]);
  const [handoverDraft, setHandoverDraft] = useState('');
  const [handoverError, setHandoverError] = useState('');
  const [handoverBusy, setHandoverBusy] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);

  useEffect(() => {
    setState(loadManagerChecklist(branchId, dayIso));
  }, [branchId, dayIso]);

  const loadShiftNotes = useCallback(async () => {
    if (!branchId) {
      setShiftNotes([]);
      return;
    }
    setNotesLoading(true);
    const qs = new URLSearchParams({ branchId, shiftDate: dayIso, limit: '10' });
    const res = await apiFetch(`/api/branch-shift-notes?${qs}`).catch(() => ({ ok: false }));
    setNotesLoading(false);
    if (!res.ok) {
      setShiftNotes([]);
      return;
    }
    setShiftNotes(Array.isArray(res.data?.notes) ? res.data.notes : []);
  }, [branchId, dayIso]);

  useEffect(() => {
    void loadShiftNotes();
  }, [loadShiftNotes]);

  const pct = useMemo(() => checklistCompletionPct(state), [state]);

  const markDone = useCallback(
    (id) => {
      setState((prev) => {
        const next = {
          ...prev,
          [id]: { done: true, at: new Date().toISOString(), by: actorName },
        };
        saveManagerChecklist(branchId, dayIso, next);
        return next;
      });
    },
    [actorName, branchId, dayIso]
  );

  const markUndone = useCallback(
    (id) => {
      setState((prev) => {
        const next = { ...prev, [id]: { done: false } };
        saveManagerChecklist(branchId, dayIso, next);
        return next;
      });
    },
    [branchId, dayIso]
  );

  const toggle = useCallback(
    (id) => {
      if (id === 'open_security') return;
      setState((prev) => {
        const next = { ...prev };
        const cur = next[id];
        if (cur?.done) {
          next[id] = { done: false };
        } else {
          next[id] = { done: true, at: new Date().toISOString(), by: actorName };
        }
        saveManagerChecklist(branchId, dayIso, next);
        return next;
      });
    },
    [actorName, branchId, dayIso]
  );

  const submitSecurityHandover = async () => {
    const note = String(handoverDraft || '').trim();
    if (note.length < 3) {
      setHandoverError('Enter a handover note (min 3 characters) before marking this tick.');
      return;
    }
    setHandoverBusy(true);
    setHandoverError('');
    const res = await apiFetch('/api/branch-shift-notes', {
      method: 'POST',
      body: JSON.stringify({ branchId, shiftDate: dayIso, note }),
    }).catch(() => ({ ok: false }));
    setHandoverBusy(false);
    if (!res.ok || res.data?.ok === false) {
      setHandoverError(res.data?.error || 'Could not save shift handover note.');
      return;
    }
    setHandoverDraft('');
    await loadShiftNotes();
    markDone('open_security');
  };

  const opening = MANAGER_CHECKLIST_ITEMS.filter((i) => i.phase === 'opening');
  const closing = MANAGER_CHECKLIST_ITEMS.filter((i) => i.phase === 'closing');

  const renderGroup = (title, items) => (
    <div>
      <p className="text-ui-xs font-black uppercase tracking-[0.14em] text-slate-500 mb-2">{title}</p>
      <ul className="space-y-1.5">
        {items.map((item) => {
          const done = Boolean(state[item.id]?.done);
          const meta = state[item.id];
          const isSecurity = item.id === 'open_security';

          if (isSecurity) {
            return (
              <li key={item.id} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 space-y-2">
                <label className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={done}
                    disabled={!done}
                    onChange={() => {
                      if (done) markUndone(item.id);
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-zarewa-teal disabled:opacity-60"
                    title={done ? 'Uncheck to clear' : 'Save a handover note to complete'}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-xs font-semibold ${done ? 'text-slate-500 line-through' : 'text-slate-800'}`}
                    >
                      {item.label}
                    </span>
                    <span className="block text-ui-xs text-slate-500 mt-0.5 leading-snug">
                      Requires a saved shift handover note (not local-only).
                    </span>
                    {done && meta?.at ? (
                      <span className="block text-ui-xs text-slate-400 mt-0.5">
                        {meta.by || actorName} ·{' '}
                        {new Date(meta.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : null}
                  </span>
                </label>
                {!done ? (
                  <div className="pl-6 space-y-2">
                    <textarea
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-800 min-h-[72px]"
                      placeholder="Overnight security / shift handover notes…"
                      value={handoverDraft}
                      onChange={(e) => setHandoverDraft(e.target.value)}
                      disabled={handoverBusy}
                    />
                    {handoverError ? (
                      <p className="text-ui-xs font-semibold text-amber-800">{handoverError}</p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={handoverBusy}
                        onClick={() => void submitSecurityHandover()}
                        className="z-btn-primary text-ui-xs disabled:opacity-50"
                      >
                        {handoverBusy ? 'Saving…' : 'Save handover & mark done'}
                      </button>
                      {shiftNotes.length > 0 ? (
                        <button
                          type="button"
                          disabled={handoverBusy}
                          onClick={() => markDone('open_security')}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-ui-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Mark reviewed (note on file)
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {notesLoading && shiftNotes.length === 0 ? (
                  <p className="pl-6 text-ui-xs text-slate-400">Loading notes…</p>
                ) : null}
                {shiftNotes.length > 0 ? (
                  <ul className="pl-6 space-y-1.5 border-t border-slate-100 pt-2">
                    {shiftNotes.map((n) => (
                      <li key={n.id} className="text-ui-xs text-slate-600 leading-snug">
                        <span className="font-bold text-slate-700">{n.authorName || 'Staff'}</span>
                        {n.createdAtIso ? (
                          <span className="text-slate-400">
                            {' '}
                            ·{' '}
                            {new Date(n.createdAtIso).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        ) : null}
                        <span className="block mt-0.5 text-slate-700">{n.note}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          }

          return (
            <li key={item.id}>
              <label className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => toggle(item.id)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-zarewa-teal"
                />
                <span className="min-w-0 flex-1">
                  <span className={`block text-xs font-semibold ${done ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                    {item.label}
                  </span>
                  {done && meta?.at ? (
                    <span className="block text-ui-xs text-slate-400 mt-0.5">
                      {meta.by || actorName} ·{' '}
                      {new Date(meta.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ) : null}
                  {item.id === 'open_attendance' && !done ? (
                    <Link
                      to={TEAM_HR_ATTENDANCE_PATH}
                      className="mt-1 inline-flex items-center gap-1 text-ui-xs font-bold text-zarewa-teal hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <LinkIcon size={11} aria-hidden />
                      Open attendance on My Team
                    </Link>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <section
      className="rounded-zarewa border border-slate-200/75 bg-white p-5 shadow-[var(--shadow-sequence)]"
      aria-label="Daily checklist"
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <CheckSquare size={16} className="text-zarewa-teal" aria-hidden />
          <h3 className="text-sm font-black text-zarewa-teal tracking-tight">Daily checklist</h3>
        </div>
        <span className="text-ui-xs font-bold tabular-nums text-slate-500">{pct}% complete</span>
      </div>
      <div className="mb-4 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-zarewa-teal transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {renderGroup('Opening', opening)}
        {renderGroup('Closing', closing)}
      </div>
    </section>
  );
}
