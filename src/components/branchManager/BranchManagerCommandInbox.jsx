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
} from 'lucide-react';
import { Button } from '../ui';
import { CreditExceptionPanel } from '../finance/CreditExceptionPanel';
import { ExpenseCategoryLaneBadge } from '../office/ExpenseCategoryLaneBadge.jsx';
import { FinanceSequencePanel } from '../layout';
import {
  MANAGER_STATUS_TONES,
  managerKindTone,
  managerRowAgeHours,
  managerSlaMeta,
} from '../../lib/managerDashboardCore';
import { MANAGER_PAC_TABS } from '../../lib/managerPageTabs';

const inboxRowBase =
  'group w-full text-left flex items-center gap-2 sm:gap-3 px-3 py-2.5 border-b border-slate-100 last:border-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zarewa-teal/25';

function fallbackMoney(value) {
  const num = Number(value) || 0;
  return `NGN ${num.toLocaleString()}`;
}

function fallbackPersonName(value) {
  const v = String(value || '').trim();
  return v || '—';
}

function KindPill({ label, tone = 'pending' }) {
  return (
    <span
      className={`shrink-0 rounded-md border px-1.5 py-0.5 text-ui-xs font-black uppercase ${
        MANAGER_STATUS_TONES[tone] || MANAGER_STATUS_TONES.pending
      }`}
    >
      {label}
    </span>
  );
}

function SlaChip({ kind, row }) {
  const age = managerRowAgeHours(row);
  const meta = managerSlaMeta(kind, age);
  if (!meta) return null;
  return (
    <span
      className={`hidden md:inline shrink-0 rounded-md border px-1.5 py-0.5 text-ui-xs font-bold tabular-nums ${
        MANAGER_STATUS_TONES[meta.tone] || MANAGER_STATUS_TONES.info
      }`}
    >
      {meta.label}
    </span>
  );
}

function pacViewFromActiveTab(activeTab) {
  if (activeTab === 'credit') return 'credit';
  if (activeTab === 'stock') return 'stock';
  return 'attention';
}

/**
 * Priority Action Center — unified approvals queue (attendance moved to My Team).
 */
export function BranchManagerCommandInbox(props) {
  const fromBm = props?.bm && typeof props.bm === 'object' ? props.bm : {};
  const merged = { ...fromBm, ...props };

  const {
    activeTab = 'attention',
    setActiveTab,
    attentionFilter = 'all',
    setAttentionFilter,
    tabCounts = {},
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
    formatPersonName,
    formatRefundReasonCategory,
    formatNgn,
    canApprovePaymentRequests = true,
    ws,
    stockRegisterInbox = [],
    setStockRegisterMgrOpen,
    showDeliveryCreditTab = true,
  } = merged;

  const asMoney = typeof formatNgn === 'function' ? formatNgn : fallbackMoney;
  const asPersonName = typeof formatPersonName === 'function' ? formatPersonName : fallbackPersonName;
  const asRefundReason =
    typeof formatRefundReasonCategory === 'function'
      ? formatRefundReasonCategory
      : (raw) => String(raw || '—').trim() || '—';

  const pacView = pacViewFromActiveTab(activeTab);
  const pacTabs = MANAGER_PAC_TABS.filter((t) => t.key !== 'credit' || showDeliveryCreditTab);

  const selectPac = (key) => {
    if (key === 'attention') {
      setActiveTab?.('attention');
      setAttentionFilter?.('all');
      return;
    }
    setActiveTab?.(key);
    setAttentionFilter?.('all');
  };

  const renderAttentionInboxRow = (it) => {
    const reasons = Array.isArray(it?.reasons) ? it.reasons : [];
    if (it?.kind === 'edit_approvals') {
      const e = it.row || it || {};
      return (
        <div key={it.id} className={`${inboxRowBase} hover:bg-slate-50/80`}>
          <KindPill label="edit" tone="pending" />
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800">
            {e.changeSummary ? (
              <>
                <span className="text-slate-900">{e.changeSummary}</span>
                {' · '}
              </>
            ) : null}
            {e.entityKind || 'record'} · <span className="font-mono">{e.entityId || '—'}</span>
            {' · '}
            {asPersonName(e.requestedByDisplay || e.requestedByUserId || e.requestedBy || '—')}
          </span>
          <SlaChip kind="edit_approvals" row={e} />
          <button
            type="button"
            className="shrink-0 rounded-lg bg-zarewa-teal px-3 py-1.5 text-ui-xs font-black uppercase text-white hover:brightness-105"
            onClick={() => openEditApprovalIntel?.(e)}
          >
            Review
          </button>
        </div>
      );
    }
    const kindLabel =
      it.kind === 'staff_purchase_credit' ? 'staff credit' : String(it.kind || 'item').replace(/_/g, ' ');
    const tone = managerKindTone(it.kind, { flagged: it.kind === 'flagged' });
    return (
      <button
        key={it.id}
        type="button"
        onClick={() => openAttentionItem?.(it)}
        className={`${inboxRowBase} hover:bg-slate-50 focus-visible:ring-zarewa-teal/25 border-l-4 ${
          tone === 'urgent' ? 'border-l-rose-500' : tone === 'pending' ? 'border-l-amber-400' : 'border-l-slate-300'
        }`}
      >
        <KindPill label={kindLabel} tone={tone} />
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800">
          <span className="font-mono font-bold text-zarewa-teal">{it.title}</span>
          {' · '}
          {it.subtitle}
        </span>
        {it.amountNgn != null ? (
          <span className="shrink-0 text-ui-xs font-bold tabular-nums text-slate-700">{asMoney(it.amountNgn)}</span>
        ) : null}
        <SlaChip kind={it.kind} row={it} />
        <span className="hidden lg:inline shrink-0 max-w-[8rem] truncate text-ui-xs text-slate-500">{reasons[0] || ''}</span>
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
            className={`${inboxRowBase} hover:bg-rose-50/40 border-l-4 border-l-rose-500 ${
              selectedIntel?.kind === 'quotation' && selectedIntel.quoteId === row.id ? 'bg-rose-50/50' : ''
            }`}
          >
            <KindPill label="flagged" tone="urgent" />
            <span className="shrink-0 text-xs font-bold text-slate-900">{row.id}</span>
            <span className="min-w-0 flex-1 truncate text-xs text-slate-700">
              <span className="font-semibold">{asPersonName(row.customer_name)}</span>
              {' · '}
              <span className="text-rose-800/90">{row.manager_flag_reason || 'Awaiting audit review.'}</span>
            </span>
            <SlaChip kind="flagged" row={row} />
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
            className={`${inboxRowBase} hover:bg-amber-50/50 border-l-4 border-l-amber-400 ${
              selectedIntel?.kind === 'quotation' && selectedIntel.quoteId === qref ? 'bg-amber-50/60' : ''
            }`}
          >
            <KindPill label="gate" tone="pending" />
            <span className="shrink-0 text-xs font-mono font-bold text-slate-600">{row.id}</span>
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">
              <span className="font-bold text-zarewa-teal">{qref}</span>
              {' · '}
              {asPersonName(row.customer_name)}
            </span>
            <span className="shrink-0 text-ui-xs text-slate-500 tabular-nums whitespace-nowrap">
              {asMoney(row.paid_ngn)} / {asMoney(row.total_ngn)}
            </span>
            <SlaChip kind="production" row={row} />
            <ChevronRight size={14} className="shrink-0 text-slate-300 group-hover:text-amber-700" />
          </button>
        );
      }

      return (
        <button
          key={row._rowKey}
          type="button"
          onClick={() => openQuotationIntel?.(row.id, row, { reviewContext: 'clearance' })}
          className={`${inboxRowBase} hover:bg-amber-50/40 border-l-4 border-l-amber-400 ${
            selectedIntel?.kind === 'quotation' && selectedIntel.quoteId === row.id ? 'bg-amber-50/50' : ''
          }`}
        >
          <KindPill label="sign-off" tone="pending" />
          <span className="shrink-0 text-xs font-mono font-bold text-zarewa-teal">{row.id}</span>
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">
            {asPersonName(row.customer_name)}
          </span>
          <span className="shrink-0 text-ui-xs font-bold tabular-nums text-slate-700">{asMoney(row.total_ngn)}</span>
          <SlaChip kind="clearance" row={row} />
          <ChevronRight size={14} className="shrink-0 text-slate-300" />
        </button>
      );
    }

    if (activeTab === 'cash_out') {
      if (row._inboxKind === 'refund') {
        return (
          <button
            key={row._rowKey}
            type="button"
            onClick={() => openAttentionItem?.({ kind: 'refunds', refundId: row.refund_id, row: { ...row } })}
            className={`${inboxRowBase} hover:bg-amber-50/40 border-l-4 border-l-amber-400 ${
              selectedIntel?.kind === 'refund' && selectedIntel.refundId === row.refund_id ? 'bg-amber-50/50' : ''
            }`}
          >
            <KindPill label="refund" tone="pending" />
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800">
              <span className="font-mono font-bold text-zarewa-teal">{row.refund_id}</span>
              {' · '}
              {asPersonName(row.customer_name)}
              {' · '}
              {asRefundReason(row.reason_category || row.reason)}
            </span>
            <span className="shrink-0 text-ui-xs font-bold tabular-nums">{asMoney(row.amount_ngn)}</span>
            <SlaChip kind="refunds" row={row} />
            <ChevronRight size={14} className="shrink-0 text-slate-300" />
          </button>
        );
      }
      return (
        <button
          key={row._rowKey}
          type="button"
          onClick={() => openAttentionItem?.({ kind: 'payments', requestId: row.request_id, row: { ...row } })}
          className={`${inboxRowBase} hover:bg-amber-50/40 border-l-4 border-l-amber-400 disabled:opacity-50 ${
            selectedIntel?.kind === 'payment' && selectedIntel.requestId === row.request_id ? 'bg-amber-50/50' : ''
          }`}
        >
          <KindPill label="expense" tone="pending" />
          {row.expense_category || row.expense_category_lane ? (
            <ExpenseCategoryLaneBadge category={row.expense_category} />
          ) : null}
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800">
            <span className="font-mono font-bold text-zarewa-teal">{row.request_id}</span>
            {' · '}
            {row.description || 'Payment request'}
          </span>
          {!canApprovePaymentRequests ? (
            <span className="shrink-0 rounded-md border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-ui-xs font-black uppercase text-amber-900">
              Finance desk
            </span>
          ) : null}
          <span className="shrink-0 text-ui-xs font-bold tabular-nums">{asMoney(row.amount_requested_ngn)}</span>
          <SlaChip kind="payments" row={row} />
          <ChevronRight size={14} className="shrink-0 text-slate-300" />
        </button>
      );
    }

    if (activeTab === 'qc') {
      return (
        <button
          key={row.job_id || row._rowKey}
          type="button"
          onClick={() => openAttentionItem?.({ kind: 'conversions', jobId: row.job_id, row: { ...row } })}
          className={`${inboxRowBase} hover:bg-amber-50/40 border-l-4 border-l-amber-400 ${
            selectedIntel?.kind === 'conversion' && selectedIntel.jobId === row.job_id ? 'bg-amber-50/50' : ''
          }`}
        >
          <KindPill label="QC" tone="pending" />
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800">
            <span className="font-mono font-bold text-zarewa-teal">{row.job_id}</span>
            {' · '}
            {row.quotation_ref || row.customer_name || 'Conversion review'}
          </span>
          <SlaChip kind="conversions" row={row} />
          <ChevronRight size={14} className="shrink-0 text-slate-300" />
        </button>
      );
    }

    if (activeTab === 'material') {
      return (
        <button
          key={row.id || row._rowKey}
          type="button"
          onClick={() => openMaterialIncidentIntel?.(row)}
          className={`${inboxRowBase} hover:bg-amber-50/40 border-l-4 border-l-amber-400`}
        >
          <KindPill label="material" tone="pending" />
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800">
            <span className="font-mono font-bold text-zarewa-teal">{row.id}</span>
            {' · '}
            {row.summary || row.incident_type || 'Material incident'}
          </span>
          <SlaChip kind="material" row={row} />
          <ChevronRight size={14} className="shrink-0 text-slate-300" />
        </button>
      );
    }

    if (activeTab === 'procurement') {
      return (
        <button
          key={row._rowKey || row.po_id || row.poID}
          type="button"
          onClick={() => openPurchaseOrderIntel?.(row)}
          className={`${inboxRowBase} hover:bg-amber-50/40 border-l-4 border-l-amber-400`}
        >
          <KindPill label="PO" tone="pending" />
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800">
            <span className="font-mono font-bold text-zarewa-teal">{row.po_id || row.poID}</span>
            {' · '}
            {row.supplier_name || 'Purchase order'}
          </span>
          <SlaChip kind="procurement" row={row} />
          <ChevronRight size={14} className="shrink-0 text-slate-300" />
        </button>
      );
    }

    if (activeTab === 'governance') {
      return (
        <button
          key={row._rowKey || row.id}
          type="button"
          onClick={() => openGovernanceIntel?.(row)}
          className={`${inboxRowBase} hover:bg-rose-50/40 border-l-4 border-l-rose-500`}
        >
          <KindPill label="governance" tone="urgent" />
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800">
            <span className="font-mono font-bold text-zarewa-teal">{row.title || row.id}</span>
            {' · '}
            {row.subtitle || 'Requires management review'}
          </span>
          {row.amountNgn != null ? (
            <span className="shrink-0 text-ui-xs font-bold tabular-nums text-rose-700">{asMoney(row.amountNgn)}</span>
          ) : null}
          <SlaChip kind="governance" row={row} />
          <ChevronRight size={14} className="shrink-0 text-slate-300 group-hover:text-rose-700" />
        </button>
      );
    }

    if (activeTab === 'edits') {
      const e = row || {};
      return (
        <div key={row._rowKey || row.id} className={`${inboxRowBase} hover:bg-slate-50/80`}>
          <KindPill label="edit" tone="pending" />
          <span className="min-w-0 flex-1 truncate text-xs text-slate-700">
            <span className="font-semibold">{e.entityKind || 'record'}</span>
            {' · '}
            <span className="font-mono font-bold text-zarewa-teal">{e.entityId || '—'}</span>
            {' · '}
            <span className="text-slate-500">{asPersonName(e.requestedByDisplay || e.requestedByUserId || e.requestedBy)}</span>
          </span>
          <SlaChip kind="edit_approvals" row={e} />
          <button
            type="button"
            onClick={() => openEditApprovalIntel?.(e)}
            className="shrink-0 rounded-lg bg-zarewa-teal px-3 py-1.5 text-ui-xs font-black uppercase text-white hover:brightness-105"
          >
            Review
          </button>
        </div>
      );
    }

    return null;
  };

  const emptyIcon = () => {
    if (activeTab === 'orders') return <CheckCircle2 size={36} className="opacity-25 mb-3 text-teal-600" />;
    if (activeTab === 'cash_out') return <DollarSign size={36} className="opacity-25 mb-3 text-amber-600" />;
    if (activeTab === 'qc') return <BarChart3 size={36} className="opacity-25 mb-3 text-slate-500" />;
    if (activeTab === 'material') return <ClipboardList size={36} className="opacity-25 mb-3 text-teal-600" />;
    if (activeTab === 'procurement') return <ShoppingCart size={36} className="opacity-25 mb-3 text-slate-500" />;
    if (activeTab === 'governance') return <AlertTriangle size={36} className="opacity-25 mb-3 text-rose-600" />;
    if (activeTab === 'edits') return <PencilLine size={36} className="opacity-25 mb-3 text-slate-500" />;
    return <Sparkles size={36} className="opacity-25 mb-3 text-teal-600" />;
  };

  return (
    <FinanceSequencePanel className="!min-h-0 sm:!min-h-0 overflow-hidden !p-0">
      <div className="sticky top-0 z-20 p-4 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2 className="text-sm font-black text-zarewa-teal tracking-tight flex items-center gap-2">
              <ShieldCheck size={18} className="text-teal-600 shrink-0" />
              Priority Action Center
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Decide what needs approval now — attendance is on My Team.
            </p>
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
            {pacView === 'attention' ? (
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={inboxSearch}
                  onChange={(e) => setInboxSearch?.(e.target.value)}
                  placeholder="Filter this queue…"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-zarewa-teal/15"
                />
              </div>
            ) : null}
          </motion.div>
        </div>

        <div className="flex gap-1 mt-4 overflow-x-auto pb-1 -mx-1 px-1 custom-scrollbar">
          {pacTabs.map((t) => {
            const active = pacView === t.key;
            const count =
              t.key === 'attention'
                ? tabCounts.attention ?? 0
                : t.key === 'credit'
                  ? tabCounts.credit ?? 0
                  : stockRegisterInbox.length;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => selectPac(t.key)}
                className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-ui-xs font-bold uppercase tracking-wide transition-colors border ${
                  active
                    ? 'bg-zarewa-teal text-white border-zarewa-teal shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {t.label}
                <span className={`tabular-nums px-1.5 py-0.5 rounded-md text-ui-xs ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-700'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {pacView === 'attention' ? (
          <div className="flex gap-1 mt-3 overflow-x-auto pb-1 -mx-1 px-1 custom-scrollbar" role="group" aria-label="Queue filters">
            {MANAGER_ATTENTION_FILTERS.map((f) => {
              const active = activeTab === 'attention' && attentionFilter === f.key;
              const count = f.key === 'all' ? attentionItems.length : filterAttentionItems(attentionItems, f.key).length;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => {
                    setActiveTab?.('attention');
                    setAttentionFilter?.(f.key);
                  }}
                  className={`shrink-0 px-2.5 py-1.5 rounded-lg text-ui-xs font-bold uppercase tracking-wide border transition-colors ${
                    active
                      ? 'bg-zarewa-teal text-white border-zarewa-teal'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-teal-200 hover:text-zarewa-teal'
                  }`}
                >
                  {f.label}
                  <span className={`ml-1 tabular-nums ${active ? 'text-teal-100' : 'text-slate-400'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div
        className={
          pacView === 'credit' || pacView === 'stock'
            ? 'p-4 sm:p-5'
            : 'min-h-[420px] max-h-[min(56vh,560px)] overflow-y-auto custom-scrollbar'
        }
      >
        {pacView === 'stock' ? (
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-zarewa-teal">Month-end stock register</p>
              <p className="text-xs text-slate-600 mt-1">
                {stockRegisterInbox.length
                  ? `${stockRegisterInbox.length} period(s) awaiting manager count alignment.`
                  : 'No registers waiting for manager review.'}
              </p>
            </div>
            <button
              type="button"
              className="z-btn-primary shrink-0"
              onClick={() => setStockRegisterMgrOpen?.(true)}
            >
              Review stock register
            </button>
          </div>
        ) : pacView === 'credit' ? (
          <CreditExceptionPanel
            branchId={ws?.workspaceBranchId || ws?.session?.branchId || null}
            roleKey={ws?.session?.user?.roleKey}
          />
        ) : loading ? (
          <div className="space-y-2 p-3" aria-busy="true" aria-label="Loading queues">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-11 rounded-lg bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : filteredInboxRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center text-slate-400">
            {emptyIcon()}
            <p className="text-sm font-bold text-slate-600">Nothing in this queue</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              {inboxSearch.trim()
                ? 'Try clearing the search filter.'
                : 'Queue clear — check your daily checklist or Branch Operations next.'}
            </p>
          </div>
        ) : (
          <div>{filteredInboxRows.map((row) => renderInboxRow(row))}</div>
        )}
      </div>
    </FinanceSequencePanel>
  );
}
