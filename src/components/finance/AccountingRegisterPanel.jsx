import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, Plus, Printer, RefreshCw, BookOpen, Lightbulb } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { downloadFinanceCsv } from '../../lib/exportFinanceCsv';
import { printAccountingRegister } from '../../lib/printAccountingRegister';
import { registerConfigFor } from '../../lib/accountingRegisterConfig';
import { useAccountingRegisterMutations } from '../../hooks/useAccountingSubledger';
import { useToast } from '../../context/ToastContext';
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
import { AccountingRegisterDetailModal } from './AccountingRegisterDetailModal';
import { AccountingRegisterClearModal } from './AccountingRegisterClearModal';
import { AccountingRegisterRow } from './accounting/AccountingRegisterRow';
import {
  AccountingDeskKpiCard,
  AccountingDeskNotice,
  AccountingDeskPageIntro,
  ACCOUNTING_REGISTER_SORT_FIELDS,
  filterRegisterItems,
  sortRegisterItems,
} from './accounting/AccountingDeskUi';

const REGISTER_PAGE_SIZE = 10;

function RegisterLoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-24 rounded-xl bg-slate-100" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-slate-100" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-slate-100" />
    </div>
  );
}

/**
 * @param {{
 *   registerSide: 'creditor' | 'debtor';
 *   data: object | null;
 *   loading: boolean;
 *   error: string;
 *   onReload: () => void;
 *   branchId?: string | null;
 *   canManage?: boolean;
 *   legacyQuickAdd?: object | null;
 *   branchScopeLabel?: string;
 * }} props
 */
export function AccountingRegisterPanel({
  registerSide,
  data,
  loading,
  error,
  onReload,
  branchId,
  canManage = false,
  legacyQuickAdd = null,
  branchScopeLabel = '',
}) {
  const config = registerConfigFor(registerSide);
  const { show: showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitial, setModalInitial] = useState(null);
  const [editLine, setEditLine] = useState(null);
  const [activeSection, setActiveSection] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState({ field: 'amount', dir: 'desc' });
  const [selectedItem, setSelectedItem] = useState(null);
  const [clearTarget, setClearTarget] = useState(null);
  const [clearingId, setClearingId] = useState('');

  const { clearLine, busy: mutBusy } = useAccountingRegisterMutations({
    onDone: () => {
      onReload();
      showToast('Register updated.', { variant: 'success' });
    },
  });

  const sections = data?.sections || [];
  const sectionTabs = useMemo(
    () =>
      sections.map((s) => ({
        id: s.id,
        label: `${s.title} (${s.count ?? 0})`,
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

  useEffect(() => {
    setSearchQuery('');
  }, [activeSection]);

  const currentSection = sections.find((s) => s.id === activeSection) || sections[0];

  const filteredItems = useMemo(() => {
    const raw = currentSection?.items || [];
    return sortRegisterItems(filterRegisterItems(raw, searchQuery), sort.field, sort.dir);
  }, [currentSection, searchQuery, sort.field, sort.dir]);

  const paging = useAppTablePaging(filteredItems, REGISTER_PAGE_SIZE, searchQuery, activeSection, sort.field, sort.dir);

  const openLegacyModal = useCallback((initial = null) => {
    setEditLine(null);
    setModalInitial(initial);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((line) => {
    setModalInitial(null);
    setEditLine(line);
    setModalOpen(true);
    setSelectedItem(null);
  }, []);

  const handlePrint = useCallback(() => {
    if (!data) return;
    const ok = printAccountingRegister({
      data,
      registerSide,
      title: config.title,
      branchScopeLabel: branchScopeLabel || data.branchScope || 'Company-wide',
    });
    if (!ok) showToast('Allow pop-ups to print the register, or try Export.', { variant: 'error' });
  }, [data, registerSide, config.title, branchScopeLabel, showToast]);

  const handleClearLegacy = useCallback(async (item) => {
    setClearingId(item.id);
    const result = await clearLine(item.id);
    setClearingId('');
    if (result?.ok) {
      setClearTarget(null);
      setSelectedItem(null);
    } else {
      showToast('Could not clear register line.', { variant: 'error' });
    }
  }, [clearLine, showToast]);

  const exportSection = useCallback(() => {
    const items = currentSection?.items || [];
    if (!items.length) return;
    downloadFinanceCsv(
      `${registerSide}-${currentSection?.id || 'section'}`,
      ['partyName', 'partyRef', 'reference', 'amountNgn', 'detail', 'asAtDateIso', 'branchId', 'category'],
      items.map((i) => ({
        partyName: i.partyName,
        partyRef: i.partyRef,
        reference: i.reference,
        amountNgn: i.amountNgn,
        detail: i.detail,
        asAtDateIso: i.asAtDateIso,
        branchId: i.branchId,
        category: i.category,
      }))
    );
    showToast('Section exported.', { variant: 'success' });
  }, [currentSection, registerSide, showToast]);

  const emptyHint = config.emptySectionHints[currentSection?.id] || 'No lines in this section for the current scope.';

  if (error) {
    return (
      <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50/50 py-14 px-6 text-center">
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
        title={config.title}
        description={data?.description || config.description}
        action={
          <>
            {canManage ? (
              <>
                {legacyQuickAdd ? (
                  <button
                    type="button"
                    onClick={() => openLegacyModal(legacyQuickAdd)}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-amber-950 hover:bg-amber-100"
                  >
                    <Plus size={12} /> Record overpayment
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => openLegacyModal(null)}
                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#134e4a] text-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider shadow-sm hover:brightness-105"
                >
                  <Plus size={12} strokeWidth={2} /> Add legacy line
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={handlePrint}
              disabled={!data?.sections?.length}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#134e4a] hover:bg-slate-50 disabled:opacity-50"
            >
              <Printer size={12} /> Print summary
            </button>
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

      <AccountingDeskNotice tone="info">
        <span className="font-bold">{config.eyebrow}.</span> Click any row for details and quick actions. KPI cards
        jump to a section.
      </AccountingDeskNotice>

      {registerSide === 'debtor' && (data?.summary?.significantOverpaymentCount ?? 0) > 0 ? (
        <AccountingDeskNotice tone="warn">
          {data.summary.significantOverpaymentCount} significant overpayment(s) totalling{' '}
          {formatNgn(data.summary.significantOverpaymentNgn)} — open Overpayment credits or record a legacy line if
          pre-system.
        </AccountingDeskNotice>
      ) : null}

      {loading && !data ? (
        <RegisterLoadingSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            <AccountingDeskKpiCard
              icon={<BookOpen size={12} />}
              label="Total register"
              value={formatNgn(data?.summary?.totalNgn ?? 0)}
              hint={data?.generatedAtISO ? `Updated ${new Date(data.generatedAtISO).toLocaleString()}` : 'All sections'}
              tone="teal"
            />
            {config.kpis.map((k) => {
              const section = sections.find((s) => s.id === k.sectionId);
              const active = activeSection === k.sectionId;
              return (
                <button
                  key={k.key}
                  type="button"
                  onClick={() => {
                    if (k.sectionId) setActiveSection(k.sectionId);
                  }}
                  className={`text-left rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#134e4a]/25 ${
                    active ? 'ring-2 ring-[#134e4a]/30 shadow-sm' : 'hover:shadow-sm'
                  }`}
                  aria-pressed={active}
                >
                  <AccountingDeskKpiCard
                    label={k.label}
                    value={formatNgn(data?.summary?.[k.key] ?? 0)}
                    hint={section ? `${section.count ?? 0} line${section.count === 1 ? '' : 's'}` : undefined}
                    tone={k.tone}
                  />
                </button>
              );
            })}
          </div>

          <ProcurementFormSection letter="?" title="How to use this register" compact>
            <ul className="list-disc space-y-1 pl-4 text-[10px] font-medium text-slate-600 leading-relaxed">
              {config.helpPoints.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </ProcurementFormSection>

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
                        {currentSection?.description ||
                          'Search and sort lines. Click a row to view details, links, and actions.'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {currentSection ? (
                        <p className="text-sm font-black text-[#134e4a] tabular-nums text-right">
                          {formatNgn(currentSection.subtotalNgn)}
                          <span className="block text-[8px] font-semibold text-slate-500 uppercase tracking-wide">
                            {currentSection.count} item{currentSection.count === 1 ? '' : 's'}
                          </span>
                        </p>
                      ) : null}
                      <button
                        type="button"
                        onClick={exportSection}
                        disabled={!currentSection?.items?.length}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#134e4a] hover:bg-slate-50 disabled:opacity-40"
                      >
                        <FileSpreadsheet size={12} />
                        Export
                      </button>
                    </div>
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
                  <Lightbulb size={20} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                    {searchQuery ? 'No lines match your search' : 'No lines in this section'}
                  </p>
                  <p className="mt-2 text-[11px] text-slate-600 max-w-md mx-auto leading-relaxed">{emptyHint}</p>
                  {canManage && currentSection?.id === 'legacy_inherited' && !searchQuery ? (
                    <button
                      type="button"
                      onClick={() => openLegacyModal(legacyQuickAdd || null)}
                      className="mt-4 inline-flex items-center gap-1 rounded-lg bg-[#134e4a] text-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider"
                    >
                      <Plus size={12} /> Add legacy line
                    </button>
                  ) : null}
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
                        onSelect={setSelectedItem}
                        onClear={setClearTarget}
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
              <ProcurementFormSection letter="i" title="System notes" compact>
                <ul className="list-disc space-y-1 pl-4 text-[10px] font-medium text-slate-600 leading-relaxed">
                  {data.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </ProcurementFormSection>
            ) : null}
          </div>
        </>
      )}

      {modalOpen ? (
        <AccountingRegisterLineModal
          registerSide={registerSide}
          branchId={branchId}
          initialValues={modalInitial}
          editLine={editLine}
          onClose={() => {
            setModalOpen(false);
            setModalInitial(null);
            setEditLine(null);
          }}
          onSaved={() => {
            const wasEdit = Boolean(editLine);
            setModalOpen(false);
            setModalInitial(null);
            setEditLine(null);
            onReload();
            showToast(wasEdit ? 'Legacy line updated.' : 'Legacy line saved.', { variant: 'success' });
          }}
        />
      ) : null}

      {selectedItem ? (
        <AccountingRegisterDetailModal
          item={selectedItem}
          sectionId={currentSection?.id || ''}
          sectionTitle={currentSection?.title}
          registerSide={registerSide}
          canManage={canManage}
          onClose={() => setSelectedItem(null)}
          onEdit={openEditModal}
          onClear={(item) => {
            setSelectedItem(null);
            setClearTarget(item);
          }}
          clearing={mutBusy && clearingId === selectedItem.id}
        />
      ) : null}

      <AccountingRegisterClearModal
        item={clearTarget}
        open={Boolean(clearTarget)}
        busy={mutBusy}
        onClose={() => setClearTarget(null)}
        onConfirm={() => clearTarget && handleClearLegacy(clearTarget)}
      />
    </div>
  );
}
