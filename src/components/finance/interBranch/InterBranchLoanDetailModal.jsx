import React, { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { apiFetch } from '../../lib/apiBase';
import { ModalFrame } from '../layout/ModalFrame';
import { InterBranchRepayModal, InterBranchStatusBadge } from './InterBranchRepayModal';

/**
 * @param {{
 *   loanId: string;
 *   branchNameById: Record<string, string>;
 *   treasuryAccounts: object[];
 *   canMdApprove?: boolean;
 *   canRepay?: boolean;
 *   onClose: () => void;
 *   onChanged: () => void;
 * }} props
 */
export function InterBranchLoanDetailModal({
  loanId,
  branchNameById,
  treasuryAccounts,
  canMdApprove = false,
  canRepay = false,
  onClose,
  onChanged,
}) {
  const [loan, setLoan] = useState(null);
  const [repayments, setRepayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [repayOpen, setRepayOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    const { ok, data } = await apiFetch(`/api/inter-branch-loans/${encodeURIComponent(loanId)}`);
    setLoading(false);
    if (!ok || !data?.ok) {
      setLoan(null);
      setRepayments([]);
      setError(data?.error || 'Could not load transfer.');
      return;
    }
    setLoan(data.loan);
    setRepayments(data.repayments || []);
  };

  useEffect(() => {
    void load();
  }, [loanId]);

  const mdApprove = async () => {
    setBusy(true);
    const { ok, data } = await apiFetch(`/api/inter-branch-loans/${encodeURIComponent(loanId)}/md-approve`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Approval failed.');
      return;
    }
    await load();
    onChanged();
  };

  const mdReject = async () => {
    setBusy(true);
    const { ok, data } = await apiFetch(`/api/inter-branch-loans/${encodeURIComponent(loanId)}/md-reject`, {
      method: 'POST',
      body: JSON.stringify({ note: rejectNote.trim() }),
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Rejection failed.');
      return;
    }
    await load();
    onChanged();
  };

  const branchLabel = (id) => branchNameById[id] || id || '—';

  return (
    <>
      <ModalFrame isOpen onClose={onClose} title="Inter-branch transfer" surface="plain">
        <div className="w-full max-w-2xl rounded-2xl border border-slate-200/90 bg-white shadow-xl overflow-hidden">
          <div className="h-1 bg-[#134e4a]" />
          <div className="p-5 sm:p-6 max-h-[min(85dvh,720px)] overflow-y-auto custom-scrollbar">
            {loading ? <p className="text-[11px] text-slate-500">Loading…</p> : null}
            {error && !loan ? <p className="text-[11px] text-rose-700">{error}</p> : null}
            {loan ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-bold text-[#134e4a]">{loan.loanId}</p>
                    <p className="text-[11px] text-slate-600 mt-1">
                      {branchLabel(loan.lenderBranchId)} → {branchLabel(loan.borrowerBranchId)}
                    </p>
                  </div>
                  <InterBranchStatusBadge status={loan.status} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Metric label="Principal" value={formatNgn(loan.principalNgn)} />
                  <Metric label="Repaid" value={formatNgn(loan.repaidNgn)} />
                  <Metric label="Outstanding" value={formatNgn(loan.outstandingNgn)} highlight />
                  <Metric label="Disbursement" value={String(loan.dateISO || '—').slice(0, 10)} />
                </div>

                {loan.reference ? (
                  <p className="text-[10px] text-slate-600">
                    <span className="font-bold uppercase text-slate-500">Reference:</span> {loan.reference}
                  </p>
                ) : null}
                {loan.proposedNote ? (
                  <p className="text-[11px] text-slate-700 rounded-lg border border-slate-100 bg-slate-50/80 p-3 leading-relaxed">
                    {loan.proposedNote}
                  </p>
                ) : null}

                {Array.isArray(loan.repaymentPlan) && loan.repaymentPlan.length > 0 ? (
                  <section>
                    <h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">
                      Planned instalments
                    </h3>
                    <ul className="rounded-lg border border-slate-200 divide-y divide-slate-100">
                      {loan.repaymentPlan.map((line, idx) => (
                        <li key={idx} className="flex justify-between gap-3 px-3 py-2 text-[11px] tabular-nums">
                          <span>{line.dueDateISO || '—'}</span>
                          <span className="font-semibold text-[#134e4a]">{formatNgn(line.amountNgn)}</span>
                          {line.note ? <span className="text-slate-500 truncate">{line.note}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {repayments.length > 0 ? (
                  <section>
                    <h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">
                      Posted repayments
                    </h3>
                    <ul className="rounded-lg border border-slate-200 divide-y divide-slate-100">
                      {repayments.map((r) => (
                        <li key={r.id} className="px-3 py-2 text-[11px]">
                          <div className="flex justify-between gap-2 tabular-nums">
                            <span>{String(r.postedAtISO || '').slice(0, 10)}</span>
                            <span className="font-semibold text-[#134e4a]">{formatNgn(r.amountNgn)}</span>
                          </div>
                          {r.note ? <p className="text-[10px] text-slate-500 mt-0.5">{r.note}</p> : null}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                <section className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 text-[10px] text-slate-600 space-y-1">
                  <p>
                    Proposed by {loan.createdByName || '—'} ·{' '}
                    {String(loan.createdAtISO || '').slice(0, 10)}
                  </p>
                  {loan.mdApprovedAtISO ? (
                    <p>
                      MD approved {String(loan.mdApprovedAtISO).slice(0, 10)}
                      {loan.mdApprovedByName ? ` · ${loan.mdApprovedByName}` : ''}
                      {loan.treasuryBatchId ? ` · batch ${loan.treasuryBatchId}` : ''}
                    </p>
                  ) : null}
                  {loan.mdRejectedAtISO ? (
                    <p className="text-rose-700">
                      Rejected {String(loan.mdRejectedAtISO).slice(0, 10)}
                      {loan.mdRejectNote ? ` — ${loan.mdRejectNote}` : ''}
                    </p>
                  ) : null}
                </section>

                {loan.status === 'pending_md' && canMdApprove ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-2">
                    <p className="text-[10px] font-bold uppercase text-amber-900">MD decision</p>
                    <input
                      className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-[11px]"
                      placeholder="Rejection note (optional)"
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void mdApprove()}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-[9px] font-semibold uppercase disabled:opacity-50"
                      >
                        <Check size={12} /> Approve disbursement
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void mdReject()}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white text-rose-800 px-3 py-1.5 text-[9px] font-semibold uppercase disabled:opacity-50"
                      >
                        <X size={12} /> Reject
                      </button>
                    </div>
                  </div>
                ) : null}

                {loan.status === 'active' && canRepay && loan.outstandingNgn > 0 ? (
                  <button
                    type="button"
                    onClick={() => setRepayOpen(true)}
                    className="inline-flex items-center rounded-lg bg-[#134e4a] text-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider"
                  >
                    Record repayment
                  </button>
                ) : null}

                {error ? <p className="text-[10px] text-rose-700">{error}</p> : null}
              </div>
            ) : null}

            <div className="flex justify-end mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-[9px] font-semibold uppercase text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </ModalFrame>

      {repayOpen && loan ? (
        <InterBranchRepayModal
          loan={loan}
          branchNameById={branchNameById}
          treasuryAccounts={treasuryAccounts}
          onClose={() => setRepayOpen(false)}
          onSaved={() => {
            setRepayOpen(false);
            void load();
            onChanged();
          }}
        />
      ) : null}
    </>
  );
}

function Metric({ label, value, highlight = false }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5">
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`mt-1 text-sm font-black tabular-nums ${
          highlight ? 'text-[#134e4a]' : 'text-slate-800'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
