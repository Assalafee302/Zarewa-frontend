import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  DollarSign,
  PencilLine,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Users,
} from 'lucide-react';
import { Card, Button } from '../ui';
import { CreditExceptionPanel } from '../finance/CreditExceptionPanel';
import { HrDailyRollPanel } from '../hr/HrDailyRollPanel';

const inboxRowBase =
  'group w-full text-left flex items-center gap-2 sm:gap-3 px-3 py-2.5 border-b border-slate-100 last:border-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset';

function fallbackMoney(value) {
  const num = Number(value) || 0;
  return `NGN ${num.toLocaleString()}`;
}

function fallbackPersonName(value) {
  const v = String(value || '').trim();
  return v || '—';
}

export function BranchManagerCommandInbox(props) {
  const fromBm = props?.bm && typeof props.bm === 'object' ? props.bm : {};
  const merged = { ...fromBm, ...props };

  const {
    managerInboxTabs = [],
    activeTab = 'attention',
    setActiveTab,
    attentionFilter = 'all',
    setAttentionFilter,
    tabCounts = {},
    tabMeta,
    inboxSearch = '',
    setInboxSearch,
    loading = false,
    filteredInboxRows = [],
    MANAGER_ATTENTION_FILTERS = [],
    attentionItems = [],
    filterAttentionItems = (items) => items,
    selectedIntel,
    decisionBusy = false,
    canManagerClearance = false,
    handleClearAllClearance,
    openQuotationIntel,
    openAttentionItem,
    openMaterialIncidentIntel,
    openPurchaseOrderIntel,
    openGovernanceIntel,
    openEditApprovalIntel,
    handleApproveEditApproval,
    formatPersonName,
    formatRefundReasonCategory,
    formatNgn,
    canApprovePaymentRequests = true,
    ws,
  } = merged;

  const asMoney = typeof formatNgn === 'function' ? formatNgn : fallbackMoney;
  const asPersonName = typeof formatPersonName === 'function' ? formatPersonName : fallbackPersonName;
  const asRefundReason =
    typeof formatRefundReasonCategory === 'function'
      ? formatRefundReasonCategory
      : (raw) => String(raw || '—').trim() || '—';

  const renderAttentionInboxRow = (it) => {
    const reasons = Array.isArray(it?.reasons) ? it.reasons : [];
    if (it?.kind === 'edit_approvals') {
      const e = it.row || it || {};
      return (
        <div key={it.id} className={`${inboxRowBase} hover:bg-slate-50/80`}>
          <span className="shrink-0 rounded-md bg-violet-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-violet-900">
            edit
          </span>
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-800">
            {e.entityKind || 'record'} · <span className="font-mono">{e.entityId || '—'}</span>
            {' · '}
            {asPersonName(e.requestedByDisplay || e.requestedByUserId || e.requestedBy || '—')}
          </span>
          <button
            type="button"
            className="shrink-0 rounded-lg bg-[#134e4a] px-3 py-1.5 text-[10px] font-black uppercase text-white hover:brightness-105"
            onClick={() => openEditApprovalIntel?.(e)}
          >
            Review
          </button>
        </div>
      );
    }
    return (
      <button
        key={it.id}
        type="button"
        onClick={() => openAttentionItem?.(it)}
        className={`${inboxRowBase} hover:bg-violet-50/50 focus-visible:ring-violet-300/40`}
      >
        <span
          className={`shrink-0 rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase ${
            it.kind === 'flagged' || it.kind === 'governance'
              ? 'bg-rose-100 text-rose-900'
              : 'bg-violet-100 text-violet-900'
          }`}
        >
          {it.kind}
        </span>
        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-800">
          <span className="font-mono font-bold text-[#134e4a]">{it.title}</span>
          {' · '}
          {it.subtitle}
        </span>
        {it.amountNgn != null ? (
          <span className="shrink-0 text-[10px] font-bold tabular-nums text-slate-700">{asMoney(it.amountNgn)}</span>
        ) : null}
        <span className="hidden lg:inline shrink-0 max-w-[8rem] truncate text-[9px] text-slate-500">{reasons[0] || ''}</span>
        <ChevronRight size={14} className="shrink-0 text-slate-300" />
      </button>
    );
  };

  const renderInboxRow = (row) => {
    if (activeTab === 'attention') return renderAttentionInboxRow(row);

    if (activeTab === 'orders') {
      if (row._inboxKind === 'flagged') {
        return (
          <button
            key={row._rowKey}
            type="button"
            onClick={() => openQuotationIntel?.(row.id, row, { reviewContext: 'flagged' })}
            className={`${inboxRowBase} hover:bg-rose-50/50 focus-visible:ring-rose-300/40 ${
              selectedIntel?.kind === 'quotation' && selectedIntel.quoteId === row.id ? 'bg-rose-50/70' : ''
            }`}
          >
            <span className="shrink-0 rounded-md bg-rose-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-rose-900">
              flagged
            </span>
            <span className="shrink-0 text-xs font-bold text-rose-900">{row.id}</span>
            <span className="min-w-0 flex-1 truncate text-[11px] text-slate-700">
              <span className="font-semibold">{asPersonName(row.customer_name)}</span>
              {' · '}
              <span className="text-rose-800/90">{row.manager_flag_reason || 'Awaiting audit review.'}</span>
            </span>
            <AlertTriangle size={14} className="shrink-0 text-rose-500" />
          </button>
        );
      }

      if (row._inboxKind === 'production') {
        const qref = row.quotation_ref;
        return (
          <button
            key={row._rowKey}
            type="button"
            onClick={() =>
              openQuotationIntel?.(
                qref,
                { id: qref, customer_name: row.customer_name },
                { cuttingListId: row.id, fromProductionGate: true }
              )
            }
            className={`${inboxRowBase} hover:bg-amber-50/60 focus-visible:ring-amber-400/30 ${
              selectedIntel?.kind === 'quotation' && selectedIntel.quoteId === qref ? 'bg-amber-50/80' : ''
            }`}
          >
            <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-900">
              gate
            </span>
            <span className="shrink-0 text-xs font-mono font-bold text-slate-600">{row.id}</span>
            <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-700">
              <span className="font-bold text-[#134e4a]">{qref}</span>
              {' · '}
              {asPersonName(row.customer_name)}
            </span>
            <span className="shrink-0 text-[10px] text-slate-500 tabular-nums whitespace-nowrap">
              {asMoney(row.paid_ngn)} / {asMoney(row.total_ngn)}
            </span>
            <ChevronRight size={14} className="shrink-0 text-slate-300 group-hover:text-amber-700" />
          </button>
        );
      }

      return (
        <button
          key={row._rowKey}
          type="button"
          onClick={() => openQuotationIntel?.(row.id, row)}
          className={`${inboxRowBase} hover:bg-teal-50/60 focus-visible:ring-[#134e4a]/25 ${
            selectedIntel?.kind === 'quotation' && selectedIntel.quoteId === row.id ? 'bg-teal-50/80' : ''
          }`}
        >
          <span className="shrink-0 rounded-md bg-teal-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-teal-900">
            sign-off
          </span>
          <span className="shrink-0 text-xs font-bold text-[#134e4a] tabular-nums">{row.id}</span>
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-700">
            {asPersonName(row.customer_name)}
          </span>
          <span className="shrink-0 text-[10px] font-semibold text-slate-600 tabular-nums whitespace-nowrap">
            {asMoney(row.paid_ngn)} / {asMoney(row.total_ngn)}
          </span>
          <ChevronRight size={14} className="shrink-0 text-slate-300 group-hover:text-[#134e4a]" />
        </button>
      );
    }

    if (activeTab === 'cash_out') {
      if (row._inboxKind === 'payment') {
        return (
          <button
            key={row._rowKey}
            type="button"
            onClick={() => openAttentionItem?.({ kind: 'payments', requestId: row.request_id, row: { ...row } })}
            className={`${inboxRowBase} hover:bg-slate-50/80 focus-visible:ring-slate-300/50 ${
              selectedIntel?.kind === 'payment' && selectedIntel.requestId === row.request_id ? 'bg-slate-100/90' : ''
            }`}
          >
            <span className="shrink-0 rounded-md bg-slate-200 px-1.5 py-0.5 text-[8px] font-black uppercase text-slate-800">
              expense
            </span>
            <span className="shrink-0 text-xs font-bold text-slate-800">{row.request_id}</span>
            <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-600">{row.description}</span>
            {!canApprovePaymentRequests ? (
              <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-900">
                Finance desk
              </span>
            ) : null}
            <span className="shrink-0 text-[10px] font-bold text-rose-700 tabular-nums whitespace-nowrap">
              {asMoney(row.amount_requested_ngn)}
            </span>
            <ChevronRight size={14} className="shrink-0 text-slate-300 group-hover:text-slate-600" />
          </button>
        );
      }

      return (
        <button
          key={row._rowKey}
          type="button"
          onClick={() => openAttentionItem?.({ kind: 'refunds', refundId: row.refund_id, row: { ...row } })}
          className={`${inboxRowBase} hover:bg-amber-50/50 focus-visible:ring-amber-300/40 ${
            selectedIntel?.kind === 'refund' && selectedIntel.refundId === row.refund_id ? 'bg-amber-50/80' : ''
          }`}
        >
          <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-900">
            refund
          </span>
          <span className="shrink-0 text-xs font-mono font-bold text-slate-800">{row.refund_id}</span>
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-700">
            {asPersonName(row.customer_name)}
            {' · '}
            <span className="font-normal text-slate-500">
              {row.quotation_ref} · {asRefundReason(row.reason_category)}
            </span>
          </span>
          <span className="shrink-0 text-[10px] font-bold text-amber-700 tabular-nums whitespace-nowrap">
            {asMoney(row.amount_ngn)}
          </span>
          <ChevronRight size={14} className="shrink-0 text-slate-300 group-hover:text-amber-700" />
        </button>
      );
    }

    if (activeTab === 'qc') {
      const alert = String(row.conversion_alert_state || '');
      return (
        <button
          key={row.job_id}
          type="button"
          onClick={() => openAttentionItem?.({ kind: 'conversions', jobId: row.job_id, row: { ...row } })}
          className={`${inboxRowBase} hover:bg-violet-50/60 focus-visible:ring-violet-300/40 ${
            selectedIntel?.kind === 'conversion' && selectedIntel.jobId === row.job_id ? 'bg-violet-50/80' : ''
          }`}
        >
          <span className="shrink-0 text-[10px] font-mono font-bold text-slate-700">{row.job_id}</span>
          <span className="min-w-0 flex-1 truncate text-[11px] text-slate-700">
            <span className="font-bold text-[#134e4a]">{row.quotation_ref || '—'}</span>
            {' · '}
            <span className="font-semibold">{asPersonName(row.customer_name)}</span>
            {row.product_name ? (
              <>
                {' · '}
                <span className="text-slate-500">{row.product_name}</span>
              </>
            ) : null}
          </span>
          <span
            className={`shrink-0 text-[9px] font-black uppercase px-2 py-0.5 rounded-md whitespace-nowrap ${
              alert === 'High'
                ? 'bg-rose-100 text-rose-800'
                : alert === 'Low'
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-slate-100 text-slate-600'
            }`}
          >
            {alert || 'Review'}
          </span>
          <span className="shrink-0 text-[10px] text-slate-500 tabular-nums whitespace-nowrap hidden sm:inline">
            {row.actual_meters != null ? `${Number(row.actual_meters).toLocaleString()} m` : '—'}
          </span>
          <ChevronRight size={14} className="shrink-0 text-slate-300 group-hover:text-violet-700" />
        </button>
      );
    }

    if (activeTab === 'material') {
      return (
        <button
          key={row.id}
          type="button"
          onClick={() => openMaterialIncidentIntel?.(row)}
          className={`${inboxRowBase} hover:bg-teal-50/60 focus-visible:ring-[#134e4a]/25`}
        >
          <span className="shrink-0 rounded-md bg-teal-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-teal-900">
            material
          </span>
          <span className="shrink-0 text-xs font-mono font-bold text-[#134e4a]">{row.id}</span>
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-700">
            {String(row.incident_type || '').replace(/_/g, ' ')}
            {' · '}
            {row.gauge_label} {row.colour}
            {' · '}
            <span className="font-bold tabular-nums">{Number(row.total_meters || 0).toFixed(1)} m</span>
          </span>
          <ChevronRight size={14} className="shrink-0 text-slate-300 group-hover:text-[#134e4a]" />
        </button>
      );
    }

    if (activeTab === 'procurement') {
      return (
        <button
          key={row._rowKey || row.po_id}
          type="button"
          onClick={() => openPurchaseOrderIntel?.(row)}
          className={`${inboxRowBase} hover:bg-indigo-50/50 focus-visible:ring-indigo-300/40 ${
            selectedIntel?.kind === 'purchase_order' && selectedIntel.poId === row.po_id ? 'bg-indigo-50/80' : ''
          }`}
        >
          <span className="shrink-0 rounded-md bg-indigo-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-indigo-900">
            PO
          </span>
          <span className="shrink-0 text-xs font-mono font-bold text-[#134e4a]">{row.po_id}</span>
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-700">
            {row.supplier_name || 'Supplier pending'}
            {row.line_count != null ? (
              <>
                {' · '}
                <span className="text-slate-500">{row.line_count} line{row.line_count === 1 ? '' : 's'}</span>
              </>
            ) : null}
          </span>
          <span className="shrink-0 text-[10px] font-bold text-indigo-800 tabular-nums whitespace-nowrap">
            {asMoney(row.total_ngn)}
          </span>
          <ChevronRight size={14} className="shrink-0 text-slate-300 group-hover:text-indigo-700" />
        </button>
      );
    }

    if (activeTab === 'governance') {
      return (
        <button
          key={row._rowKey || row.id}
          type="button"
          onClick={() => openGovernanceIntel?.(row)}
          className={`${inboxRowBase} hover:bg-rose-50/50 focus-visible:ring-rose-300/40`}
        >
          <span className="shrink-0 rounded-md bg-rose-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-rose-900">
            governance
          </span>
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-800">
            <span className="font-mono font-bold text-[#134e4a]">{row.title || row.id}</span>
            {' · '}
            {row.subtitle || 'Requires management review'}
          </span>
          {row.amountNgn != null ? (
            <span className="shrink-0 text-[10px] font-bold tabular-nums text-rose-700">{asMoney(row.amountNgn)}</span>
          ) : null}
          <ChevronRight size={14} className="shrink-0 text-slate-300 group-hover:text-rose-700" />
        </button>
      );
    }

    if (activeTab === 'edits') {
      const e = row || {};
      return (
        <div key={row._rowKey || row.id} className={`${inboxRowBase} hover:bg-violet-50/40`}>
          <span className="shrink-0 rounded-md bg-violet-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-violet-900">
            edit
          </span>
          <span className="min-w-0 flex-1 truncate text-[11px] text-slate-700">
            <span className="font-semibold">{e.entityKind || 'record'}</span>
            {' · '}
            <span className="font-mono font-bold text-[#134e4a]">{e.entityId || '—'}</span>
            {' · '}
            <span className="text-slate-500">{asPersonName(e.requestedByDisplay || e.requestedByUserId || e.requestedBy)}</span>
          </span>
          <button
            type="button"
            onClick={() => openEditApprovalIntel?.(e)}
            className="shrink-0 rounded-lg bg-[#134e4a] px-3 py-1.5 text-[10px] font-black uppercase text-white hover:brightness-105"
          >
            Review
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <Card className="overflow-hidden border-slate-200/90 shadow-sm">
      <div className="sticky top-0 z-20 p-4 border-b border-slate-100 bg-slate-50/95 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2 className="text-sm font-black text-[#134e4a] tracking-tight flex items-center gap-2">
              <ShieldCheck size={18} className="text-teal-600 shrink-0" />
              Command inbox
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">{tabMeta?.description}</p>
          </div>
          <motion.div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:items-center">
            {activeTab === 'orders' && canManagerClearance && filteredInboxRows.some((r) => r._inboxKind === 'clearance') ? (
              <Button
                type="button"
                size="sm"
                disabled={decisionBusy || loading}
                onClick={() => void handleClearAllClearance?.()}
                className="shrink-0 w-full sm:w-auto"
              >
                <CheckCircle2 size={14} />
                Clear all paid
              </Button>
            ) : null}
            {activeTab !== 'attendance' && activeTab !== 'credit' ? (
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={inboxSearch}
                  onChange={(e) => setInboxSearch?.(e.target.value)}
                  placeholder="Filter this queue…"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[#134e4a]/15"
                />
              </div>
            ) : null}
          </motion.div>
        </div>

        <div className="flex gap-1 mt-4 overflow-x-auto pb-1 -mx-1 px-1 custom-scrollbar">
          {managerInboxTabs.map((t) => {
            const active = activeTab === t.key;
            const count = tabCounts[t.key] ?? 0;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setActiveTab?.(t.key);
                  if (t.key !== 'attention') setAttentionFilter?.('all');
                }}
                className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-colors border ${
                  active
                    ? 'bg-[#134e4a] text-white border-[#134e4a] shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {t.label}
                <span className={`tabular-nums px-1.5 py-0.5 rounded-md text-[9px] ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-700'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {activeTab === 'attention' ? (
          <div className="flex gap-1 mt-3 overflow-x-auto pb-1 -mx-1 px-1 custom-scrollbar" role="group" aria-label="Everything filters">
            {MANAGER_ATTENTION_FILTERS.map((f) => {
              const active = attentionFilter === f.key;
              const count = f.key === 'all' ? attentionItems.length : filterAttentionItems(attentionItems, f.key).length;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setAttentionFilter?.(f.key)}
                  className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wide border transition-colors ${
                    active
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-violet-200 hover:text-violet-800'
                  }`}
                >
                  {f.label}
                  <span className={`ml-1 tabular-nums ${active ? 'text-violet-100' : 'text-slate-400'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div
        className={
          activeTab === 'attendance' || activeTab === 'credit'
            ? 'p-4 sm:p-5'
            : 'min-h-[420px] max-h-[min(56vh,560px)] overflow-y-auto custom-scrollbar'
        }
      >
        {activeTab === 'attendance' ? (
          <HrDailyRollPanel branchManagerMode />
        ) : activeTab === 'credit' ? (
          <CreditExceptionPanel
            branchId={ws?.workspaceBranchId || ws?.session?.branchId || null}
            roleKey={ws?.session?.user?.roleKey}
          />
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
            <RefreshCw size={28} className="animate-spin text-[#134e4a]" />
            <p className="text-xs font-bold uppercase tracking-widest">Loading queues</p>
          </div>
        ) : filteredInboxRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center text-slate-400">
            {activeTab === 'orders' ? (
              <CheckCircle2 size={36} className="opacity-25 mb-3 text-teal-600" />
            ) : activeTab === 'cash_out' ? (
              <DollarSign size={36} className="opacity-25 mb-3 text-amber-600" />
            ) : activeTab === 'qc' ? (
              <BarChart3 size={36} className="opacity-25 mb-3 text-violet-600" />
            ) : activeTab === 'material' ? (
              <ClipboardList size={36} className="opacity-25 mb-3 text-teal-600" />
            ) : activeTab === 'procurement' ? (
              <ShoppingCart size={36} className="opacity-25 mb-3 text-indigo-600" />
            ) : activeTab === 'governance' ? (
              <AlertTriangle size={36} className="opacity-25 mb-3 text-rose-600" />
            ) : activeTab === 'edits' ? (
              <PencilLine size={36} className="opacity-25 mb-3 text-violet-600" />
            ) : activeTab === 'attendance' ? (
              <Users size={36} className="opacity-25 mb-3 text-teal-600" />
            ) : (
              <Sparkles size={36} className="opacity-25 mb-3 text-violet-500" />
            )}
            <p className="text-sm font-bold text-slate-600">Nothing in this queue</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              {inboxSearch.trim() ? 'Try clearing the search filter.' : 'When new items arrive, they will appear here.'}
            </p>
          </div>
        ) : (
          <div>{filteredInboxRows.map((row) => renderInboxRow(row))}</div>
        )}
      </div>
    </Card>
  );
}
