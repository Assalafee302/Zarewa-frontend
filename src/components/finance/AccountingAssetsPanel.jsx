import React, { useMemo, useState } from 'react';
import { Building2, Plus, RefreshCw } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { useAccountingAssets, useAccountingRegisterMutations } from '../../hooks/useAccountingSubledger';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ProcurementFormSection } from '../procurement/ProcurementFormSection';
import {
  SalesListSearchInput,
  SalesListSortBar,
  SalesListTableFrame,
} from '../sales/SalesListTableFrame';
import { PageTabs } from '../layout/PageTabs';
import { AppTablePager } from '../ui/AppDataTable';
import { useAppTablePaging } from '../../lib/appDataTable';
import {
  AccountingDeskKpiCard,
  AccountingDeskPageIntro,
  ACCOUNTING_CARD_ROW,
  filterRegisterItems,
  sortRegisterItems,
} from './accounting/AccountingDeskUi';

const ASSETS_PAGE_SIZE = 10;

const CATEGORY_LABELS = {
  plant: 'Plant & machinery',
  vehicle: 'Vehicles',
  it: 'IT equipment',
  building: 'Buildings',
  land: 'Land',
  other: 'Other',
};

const CATEGORY_TABS = [
  { id: 'all', label: 'All' },
  { id: 'plant', label: 'Machinery' },
  { id: 'building', label: 'Buildings' },
  { id: 'land', label: 'Land' },
  { id: 'vehicle', label: 'Vehicles' },
  { id: 'it', label: 'IT & furniture' },
  { id: 'other', label: 'Other' },
];

const ASSET_SORT_FIELDS = [
  { id: 'amount', label: 'NBV' },
  { id: 'party', label: 'Name' },
  { id: 'reference', label: 'Category' },
];

/**
 * @param {{ branchId?: string | null; enabled?: boolean; canManage?: boolean }} props
 */
export function AccountingAssetsPanel({ branchId, enabled = true, canManage = false }) {
  const ws = useWorkspace();
  const branches = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
  const { data, loading, error, reload } = useAccountingAssets({ branchId, enabled });
  const mutations = useAccountingRegisterMutations({ onDone: reload });

  const [filter, setFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState({ field: 'amount', dir: 'desc' });
  const [form, setForm] = useState({
    name: '',
    category: 'plant',
    branchId: branchId && branchId !== 'ALL' ? branchId : branches[0]?.id || '',
    acquisitionDateIso: '',
    costNgn: '',
    salvageNgn: '0',
    usefulLifeMonths: '60',
    treasuryReference: '',
    notes: '',
  });

  const assets = data?.assets || [];
  const filteredByCategory = useMemo(() => {
    if (filter === 'all') return assets;
    if (filter === 'it') return assets.filter((a) => a.category === 'it' || a.category === 'other');
    return assets.filter((a) => a.category === filter);
  }, [assets, filter]);

  const tableItems = useMemo(
    () =>
      filteredByCategory.map((a) => ({
        id: a.id,
        partyName: a.name,
        reference: CATEGORY_LABELS[a.category] || a.category,
        detail: `${branchName(branches, a.branchId)} · Acq ${String(a.acquisitionDateIso || '').slice(0, 10)}`,
        amountNgn: a.netBookValueNgn,
        costNgn: a.costNgn,
        status: a.status,
        raw: a,
      })),
    [filteredByCategory, branches]
  );

  const filteredItems = useMemo(
    () => sortRegisterItems(filterRegisterItems(tableItems, searchQuery), sort.field, sort.dir),
    [tableItems, searchQuery, sort.field, sort.dir]
  );

  const paging = useAppTablePaging(filteredItems, ASSETS_PAGE_SIZE, searchQuery, filter, sort.field, sort.dir);

  const summary = useMemo(() => {
    const active = assets.filter((a) => a.status === 'active');
    return {
      count: active.length,
      costNgn: active.reduce((s, a) => s + (a.costNgn || 0), 0),
      nbvNgn: active.reduce((s, a) => s + (a.netBookValueNgn || 0), 0),
      accumulatedNgn: active.reduce((s, a) => s + (a.accumulatedDepreciationNgn || 0), 0),
    };
  }, [assets]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const result = await mutations.createAsset({
      name: form.name.trim(),
      category: form.category,
      branchId: form.branchId,
      acquisitionDateIso: form.acquisitionDateIso,
      costNgn: Math.round(Number(form.costNgn) || 0),
      salvageNgn: Math.round(Number(form.salvageNgn) || 0),
      usefulLifeMonths: Math.round(Number(form.usefulLifeMonths) || 60),
      treasuryReference: form.treasuryReference.trim() || undefined,
      notes: form.notes.trim() || undefined,
    });
    if (result.ok) {
      setFormOpen(false);
      setForm((f) => ({ ...f, name: '', costNgn: '', notes: '' }));
    }
  };

  if (error) {
    return (
      <div className="rounded-lg border border-dashed border-rose-200 bg-rose-50/50 py-14 px-6 text-center">
        <p className="text-[10px] font-semibold text-rose-800 uppercase tracking-widest">Could not load assets</p>
        <p className="mt-2 text-[11px] text-rose-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:gap-6 min-w-0">
      <AccountingDeskPageIntro
        title="Fixed assets register"
        description="Plant, machinery, furniture, land and buildings — cost, depreciation, and net book value."
        action={
          <>
            {canManage ? (
              <button
                type="button"
                onClick={() => setFormOpen((v) => !v)}
                className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#134e4a] text-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider shadow-sm hover:brightness-105"
              >
                <Plus size={12} strokeWidth={2} /> {formOpen ? 'Close form' : 'Add asset'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={reload}
              disabled={loading}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#134e4a] hover:bg-slate-50"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AccountingDeskKpiCard
          icon={<Building2 size={12} />}
          label="Active assets"
          value={summary.count}
          tone="teal"
        />
        <AccountingDeskKpiCard label="Total cost" value={formatNgn(summary.costNgn)} />
        <AccountingDeskKpiCard label="Accumulated depreciation" value={formatNgn(summary.accumulatedNgn)} />
        <AccountingDeskKpiCard label="Net book value" value={formatNgn(summary.nbvNgn)} tone="teal" />
      </div>

      {formOpen && canManage ? (
        <ProcurementFormSection letter="A" title="New fixed asset">
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Name *
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-800 outline-none focus:border-[#134e4a]/35 focus:ring-2 focus:ring-[#134e4a]/10"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </label>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Category
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-[#134e4a] outline-none focus:border-[#134e4a]/35"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Acquisition date *
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold outline-none focus:border-[#134e4a]/35"
                value={form.acquisitionDateIso}
                onChange={(e) => setForm((f) => ({ ...f, acquisitionDateIso: e.target.value }))}
                required
              />
            </label>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Cost (₦) *
              <input
                type="number"
                min="0"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold tabular-nums outline-none focus:border-[#134e4a]/35"
                value={form.costNgn}
                onChange={(e) => setForm((f) => ({ ...f, costNgn: e.target.value }))}
                required
              />
            </label>
            {branches.length ? (
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Branch *
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-[#134e4a] outline-none"
                  value={form.branchId}
                  onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
                >
                  {branches.map((b) => (
                    <option key={b.id || b.branchId} value={b.id || b.branchId}>
                      {b.name || b.id}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Useful life (months)
              <input
                type="number"
                min="1"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold outline-none"
                value={form.usefulLifeMonths}
                onChange={(e) => setForm((f) => ({ ...f, usefulLifeMonths: e.target.value }))}
              />
            </label>
            {mutations.error ? <p className="sm:col-span-2 text-[10px] text-rose-700">{mutations.error}</p> : null}
            <div className="sm:col-span-2 flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={mutations.busy}
                className="inline-flex items-center rounded-lg bg-[#134e4a] text-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider disabled:opacity-50"
              >
                Save asset
              </button>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </ProcurementFormSection>
      ) : null}

      <PageTabs tabs={CATEGORY_TABS} value={filter} onChange={setFilter} />

      <SalesListTableFrame
        toolbar={
          <div className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                  <Building2 size={12} className="text-[#134e4a]" />
                  Asset register
                </h3>
                <p className="text-[11px] text-slate-600 mt-1">Search and sort fixed assets by name, category, or NBV.</p>
              </div>
              <p className="text-sm font-black text-[#134e4a] tabular-nums">{filteredItems.length} shown</p>
            </div>
            <SalesListSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search asset name, category, branch…"
            />
            <SalesListSortBar
              fields={ASSET_SORT_FIELDS}
              field={sort.field}
              dir={sort.dir}
              onFieldChange={(field) => setSort((s) => ({ ...s, field }))}
              onDirToggle={() => setSort((s) => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }))}
            />
          </div>
        }
      >
        {loading && !data ? (
          <p className="text-[11px] text-slate-500">Loading assets…</p>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-14 px-6 text-center">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              No assets in this category
            </p>
          </div>
        ) : (
          <>
            <ul className="space-y-1.5 max-h-[min(52vh,480px)] overflow-y-auto custom-scrollbar">
              {paging.slice.map((row) => (
                <li key={row.id} className={`${ACCOUNTING_CARD_ROW} flex flex-wrap items-start justify-between gap-2`}>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="text-[11px] font-bold text-[#134e4a] truncate">{row.partyName}</p>
                    <p className="text-[8px] text-slate-500 mt-0.5">{row.detail}</p>
                    <p className="text-[9px] text-slate-600 mt-1">
                      {row.reference} · Cost {formatNgn(row.costNgn)} ·{' '}
                      <span className={row.status === 'active' ? 'text-emerald-800 font-semibold' : 'text-slate-500'}>
                        {row.status === 'active' ? 'Active' : 'Disposed'}
                      </span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="block text-[8px] font-semibold text-slate-500 uppercase tracking-wide">NBV</span>
                    <span className="text-[11px] font-black text-[#134e4a] tabular-nums">
                      {formatNgn(row.amountNgn)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3 text-[10px] text-slate-600">
              <AppTablePager
                showingFrom={paging.showingFrom}
                showingTo={paging.showingTo}
                total={paging.total}
                hasPrev={paging.hasPrev}
                hasNext={paging.hasNext}
                onPrev={paging.goPrev}
                onNext={paging.goNext}
                pageSize={ASSETS_PAGE_SIZE}
              />
            </div>
          </>
        )}
      </SalesListTableFrame>
    </div>
  );
}

function branchName(branches, id) {
  return branches.find((b) => (b.id || b.branchId) === id)?.name || id || '—';
}
