import React, { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router-dom';
import { formatNgn } from '../../lib/formatNgn';
import { userMayAccessLegacyAccountsRoute } from '../../lib/legacyAccountsAccess';
import { EXPENSE_CATEGORY_OPTIONS } from '../../shared/expenseCategories';
import {
  buildManagerSpendInsights,
  monthKeyFromDate,
} from '../../lib/managerSpendInsights';
import { FinanceSequencePanel, ModalFrame } from '../layout';
import { ManagerSpendMachinesPanel } from './ManagerSpendMachinesPanel';

function PanelShell({ title, subtitle, children, disclaimer }) {
  return (
    <FinanceSequencePanel className="!min-h-0 sm:!min-h-0 p-5 sm:p-5 bg-white">
      <div className="mb-3">
        <h3 className="text-sm font-black text-zarewa-teal tracking-tight">{title}</h3>
        {subtitle ? <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p> : null}
        {disclaimer ? (
          <p className="mt-2 rounded-lg border border-amber-100 bg-amber-50/80 px-2.5 py-1.5 text-ui-xs text-amber-900">
            {disclaimer}
          </p>
        ) : null}
      </div>
      {children}
    </FinanceSequencePanel>
  );
}

function EmptyNote({ text }) {
  return <p className="text-xs text-slate-500 py-6 text-center">{text}</p>;
}

function statusLabel(status) {
  switch (status) {
    case 'pending':
      return 'Awaiting approval';
    case 'approved_awaiting':
      return 'Waiting on Desk';
    case 'partial':
      return 'Part paid Â· Waiting on Desk';
    case 'paid':
      return 'Paid';
    default:
      return status || 'â€”';
  }
}

/** Extra signal under the status cell for rows still awaiting treasury payout. */
function statusSubtitle(status) {
  if (status === 'approved_awaiting' || status === 'partial') return 'Waiting on Cashier desk';
  return null;
}

/**
 * Branch Manager Spend tab â€” committed + paid expense insights (branch-scoped for BM).
 * Machine repair-vs-replace is additive via ManagerSpendMachinesPanel (maintenance insights API).
 */
export function ManagerSpendTab({
  snapshot,
  branchId = '',
  branchLabel = '',
  viewAllBranches = false,
  roleKey = '',
  permissions = [],
  onOpenWorkOrder,
}) {
  const [monthKey, setMonthKey] = useState(() => monthKeyFromDate());
  const [filterBranchId, setFilterBranchId] = useState(() => (viewAllBranches ? '' : String(branchId || '')));
  const [filterCategory, setFilterCategory] = useState('');
  const [paidOnly, setPaidOnly] = useState(false);
  const [drill, setDrill] = useState(null);

  const branches = useMemo(() => {
    const list = Array.isArray(snapshot?.branches) ? snapshot.branches : [];
    return list
      .map((b) => ({
        id: String(b.id || b.branchId || '').trim(),
        name: String(b.name || b.label || b.id || '').trim(),
      }))
      .filter((b) => b.id);
  }, [snapshot?.branches]);

  const branchNameById = useMemo(() => {
    const m = new Map(branches.map((b) => [b.id, b.name]));
    return m;
  }, [branches]);

  const effectiveBranchId = viewAllBranches ? filterBranchId : String(branchId || filterBranchId || '');

  const insights = useMemo(
    () =>
      buildManagerSpendInsights(snapshot || {}, {
        monthKey,
        branchId: effectiveBranchId || null,
        category: filterCategory || null,
        paidOnly,
      }),
    [snapshot, monthKey, effectiveBranchId, filterCategory, paidOnly]
  );

  const canOpenPaymentRegister = userMayAccessLegacyAccountsRoute(roleKey, permissions);

  const openDrill = (opts = {}) => {
    let rows = insights.rows;
    if (opts.category) {
      rows = rows.filter((r) => r.category === opts.category);
    }
    if (opts.payee) {
      const needle = String(opts.payee).toLowerCase();
      rows = rows.filter((r) => String(r.payee || '').toLowerCase() === needle);
    }
    if (opts.statusGroup === 'open') {
      rows = rows.filter((r) => r.status === 'pending' || r.status === 'approved_awaiting' || r.status === 'partial');
    }
    if (opts.paidOnlyRows) {
      rows = rows.filter((r) => (Number(r.paidNgn) || 0) > 0);
    }
    setDrill({
      title: opts.title || 'Expenses detail',
      subtitle: opts.subtitle || `${monthKey}${opts.category ? ` Â· ${opts.category}` : ''}`,
      rows,
    });
  };

  const filterSelectClass =
    'rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-zarewa-teal/15';

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-600">
        Expenses for {viewAllBranches && !effectiveBranchId ? 'all branches' : branchLabel || 'your branch'} â€” paid cash
        plus committed requests (awaiting approval or payout). Maintenance is included as a category (GL 5020);
        machine repair-vs-replace below is additive and does not change these category totals.
      </p>

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <label className="flex flex-col gap-1 text-ui-xs font-bold uppercase tracking-wide text-slate-500">
          Month
          <input
            type="month"
            value={monthKey}
            onChange={(e) => setMonthKey(e.target.value || monthKeyFromDate())}
            className={filterSelectClass}
          />
        </label>
        {viewAllBranches ? (
          <label className="flex flex-col gap-1 text-ui-xs font-bold uppercase tracking-wide text-slate-500">
            Branch
            <select
              value={filterBranchId}
              onChange={(e) => setFilterBranchId(e.target.value)}
              className={filterSelectClass}
            >
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="flex flex-col gap-1 text-ui-xs font-bold uppercase tracking-wide text-slate-500">
          Category
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={`${filterSelectClass} min-w-[10rem]`}
          >
            <option value="">All categories</option>
            {EXPENSE_CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={paidOnly}
            onChange={(e) => setPaidOnly(e.target.checked)}
            className="rounded border-slate-300 text-zarewa-teal focus:ring-zarewa-teal/30"
          />
          Paid only
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => openDrill({ title: 'All expenses this period' })}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-zarewa-teal/40 focus:outline-none focus:ring-2 focus:ring-zarewa-teal/20"
        >
          <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Total expenses</p>
          <p className="mt-1 text-xl font-black tabular-nums text-zarewa-teal">{formatNgn(insights.totalNgn)}</p>
          <p className="mt-0.5 text-ui-xs text-slate-500">{paidOnly ? 'Paid cash' : 'Committed + paid'}</p>
        </button>
        <button
          type="button"
          onClick={() => openDrill({ title: 'Expenses vs prior month' })}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-zarewa-teal/40 focus:outline-none focus:ring-2 focus:ring-zarewa-teal/20"
        >
          <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Vs prior month</p>
          <p className="mt-1 text-xl font-black tabular-nums text-zarewa-teal">
            {insights.vsPriorPct > 0 ? '+' : ''}
            {insights.vsPriorPct}%
          </p>
          <p className="mt-0.5 text-ui-xs text-slate-500">Was {formatNgn(insights.priorTotalNgn)}</p>
        </button>
        <button
          type="button"
          onClick={() =>
            openDrill({
              title: insights.topCategory ? `Top: ${insights.topCategory.category}` : 'Top category',
              category: insights.topCategory?.category,
            })
          }
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-zarewa-teal/40 focus:outline-none focus:ring-2 focus:ring-zarewa-teal/20"
        >
          <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Top category</p>
          <p className="mt-1 text-sm font-black text-zarewa-teal truncate">
            {insights.topCategory?.category || 'â€”'}
          </p>
          <p className="mt-0.5 text-ui-xs text-slate-500 tabular-nums">
            {insights.topCategory ? formatNgn(insights.topCategory.amountNgn) : 'No expenses'}
          </p>
        </button>
        <button
          type="button"
          onClick={() =>
            openDrill({
              title: 'Open / awaiting',
              statusGroup: 'open',
              subtitle: 'Pending approval or payout',
            })
          }
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-zarewa-teal/40 focus:outline-none focus:ring-2 focus:ring-zarewa-teal/20"
        >
          <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Open requests</p>
          <p className="mt-1 text-xl font-black tabular-nums text-zarewa-teal">{insights.pendingCount}</p>
          <p className="mt-0.5 text-ui-xs text-slate-500">Paid cash {formatNgn(insights.paidNgn)}</p>
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PanelShell title="How are expenses performing?" subtitle="Weekly trend this month">
          {insights.trend.length ? (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={insights.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={44} />
                  <Tooltip formatter={(v) => formatNgn(v)} />
                  <Area type="monotone" dataKey="v" stroke="#134e4a" fill="#134e4a" fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyNote text="No expenses in this period yet." />
          )}
        </PanelShell>

        <PanelShell title="Category mix" subtitle="Top categories this period">
          {insights.categoryBars.length ? (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={insights.categoryBars} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(v) => formatNgn(v)} />
                  <Bar
                    dataKey="v"
                    fill="#134e4a"
                    radius={[0, 6, 6, 0]}
                    cursor="pointer"
                    onClick={(data) => {
                      const cat = data?.name || data?.payload?.name;
                      if (cat) openDrill({ title: cat, category: cat });
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyNote text="No category breakdown for this filter." />
          )}
        </PanelShell>
      </div>

      <PanelShell title="What's costing the most?" subtitle="Auto-ranked cost drivers (top 5)">
        {insights.drivers.length ? (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {insights.drivers.slice(0, 5).map((d, i) => (
                <button
                  key={d.category}
                  type="button"
                  onClick={() => openDrill({ title: d.category, category: d.category })}
                  className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 text-left hover:border-zarewa-teal/40"
                >
                  <p className="text-ui-xs font-bold uppercase text-slate-500">#{i + 1}</p>
                  <p className="text-sm font-black text-zarewa-teal truncate">{d.category}</p>
                  <p className="mt-1 text-sm font-bold tabular-nums text-slate-800">{formatNgn(d.amountNgn)}</p>
                  <p className="text-ui-xs text-slate-500">
                    {d.pct}% of total
                    {d.deltaPct != null ? ` Â· ${d.deltaPct > 0 ? '+' : ''}${d.deltaPct}% MoM` : ''}
                  </p>
                </button>
              ))}
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-50 text-ui-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-bold">Category</th>
                    <th className="px-3 py-2 font-bold text-right">Amount</th>
                    <th className="px-3 py-2 font-bold text-right">% total</th>
                    <th className="px-3 py-2 font-bold text-right">Î” vs prior</th>
                  </tr>
                </thead>
                <tbody>
                  {insights.categoryRank.map((r) => (
                    <tr
                      key={r.category}
                      className="border-t border-slate-100 cursor-pointer hover:bg-slate-50/80"
                      onClick={() => openDrill({ title: r.category, category: r.category })}
                    >
                      <td className="px-3 py-2 font-semibold text-slate-800">{r.category}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatNgn(r.amountNgn)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-600">{r.pct}%</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                        {r.deltaPct > 0 ? '+' : ''}
                        {r.deltaPct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {viewAllBranches && insights.branchRank.length > 1 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <p className="px-3 py-2 text-ui-xs font-bold uppercase tracking-wide text-slate-500 bg-slate-50">
                  By branch
                </p>
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-white text-ui-xs uppercase tracking-wide text-slate-500 border-t border-slate-100">
                    <tr>
                      <th className="px-3 py-2 font-bold">Branch</th>
                      <th className="px-3 py-2 font-bold text-right">Amount</th>
                      <th className="px-3 py-2 font-bold text-right">Requests</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.branchRank.map((r) => (
                      <tr key={r.branchId} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-semibold text-slate-800">
                          {branchNameById.get(r.branchId) || r.branchId}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatNgn(r.amountNgn)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-600">{r.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyNote text="No cost drivers for this filter." />
        )}
      </PanelShell>

      <PanelShell
        title="How do I reduce it?"
        subtitle="Anomalies and actionable signals"
        disclaimer="MoM alerts need â‰¥25% rise, â‰¥â‚¦50,000 absolute increase, and a material prior month (also â‰¥â‚¦50,000) â€” so one-off spikes do not keep alerting after expenses return to normal."
      >
        {insights.signals.length ? (
          <ul className="space-y-2">
            {insights.signals.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900">{s.title}</p>
                  <p className="text-ui-xs text-slate-600 mt-0.5">{s.detail}</p>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-ui-xs font-bold uppercase text-slate-700 hover:border-zarewa-teal hover:text-zarewa-teal"
                  onClick={() =>
                    openDrill({
                      title: s.title,
                      category: s.category,
                      payee: s.payee,
                    })
                  }
                >
                  View expenses
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyNote text="No material spikes or recurring-vendor flags for this period." />
        )}
      </PanelShell>

      <ManagerSpendMachinesPanel
        branchId={branchId}
        filterBranchId={filterBranchId}
        viewAllBranches={viewAllBranches}
        branchNameById={branchNameById}
        branches={branches}
        roleKey={roleKey}
        onOpenWorkOrder={onOpenWorkOrder}
      />

      <ModalFrame
        isOpen={Boolean(drill)}
        onClose={() => setDrill(null)}
        title={drill?.title || 'Expenses detail'}
        description={drill?.subtitle}
        surface="plain"
        showCloseButton={false}>
        <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-black text-zarewa-teal">{drill?.title}</p>
              <p className="text-ui-xs text-slate-500">{drill?.subtitle}</p>
            </div>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-ui-xs font-bold uppercase text-slate-600"
              onClick={() => setDrill(null)}
            >
              Close
            </button>
          </div>
          <div className="max-h-[min(70dvh,560px)] overflow-auto">
            {(drill?.rows || []).length ? (
              <table className="min-w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 text-ui-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-bold">Date</th>
                    <th className="px-3 py-2 font-bold">Category</th>
                    <th className="px-3 py-2 font-bold">Payee</th>
                    <th className="px-3 py-2 font-bold">Status</th>
                    <th className="px-3 py-2 font-bold text-right">Amount</th>
                    <th className="px-3 py-2 font-bold">Ref</th>
                  </tr>
                </thead>
                <tbody>
                  {drill.rows.map((r) => (
                    <tr key={`${r.source}-${r.id}`} className="border-t border-slate-100">
                      <td className="px-3 py-2 tabular-nums text-slate-700">{r.dateIso}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{r.category}</td>
                      <td className="px-3 py-2 text-slate-700">{r.payee}</td>
                      <td className="px-3 py-2 text-slate-600">
                        <span className="font-semibold text-slate-800">{statusLabel(r.status)}</span>
                        {statusSubtitle(r.status) ? (
                          <span className="mt-0.5 block text-ui-xs font-medium text-amber-800">
                            {statusSubtitle(r.status)}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatNgn(r.amountNgn)}</td>
                      <td className="px-3 py-2 text-slate-500">{r.requestId || r.expenseId || r.reference || 'â€”'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyNote text="No matching expense records." />
            )}
          </div>
          <div className="border-t border-slate-100 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-ui-xs text-slate-500">
              {(drill?.rows || []).length} record{(drill?.rows || []).length === 1 ? '' : 's'}
            </p>
            {canOpenPaymentRegister ? (
              <Link
                to="/accounts?tab=disbursements"
                className="text-ui-xs font-bold uppercase text-zarewa-teal hover:underline"
              >
                Full Payouts & expenses →
              </Link>
            ) : (
              <p className="text-ui-xs text-slate-500">Payouts & expenses stay on the Finance desk.</p>
            )}
          </div>
        </div>
      </ModalFrame>
    </div>
  );
}
