import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, BookOpen } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { useAccountingRegisterMutations } from '../../hooks/useAccountingSubledger';
import { ProcurementFormSection } from '../procurement/ProcurementFormSection';
import {
  SalesListSearchInput,
  SalesListSortBar,
  SalesListTableFrame,
} from '../sales/SalesListTableFrame';
import { PageTabs } from '../layout/PageTabs';
import { AppTablePager } from '../ui/AppDataTable';
import { useAppTablePaging } from '../../lib/appDataTable';
import { AccountingRegisterLineModal } from './AccountingRegisterLineModal';
import { AccountingRegisterRow } from './accounting/AccountingRegisterRow';
import {
  AccountingDeskKpiCard,
  AccountingDeskPageIntro,
  ACCOUNTING_REGISTER_SORT_FIELDS,
  filterRegisterItems,
  sortRegisterItems,
} from './accounting/AccountingDeskUi';

const REGISTER_PAGE_SIZE = 10;

const KPI_MAP = {
  creditors: [
    { key: 'staffLoansNgn', label: 'Staff loans', tone: 'default' },
    { key: 'customerReceivablesNgn', label: 'Customer receivables', tone: 'default' },
    { key: 'supplierPrepaymentsNgn', label: 'Supplier prepayments', tone: 'teal' },
    { key: 'interBranchReceivableNgn', label: 'Inter-branch receivable', tone: 'default' },
    { key: 'legacyInheritedNgn', label: 'Inherited / manual', tone: 'amber' },
  ],
  debtors: [
    { key: 'supplierPayablesNgn', label: 'Supplier payables', tone: 'default' },
    { key: 'customerDepositsNgn', label: 'Customer deposits', tone: 'teal' },
    { key: 'overpaymentCreditsNgn', label: 'Overpayment credits', tone: 'amber' },
    { key: 'unlinkedPaymentsNgn', label: 'Unlinked receipts', tone: 'default' },
    { key: 'interBranchPayableNgn', label: 'Inter-branch payable', tone: 'default' },
    { key: 'legacyInheritedNgn', label: 'Inherited / manual', tone: 'amber' },
  ],
};

/**
 * @param {{
 *   registerSide: 'creditor' | 'debtor';
 *   title: string;
 *   data: object | null;
 *   loading: boolean;
 *   error: string;
 *   onReload: () => void;
 *   branchId?: string | null;
 *   canManage?: boolean;
 * }} props
 */
export function AccountingRegisterPanel({
  registerSide,
  title,
  data,
  loading,
  error,
  onReload,
  branchId,
  canManage = false,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState({ field: 'amount', dir: 'desc' });
  const [clearingId, setClearingId] = useState('');

  const { clearLine, busy: mutBusy } = useAccountingRegisterMutations({ onDone: onReload });
  const kpis = KPI_MAP[registerSide] || [];

  const sections = data?.sections || [];
  const sectionTabs = useMemo(
    () =>
      sections.map((s) => ({
        id: s.id,
        label: s.title,
        icon: null,
      })),
    [sections]
  );

  useEffect(() => {
    if (!sections.length) return;
    if (!activeSection || !sections.some((s) => s.id === activeSection)) {
      setActiveSection(sections[0].id);
    }
  }, [sections, activeSection]);

  const currentSection = sections.find((s) => s.id === activeSection) || sections[0];

  const filteredItems = useMemo(() => {
    const raw = currentSection?.items || [];
    return sortRegisterItems(filterRegisterItems(raw, searchQuery), sort.field, sort.dir);
  }, [currentSection, searchQuery, sort.field, sort.dir]);

  const paging = useAppTablePaging(filteredItems, REGISTER_PAGE_SIZE, searchQuery, activeSection, sort.field, sort.dir);

  const handleClearLegacy = useCallback(
    async (item) => {
      const label = item.partyName || item.reference || item.id;
      const ok = window.confirm(
        `Mark "${label}" (${formatNgn(item.amountNgn)}) as cleared?\n\nUse after settlement in live transactions or GL.`
      );
      if (!ok) return;
      setClearingId(item.id);
      await clearLine(item.id);
      setClearingId('');
    },
    [clearLine]
  );

  if (error) {
    return (
      <div className="rounded-lg border border-dashed border-rose-200 bg-rose-50/50 py-14 px-6 text-center">
        <p className="text-[10px] font-semibold text-rose-800 uppercase tracking-widest">Could not load register</p>
        <p className="mt-2 text-[11px] text-rose-700">{error}</p>
        <button
          type="button"
          onClick={onReload}
          className="mt-4 inline-flex items-center gap-1 rounded-lg bg-[#134e4a] text-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:gap-6 min-w-0">
      <AccountingDeskPageIntro
        title={title}
        description={data?.description}
        action={
          <>
            {canManage ? (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#134e4a] text-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider shadow-sm hover:brightness-105"
              >
                <Plus size={12} strokeWidth={2} /> Add legacy line
              </button>
            ) : null}
            <button
              type="button"
              onClick={onReload}
              disabled={loading}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#134e4a] hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AccountingDeskKpiCard
          icon={<BookOpen size={12} />}
          label="Total register"
          value={formatNgn(data?.summary?.totalNgn ?? 0)}
          hint="All sections combined"
          tone="teal"
        />
        {kpis.slice(0, 3).map((k) => (
          <AccountingDeskKpiCard
            key={k.key}
            label={k.label}
            value={formatNgn(data?.summary?.[k.key] ?? 0)}
            tone={k.tone}
          />
        ))}
      </div>

      {registerSide === 'debtor' && (data?.summary?.significantOverpaymentCount ?? 0) > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3 text-[10px] font-medium text-amber-900 leading-relaxed">
          {data.summary.significantOverpaymentCount} significant overpayment(s) totalling{' '}
          {formatNgn(data.summary.significantOverpaymentNgn)} — review for refund or withdrawal.
        </div>
      ) : null}

      {loading && !data ? (
        <p className="text-[11px] text-slate-500 px-1">Loading register…</p>
      ) : (
        <div className="min-w-0 space-y-4">
          {sectionTabs.length > 1 ? (
            <PageTabs tabs={sectionTabs} value={activeSection} onChange={setActiveSection} />
          ) : null}

          <SalesListTableFrame
            toolbar={
              <div className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                      <BookOpen size={12} className="text-[#134e4a]" />
                      {currentSection?.title || 'Register lines'}
                    </h3>
                    <p className="text-[11px] text-slate-600 mt-1 leading-snug max-w-2xl">
                      {currentSection?.description || 'Search and sort register lines. Click a row to open the linked record.'}
                    </p>
                  </div>
                  {currentSection ? (
                    <p className="text-sm font-black text-[#134e4a] tabular-nums shrink-0">
                      {formatNgn(currentSection.subtotalNgn)}
                      <span className="block text-[8px] font-semibold text-slate-500 uppercase tracking-wide text-right">
                        {currentSection.count} item{currentSection.count === 1 ? '' : 's'}
                      </span>
                    </p>
                  ) : null}
                </div>
                <SalesListSearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search party, reference, detail, amount…"
                />
                <SalesListSortBar
                  fields={ACCOUNTING_REGISTER_SORT_FIELDS}
                  field={sort.field}
                  dir={sort.dir}
                  onFieldChange={(field) => setSort((s) => ({ ...s, field }))}
                  onDirToggle={() => setSort((s) => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }))}
                />
              </div>
            }
          >
            {filteredItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-14 px-6 text-center">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                  No lines match your search
                </p>
              </div>
            ) : (
              <>
                <ul className="space-y-1.5 max-h-[min(52vh,480px)] overflow-y-auto custom-scrollbar">
                  {paging.slice.map((item) => (
                    <AccountingRegisterRow
                      key={item.id}
                      sectionId={currentSection?.id || ''}
                      item={item}
                      canManage={canManage}
                      onClear={handleClearLegacy}
                      clearing={mutBusy && clearingId === item.id}
                    />
                  ))}
                </ul>
                <div className="mt-3 text-[10px] text-slate-600 [&_button]:rounded-lg [&_button]:px-2 [&_button]:py-1 [&_button]:text-[10px] [&_p]:text-[10px]">
                  <AppTablePager
                    showingFrom={paging.showingFrom}
                    showingTo={paging.showingTo}
                    total={paging.total}
                    hasPrev={paging.hasPrev}
                    hasNext={paging.hasNext}
                    onPrev={paging.goPrev}
                    onNext={paging.goNext}
                    pageSize={REGISTER_PAGE_SIZE}
                  />
                </div>
              </>
            )}
          </SalesListTableFrame>

          {data?.notes?.length ? (
            <ProcurementFormSection letter="i" title="Notes" compact>
              <ul className="list-disc space-y-1 pl-4 text-[10px] font-medium text-slate-600 leading-relaxed">
                {data.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </ProcurementFormSection>
          ) : null}
        </div>
      )}

      {modalOpen ? (
        <AccountingRegisterLineModal
          registerSide={registerSide}
          branchId={branchId}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            onReload();
          }}
        />
      ) : null}
    </div>
  );
}
