import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchHrIncidentMemos } from '../../lib/hrExtended';
import HrIncidentMemoEscalateModal from './HrIncidentMemoEscalateModal';
import { HrCard, HrButton, HrAddButton } from './hrPageUi';
import { HR_BTN_SECONDARY } from './hrFormStyles';

export default function HrAccountabilityMemoQueue({ canManage, onEscalated, onViewAll, focusMemoId, onFocusHandled }) {
  const [memos, setMemos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [escalateMemo, setEscalateMemo] = useState(null);

  const load = useCallback(async () => {
    if (!canManage) return;
    setBusy(true);
    setErr('');
    const { ok, data } = await fetchHrIncidentMemos();
    setBusy(false);
    if (!ok || !data?.ok) {
      setErr(data?.error || 'Could not load memos.');
      setMemos([]);
      return;
    }
    setMemos(data.memos || []);
  }, [canManage]);

  useEffect(() => {
    load();
  }, [load]);

  const openMemos = useMemo(() => memos.filter((m) => m.status === 'open').slice(0, 5), [memos]);

  useEffect(() => {
    const id = String(focusMemoId || '').trim();
    if (!id || !canManage || busy) return;
    const memo = memos.find((m) => m.id === id);
    if (!memo) return;
    if (memo.status === 'open') {
      setEscalateMemo(memo);
    }
    onFocusHandled?.(memo);
  }, [focusMemoId, memos, canManage, busy, onFocusHandled]);

  if (!canManage) return null;

  return (
    <>
      <HrCard title="Memos awaiting escalation" subtitle="Team-reported incidents not yet in the accountability register">
        {err ? <p className="text-sm text-red-700 mb-2">{err}</p> : null}
        {!openMemos.length && !busy ? (
          <p className="text-sm text-slate-500">No open incident memos — team reports will appear here.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {openMemos.map((m) => (
              <li key={m.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-amber-100 bg-amber-50/40 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-800">{m.staffDisplayName}</div>
                  <div className="text-xs text-slate-500">{m.incidentDateIso}</div>
                  <p className="text-slate-700 mt-1 line-clamp-2">{m.summary}</p>
                </div>
                <button
                  type="button"
                  className="text-xs font-bold text-teal-800 hover:underline shrink-0"
                  onClick={() => setEscalateMemo(m)}
                >
                  Escalate…
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2 mt-3">
          <HrButton type="button" variant="secondary" onClick={load} disabled={busy}>
            {busy ? 'Refreshing…' : 'Refresh'}
          </HrButton>
          {onViewAll ? (
            <HrButton type="button" variant="secondary" onClick={onViewAll}>
              All incident memos
            </HrButton>
          ) : null}
        </div>
      </HrCard>

      <HrIncidentMemoEscalateModal
        memo={escalateMemo}
        open={Boolean(escalateMemo)}
        onClose={() => setEscalateMemo(null)}
        onEscalated={(data) => {
          onEscalated?.(data);
          load();
        }}
      />
    </>
  );
}
