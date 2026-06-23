import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Building2, FileSpreadsheet, Plus, Printer, RefreshCw, Calculator } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { downloadFinanceCsv } from '../../lib/exportFinanceCsv';
import { printAccountingAssets } from '../../lib/printAccountingAssets';
import { useAccountingAssets, useAccountingRegisterMutations } from '../../hooks/useAccountingSubledger';
import { useWorkspace } from '../../context/WorkspaceContext';
import { treasuryAccountsForWorkspace } from '../../lib/treasuryAccountsStore';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../lib/apiBase';
import { ModalFrame } from '../layout/ModalFrame';
import { ProcurementFormSection } from '../procurement/ProcurementFormSection';
import {
  SalesListSearchInput,
  SalesListSortBar,
  SalesListTableFrame,
} from '../sales/SalesListTableFrame';
import { AppTablePager } from '../ui/AppDataTable';
import { useAppTablePaging } from '../../lib/appDataTable';
import {
  AccountingDeskKpiCard,
  filterRegisterItems,
  sortRegisterItems,
} from './accounting/AccountingDeskUi';
import { AccountingFilterSelect, AccountingRegisterHeader } from './accounting/AccountingRegisterLayout';
import { AccountingRegisterTieOutStrip } from './accounting/AccountingRegisterTieOutStrip';
import { useAccountingDesk } from './accounting/AccountingDeskContext';
import { useAccountingRegisterTieOut } from '../../hooks/useAccountingRegisterTieOut';
import { AccountingAssetRow } from './accounting/AccountingAssetRow';
import { AccountingAssetDetailModal } from './AccountingAssetDetailModal';

const ASSETS_PAGE_SIZE = 15;

const CATEGORY_LABELS = {
  plant: 'Plant & machinery',
  vehicle: 'Vehicles',
  it: 'IT equipment',
  building: 'Buildings',
  land: 'Land',
  other: 'Other',
};

const CATEGORY_OPTIONS = [
  { id: 'all', label: 'All categories' },
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

const INPUT =
  'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-800 outline-none focus:border-[#134e4a]/35 focus:ring-2 focus:ring-[#134e4a]/10';

/**
 * @param {{ branchId?: string | null; enabled?: boolean; canManage?: boolean; branchScopeLabel?: string; deskRefresh?: number; onFocusTab?: (tabId: string) => void }} props
 */
export function AccountingAssetsPanel({
  branchId,
  enabled = true,
  canManage = false,
  branchScopeLabel = '',
  deskRefresh = 0,
  onFocusTab,
}) {
  const ws = useWorkspace();
  const { periodKey } = useAccountingDesk();
  const tieOut = useAccountingRegisterTieOut({
    registerKind: 'assets',
    periodKey,
    branchId,
    enabled: Boolean(periodKey),
    deskRefresh,
  });
  const { show: showToast } = useToast();
  const branches = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
  const treasuryAccounts = useMemo(
    () => treasuryAccountsForWorkspace(ws?.snapshot, ws?.session),
    [ws?.snapshot, ws?.session]
  );
  const { data, loading, error, reload } = useAccountingAssets({ branchId, enabled, deskRefresh });
  const workspaceLockedBranch = branchId && branchId !== 'ALL' ? String(branchId).trim() : '';
  const canAddAsset = canManage && Boolean(workspaceLockedBranch);
  const mutations = useAccountingRegisterMutations({ onDone: reload });

  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState({ field: 'amount', dir: 'desc' });
  const [depPeriod, setDepPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [depPreview, setDepPreview] = useState(null);
  const [depBusy, setDepBusy] = useState(false);
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

  const exportAssets = () => {
    const rows = filteredByCategory;
    if (!rows.length) return;
    downloadFinanceCsv(
      `fixed-assets-${filter}`,
      ['id', 'name', 'category', 'branchId', 'acquisitionDateIso', 'costNgn', 'accumulatedDepreciationNgn', 'netBookValueNgn', 'status'],
      rows.map((a) => ({
        id: a.id,
        name: a.name,
        category: a.category,
        branchId: a.branchId,
        acquisitionDateIso: a.acquisitionDateIso,
        costNgn: a.costNgn,
        accumulatedDepreciationNgn: a.accumulatedDepreciationNgn,
        netBookValueNgn: a.netBookValueNgn,
        status: a.status,
      }))
    );
    showToast('Exported to CSV.', { variant: 'success' });
  };

  const handlePrint = () => {
    const ok = printAccountingAssets({
      assets: filteredByCategory,
      summary,
      branchScopeLabel: branchScopeLabel || branchId || 'Company-wide',
      categoryLabel: CATEGORY_OPTIONS.find((o) => o.id === filter)?.label,
    });
    if (!ok) showToast('Could not open print preview.', { variant: 'error' });
  };

  const handleDispose = async (asset, payload) => {
    const result = await mutations.disposeAsset(asset.id, payload);
    if (result?.ok) {
      const msg =
        payload?.saleProceedsNgn > 0
          ? `Asset sold — ${formatNgn(payload.saleProceedsNgn)} recorded in treasury.`
          : 'Asset disposed.';
      showToast(msg, { variant: 'success' });
      setSelectedAsset(null);
      reload();
    } else {
      showToast(mutations.error || 'Could not dispose asset.', { variant: 'error' });
    }
  };

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

  const loadDepPreview = useCallback(async () => {
    const res = await apiFetch(`/api/finance/depreciation/preview?period=${encodeURIComponent(depPeriod)}`);
    if (res.ok && res.data?.ok) setDepPreview(res.data);
    else {
      setDepPreview(null);
      showToast(res.data?.error || 'Could not preview depreciation.', { variant: 'error' });
    }
  }, [depPeriod, showToast]);

  useEffect(() => {
    if (enabled) loadDepPreview();
  }, [enabled, loadDepPreview]);

  const postDepreciation = async () => {
    setDepBusy(true);
    const res = await apiFetch('/api/finance/depreciation/post', {
      method: 'POST',
      body: { period: depPeriod },
    });
    setDepBusy(false);
    if (!res.ok || !res.data?.ok) {
      showToast(res.data?.error || 'Could not post depreciation.', { variant: 'error' });
      return;
    }
    const note = res.data.duplicate ? 'Depreciation already posted for this period.' : 'Depreciation posted to GL.';
    showToast(note, { variant: 'success' });
    await loadDepPreview();
    reload();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const result = await mutations.createAsset({
      name: form.name.trim(),
      category: form.category,
      branchId: workspaceLockedBranch || form.branchId,
      acquisitionDateIso: form.acquisitionDateIso,
      costNgn: Math.round(Number(form.costNgn) || 0),
      salvageNgn: Math.round(Number(form.salvageNgn) || 0),
      usefulLifeMonths: Math.round(Number(form.usefulLifeMonths) || 60),
      treasuryReference: form.treasuryReference.trim() || undefined,
      notes: form.notes.trim() || undefined,
    });
    if (result.ok) {
      setModalOpen(false);
      setForm((f) => ({ ...f, name: '', costNgn: '', notes: '' }));
    }
  };

  if (error) {
    return (
      <div className="rounded-lg border border-dashed border-rose-200 bg-rose-50/50 py-10 px-6 text-center">
        <p className="text-[10px] font-semibold text-rose-800 uppercase tracking-widest">Could not load assets</p>
        <p className="mt-2 text-[11px] text-rose-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 min-w-0">
      <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#134e4a] flex items-center gap-1.5">
              <Calculator size={14} /> Monthly depreciation
            </p>
            <p className="mt-1 text-[10px] text-slate-600">
              Dr 6100 / Cr 1398 — land is excluded. Post once per period before month-end close.
            </p>
          </div>
          <label className="text-[10px] font-bold text-slate-600">
            Period
            <input
              type="month"
              value={depPeriod}
              onChange={(e) => setDepPeriod(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold"
            />
          </label>
        </div>
        {depPreview?.totalDepreciationNgn > 0 ? (
          <p className="mt-3 text-[11px] font-medium text-slate-800">
            Due: <span className="font-bold tabular-nums">{formatNgn(depPreview.totalDepreciationNgn)}</span>
            <span className="text-slate-500"> · {depPreview.rows?.length || 0} asset(s)</span>
          </p>
        ) : (
          <p className="mt-3 text-[10px] text-slate-500">No depreciation due for this period.</p>
        )}
        {canManage && depPreview?.totalDepreciationNgn > 0 ? (
          <button
            type="button"
            onClick={postDepreciation}
            disabled={depBusy}
            className="mt-3 inline-flex items-center rounded-lg bg-[#134e4a] px-4 py-2 text-[9px] font-semibold uppercase tracking-wider text-white disabled:opacity-50"
          >
            Post depreciation to GL
          </button>
        ) : null}
      </div>

      <AccountingRegisterTieOutStrip
        checks={tieOut.checks}
        loading={tieOut.loading}
        thresholdPct={tieOut.thresholdPct}
        onFocusTab={onFocusTab}
      />

      <AccountingRegisterHeader
        title="Fixed assets register"
        subtitle="Cost, depreciation, and NBV. Capex purchases auto-register; sales post treasury and GL."
        totalLabel="Net book value"
        totalValue={formatNgn(summary.nbvNgn)}
        compact
        actions={
          <>
            {canAddAsset ? (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg bg-[#134e4a] text-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider shadow-sm hover:brightness-105"
              >
                <Plus size={12} /> Add asset
              </button>
            ) : null}
            <button
              type="button"
              onClick={exportAssets}
              disabled={!filteredByCategory.length}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#134e4a] hover:bg-slate-50 disabled:opacity-40"
            >
              <FileSpreadsheet size={12} /> Export
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={!filteredByCategory.length}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#134e4a] hover:bg-slate-50 disabled:opacity-40"
            >
              <Printer size={12} /> Print
            </button>
            <button
              type="button"
              onClick={reload}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#134e4a] hover:bg-slate-50 disabled:opacity-40"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AccountingDeskKpiCard icon={<Building2 size={12} />} label="Active" value={summary.count} tone="teal" />
        <AccountingDeskKpiCard label="Cost" value={formatNgn(summary.costNgn)} />
        <AccountingDeskKpiCard label="Accum. depreciation" value={formatNgn(summary.accumulatedNgn)} />
        <AccountingDeskKpiCard label="NBV" value={formatNgn(summary.nbvNgn)} tone="teal" />
      </div>

      <SalesListTableFrame
        toolbar={
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <AccountingFilterSelect
                label="Category"
                value={filter}
                onChange={setFilter}
                options={CATEGORY_OPTIONS}
              />
              <div className="flex items-center gap-2 ml-auto shrink-0">
                <button
                  type="button"
                  onClick={exportAssets}
                  disabled={!filteredItems.length}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#134e4a] hover:bg-slate-50 disabled:opacity-40"
                >
                  <FileSpreadsheet size={12} /> Export
                </button>
                <span className="text-[10px] text-slate-500 tabular-nums">{filteredItems.length} assets</span>
              </div>
            </div>
            <SalesListSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search name, category, branch…"
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
          <p className="text-[11px] text-slate-500">Loading…</p>
        ) : filteredItems.length === 0 ? (
          <p className="text-[11px] text-slate-500 py-10 text-center border border-dashed border-slate-200 rounded-lg">
            No assets in this category.
          </p>
        ) : (
          <>
            <ul className="space-y-1.5">
              {paging.slice.map((row) => (
                <AccountingAssetRow
                  key={row.id}
                  asset={row.raw}
                  categoryLabel={row.reference}
                  branchLabel={branchName(branches, row.raw.branchId)}
                  onSelect={setSelectedAsset}
                />
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

      {modalOpen && canAddAsset ? (
        <ModalFrame isOpen onClose={() => setModalOpen(false)} title="Add fixed asset" surface="plain">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="h-1 bg-[#134e4a]" />
            <form onSubmit={handleCreate} className="p-5 space-y-4 max-h-[min(80dvh,640px)] overflow-y-auto">
              <ProcurementFormSection letter="A" title="Asset details" compact>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="sm:col-span-2 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Name *
                    <input className={INPUT} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
                  </label>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Category
                    <select className={INPUT} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                      {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </label>
                  {branches.length ? (
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Branch
                      {workspaceLockedBranch ? (
                        <input
                          className={`${INPUT} bg-slate-50 text-slate-600`}
                          value={branchName(branches, workspaceLockedBranch)}
                          readOnly
                        />
                      ) : (
                        <select className={INPUT} value={form.branchId} onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}>
                          {branches.map((b) => (
                            <option key={b.id || b.branchId} value={b.id || b.branchId}>{b.name || b.label || b.id}</option>
                          ))}
                        </select>
                      )}
                    </label>
                  ) : null}
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Acquisition date *
                    <input type="date" className={INPUT} value={form.acquisitionDateIso} onChange={(e) => setForm((f) => ({ ...f, acquisitionDateIso: e.target.value }))} required />
                  </label>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Cost (₦) *
                    <input type="number" min="1" className={INPUT} value={form.costNgn} onChange={(e) => setForm((f) => ({ ...f, costNgn: e.target.value }))} required />
                  </label>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Useful life (months)
                    <input type="number" min="1" className={INPUT} value={form.usefulLifeMonths} onChange={(e) => setForm((f) => ({ ...f, usefulLifeMonths: e.target.value }))} />
                  </label>
                </div>
              </ProcurementFormSection>
              {mutations.error ? <p className="text-[10px] text-rose-700">{mutations.error}</p> : null}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[9px] font-semibold uppercase text-slate-700">
                  Cancel
                </button>
                <button type="submit" disabled={mutations.busy} className="rounded-lg bg-[#134e4a] text-white px-3 py-1.5 text-[9px] font-semibold uppercase disabled:opacity-50">
                  {mutations.busy ? 'Saving…' : 'Save asset'}
                </button>
              </div>
            </form>
          </div>
        </ModalFrame>
      ) : null}

      <AccountingAssetDetailModal
        asset={selectedAsset}
        branchLabel={selectedAsset ? branchName(branches, selectedAsset.branchId) : ''}
        treasuryAccounts={treasuryAccounts}
        canManage={canManage}
        busy={mutations.busy}
        onClose={() => setSelectedAsset(null)}
        onDispose={handleDispose}
      />
    </div>
  );
}

function branchName(branches, id) {
  return branches.find((b) => (b.id || b.branchId) === id)?.name || id || '—';
}
