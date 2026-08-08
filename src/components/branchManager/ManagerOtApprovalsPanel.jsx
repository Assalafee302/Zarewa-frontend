import React, { useCallback, useEffect, useState } from 'react';
import { Banknote, ChevronRight, RefreshCw } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { useWorkspace } from '../../context/WorkspaceContext';
import { OT_STATUS } from '../../lib/otConstants';
import { listOtRequests } from '../../lib/otRequestsApi';
import { FinanceSequencePanel } from '../layout';
import { OtStatusChip } from '../ot/OtStatusTimeline';
import { OtApprovalDecisionModal } from './OtApprovalDecisionModal';

/**
 * Branch manager — OT pay approvals queue (opens detail popup to approve/reject).
 */
export function ManagerOtApprovalsPanel({ branchId = '', onQueueChange }) {
  const ws = useWorkspace();
  const canApprove = Boolean(ws?.hasPermission?.('ot.approve') || ws?.hasPermission?.('*'));

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');

  const load = useCallback(async () => {
    if (!canApprove) {
      setRows([]);
      setLoading(false);
      onQueueChange?.(0);
      return;
    }
    setLoading(true);
    setError('');
    const res = await listOtRequests({
      status: OT_STATUS.PENDING_BM,
      limit: 80,
    }).catch(() => ({ ok: false }));
    setLoading(false);
    if (!res.ok || res.data?.ok === false) {
      setRows([]);
      setError(res.data?.error || 'Could not load OT approval queue.');
      onQueueChange?.(0);
      return;
    }
    const list = Array.isArray(res.data?.rows) ? res.data.rows : [];
    setRows(list);
    onQueueChange?.(list.length);
  }, [canApprove, onQueueChange]);

  useEffect(() => {
    void load();
  }, [load, branchId]);

  const openDetail = (id) => {
    setSelectedId(id);
  };

  if (!canApprove) return null;

  return (
    <>
      <FinanceSequencePanel
        className="!min-h-0 sm:!min-h-0 overflow-hidden bg-white p-0"
        data-testid="manager-ot-approvals-panel"
      >
        <div className="flex items-start justify-between gap-3 border-b border-amber-100 bg-amber-50/40 px-4 py-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-900/70">
              Also in Needs approval · Overtime filter
            </p>
            <h3 className="mt-0.5 flex items-center gap-2 text-sm font-black tracking-tight text-amber-950">
              <Banknote size={16} aria-hidden /> Overtime pay to approve
              {rows.length ? (
                <span className="rounded-md bg-amber-200/80 px-1.5 py-0.5 text-ui-xs tabular-nums text-amber-950">
                  {rows.length}
                </span>
              ) : null}
            </h3>
            <p className="mt-0.5 text-xs text-amber-950/70">
              Open a row for full details, then approve or reject in the popup.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex shrink-0 items-center gap-1 text-ui-xs font-bold uppercase text-amber-900 hover:underline"
          >
            <RefreshCw size={12} aria-hidden /> Refresh
          </button>
        </div>

        {error ? (
          <p className="m-3 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-ui-xs text-amber-950">
            {error}
          </p>
        ) : null}
        {loading ? <p className="px-4 py-8 text-center text-xs text-slate-500">Loading queue…</p> : null}
        {!loading && rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-slate-500">
            No OT pay requests awaiting your approval.
          </p>
        ) : null}

        {!loading && rows.length ? (
          <ul className="max-h-80 divide-y divide-slate-100 overflow-auto">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => openDetail(row.id)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-amber-50/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-slate-800">{row.id}</span>
                      <OtStatusChip status={row.status} />
                    </div>
                    <p className="text-ui-xs text-slate-600">
                      {row.dayIso} · {row.workType} · {row.createdByName || 'Store'}
                      {row.quotationRef ? ` · ${row.quotationRef}` : ''}
                      {row.poId ? ` · ${row.poId}` : ''}
                    </p>
                    <p className="text-ui-xs text-slate-500 line-clamp-1">{row.reason || '—'}</p>
                  </div>
                  {row.totalPayableNgn ? (
                    <span className="shrink-0 text-ui-xs font-bold tabular-nums text-slate-700">
                      {formatNgn(row.totalPayableNgn)}
                    </span>
                  ) : null}
                  <ChevronRight size={14} className="shrink-0 text-slate-300" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </FinanceSequencePanel>

      <OtApprovalDecisionModal
        isOpen={Boolean(selectedId)}
        requestId={selectedId}
        onClose={() => setSelectedId('')}
        onDecisionComplete={async () => {
          setSelectedId('');
          await load();
        }}
      />
    </>
  );
}
