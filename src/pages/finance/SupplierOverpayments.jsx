import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  RotateCcw,
  CreditCard,
  Pencil,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  Calendar,
  Check,
  Copy,
  RefreshCw,
  Sparkles,
  ChevronRight,
  X,
  FileText,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useInventory } from '../../context/InventoryContext';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../shared/lib/formatNgn.js';
import { treasuryAccountDisplayName, treasuryAccountsForWorkspace } from '../../lib/treasuryAccountsStore';
import {
  parseNairaInput,
  previewExtraPayment,
  previewPaymentCorrection,
  todayISO,
} from '../../lib/supplierOverpaymentDesk.js';
import { purchaseOrderOrderedValueNgn } from '../../lib/liveAnalytics.js';
import { PoStatusChip } from '../../components/procurement/PoStatusChip.jsx';

const TABS = [
  {
    id: 'pay',
    title: 'Record extra payment',
    hint: 'Second transfer, duplicate payment, or cash above order',
    icon: CreditCard,
  },
  {
    id: 'rev',
    title: 'Record reversal',
    hint: 'Supplier refund or bank recall',
    icon: RotateCcw,
  },
  {
    id: 'edit',
    title: 'Correct a wrong payment',
    hint: 'Restate an amount that left the bank',
    icon: Pencil,
  },
];

function Field({ label, children, hint, required }) {
  return (
    <label className="block space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-ui-xs font-bold uppercase tracking-wider text-slate-500">
          {label} {required ? <span className="text-rose-500">*</span> : null}
        </span>
      </div>
      {children}
      {hint ? <span className="block text-ui-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-zarewa-teal focus:ring-2 focus:ring-teal-100';

function KpiCard({ label, value, detail, tone = 'plain', icon: Icon }) {
  const tones = {
    plain: 'border-slate-200 bg-white text-slate-900',
    good: 'border-emerald-200 bg-emerald-50/60 text-emerald-950',
    due: 'border-amber-200 bg-amber-50/60 text-amber-950',
    excess: 'border-violet-200 bg-violet-50/70 text-violet-950',
  };
  const iconTones = {
    plain: 'text-slate-400 bg-slate-100',
    good: 'text-emerald-700 bg-emerald-100',
    due: 'text-amber-700 bg-amber-100',
    excess: 'text-violet-700 bg-violet-100',
  };
  return (
    <div className={`rounded-2xl border p-4 shadow-sm transition-all ${tones[tone] || tones.plain}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-ui-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
        {Icon ? (
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconTones[tone] || iconTones.plain}`}>
            <Icon size={14} />
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-xl font-black tabular-nums tracking-tight">{value}</p>
      <p className="mt-1 text-ui-xs font-medium text-slate-600 line-clamp-1">{detail}</p>
    </div>
  );
}

/**
 * Second supplier payment, amount correction, and overpayment refund.
 * Rendered natively inside Procurement → Payments.
 * @param {{ initialPoId?: string }} [props]
 */
export function SupplierOverpaymentPanel({ initialPoId = '' }) {
  const ws = useWorkspace();
  const { purchaseOrders } = useInventory();
  const { show: showToast } = useToast();

  const [poId, setPoId] = useState(String(initialPoId || '').trim());
  const [query, setQuery] = useState(String(initialPoId || '').trim());
  const [isSearchingPo, setIsSearchingPo] = useState(!initialPoId);
  const [poFilter, setPoFilter] = useState('all'); // all, excess, paid, open
  const [copiedPo, setCopiedPo] = useState(false);

  const [tab, setTab] = useState('pay');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [position, setPosition] = useState(null);
  const [movements, setMovements] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loadError, setLoadError] = useState('');

  const [payForm, setPayForm] = useState({
    amount: '',
    reason: 'duplicate_payment',
    treasuryAccountId: '',
    dateISO: todayISO(),
    reference: '',
    note: '',
  });

  const [revForm, setRevForm] = useState({
    amount: '',
    reason: 'supplier_refund',
    treasuryAccountId: '',
    dateISO: todayISO(),
    reference: '',
    note: '',
  });

  const [corrections, setCorrections] = useState({});

  const canPost = Boolean(ws?.hasPermission?.('finance.pay') || ws?.hasPermission?.('*'));

  const accounts = useMemo(
    () =>
      treasuryAccountsForWorkspace(ws?.snapshot, ws?.session, {
        payableBranchId: position?.branchId,
      }),
    [ws?.snapshot, ws?.session, position?.branchId]
  );

  // Quick PO Discovery & Filtering
  const enrichedOrders = useMemo(() => {
    const rows = Array.isArray(purchaseOrders) ? purchaseOrders : [];
    return rows.map((po) => {
      const id = String(po.poID || po.poId || '').trim();
      const paid = Number(po.supplierPaidNgn || po.paidNgn || 0);
      const ordered = purchaseOrderOrderedValueNgn(po) || Number(po.totalCostNgn || 0);
      const excess = Math.max(0, paid - ordered);
      const open = paid < ordered;
      return {
        id,
        supplierName: po.supplierName || 'Supplier',
        status: po.status || 'open',
        branchId: po.branchId || '',
        paid,
        ordered,
        excess,
        open,
      };
    });
  }, [purchaseOrders]);

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enrichedOrders
      .filter((po) => {
        if (poFilter === 'excess' && po.excess <= 0) return false;
        if (poFilter === 'paid' && po.open) return false;
        if (poFilter === 'open' && !po.open) return false;
        if (!q) return true;
        return (
          po.id.toLowerCase().includes(q) ||
          po.supplierName.toLowerCase().includes(q) ||
          po.branchId.toLowerCase().includes(q)
        );
      })
      .slice(0, 12);
  }, [enrichedOrders, query, poFilter]);

  const excessOrdersCount = useMemo(
    () => enrichedOrders.filter((po) => po.excess > 0).length,
    [enrichedOrders]
  );

  useEffect(() => {
    const next = String(initialPoId || '').trim();
    if (!next) return;
    setPoId(next);
    setQuery(next);
    setIsSearchingPo(false);
  }, [initialPoId]);

  useEffect(() => {
    if (!accounts.length) return;
    setPayForm((f) => ({ ...f, treasuryAccountId: f.treasuryAccountId || String(accounts[0].id) }));
    setRevForm((f) => ({ ...f, treasuryAccountId: f.treasuryAccountId || String(accounts[0].id) }));
  }, [accounts]);

  const fetchPosition = async (id, isRefresh = false) => {
    if (!id) {
      setPosition(null);
      setMovements([]);
      setPayments([]);
      setLoadError('');
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setLoadError('');

    try {
      const { ok, data } = await apiFetch(`/api/purchase-orders/${encodeURIComponent(id)}/supplier-overpayment`);
      if (!ok || !data?.position) {
        setPosition(null);
        setMovements([]);
        setPayments([]);
        setLoadError(data?.error || 'Purchase order not found.');
        return;
      }
      setPosition(data.position);
      setMovements(Array.isArray(data.movements) ? data.movements : []);
      setPayments(Array.isArray(data.payments) ? data.payments : []);
      setQuery(data.position.poId || id);
      setIsSearchingPo(false);
    } catch {
      setLoadError('Could not load this purchase order.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!poId) return;
    fetchPosition(poId);
  }, [poId]);

  const selectPo = (id) => {
    const next = String(id || '').trim();
    if (!next) return;
    setPoId(next);
    setQuery(next);
    setIsSearchingPo(false);
  };

  const copyPoId = () => {
    if (!position?.poId) return;
    navigator.clipboard?.writeText(position.poId);
    setCopiedPo(true);
    setTimeout(() => setCopiedPo(false), 2000);
  };

  const payPreview = previewExtraPayment({
    stillOwedNgn: position?.stillOwedNgn,
    amountNgn: parseNairaInput(payForm.amount),
  });

  async function postAction(path, body, success) {
    if (!canPost) {
      showToast('Recording these payments requires finance.pay permission.', { variant: 'error' });
      return;
    }
    if (!ws?.canMutate) {
      showToast('Workspace is read-only.', { variant: 'error' });
      return;
    }
    setBusy(true);
    try {
      const { ok, data } = await apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
      if (!ok || data?.ok === false) {
        showToast(data?.error || 'Could not save.', { variant: 'error' });
        return;
      }
      if (data.position) setPosition(data.position);
      if (Array.isArray(data.movements)) setMovements(data.movements);
      if (Array.isArray(data.payments)) setPayments(data.payments);
      else if (poId) {
        await fetchPosition(poId, true);
      }
      showToast(success(data), { variant: 'success' });
    } finally {
      setBusy(false);
    }
  }

  const obligation = Number(position?.obligationNgn) || 0;
  const paid = Number(position?.supplierPaidNgn) || 0;
  const owed = Number(position?.stillOwedNgn) || 0;
  const excess = Number(position?.excessNgn) || 0;

  const percentSettled = obligation > 0 ? Math.min(100, Math.round((paid / obligation) * 100)) : 0;
  const percentExcess = obligation > 0 && excess > 0 ? Math.round((excess / obligation) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Top PO Selector / Header Area */}
      {position && !isSearchingPo ? (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-base font-bold text-zarewa-teal bg-teal-50 border border-teal-100 rounded-lg px-2.5 py-1 flex items-center gap-1.5">
                #{position.poId}
                <button
                  type="button"
                  onClick={copyPoId}
                  title="Copy PO number"
                  className="text-slate-400 hover:text-zarewa-teal transition-colors"
                >
                  {copiedPo ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </button>
              </span>
              <h2 className="text-lg font-black text-slate-900">{position.supplierName || 'Supplier'}</h2>
              <PoStatusChip status={position.status} />
              {position.branchId ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-ui-xs font-semibold text-slate-600">
                  <Building2 size={11} className="text-slate-400" />
                  {position.branchId}
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={() => fetchPosition(position.poId, true)}
                disabled={refreshing}
                title="Refresh balances"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 active:scale-[0.99] disabled:opacity-50"
              >
                <RefreshCw size={13} className={refreshing ? 'animate-spin text-zarewa-teal' : 'text-slate-500'} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => setIsSearchingPo(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50/70 px-3 py-1.5 text-xs font-bold text-zarewa-teal shadow-sm hover:bg-teal-100/70 active:scale-[0.99]"
              >
                <Search size={13} />
                Switch order
              </button>
            </div>
          </div>

          {/* Visual Obligation & Advance Bar */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-2 text-ui-xs">
              <span className="font-semibold text-slate-600">
                Disbursed:{' '}
                <strong className="text-slate-900 tabular-nums">{formatNgn(paid)}</strong> of{' '}
                <strong className="text-slate-700 tabular-nums">{formatNgn(obligation)}</strong>
              </span>
              <span className="font-bold tabular-nums">
                {excess > 0 ? (
                  <span className="text-violet-800 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-md">
                    {percentSettled + percentExcess}% Disbursed · {formatNgn(excess)} Excess Advance
                  </span>
                ) : owed === 0 ? (
                  <span className="text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <CheckCircle2 size={12} /> Settled 100%
                  </span>
                ) : (
                  <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                    {percentSettled}% Paid · {formatNgn(owed)} Outstanding
                  </span>
                )}
              </span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 flex">
              <div
                className="h-full bg-zarewa-teal transition-all duration-500"
                style={{ width: `${percentSettled}%` }}
              />
              {excess > 0 ? (
                <div
                  className="h-full bg-violet-500 transition-all duration-500"
                  style={{ width: `${Math.min(100 - percentSettled, percentExcess)}%` }}
                  title={`Excess advance: ${formatNgn(excess)}`}
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        /* Order Discovery & Search Drawer */
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Search size={16} className="text-zarewa-teal" />
                Select a purchase order to adjust
              </h3>
              <p className="text-ui-xs text-slate-500 mt-0.5">
                Search by PO number, supplier name, or pick from the active orders below.
              </p>
            </div>
            {position ? (
              <button
                type="button"
                onClick={() => setIsSearchingPo(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Cancel"
              >
                <X size={18} />
              </button>
            ) : null}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className={`${inputClass} pl-9 pr-8`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type PO number (e.g. PO-2026-0012) or supplier name…"
                autoFocus={!position}
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => selectPo(query)}
              disabled={!query.trim()}
              className="z-btn-primary rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider shrink-0 disabled:opacity-40"
            >
              Open Order
            </button>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setPoFilter('all')}
              className={`rounded-lg px-2.5 py-1 text-ui-xs font-bold transition-colors ${
                poFilter === 'all'
                  ? 'bg-zarewa-teal text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All orders ({enrichedOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setPoFilter('excess')}
              className={`rounded-lg px-2.5 py-1 text-ui-xs font-bold transition-colors flex items-center gap-1 ${
                poFilter === 'excess'
                  ? 'bg-violet-700 text-white shadow-xs'
                  : 'bg-violet-50 text-violet-800 border border-violet-200 hover:bg-violet-100'
              }`}
            >
              <Sparkles size={11} />
              Excess Held ({excessOrdersCount})
            </button>
            <button
              type="button"
              onClick={() => setPoFilter('paid')}
              className={`rounded-lg px-2.5 py-1 text-ui-xs font-bold transition-colors ${
                poFilter === 'paid'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              Fully Settled
            </button>
            <button
              type="button"
              onClick={() => setPoFilter('open')}
              className={`rounded-lg px-2.5 py-1 text-ui-xs font-bold transition-colors ${
                poFilter === 'open'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              Outstanding
            </button>
          </div>

          {/* Filtered Order Cards */}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-64 overflow-y-auto custom-scrollbar pt-1">
            {filteredOrders.length === 0 ? (
              <div className="col-span-full py-8 text-center text-xs text-slate-500">
                No purchase orders match that query. Type the exact PO number above to load it.
              </div>
            ) : (
              filteredOrders.map((po) => (
                <button
                  key={po.id}
                  type="button"
                  onClick={() => selectPo(po.id)}
                  className={`text-left rounded-xl border p-3 transition-all hover:border-zarewa-teal hover:shadow-sm ${
                    po.id === position?.poId
                      ? 'border-zarewa-teal bg-teal-50/50 ring-1 ring-teal-200'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-xs font-bold text-zarewa-teal">#{po.id}</span>
                    <PoStatusChip status={po.status} />
                  </div>
                  <p className="mt-1 text-xs font-bold text-slate-800 truncate">{po.supplierName}</p>
                  <div className="mt-2 flex items-center justify-between text-ui-xs tabular-nums border-t border-slate-200/60 pt-1.5">
                    <span className="text-slate-500">Obligation: {formatNgn(po.ordered)}</span>
                    {po.excess > 0 ? (
                      <span className="font-bold text-violet-800 bg-violet-100/70 px-1.5 py-0.5 rounded text-ui-2xs">
                        +{formatNgn(po.excess)} Excess
                      </span>
                    ) : (
                      <span className="font-semibold text-slate-700">Paid: {formatNgn(po.paid)}</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <RefreshCw size={20} className="animate-spin text-zarewa-teal" />
          <span className="ml-2.5 text-xs font-bold text-slate-600">Loading purchase order details…</span>
        </div>
      ) : null}

      {loadError ? (
        <div className="flex items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800">
          <AlertCircle size={16} className="shrink-0 text-rose-600" />
          <span>{loadError}</span>
        </div>
      ) : null}

      {position && !loading ? (
        <div className="space-y-4">
          {/* 4 Financial KPI Cards */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Order Obligation"
              value={formatNgn(obligation)}
              detail="Total agreed line value or landed cost"
              icon={Building2}
            />
            <KpiCard
              label="Total Disbursed"
              value={formatNgn(paid)}
              detail="All posted cash that left bank accounts"
              icon={CreditCard}
            />
            <KpiCard
              label="Still Owed"
              value={formatNgn(owed)}
              detail={owed === 0 ? 'Fully settled in full ✓' : 'Remaining balance on order'}
              tone={owed === 0 ? 'good' : 'due'}
              icon={CheckCircle2}
            />
            <KpiCard
              label="Excess Advance"
              value={formatNgn(excess)}
              detail={excess > 0 ? '⚡ Supplier owes this cash back' : 'No unapplied cash held'}
              tone={excess > 0 ? 'excess' : 'plain'}
              icon={RotateCcw}
            />
          </div>

          {/* Action Tabs Header */}
          <div className="grid gap-2 sm:grid-cols-3">
            {TABS.map((item) => {
              const Icon = item.icon;
              const isActive = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`relative flex flex-col items-start rounded-2xl border p-3.5 sm:p-4 text-left transition-all ${
                    isActive
                      ? 'border-zarewa-teal bg-white shadow-sm ring-1 ring-teal-500/20'
                      : 'border-slate-200/90 bg-slate-50/70 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-lg ${
                          isActive ? 'bg-teal-100 text-zarewa-teal' : 'bg-slate-200/70 text-slate-500'
                        }`}
                      >
                        <Icon size={14} />
                      </div>
                      <span className="text-xs font-bold text-slate-900">{item.title}</span>
                    </div>

                    {item.id === 'rev' && excess > 0 ? (
                      <span className="rounded-full bg-violet-600 px-2 py-0.5 text-ui-2xs font-extrabold text-white uppercase tracking-wider animate-pulse">
                        Refundable
                      </span>
                    ) : null}

                    {item.id === 'edit' && payments.length > 0 ? (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-ui-2xs font-bold text-slate-700">
                        {payments.length}
                      </span>
                    ) : null}
                  </div>
                  <span className="mt-1.5 block text-ui-xs text-slate-500 leading-snug">{item.hint}</span>
                </button>
              );
            })}
          </div>

          {!canPost ? (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              <AlertCircle size={15} className="shrink-0 text-amber-700" />
              <span>
                <strong>View-only mode:</strong> You can review this purchase order's position. Posting an extra
                payment, reversal, or correction requires <code>finance.pay</code> permission.
              </span>
            </div>
          ) : null}

          {/* TAB 1: RECORD EXTRA PAYMENT */}
          {tab === 'pay' ? (
            <form
              className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-sm"
              onSubmit={(e) => {
                e.preventDefault();
                const amountNgn = parseNairaInput(payForm.amount);
                if (payPreview.withinInvoice) {
                  showToast('That amount is still within the invoice. Record it as a standard payable payment.', {
                    variant: 'error',
                  });
                  return;
                }
                postAction(
                  `/api/purchase-orders/${encodeURIComponent(position.poId)}/supplier-excess-payment`,
                  {
                    amountNgn,
                    treasuryAccountId: Number(payForm.treasuryAccountId),
                    dateISO: payForm.dateISO,
                    reference: payForm.reference,
                    note: payForm.note,
                    reason: payForm.reason,
                  },
                  (data) =>
                    data.duplicate
                      ? 'That bank reference was already recorded.'
                      : `Successfully recorded ${formatNgn(data.amountNgn)}. ${formatNgn(data.advanceNgn)} is held as excess advance.`
                );
              }}
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <ArrowUpRight size={16} className="text-zarewa-teal" />
                    Record a second payment or advance disbursement
                  </h3>
                  <p className="text-ui-xs text-slate-500 mt-0.5">
                    Use this when cash already left the bank a second time (e.g. duplicate transfer) or when paying
                    above the purchase order value.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Reason for this payment" required>
                  <select
                    className={inputClass}
                    value={payForm.reason}
                    onChange={(e) => setPayForm((f) => ({ ...f, reason: e.target.value }))}
                  >
                    <option value="duplicate_payment">We paid this supplier twice (duplicate bank transfer)</option>
                    <option value="overpayment">One transfer was larger than the order obligation</option>
                  </select>
                </Field>

                <Field
                  label="Amount that left the bank"
                  required
                  hint={
                    parseNairaInput(payForm.amount) > 0 ? (
                      <span className="font-bold text-zarewa-teal tabular-nums">
                        = {formatNgn(parseNairaInput(payForm.amount))}
                      </span>
                    ) : null
                  }
                >
                  <input
                    className={inputClass}
                    inputMode="numeric"
                    placeholder="e.g. 1500000 or 1,500,000"
                    value={payForm.amount}
                    onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
                    required
                  />
                </Field>

                <Field label="Disbursing bank account" required>
                  <select
                    className={inputClass}
                    value={payForm.treasuryAccountId}
                    onChange={(e) => setPayForm((f) => ({ ...f, treasuryAccountId: e.target.value }))}
                    required
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {treasuryAccountDisplayName(a)} · Available: {formatNgn(a.balance)}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Posting date" required>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className={inputClass}
                      value={payForm.dateISO}
                      onChange={(e) => setPayForm((f) => ({ ...f, dateISO: e.target.value }))}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setPayForm((f) => ({ ...f, dateISO: todayISO() }))}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-ui-xs font-bold text-slate-700 hover:bg-slate-50 shrink-0"
                    >
                      Today
                    </button>
                  </div>
                </Field>

                <Field label="Bank reference / session id" required hint="Reference from bank statement or debit alert">
                  <input
                    className={inputClass}
                    minLength={3}
                    placeholder="e.g. NIP/20261002/094829"
                    value={payForm.reference}
                    onChange={(e) => setPayForm((f) => ({ ...f, reference: e.target.value }))}
                    required
                  />
                </Field>

                <Field label="Audit explanation note" required hint="At least 8 characters">
                  <input
                    className={inputClass}
                    minLength={8}
                    placeholder="e.g. Duplicate debit processed on Zenith Bank"
                    value={payForm.note}
                    onChange={(e) => setPayForm((f) => ({ ...f, note: e.target.value }))}
                    required
                  />
                </Field>
              </div>

              {/* Quick Fill Shortcuts */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-ui-2xs font-bold uppercase tracking-wider text-slate-400">Quick fill:</span>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-ui-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                  onClick={() => setPayForm((f) => ({ ...f, amount: String(obligation || '') }))}
                >
                  Full order value ({formatNgn(obligation)})
                </button>
                {owed > 0 ? (
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-ui-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                    onClick={() => setPayForm((f) => ({ ...f, amount: String(owed || '') }))}
                  >
                    Exact balance ({formatNgn(owed)})
                  </button>
                ) : null}
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-ui-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                  onClick={() => setPayForm((f) => ({ ...f, amount: String((owed || 0) + 100_000) }))}
                >
                  Balance + ₦100,000
                </button>
              </div>

              {/* Allocation Simulation Preview */}
              {payPreview.amountNgn > 0 ? (
                <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3.5 space-y-1.5 text-xs text-teal-950">
                  <p className="font-bold flex items-center gap-1.5 text-zarewa-teal">
                    <Sparkles size={14} />
                    How this payment will be booked:
                  </p>
                  {payPreview.withinInvoice ? (
                    <p className="text-amber-800">
                      This amount fits within the remaining purchase order balance. You can record it from the Payables
                      tab directly, or post it here.
                    </p>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-2 pt-1 font-medium">
                      <div className="rounded-lg bg-white/80 p-2 border border-teal-100">
                        <span className="text-ui-xs text-slate-500 block">Settles Order Balance:</span>
                        <span className="font-black text-slate-900 tabular-nums">
                          {formatNgn(payPreview.settlementNgn)}
                        </span>
                        <span className="text-ui-2xs text-slate-400 block mt-0.5">Dr 2000 Trade Payables</span>
                      </div>
                      <div className="rounded-lg bg-white/80 p-2 border border-violet-100">
                        <span className="text-ui-xs text-violet-700 block">Held as Advance:</span>
                        <span className="font-black text-violet-900 tabular-nums">
                          {formatNgn(payPreview.advanceNgn)}
                        </span>
                        <span className="text-ui-2xs text-violet-400 block mt-0.5">Dr 1400 Supplier Prepayments</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={busy || !canPost}
                className="z-btn-primary rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
              >
                {busy ? 'Posting disbursement…' : 'Post extra payment'}
              </button>
            </form>
          ) : null}

          {/* TAB 2: RECORD OVERPAYMENT REVERSAL (REFUND) */}
          {tab === 'rev' ? (
            <form
              className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-sm"
              onSubmit={(e) => {
                e.preventDefault();
                const amountNgn = parseNairaInput(revForm.amount);
                if (amountNgn > excess) {
                  showToast(`Only ${formatNgn(excess)} is currently held as excess above the order.`, {
                    variant: 'error',
                  });
                  return;
                }
                postAction(
                  `/api/purchase-orders/${encodeURIComponent(position.poId)}/supplier-overpayment-reversal`,
                  {
                    amountNgn,
                    treasuryAccountId: Number(revForm.treasuryAccountId),
                    dateISO: revForm.dateISO,
                    reference: revForm.reference,
                    note: revForm.note,
                    reason: revForm.reason,
                  },
                  (data) =>
                    data.duplicate
                      ? 'That bank reference was already recorded.'
                      : `Successfully recorded ${formatNgn(data.amountNgn)} refunded. Supplier paid total is now ${formatNgn(data.position?.supplierPaidNgn)}.`
                );
              }}
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <ArrowDownLeft size={16} className="text-emerald-700" />
                    Record reversal or refund from supplier
                  </h3>
                  <p className="text-ui-xs text-slate-500 mt-0.5">
                    Book cash entering the bank when the supplier transfers back the duplicate payment or when the bank
                    recalls it.
                  </p>
                </div>
              </div>

              {excess <= 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 space-y-2">
                  <p className="font-semibold text-slate-800">No excess balance is held on this purchase order.</p>
                  <p>
                    If cash actually entered the bank, record the extra payment first so the system knows an excess
                    existed, or switch to the <strong>Correct a wrong payment</strong> tab if a payment figure was
                    simply typed incorrectly in the ERP.
                  </p>
                  <button
                    type="button"
                    onClick={() => setTab('edit')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil size={12} />
                    Go to Correct wrong payment
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-3.5 text-xs text-violet-950 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold block text-sm">
                      {formatNgn(excess)} is currently held as excess cash
                    </span>
                    <span className="text-ui-xs text-violet-700">
                      Supplier {position.supplierName} owes this balance back.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRevForm((f) => ({ ...f, amount: String(excess || '') }))}
                    className="rounded-lg bg-violet-700 text-white px-3 py-1.5 text-xs font-bold hover:bg-violet-800 transition-colors shadow-xs"
                  >
                    Fill full {formatNgn(excess)}
                  </button>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Reason for this reversal" required>
                  <select
                    className={inputClass}
                    value={revForm.reason}
                    onChange={(e) => setRevForm((f) => ({ ...f, reason: e.target.value }))}
                  >
                    <option value="supplier_refund">Supplier refunded the overpayment</option>
                    <option value="bank_reversal">Bank recalled / reversed the duplicate payment</option>
                  </select>
                </Field>

                <Field
                  label="Amount received back into bank"
                  required
                  hint={
                    parseNairaInput(revForm.amount) > 0 ? (
                      <span className="font-bold text-emerald-700 tabular-nums">
                        = {formatNgn(parseNairaInput(revForm.amount))}
                      </span>
                    ) : null
                  }
                >
                  <input
                    className={inputClass}
                    inputMode="numeric"
                    placeholder="e.g. 1000000"
                    value={revForm.amount}
                    onChange={(e) => setRevForm((f) => ({ ...f, amount: e.target.value }))}
                    disabled={excess <= 0}
                    required
                  />
                </Field>

                <Field label="Receiving bank account" required>
                  <select
                    className={inputClass}
                    value={revForm.treasuryAccountId}
                    onChange={(e) => setRevForm((f) => ({ ...f, treasuryAccountId: e.target.value }))}
                    disabled={excess <= 0}
                    required
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {treasuryAccountDisplayName(a)} · Current: {formatNgn(a.balance)}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Date received" required>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className={inputClass}
                      value={revForm.dateISO}
                      onChange={(e) => setRevForm((f) => ({ ...f, dateISO: e.target.value }))}
                      disabled={excess <= 0}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setRevForm((f) => ({ ...f, dateISO: todayISO() }))}
                      disabled={excess <= 0}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-ui-xs font-bold text-slate-700 hover:bg-slate-50 shrink-0 disabled:opacity-40"
                    >
                      Today
                    </button>
                  </div>
                </Field>

                <Field label="Bank reference" required hint="Credit alert or session ID">
                  <input
                    className={inputClass}
                    minLength={3}
                    placeholder="e.g. REV/20261002/847291"
                    value={revForm.reference}
                    onChange={(e) => setRevForm((f) => ({ ...f, reference: e.target.value }))}
                    disabled={excess <= 0}
                    required
                  />
                </Field>

                <Field label="Audit explanation note" required hint="At least 8 characters">
                  <input
                    className={inputClass}
                    minLength={8}
                    placeholder="e.g. Inflow received from African Steel Mills refund"
                    value={revForm.note}
                    onChange={(e) => setRevForm((f) => ({ ...f, note: e.target.value }))}
                    disabled={excess <= 0}
                    required
                  />
                </Field>
              </div>

              {parseNairaInput(revForm.amount) > 0 && excess > 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-xs text-emerald-950 space-y-1 font-medium">
                  <p className="font-bold text-emerald-800">Impact after reversal:</p>
                  <p>
                    Supplier paid total will reduce to{' '}
                    <strong>{formatNgn(Math.max(0, paid - parseNairaInput(revForm.amount)))}</strong>.
                  </p>
                  <p>
                    Remaining excess advance will become{' '}
                    <strong>{formatNgn(Math.max(0, excess - parseNairaInput(revForm.amount)))}</strong>.
                  </p>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={busy || !canPost || excess <= 0}
                className="z-btn-primary rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
              >
                {busy ? 'Posting reversal…' : 'Post reversal'}
              </button>
            </form>
          ) : null}

          {/* TAB 3: CORRECT A WRONG PAYMENT */}
          {tab === 'edit' ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Pencil size={16} className="text-zarewa-teal" />
                  Correct a payment entered at the wrong amount
                </h3>
                <p className="text-ui-xs text-slate-500 mt-0.5">
                  If an amount was mistyped into the ERP, select the original payment line below and type the true figure
                  that left the bank. The difference updates the bank balance, order paid total, and accounts payable
                  without deleting history.
                </p>
              </div>

              {payments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                  {paid > 0
                    ? `${formatNgn(paid)} is recorded as paid on this order, but there are no direct bank payment lines eligible for restatement.`
                    : 'No supplier payments have been posted on this order yet.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((row) => {
                    const draft = corrections[row.id] || { amount: String(row.amountPaidNgn || ''), note: '' };
                    const nextVal = parseNairaInput(draft.amount);
                    const delta = nextVal - row.amountPaidNgn;
                    const preview = previewPaymentCorrection({
                      obligationNgn: obligation,
                      supplierPaidNgn: paid,
                      currentLineNgn: row.amountPaidNgn,
                      nextLineNgn: nextVal,
                    });

                    return (
                      <form
                        key={row.id}
                        className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm space-y-4"
                        onSubmit={(e) => {
                          e.preventDefault();
                          postAction(
                            `/api/purchase-orders/${encodeURIComponent(position.poId)}/supplier-payment-correction`,
                            {
                              movementId: row.id,
                              amountNgn: nextVal,
                              note: draft.note,
                            },
                            (data) =>
                              data.noOp
                                ? `That payment is already ${formatNgn(data.amountNgn)}.`
                                : `Payment restated from ${formatNgn(data.previousAmountNgn)} to ${formatNgn(data.amountNgn)}.`
                          );
                        }}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">{row.kindLabel || 'Bank Payment'}</span>
                              <span className="rounded bg-slate-100 px-2 py-0.5 text-ui-2xs font-mono text-slate-600">
                                Line #{row.id}
                              </span>
                            </div>
                            <p className="text-ui-xs text-slate-500">
                              {String(row.postedAtISO || '').slice(0, 10)} · {row.accountName || 'Account'} · Ref:{' '}
                              <span className="font-mono">{row.reference || '—'}</span>
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-ui-xs text-slate-500 block">Currently Recorded</span>
                            <span className="text-base font-black tabular-nums text-slate-900">
                              {formatNgn(row.amountPaidNgn)}
                            </span>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <Field
                            label="Actual amount that left the bank"
                            required
                            hint={
                              nextVal > 0 && delta !== 0 ? (
                                <span className={delta > 0 ? 'text-rose-700 font-bold' : 'text-emerald-700 font-bold'}>
                                  {delta > 0 ? `+${formatNgn(delta)} extra outflow` : `${formatNgn(delta)} restored to bank`}
                                </span>
                              ) : null
                            }
                          >
                            <input
                              className={inputClass}
                              inputMode="numeric"
                              value={draft.amount}
                              onChange={(e) =>
                                setCorrections((prev) => ({
                                  ...prev,
                                  [row.id]: { ...draft, amount: e.target.value },
                                }))
                              }
                              required
                            />
                          </Field>

                          <Field label="Why the figure was wrong" required hint="At least 8 characters">
                            <input
                              className={inputClass}
                              minLength={8}
                              placeholder="e.g. Bank statement debit was ₦1.8M instead of ₦1.5M"
                              value={draft.note}
                              onChange={(e) =>
                                setCorrections((prev) => ({
                                  ...prev,
                                  [row.id]: { ...draft, note: e.target.value },
                                }))
                              }
                              required
                            />
                          </Field>
                        </div>

                        {/* Quick Explanation Presets */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-ui-2xs font-bold uppercase tracking-wider text-slate-400">Presets:</span>
                          <button
                            type="button"
                            onClick={() =>
                              setCorrections((prev) => ({
                                ...prev,
                                [row.id]: { ...draft, note: 'Bank statement debit differed from cashier entry' },
                              }))
                            }
                            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-ui-xs font-semibold text-slate-600 hover:bg-slate-100"
                          >
                            Bank debit differed
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setCorrections((prev) => ({
                                ...prev,
                                [row.id]: { ...draft, note: 'Typographical error when entering amount' },
                              }))
                            }
                            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-ui-xs font-semibold text-slate-600 hover:bg-slate-100"
                          >
                            Typo on amount
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setCorrections((prev) => ({
                                ...prev,
                                [row.id]: { ...draft, note: 'Adjusted for bank fees/withholding deduction' },
                              }))
                            }
                            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-ui-xs font-semibold text-slate-600 hover:bg-slate-100"
                          >
                            Bank fee adjustment
                          </button>
                        </div>

                        {/* Live Impact Box */}
                        {!preview.unchanged && nextVal > 0 ? (
                          <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-xs text-sky-950 font-medium space-y-1">
                            <p className="font-bold text-sky-900">Restatement outcome:</p>
                            <p>
                              Supplier paid total becomes <strong>{formatNgn(preview.nextPaidNgn)}</strong>.
                              {preview.stillOwedNgn > 0 ? (
                                <span> Remaining balance: {formatNgn(preview.stillOwedNgn)}.</span>
                              ) : (
                                <span> Order settled in full.</span>
                              )}
                              {preview.excessNgn > 0 ? (
                                <span className="text-violet-900 font-bold">
                                  {' '}
                                  Excess advance held: {formatNgn(preview.excessNgn)}.
                                </span>
                              ) : null}
                            </p>
                          </div>
                        ) : null}

                        <button
                          type="submit"
                          disabled={busy || !canPost || preview.unchanged}
                          className="z-btn-primary rounded-xl px-5 py-2 text-xs font-bold uppercase tracking-wider disabled:opacity-40"
                        >
                          {busy ? 'Saving correction…' : 'Save corrected amount'}
                        </button>
                      </form>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          {/* Activity / Audit Ledger of Movements */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <FileText size={15} className="text-slate-500" />
                Disbursement &amp; adjustment history on this order
              </h3>
              <span className="text-ui-xs font-bold text-slate-500 tabular-nums">
                {movements.length} record{movements.length === 1 ? '' : 's'}
              </span>
            </div>

            {movements.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-500">
                No extra payments or reversals have been recorded on this screen for this order yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-ui-xs font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-2.5 pr-3">Date</th>
                      <th className="py-2.5 pr-3">Activity</th>
                      <th className="py-2.5 pr-3">Treasury Account</th>
                      <th className="py-2.5 pr-3">Reference</th>
                      <th className="py-2.5 pr-3">Audit Note</th>
                      <th className="py-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {movements.map((row) => {
                      const inbound = Number(row.amountNgn) > 0;
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 pr-3 font-medium text-slate-700 whitespace-nowrap">
                            {String(row.postedAtISO || '').slice(0, 10)}
                          </td>
                          <td className="py-2.5 pr-3 whitespace-nowrap">
                            {inbound ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-ui-2xs font-bold text-emerald-800">
                                <ArrowDownLeft size={11} /> Reversal / Refund
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-ui-2xs font-bold text-rose-800">
                                <ArrowUpRight size={11} /> Extra Disbursement
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 pr-3 text-slate-700">{row.accountName || '—'}</td>
                          <td className="py-2.5 pr-3 font-mono text-ui-xs text-slate-600">{row.reference || '—'}</td>
                          <td className="py-2.5 pr-3 text-slate-600 max-w-xs truncate" title={row.note}>
                            {row.note || '—'}
                          </td>
                          <td
                            className={`py-2.5 text-right font-black tabular-nums whitespace-nowrap ${
                              inbound ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {inbound ? '+' : '−'}
                            {formatNgn(Math.abs(row.amountNgn))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
