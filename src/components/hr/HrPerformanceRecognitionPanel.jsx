import { useCallback, useEffect, useState } from 'react';
import { fetchPerformanceRecognitions } from '../../lib/hrIncidents';
import { HR_CARD, HR_MUTED, HR_SECTION_TITLE } from './hrPageUi';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../ui/AppDataTable';

export default function HrPerformanceRecognitionPanel() {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setBusy(true);
    setErr('');
    const { ok, data } = await fetchPerformanceRecognitions();
    setBusy(false);
    if (!ok || !data?.ok) {
      setErr(data?.error || 'Could not load performance recognitions.');
      setRows([]);
      return;
    }
    setRows(data.recognitions || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className={HR_CARD}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h3 className={HR_SECTION_TITLE}>Performance recognition</h3>
          <p className={HR_MUTED}>
            Positive incidents routed to recognition — not discipline. Register new entries via New incident → Performance.
          </p>
        </div>
        <button type="button" className="text-xs font-semibold text-teal-800 hover:underline" onClick={load} disabled={busy}>
          {busy ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      {err ? <p className="text-sm text-red-700 mb-3">{err}</p> : null}
      {!rows.length && !busy ? (
        <p className="text-sm text-slate-500">No performance recognitions recorded yet.</p>
      ) : (
        <AppTableWrap>
          <AppTable>
            <AppTableThead>
              <AppTableTh>Date</AppTableTh>
                <AppTableTh>Staff</AppTableTh>
                <AppTableTh>Summary</AppTableTh>
                <AppTableTh>Metric</AppTableTh>
                <AppTableTh>Bonus</AppTableTh>
                <AppTableTh>Registry</AppTableTh>
            </AppTableThead>
            <AppTableBody>
              {rows.map((r) => (
                <AppTableTr key={r.id}>
                  <AppTableTd className="whitespace-nowrap text-xs">{r.createdAtIso?.slice(0, 10) || '—'}</AppTableTd>
                  <AppTableTd>{r.staffDisplayName || r.userId}</AppTableTd>
                  <AppTableTd className="max-w-xs truncate" title={r.summary}>{r.summary}</AppTableTd>
                  <AppTableTd className="text-xs text-slate-600">
                    {r.metric?.outputAboveTargetPct != null ? `${r.metric.outputAboveTargetPct}% above target` : '—'}
                  </AppTableTd>
                  <AppTableTd>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.bonusEligible ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                      {r.bonusEligible ? 'Eligible' : 'Not eligible'}
                    </span>
                  </AppTableTd>
                  <AppTableTd className="text-xs font-mono text-slate-500">{r.registryId || '—'}</AppTableTd>
                </AppTableTr>
              ))}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      )}
    </div>
  );
}
