import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserCircle, TrendingUp, Ruler, Moon, Trash2 } from 'lucide-react';
import {
  SalesListTableFrame,
  SalesListSearchInput,
  SalesListSortBar,
} from './SalesListTableFrame';
import { useCustomers } from '../../context/CustomersContext';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formatNgn } from '../../Data/mockData';
import { appConfirm } from '../../lib/appConfirm';
import { customerPickerSearchBlob } from '../../lib/customerPickerSearch';
import {
  customerInitials,
} from '../customers/customerUi';
import { CustomerStatusChip, CustomerTierChip } from '../customers/CustomerStatusChip';

const TODAY_ISO = new Date().toISOString().slice(0, 10);
const INSIGHT_DAYS = 90;

/** Match quotation row chrome; padding lives on the link / actions so the whole row is clickable */
const CARD_ROW =
  'rounded-xl border border-slate-200/70 bg-white shadow-sm transition-all hover:border-teal-200/80 hover:shadow-md';

function parseMeters(totalStr) {
  const m = String(totalStr ?? '').match(/([\d.]+)\s*m/i);
  return m ? parseFloat(m[1], 10) : 0;
}

function insightCutoffISO() {
  const d = new Date(TODAY_ISO);
  d.setDate(d.getDate() - INSIGHT_DAYS);
  return d.toISOString().slice(0, 10);
}

function lastTouchISO(customerID, quotations, receipts, cuttingLists) {
  let max = '';
  const bump = (iso) => {
    if (iso && iso > max) max = iso;
  };
  quotations.forEach((q) => {
    if (q.customerID === customerID) bump(q.dateISO);
  });
  receipts.forEach((r) => {
    if (r.customerID === customerID) bump(r.dateISO);
  });
  cuttingLists.forEach((cl) => {
    if (cl.customerID === customerID) bump(cl.dateISO);
  });
  return max;
}

/**
 * Customers workspace embedded in Sales (Customers tab).
 * @param {{ searchQuery: string; onSearchChange: (q: string) => void; createdByLabel?: string; quotations?: object[]; receipts?: object[]; cuttingLists?: object[] }} props
 */
const CUSTOMER_SORT_FIELDS = [
  { id: 'name', label: 'Name' },
  { id: 'customerID', label: 'Customer ID' },
  { id: 'tier', label: 'Tier' },
  { id: 'phoneNumber', label: 'Phone' },
  { id: 'revenue', label: 'Total revenue' },
];

export default function SalesCustomersTab({
  searchQuery,
  onSearchChange = () => {},
  // eslint-disable-next-line no-unused-vars
  createdByLabel = 'Sales',
  quotations = [],
  receipts = [],
  cuttingLists = [],
}) {
  const [sortField, setSortField] = useState('customerID');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const { customers, deleteCustomer } = useCustomers();
  const { show: showToast } = useToast();
  const ws = useWorkspace();
  const canDeleteCustomer = Boolean(ws?.hasPermission?.('sales.manage') && ws?.canMutate);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleDeleteCustomer = async (c) => {
    if (!(await appConfirm({
      title: 'Delete',
      message: `Delete ${c.name} (${c.customerID})? This cannot be undone.`,
      variant: 'danger',
    }))) return;
    setDeleteBusy(true);
    try {
      await deleteCustomer(c.customerID);
      showToast('Customer deleted.');
    } catch (e) {
      showToast(e?.message || 'Could not delete customer.', { variant: 'error' });
    } finally {
      setDeleteBusy(false);
    }
  };

  /** Calculate total spend per customer for sorting */
  const customerRevenue = useMemo(() => {
    const rev = new Map();
    quotations.forEach(q => {
      if (!q.customerID) return;
      rev.set(q.customerID, (rev.get(q.customerID) || 0) + (q.totalNgn || 0));
    });
    return rev;
  }, [quotations]);

  const sortedAndFiltered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = q
      ? customers.filter((c) => customerPickerSearchBlob(c).includes(q))
      : [...customers];

    list.sort((a, b) => {
      let valA, valB;
      if (sortField === 'revenue') {
        valA = customerRevenue.get(a.customerID) || 0;
        valB = customerRevenue.get(b.customerID) || 0;
      } else if (sortField === 'customerID') {
        valA = String(a.customerID || '');
        valB = String(b.customerID || '');
      } else {
        valA = String(a[sortField] || '').toLowerCase();
        valB = String(b[sortField] || '').toLowerCase();
      }

      if (sortField === 'customerID') {
        const cmp = valA.localeCompare(valB, undefined, { sensitivity: 'base', numeric: true });
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [customers, searchQuery, sortField, sortOrder, customerRevenue]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedAndFiltered.slice(start, start + itemsPerPage);
  }, [sortedAndFiltered, currentPage]);

  const totalPages = Math.ceil(sortedAndFiltered.length / itemsPerPage);

  const insights = useMemo(() => {
    const ciso = insightCutoffISO();
    const byCustomer = new Map();
    quotations.forEach((q) => {
      if (!q.customerID || !q.dateISO || q.dateISO < ciso) return;
      const cur = byCustomer.get(q.customerID) || { spend: 0, meters: 0 };
      cur.spend += q.totalNgn || 0;
      byCustomer.set(q.customerID, cur);
    });
    cuttingLists.forEach((cl) => {
      if (!cl.customerID || !cl.dateISO || cl.dateISO < ciso) return;
      const cur = byCustomer.get(cl.customerID) || { spend: 0, meters: 0 };
      cur.meters += parseMeters(cl.total);
      byCustomer.set(cl.customerID, cur);
    });

    const nameOf = (id) => customers.find((c) => c.customerID === id)?.name ?? id;

    const topSpend = [...byCustomer.entries()]
      .filter(([, v]) => v.spend > 0)
      .sort((a, b) => b[1].spend - a[1].spend)
      .slice(0, 3)
      .map(([id, v]) => ({ id, name: nameOf(id), spend: v.spend }));

    const topMeters = [...byCustomer.entries()]
      .filter(([, v]) => v.meters > 0)
      .sort((a, b) => b[1].meters - a[1].meters)
      .slice(0, 3)
      .map(([id, v]) => ({ id, name: nameOf(id), meters: v.meters }));

    const inactive = customers.filter((c) => {
      const touch = lastTouchISO(c.customerID, quotations, receipts, cuttingLists) || c.lastActivityISO || c.createdAtISO || '';
      return touch && touch < ciso;
    });

    return { topSpend, topMeters, inactive, ciso };
  }, [customers, cuttingLists, quotations, receipts]);

  return (
    <>
      <div className="grid w-full min-w-0 grid-cols-1 gap-6 items-start lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        {/* Intelligence Sidebar on Left */}
        <aside className="space-y-5 sticky top-4 min-w-0">
          <div className="rounded-xl border border-teal-100 bg-white p-5 space-y-6 shadow-sm overflow-hidden">
            <div className="h-1 bg-teal-600 -mx-5 -mt-5 mb-4" />
            <div>
              <p className="text-ui-xs font-black text-teal-600 uppercase tracking-widest mb-1">Network Intel</p>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-tight">Last {INSIGHT_DAYS} Days</h4>
            </div>

            <div className="space-y-6">
              <section>
                <p className="text-ui-xs font-black text-slate-400 uppercase flex items-center gap-2 mb-3 tracking-widest">
                  <TrendingUp size={14} className="text-teal-500" /> Revenue
                </p>
                {insights.topSpend.length === 0 ? (
                  <p className="text-ui-xs text-slate-300 italic">No activity</p>
                ) : (
                  <ul className="space-y-2">
                    {insights.topSpend.map(r => (
                      <li key={r.id} className="min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">{r.name}</p>
                        <p className="text-ui-xs font-black text-teal-600 tabular-nums">{formatNgn(r.spend)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <p className="text-ui-xs font-black text-slate-400 uppercase flex items-center gap-2 mb-3 tracking-widest">
                  <Ruler size={14} className="text-amber-500" /> Metres
                </p>
                {insights.topMeters.length === 0 ? (
                  <p className="text-ui-xs text-slate-300 italic">No volume</p>
                ) : (
                  <ul className="space-y-2">
                    {insights.topMeters.map(r => (
                      <li key={r.id} className="min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">{r.name}</p>
                        <p className="text-ui-xs font-black text-amber-600 tabular-nums">{r.meters.toLocaleString()} m</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="pt-4 border-t border-slate-50">
                <p className="text-ui-xs font-black text-slate-400 uppercase flex items-center gap-2 mb-2 tracking-widest">
                  <Moon size={14} className="text-sky-500" /> Reactivation
                </p>
                <p className="text-ui-xs font-bold text-slate-500 leading-tight">
                  <span className="text-rose-600">{insights.inactive.length} accounts</span> quiet since {insights.ciso}.
                </p>
              </section>
            </div>
          </div>

        </aside>

        {/* Main Customer List on Right */}
        <div className="min-w-0 space-y-4">
          <SalesListTableFrame
            toolbar={
              <>
                <SalesListSearchInput
                  value={searchQuery}
                  onChange={onSearchChange}
                  placeholder="Search name, phone, staff ID, tier, notes…"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <SalesListSortBar
                    fields={CUSTOMER_SORT_FIELDS}
                    field={sortField}
                    dir={sortOrder}
                    onFieldChange={setSortField}
                    onDirToggle={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
                  />
                  <p className="text-xs font-bold text-slate-400 tabular-nums shrink-0">
                    Showing {paginated.length} of {sortedAndFiltered.length}
                  </p>
                </div>
              </>
            }
          >
            {paginated.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-14 px-6 text-center">
                <UserCircle size={40} className="mx-auto text-slate-200 mb-3" strokeWidth={1.5} />
                <p className="text-ui-xs font-semibold text-slate-500 uppercase tracking-widest">No matching customers</p>
              </div>
            ) : (
              <ul className="space-y-1.5">
              {paginated.map((c) => {
                const rev = customerRevenue.get(c.customerID) || 0;
                const meta2 = [c.phoneNumber || 'No phone', c.email || 'No email'].join(' · ');
                const profileTo = `/customers/${encodeURIComponent(c.customerID)}`;
                return (
                  <li key={c.customerID} className={`${CARD_ROW} flex flex-nowrap items-stretch min-w-0 overflow-hidden`}>
                    <Link
                      to={profileTo}
                      className="min-w-0 flex-1 flex items-center gap-3 px-3 py-3 text-inherit no-underline outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zarewa-teal/25"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-zarewa-teal to-teal-700 text-xs font-black text-teal-100">
                        {customerInitials(c.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 min-w-0">
                          <p className="text-sm font-bold text-zarewa-teal truncate min-w-0">
                            {c.name}
                          </p>
                          <span className="text-sm font-black text-zarewa-teal tabular-nums shrink-0">
                            {formatNgn(rev)}
                          </span>
                        </div>
                        <p className="text-ui-xs text-slate-500 mt-0.5 truncate tabular-nums font-mono">
                          {c.customerID}
                        </p>
                        <p className="text-ui-xs text-slate-500 mt-1 leading-snug line-clamp-1" title={meta2}>
                          {meta2}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <CustomerStatusChip status={c.status} />
                          <CustomerTierChip tier={c.tier} />
                        </div>
                      </div>
                    </Link>
                    {canDeleteCustomer ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteCustomer(c);
                        }}
                        disabled={deleteBusy}
                        className="shrink-0 self-stretch px-2.5 py-1.5 flex items-center border-l border-slate-200/60 text-slate-300 hover:text-rose-600 hover:bg-rose-50/80 transition-colors disabled:opacity-40"
                        title="Delete customer"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : null}
                  </li>
                );
              })}
              </ul>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="px-3 py-1 rounded-lg border border-slate-200 text-ui-xs font-black uppercase text-zarewa-teal disabled:opacity-30"
                >
                  Prev
                </button>
                <span className="text-xs font-black text-zarewa-teal tabular-nums mx-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="px-3 py-1 rounded-lg border border-slate-200 text-ui-xs font-black uppercase text-zarewa-teal disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            )}
          </SalesListTableFrame>
        </div>
      </div>
    </>
  );
}
