import React, { useMemo, useState } from 'react';
import { formatNgn } from '../../Data/mockData';
import { downloadFinanceCsv } from '../../lib/exportFinanceCsv';
import { useCreditExceptions } from '../../hooks/useCreditExceptions';
import { FinanceReportPanel } from './FinanceReportPanel';
import { FinanceDataTable } from './FinanceDataTable';

const today = () => new Date().toISOString().slice(0, 10);

/**
 * @param {{ branchId?: string | null }} props
 */
export function CreditExceptionReports({ branchId }) {
  const { items, loading, reload } = useCreditExceptions({ branchId, enabled: true });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loaded, setLoaded] = useState(false);

  const filtered = useMemo(() => {
    if (!loaded) return [];
    let rows = items;
    if (statusFilter !== 'ALL') rows = rows.filter((i) => i.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter((i) => String(i.quotationRef || '').toLowerCase().includes(q));
    return rows;
  }, [items, statusFilter, search, loaded]);

  const byBranch = useMemo(() => {
    const m = new Map();
    for (const i of filtered) {
      const b = i.branchId || 'Unassigned';
      m.set(b, (m.get(b) || 0) + (i.amountNgn || 0));
    }
    return [...m.entries()].map(([branch, exposure]) => ({
      _key: branch,
      branch,
      exposure: formatNgn(exposure),
      count: filtered.filter((x) => (x.branchId || 'Unassigned') === branch).length,
    }));
  }, [filtered]);

  const overdue = useMemo(
    () => filtered.filter((i) => i.status === 'approved' && i.dueDateISO && i.dueDateISO < today()),
    [filtered]
  );

  const tableRows = filtered.map((i) => ({
    _key: i.id,
    id: i.id,
    quote: i.quotationRef,
    status: i.status,
    amount: formatNgn(i.amountNgn),
    due: i.dueDateISO || '—',
    branch: i.branchId || '—',
  }));

  return (
    <div className="space-y-6">
      <FinanceReportPanel
        title="Credit exception register"
        description="Pending, approved, and closed delivery credit — receivable remains until cash received."
        loading={loading}
        onLoad={() => {
          setLoaded(true);
          reload();
        }}
        onExport={() =>
          downloadFinanceCsv('credit-exceptions', ['id', 'quote', 'status', 'amount', 'due', 'branch'], tableRows)
        }
        exportDisabled={!tableRows.length}
        filters={
          <div className="flex flex-wrap gap-3 items-end">
            <label className="text-xs font-bold text-slate-600">
              Status
              <select
                className="mt-1 block rounded-lg border border-slate-200 px-2 py-1 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="revoked">Revoked</option>
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">
              Quotation search
              <input
                className="mt-1 block rounded-lg border border-slate-200 px-2 py-1 text-sm w-40"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="QT-…"
              />
            </label>
          </div>
        }
        emptyTitle={loaded ? 'No rows match filters' : 'Load report'}
      >
        {loaded && tableRows.length ? (
          <FinanceDataTable
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'quote', label: 'Quotation' },
              { key: 'status', label: 'Status' },
              { key: 'amount', label: 'Credit', align: 'right' },
              { key: 'due', label: 'Due' },
              { key: 'branch', label: 'Branch' },
            ]}
            rows={tableRows.slice(0, 100)}
          />
        ) : null}
      </FinanceReportPanel>

      <FinanceReportPanel
        title="Approved credit exposure by branch"
        description="Sum of approved credit amounts in current filter."
        onLoad={() => setLoaded(true)}
        onExport={() => downloadFinanceCsv('credit-by-branch', ['branch', 'exposure', 'count'], byBranch)}
        exportDisabled={!byBranch.length}
      >
        {loaded && byBranch.length ? (
          <FinanceDataTable
            columns={[
              { key: 'branch', label: 'Branch' },
              { key: 'exposure', label: 'Exposure', align: 'right' },
              { key: 'count', label: 'Lines', align: 'right' },
            ]}
            rows={byBranch}
          />
        ) : null}
      </FinanceReportPanel>

      <FinanceReportPanel
        title="Overdue approved credit"
        description="Approved credit past due date — collection follow-up required."
        onLoad={() => setLoaded(true)}
        emptyTitle={loaded && !overdue.length ? 'No overdue approved credit' : undefined}
      >
        {loaded && overdue.length ? (
          <FinanceDataTable
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'quote', label: 'Quotation' },
              { key: 'amount', label: 'Amount', align: 'right' },
              { key: 'due', label: 'Due' },
            ]}
            rows={overdue.map((i) => ({
              _key: i.id,
              id: i.id,
              quote: i.quotationRef,
              amount: formatNgn(i.amountNgn),
              due: i.dueDateISO,
            }))}
          />
        ) : null}
      </FinanceReportPanel>
    </div>
  );
}
