import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { formatDurationHm, otDeltaBand } from '../../lib/opsUiChrome';
import { FinanceSequencePanel } from '../layout';

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Attendance visibility only; this is not a payroll calculation. */
export function ManagerOtBoardPanel({ branchId = '' }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const dayIso = useMemo(() => todayIso(), []);

  const load = useCallback(async () => {
    if (!branchId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const qs = new URLSearchParams({ branchId, dayIso });
    const res = await apiFetch(`/api/hr/ot-board?${qs}`).catch(() => ({ ok: false }));
    setLoading(false);
    if (!res.ok || res.data?.ok === false) {
      setRows([]);
      setError(res.data?.error || 'Could not load overtime visibility.');
      return;
    }
    setRows(Array.isArray(res.data?.rows) ? res.data.rows : []);
  }, [branchId, dayIso]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <FinanceSequencePanel className="!min-h-0 sm:!min-h-0 overflow-hidden bg-white p-0">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Attendance · hours only
          </p>
          <h3 className="text-sm font-black tracking-tight text-zarewa-teal">
            Attendance OT board
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Worked vs scheduled · {dayIso} · not OT pay approvals
          </p>
        </div>
        <button type="button" onClick={() => void load()} className="text-ui-xs font-bold uppercase text-zarewa-teal hover:underline">
          Refresh
        </button>
      </div>
      {error ? <p className="m-3 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-ui-xs text-amber-950">{error}</p> : null}
      {loading ? <p className="px-4 py-8 text-center text-xs text-slate-500">Loading attendance…</p> : null}
      {!loading && !error && rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-slate-500">No worked time above schedule recorded today.</p>
      ) : null}
      {!loading && rows.length ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-ui-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-bold">Staff</th>
                <th className="px-3 py-2 font-bold text-right">Scheduled</th>
                <th className="px-3 py-2 font-bold text-right">Worked</th>
                <th className="px-3 py-2 font-bold text-right">Delta</th>
                <th className="px-3 py-2 font-bold">Flag</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const band = otDeltaBand(row.scheduledMinutes, row.workedMinutes);
                return (
                  <tr key={`${row.userId}-${row.dayIso}`} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-semibold text-slate-800">{row.displayName || row.staffName || row.userId || 'Staff'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-700">{formatDurationHm(row.scheduledMinutes)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-700">{formatDurationHm(row.workedMinutes)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${band.className}`}>
                      {band.delta == null ? '—' : `${band.delta > 0 ? '+' : ''}${formatDurationHm(Math.abs(band.delta))}`}
                    </td>
                    <td className="px-3 py-2">
                      {band.delta > 60 ? <span className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-ui-xs font-bold uppercase text-rose-900">Review</span> : <span className="text-ui-xs text-slate-500">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </FinanceSequencePanel>
  );
}
