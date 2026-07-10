import React, { useMemo, useState } from 'react';
import { ArrowRightLeft, Plus, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatNgn } from '../../../Data/mockData';
import { useInterBranchLoans } from '../../../hooks/useInterBranchLoans';
import { useWorkspace } from '../../../context/WorkspaceContext';
import { treasuryAccountsFromSnapshot } from '../../../lib/treasuryAccountsStore';
import {
  AccountingDeskKpiCard,
  AccountingDeskNotice,
  ACCOUNTING_CARD_ROW,
} from '../accounting/AccountingDeskUi';
import { AccountingRegisterHeader } from '../accounting/AccountingRegisterLayout';
import { SalesListSearchInput, SalesListSortBar, SalesListTableFrame } from '../../sales/SalesListTableFrame';
import { AppTablePager } from '../../ui/AppDataTable';
import { useAppTablePaging } from '../../../lib/appDataTable';
import { InterBranchProposeModal } from './InterBranchProposeModal';
import { InterBranchLoanDetailModal } from './InterBranchLoanDetailModal';
import { InterBranchStatusBadge } from './InterBranchRepayModal';

const PAGE_SIZE = 12;
const SORT_FIELDS = [
  { id: 'date', label: 'Date' },
  { id: 'amount', label: 'Principal' },
  { id: 'status', label: 'Status' },
  { id: 'id', label: 'ID' },
];

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending_md', label: 'Pending MD' },
  { id: 'active', label: 'Active' },
  { id: 'closed', label: 'Closed' },
  { id: 'rejected', label: 'Rejected' },
];

/**
 * @param {{ branchScopeLabel?: string; workspaceBranchId?: string }} props
 */
export function AccountingInterBranchPanel({ branchScopeLabel = '', workspaceBranchId = '' }) {
  const ws = useWorkspace();
  const { loans, balances, loading, error, reload } = useInterBranchLoans({ enabled: true });
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState({ field: 'date', dir: 'desc' });
  const [proposeOpen, setProposeOpen] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState('');

  const branches = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
  const branchNameById = useMemo(
    () =>
      Object.fromEntries(
        branches.map((b) => [String(b.id || '').trim(), b.name || b.code || b.id || '—'])
      ),
    [branches]
  );
  const treasuryAccounts = useMemo(
    () => treasuryAccountsFromSnapshot(ws?.snapshot),
    [ws?.snapshot]
  );

  const canPropose =
    Boolean(ws?.hasPermission?.('treasury.manage')) &&
    Boolean(ws?.hasPermission?.('finance.post')) &&
    Boolean(ws?.canMutate);
  const canMdApprove = Boolean(ws?.hasPermission?.('inter_branch_loan.md_approve'));
  const canRepay =
    Boolean(ws?.hasPermission?.('treasury.manage')) || Boolean(ws?.hasPermission?.('finance.pay'));

  const refreshAll = async () => {
    await reload();
    await ws?.refresh?.();
  };

  const summary = useMemo(() => {
    const active = loans.filter((l) => l.status === 'active');
    const pending = loans.filter((l) => l.status === 'pending_md');
    const outstandingNgn = active.reduce((s, l) => s + (l.outstandingNgn || 0), 0);
    return {
      outstandingNgn,
      activeCount: active.length,
      pendingCount: pending.length,
      totalPrincipalNgn: loans.reduce((s, l) => s + (l.principalNgn || 0), 0),
    };
  }, [loans]);

  const filteredLoans = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = loans;
    if (statusFilter !== 'all') list = list.filter((l) => l.status === statusFilter);
    if (q) {
      list = list.filter((l) => {
        const hay = [
          l.loanId,
          l.reference,
          l.proposedNote,
          branchNameById[l.lenderBranchId],
          branchNameById[l.borrowerBranchId],
          l.status,
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sort.field === 'amount') return ((a.principalNgn || 0) - (b.principalNgn || 0)) * dir;
      if (sort.field === 'status') {
        return String(a.status || '').localeCompare(String(b.status || '')) * dir;
      }
      if (sort.field === 'id') return String(a.loanId || '').localeCompare(String(b.loanId || '')) * dir;
      const ad = String(a.dateISO || a.createdAtISO || '');
      const bd = String(b.dateISO || b.createdAtISO || '');
      return ad.localeCompare(bd) * dir;
    });
  }, [loans, statusFilter, searchQuery, sort, branchNameById]);

  const paging = useAppTablePaging(filteredLoans, PAGE_SIZE, searchQuery, statusFilter, sort.field, sort.dir);

  if (error) {
    return (
      <div className="rounded-lg border border-dashed border-rose-200 bg-rose-50/50 py-10 px-6 text-center">
        <p className="text-ui-xs font-semibold text-rose-800 uppercase tracking-widest">Could not load transfers</p>
        <p className="mt-2 text-xs text-rose-700">{error}</p>
        <button type="button" onClick={() => void refreshAll()} className="mt-3 text-ui-xs font-bold text-zarewa-teal hover:underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 min-w-0">
      <AccountingRegisterHeader
        title="Inter-branch transfers"
        subtitle="Cross-branch treasury funding with MD approval, repayment tracking, and register integration."
        totalLabel="Outstanding"
        totalValue={formatNgn(summary.outstandingNgn)}
        compact
        actions={
          <>
            {canPropose ? (
              <button
                type="button"
                onClick={() => setProposeOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg bg-zarewa-teal text-white px-3 py-1.5 text-ui-xs font-semibold uppercase tracking-wider shadow-sm hover:brightness-105"
              >
                <Plus size={12} /> Propose transfer
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void refreshAll()}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-ui-xs font-semibold uppercase tracking-wider text-zarewa-teal hover:bg-slate-50 disabled:opacity-40"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </>
        }
      />

      <AccountingDeskNotice tone="info">
        Inter-branch transfers move cash between branch treasuries. They appear in the{' '}
        <Link to="/accounting" state={{ focusTab: 'creditors' }} className="font-semibold text-zarewa-teal hover:underline">
          Creditors
        </Link>{' '}
        and{' '}
        <Link to="/accounting" state={{ focusTab: 'debtors' }} className="font-semibold text-zarewa-teal hover:underline">
          Debtors
        </Link>{' '}
        registers once active. Same-branch movements stay on{' '}
        <Link to="/accounts?tab=movements" className="font-semibold text-zarewa-teal hover:underline">
          Cashier → Movements
        </Link>
        .
        {branchScopeLabel ? ` Scope: ${branchScopeLabel}.` : ''}
      </AccountingDeskNotice>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AccountingDeskKpiCard
          icon={<ArrowRightLeft size={12} />}
          label="Outstanding"
          value={formatNgn(summary.outstandingNgn)}
          tone="teal"
        />
        <AccountingDeskKpiCard label="Active loans" value={summary.activeCount} />
        <AccountingDeskKpiCard label="Pending MD" value={summary.pendingCount} tone="amber" />
        <AccountingDeskKpiCard label="Total principal" value={formatNgn(summary.totalPrincipalNgn)} />
      </div>

      {balances.length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-ui-xs font-bold uppercase tracking-wide text-slate-500 mb-3">
            Net positions in scope
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {balances.map((b) => (
              <li
                key={`${b.lenderBranchId}-${b.borrowerBranchId}`}
                className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs"
              >
                <span className="font-semibold text-slate-800">
                  {branchNameById[b.borrowerBranchId] || b.borrowerBranchId}
                </span>{' '}
                owes{' '}
                <span className="font-semibold text-slate-800">
                  {branchNameById[b.lenderBranchId] || b.lenderBranchId}
                </span>
                <p className="mt-1 text-sm font-black text-zarewa-teal tabular-nums">
                  {formatNgn(b.outstandingNgn)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <SalesListTableFrame
        toolbar={
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={`rounded-lg px-2.5 py-1.5 text-ui-xs font-bold uppercase tracking-wide border ${
                    statusFilter === f.id
                      ? 'bg-zarewa-teal text-white border-zarewa-teal'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <SalesListSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search loan id, branch, reference, status…"
            />
            <SalesListSortBar
              fields={SORT_FIELDS}
              field={sort.field}
              dir={sort.dir}
              onFieldChange={(field) => setSort((s) => ({ ...s, field }))}
              onDirToggle={() => setSort((s) => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }))}
            />
          </div>
        }
        footer={
          <AppTablePager
            showingFrom={paging.showingFrom}
            showingTo={paging.showingTo}
            total={paging.total}
            hasPrev={paging.hasPrev}
            hasNext={paging.hasNext}
            onPrev={paging.goPrev}
            onNext={paging.goNext}
            pageSize={PAGE_SIZE}
          />
        }
      >
        {loading && !loans.length ? (
          <p className="text-xs text-slate-500 py-8 text-center">Loading transfers…</p>
        ) : paging.slice.length === 0 ? (
          <p className="text-xs text-slate-500 py-8 text-center">No inter-branch transfers in this scope.</p>
        ) : (
          <ul className="space-y-1.5">
            {paging.slice.map((loan) => (
              <li key={loan.loanId}>
                <button
                  type="button"
                  onClick={() => setSelectedLoanId(loan.loanId)}
                  className={`${ACCOUNTING_CARD_ROW} w-full text-left`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zarewa-teal">
                        <span className="font-mono">{loan.loanId}</span>
                        <span className="font-medium text-slate-600">
                          {' '}
                          · {branchNameById[loan.lenderBranchId] || loan.lenderBranchId} →{' '}
                          {branchNameById[loan.borrowerBranchId] || loan.borrowerBranchId}
                        </span>
                      </p>
                      <p className="text-ui-xs text-slate-500 mt-0.5">
                        {String(loan.dateISO || loan.createdAtISO || '').slice(0, 10)}
                        {loan.reference ? ` · ${loan.reference}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-black text-zarewa-teal tabular-nums">
                        {formatNgn(loan.principalNgn)}
                      </span>
                      <InterBranchStatusBadge status={loan.status} />
                    </div>
                  </div>
                  {loan.status === 'active' || loan.status === 'closed' ? (
                    <p className="text-ui-xs text-slate-500 mt-1 tabular-nums">
                      Repaid {formatNgn(loan.repaidNgn)} · Outstanding {formatNgn(loan.outstandingNgn)}
                    </p>
                  ) : loan.proposedNote ? (
                    <p className="text-ui-xs text-slate-600 mt-1 line-clamp-1">{loan.proposedNote}</p>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </SalesListTableFrame>

      {proposeOpen ? (
        <InterBranchProposeModal
          branches={branches}
          treasuryAccounts={treasuryAccounts}
          workspaceBranchId={workspaceBranchId}
          onClose={() => setProposeOpen(false)}
          onSaved={() => {
            setProposeOpen(false);
            void refreshAll();
          }}
        />
      ) : null}

      {selectedLoanId ? (
        <InterBranchLoanDetailModal
          loanId={selectedLoanId}
          branchNameById={branchNameById}
          treasuryAccounts={treasuryAccounts}
          canMdApprove={canMdApprove}
          canRepay={canRepay && ws?.canMutate}
          onClose={() => setSelectedLoanId('')}
          onChanged={() => void refreshAll()}
        />
      ) : null}
    </div>
  );
}
