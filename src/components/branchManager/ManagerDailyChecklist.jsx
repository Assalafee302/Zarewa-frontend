import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckSquare, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import {
  MANAGER_CHECKLIST_ITEMS,
  checklistCompletionPct,
  loadHandoverDraft,
  loadManagerChecklist,
  saveHandoverDraft,
  saveManagerChecklist,
  ymdLocal,
} from '../../lib/managerDailyChecklist';
import { TEAM_HR_ATTENDANCE_PATH } from '../../lib/managerPageTabs';
import { relativeTime } from '../../lib/opsUiChrome';

const DURABLE_IDS = new Set(['open_security', 'open_cash', 'close_cash', 'close_incidents']);

/**
 * Opening/closing checklist — durable notes for security/cash/incidents; SOP links on every tick.
 */
export function ManagerDailyChecklist({ branchId, actorName = 'Manager' }) {
  const dayIso = ymdLocal();
  const [state, setState] = useState(() => loadManagerChecklist(branchId, dayIso));
  const [shiftNotes, setShiftNotes] = useState([]);
  const [handoverDraft, setHandoverDraft] = useState(() => loadHandoverDraft(branchId, dayIso));
  const [noteKind, setNoteKind] = useState('night');
  const [flags, setFlags] = useState({ gatesOk: true, cctvOk: true, cashOk: true, keysOk: true });
  const [incidentCode, setIncidentCode] = useState('');
  const [handoverError, setHandoverError] = useState('');
  const [handoverBusy, setHandoverBusy] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  const [durableDraft, setDurableDraft] = useState('');
  const [durableItem, setDurableItem] = useState('');

  useEffect(() => {
    setState(loadManagerChecklist(branchId, dayIso));
    setHandoverDraft(loadHandoverDraft(branchId, dayIso));
  }, [branchId, dayIso]);

  useEffect(() => {
    saveHandoverDraft(branchId, dayIso, handoverDraft);
  }, [handoverDraft, branchId, dayIso]);

  const loadShiftNotes = useCallback(async () => {
    if (!branchId) {
      setShiftNotes([]);
      return;
    }
    setNotesLoading(true);
    const qs = new URLSearchParams({ branchId, shiftDate: dayIso, limit: '15' });
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
      if (DURABLE_IDS.has(id)) return;
      setState((prev) => {
        const next = { ...prev };
        const cur = next[id];
        if (cur?.done) next[id] = { done: false };
        else next[id] = { done: true, at: new Date().toISOString(), by: actorName };
        saveManagerChecklist(branchId, dayIso, next);
        return next;
      });
    },
    [actorName, branchId, dayIso]
  );

  const submitSecurityHandover = async () => {
    const note = String(handoverDraft || '').trim();
    if (note.length < 3) {
      setHandoverError('Enter a handover note (min 3 characters) before completing this checklist item.');
      return;
    }
    setHandoverBusy(true);
    setHandoverError('');
    const res = await apiFetch('/api/branch-shift-notes', {
      method: 'POST',
      body: JSON.stringify({
        branchId,
        shiftDate: dayIso,
        note,
        noteKind,
        gatesOk: flags.gatesOk,
        cctvOk: flags.cctvOk,
        cashOk: flags.cashOk,
        keysOk: flags.keysOk,
        incidentCode: incidentCode.trim() || undefined,
      }),
    }).catch(() => ({ ok: false }));
    setHandoverBusy(false);
    if (!res.ok || res.data?.ok === false) {
      setHandoverError(res.data?.error || 'Could not save shift handover note.');
      return;
    }
    setHandoverDraft('');
    saveHandoverDraft(branchId, dayIso, '');
    setIncidentCode('');
    await loadShiftNotes();
    markDone('open_security');
  };

  const submitDurableEvent = async (itemId) => {
    const note = String(durableDraft || '').trim();
    if (note.length < 3) {
      setHandoverError('Enter a short note (min 3 characters) to complete this checklist item.');
      return;
    }
    setHandoverBusy(true);
    setHandoverError('');
    const res = await apiFetch('/api/branch-checklist-events', {
      method: 'POST',
      body: JSON.stringify({ branchId, dayIso, itemId, note }),
    }).catch(() => ({ ok: false }));
    setHandoverBusy(false);
    if (!res.ok || res.data?.ok === false) {
      setHandoverError(res.data?.error || 'Could not save checklist event.');
      return;
    }
    setDurableDraft('');
    setDurableItem('');
    markDone(itemId);
  };

  const renderDurableExtra = (item, done) => {
    if (item.id === 'open_security') {
      return (
        <>
          {!done ? (
            <div className="pl-6 space-y-2">
              <p className="text-ui-xs text-slate-500 leading-snug">
                Save a durable shift note first — the checkbox alone cannot complete this checklist item.
              </p>
              <div className="flex flex-wrap gap-2">
                {['night', 'day'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setNoteKind(k)}
                    className={`rounded-lg px-2.5 py-1 text-ui-xs font-bold ${
                      noteKind === k ? 'bg-zarewa-teal text-white' : 'border border-slate-200 text-slate-700'
                    }`}
                  >
                    {k === 'night' ? 'Night / overnight' : 'Day shift'}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 text-ui-xs font-semibold text-slate-700">
                {[
                  ['gatesOk', 'Gates'],
                  ['cctvOk', 'CCTV'],
                  ['cashOk', 'Cash'],
                  ['keysOk', 'Keys'],
                ].map(([key, label]) => (
                  <label key={key} className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(flags[key])}
                      onChange={(e) => setFlags((f) => ({ ...f, [key]: e.target.checked }))}
                      className="rounded border-slate-300 accent-zarewa-teal"
                    />
                    {label} OK
                  </label>
                ))}
              </div>
              <input
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                placeholder="Incident code (optional)"
                value={incidentCode}
                onChange={(e) => setIncidentCode(e.target.value)}
              />
              <textarea
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-800 min-h-[88px]"
                placeholder="Overnight security / shift handover notes…"
                value={handoverDraft}
                onChange={(e) => setHandoverDraft(e.target.value)}
                disabled={handoverBusy}
              />
              {handoverError ? <p className="text-ui-xs font-semibold text-amber-800">{handoverError}</p> : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={handoverBusy}
                  onClick={() => void submitSecurityHandover()}
                  className="z-btn-primary text-ui-xs disabled:opacity-50"
                >
                  {handoverBusy ? 'Saving…' : 'Save handover and complete'}
                </button>
                {shiftNotes.length > 0 ? (
                  <button
                    type="button"
                    disabled={handoverBusy}
                    onClick={() => markDone('open_security')}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-ui-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Mark reviewed (note on file)
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="pl-6">
              <button
                type="button"
                className="text-ui-xs font-bold text-slate-500 hover:underline"
                onClick={() => markUndone('open_security')}
              >
                Undo reviewed
              </button>
            </div>
          )}
          {notesLoading && shiftNotes.length === 0 ? (
            <p className="pl-6 text-ui-xs text-slate-400">Loading notes…</p>
          ) : null}
          {shiftNotes.length > 0 ? (
            <ul className="pl-6 space-y-1.5 border-t border-slate-100 pt-2">
              {shiftNotes.map((n) => (
                <li key={n.id} className="text-ui-xs text-slate-600 leading-snug">
                  <span className="font-bold text-slate-700">{n.authorName || 'Staff'}</span>
                  <span className="text-slate-400" title={n.createdAtIso || ''}>
                    {' '}
                    · {n.noteKind || 'night'} · {relativeTime(n.createdAtIso)}
                  </span>
                  <span className="block mt-0.5 text-slate-700">{n.note}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      );
    }

    if (!DURABLE_IDS.has(item.id) || item.id === 'open_security') return null;
    if (done) {
      return (
        <div className="pl-6">
          <button
            type="button"
            className="text-ui-xs font-bold text-slate-500 hover:underline"
            onClick={() => markUndone(item.id)}
          >
            Undo
          </button>
        </div>
      );
    }
    const open = durableItem === item.id;
    return (
      <div className="pl-6 space-y-2">
        <p className="text-ui-xs text-slate-500">Requires a saved checklist event (not local-only).</p>
        {!open ? (
          <button
            type="button"
            className="text-ui-xs font-bold text-zarewa-teal hover:underline"
            onClick={() => {
              setDurableItem(item.id);
              setDurableDraft('');
            }}
          >
            Add note &amp; complete
          </button>
        ) : (
          <>
            <textarea
              className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs min-h-[72px]"
              value={durableDraft}
              onChange={(e) => setDurableDraft(e.target.value)}
              placeholder="What did you verify?"
            />
            <button
              type="button"
              disabled={handoverBusy}
              onClick={() => void submitDurableEvent(item.id)}
              className="z-btn-primary text-ui-xs disabled:opacity-50"
            >
              Save &amp; mark done
            </button>
          </>
        )}
      </div>
    );
  };

  const renderGroup = (title, items) => (
    <div>
      <p className="text-ui-xs font-black uppercase tracking-[0.14em] text-slate-500 mb-2">{title}</p>
      <ul className="space-y-1.5">
        {items.map((item) => {
          const done = Boolean(state[item.id]?.done);
          const meta = state[item.id];
          const durable = DURABLE_IDS.has(item.id);
          return (
            <li key={item.id} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 space-y-2">
              <label className={`flex items-start gap-2.5 ${durable && !done ? '' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  checked={done}
                  disabled={durable && !done}
                  onChange={() => {
                    if (durable) {
                      if (done) markUndone(item.id);
                      return;
                    }
                    toggle(item.id);
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-zarewa-teal disabled:opacity-60"
                  title={durable && !done ? 'Save a durable note to complete' : undefined}
                  aria-describedby={durable && !done ? `${item.id}-hint` : undefined}
                />
                <span className="min-w-0 flex-1">
                  <span className={`block text-xs font-semibold ${done ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                    {item.label}
                  </span>
                  {done && meta?.at ? (
                    <span className="block text-ui-xs text-slate-400 mt-0.5" title={meta.at}>
                      {meta.by || actorName} · {relativeTime(meta.at)}
                    </span>
                  ) : null}
                  {item.sopHint ? (
                    <span className="mt-1 block text-ui-xs text-slate-400">{item.sopHint}</span>
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
              {durable ? <div id={`${item.id}-hint`}>{renderDurableExtra(item, done)}</div> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );

  const opening = MANAGER_CHECKLIST_ITEMS.filter((i) => i.phase === 'opening');
  const closing = MANAGER_CHECKLIST_ITEMS.filter((i) => i.phase === 'closing');

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
        <div
          className="h-full rounded-full bg-zarewa-teal transition-all motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
      {handoverError && !handoverBusy ? (
        <p className="mb-3 text-ui-xs font-semibold text-amber-800">{handoverError}</p>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        {renderGroup('Opening', opening)}
        {renderGroup('Closing', closing)}
      </div>
      {shiftNotes.length > 0 ? (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="text-ui-xs font-black uppercase tracking-wide text-slate-500 mb-2">
            Today&apos;s shift notes (opening &amp; closing)
          </p>
          <ul className="space-y-1">
            {shiftNotes.slice(0, 5).map((n) => (
              <li key={`digest-${n.id}`} className="text-ui-xs text-slate-600">
                <span className="font-bold">{n.noteKind || 'night'}</span> — {n.note.slice(0, 120)}
                {n.note.length > 120 ? '…' : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
