import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Printer, X } from 'lucide-react';
import { PrintModalPortal } from '../layout/PrintModalPortal';
import { StockCountSheetPrint } from './StockCountSheetPrint';
import { apiFetch, apiUrl } from '../../lib/apiBase.js';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { COUNT_SHEET_BRANCH_OPTIONS } from './stockCountSheetBranches.js';

/**
 * Load / print / download Operations physical count sheets (store + manager).
 */
export function StockCountSheetModal({ open, onClose }) {
  const { show: showToast } = useToast();
  const ws = useWorkspace();
  const workspaceBranchId = String(ws?.branchScope || ws?.session?.currentBranchId || '').trim();
  const viewAllBranches = Boolean(ws?.viewAllBranches);
  const branches = ws?.snapshot?.branches || [];

  const defaultBranch = useMemo(() => {
    const wb = String(workspaceBranchId || '').trim();
    if (wb && COUNT_SHEET_BRANCH_OPTIONS.some((b) => b.id === wb)) return wb;
    return 'BR-KD';
  }, [workspaceBranchId]);

  const [branchId, setBranchId] = useState(defaultBranch);
  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [printVariant, setPrintVariant] = useState(null); // 'store' | 'manager' | null
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (open) setBranchId(defaultBranch);
  }, [open, defaultBranch]);

  const branchOptions = useMemo(() => {
    const fromSnap = (branches || [])
      .filter((b) => COUNT_SHEET_BRANCH_OPTIONS.some((o) => o.id === String(b.id || b.branchId)))
      .map((b) => ({
        id: String(b.id || b.branchId),
        code: b.code || String(b.id || '').replace(/^BR-/, ''),
        name: b.name || b.code || b.id,
      }));
    return fromSnap.length ? fromSnap : COUNT_SHEET_BRANCH_OPTIONS;
  }, [branches]);

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setError('');
    setPack(null);
    try {
      const q = new URLSearchParams({ branchId, format: 'json' });
      const { ok, data } = await apiFetch(`/api/operations/stock-count-sheet?${q}`);
      if (!ok || !data?.ok) {
        const msg = data?.error || 'Could not load count sheet.';
        setError(msg);
        showToast?.(msg, { variant: 'error' });
        return;
      }
      setPack(data);
    } catch (e) {
      const msg = String(e?.message || e || 'Could not load count sheet.');
      setError(msg);
      showToast?.(msg, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [branchId, showToast]);

  useEffect(() => {
    if (!open) {
      setPack(null);
      setError('');
      setPrintVariant(null);
      return;
    }
    void load();
  }, [open, load]);

  const downloadExcel = useCallback(async () => {
    if (!branchId) return;
    setDownloading(true);
    try {
      const q = new URLSearchParams({ branchId, format: 'xlsx' });
      const r = await fetch(apiUrl(`/api/operations/stock-count-sheet?${q}`), {
        credentials: 'include',
      });
      if (!r.ok) {
        let msg = 'Could not download Excel.';
        try {
          const j = await r.json();
          msg = j.error || msg;
        } catch {
          /* ignore */
        }
        showToast?.(msg, { variant: 'error' });
        return;
      }
      const blob = await r.blob();
      const filename =
        r.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] ||
        `${branchId}-stock-count.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      showToast?.('Count sheet Excel downloaded.');
    } catch (e) {
      showToast?.(String(e?.message || e || 'Download failed.'), { variant: 'error' });
    } finally {
      setDownloading(false);
    }
  }, [branchId, showToast]);

  if (!open) return null;

  const showBranchPick = Boolean(viewAllBranches);

  return (
    <>
      <div
        className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-3 sm:items-center"
        role="dialog"
        aria-modal="true"
        aria-label="Print count sheet"
      >
        <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
        <div className="relative z-[81] w-full max-w-lg rounded-xl border border-slate-200 bg-white p-4 shadow-xl sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <p className="text-ui-xs font-black uppercase tracking-widest text-slate-400">Operations · Stock</p>
              <h2 className="text-base font-bold text-zarewa-teal">Print count sheet</h2>
              <p className="mt-1 text-xs text-slate-600">
                Large walk sheets for coils and accessories & stone. Store copy hides ERP; manager copy includes it.
              </p>
            </div>
            <button type="button" className="z-btn-secondary px-2.5 py-2" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          {showBranchPick ? (
            <label className="mb-3 block text-xs font-semibold text-slate-700">
              Branch
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                {branchOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} — {b.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="mb-3 text-xs text-slate-600">
              Branch:{' '}
              <span className="font-semibold text-slate-800">
                {branchOptions.find((b) => b.id === branchId)?.name || branchId}
              </span>
            </p>
          )}

          {loading ? <p className="text-sm text-slate-500">Loading count lines…</p> : null}
          {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
          {pack && !loading ? (
            <p className="mb-3 text-xs text-slate-600 tabular-nums">
              {pack.counts?.coils ?? pack.coils?.length ?? 0} coils ·{' '}
              {pack.counts?.accessoriesStone ?? pack.accessoriesStone?.length ?? 0} accessories & stone
              (zero-stock and tails excluded)
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              className="z-btn-primary px-3 py-2.5"
              disabled={!pack || loading}
              onClick={() => setPrintVariant('store')}
            >
              <Printer size={16} aria-hidden />
              Print store copy
            </button>
            <button
              type="button"
              className="z-btn-secondary px-3 py-2.5"
              disabled={!pack || loading}
              onClick={() => setPrintVariant('manager')}
            >
              <Printer size={16} aria-hidden />
              Print manager copy
            </button>
            <button
              type="button"
              className="z-btn-secondary px-3 py-2.5"
              disabled={!branchId || downloading}
              onClick={() => void downloadExcel()}
            >
              <Download size={16} aria-hidden />
              {downloading ? 'Downloading…' : 'Download Excel'}
            </button>
          </div>
        </div>
      </div>

      <PrintModalPortal open={Boolean(printVariant && pack)} onClose={() => setPrintVariant(null)}>
        <div className="mx-auto max-w-[210mm] pb-16">
          <div className="no-print sticky top-0 z-10 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="min-w-0">
              <p className="text-ui-xs font-black uppercase tracking-widest text-slate-400">Print preview</p>
              <p className="truncate text-sm font-bold text-zarewa-teal">
                {printVariant === 'manager' ? 'Manager count sheet' : 'Store count sheet'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={() => window.print()} className="z-btn-primary px-4 py-2.5">
                <Printer size={16} />
                Print A4
              </button>
              <button
                type="button"
                onClick={() => setPrintVariant(null)}
                className="z-btn-secondary px-3 py-2.5"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white shadow-2xl print:rounded-none print:border-0 print:shadow-none">
            <StockCountSheetPrint pack={pack} variant={printVariant || 'store'} />
          </div>
        </div>
      </PrintModalPortal>
    </>
  );
}
