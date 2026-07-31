import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Upload, X, Trash2 } from 'lucide-react';
import { ModalFrame } from '../layout/ModalFrame';
import { apiFetch, apiUrl } from '../../lib/apiBase';
import { formatNgn } from '../../Data/mockData';
import { EXPENSE_CATEGORY_OPTIONS } from '../../shared/expenseCategories.js';
import { appConfirm } from '../../lib/appConfirm';

async function fileToBase64(file) {
  const buf = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

const FIELD =
  'w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-zarewa-teal/15';
const FIELD_WARN =
  'w-full rounded-lg border border-amber-400 bg-amber-50 px-2 py-1.5 text-[11px] font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-300/40';

function fieldClass(row, key) {
  if (row.include === false) return FIELD;
  const missing = Array.isArray(row.missingFields) && row.missingFields.includes(key);
  return missing ? FIELD_WARN : FIELD;
}

/**
 * Account → Payouts & expenses → Import expenses
 * Branch-scoped template → upload → editable preview (incomplete rows highlighted) → commit.
 */
export function ExpenseBulkImportModal({
  open,
  onClose,
  onImported,
  treasuryAccounts = [],
  categories: categoriesProp,
  branchId = '',
  branchLabel = '',
}) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [previewMeta, setPreviewMeta] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [requireTreasury, setRequireTreasury] = useState(true);
  const [showCategories, setShowCategories] = useState(false);

  const categories = useMemo(() => {
    if (Array.isArray(categoriesProp) && categoriesProp.length) return categoriesProp;
    if (Array.isArray(previewMeta?.categories) && previewMeta.categories.length) {
      return previewMeta.categories;
    }
    return [...EXPENSE_CATEGORY_OPTIONS];
  }, [categoriesProp, previewMeta?.categories]);

  const treasuryOptions = useMemo(
    () =>
      (Array.isArray(treasuryAccounts) ? treasuryAccounts : []).map((a) => ({
        id: Number(a.id),
        label: `${a.name || 'Account'}${a.bankName ? ` · ${a.bankName}` : ''} (#${a.id})`,
      })),
    [treasuryAccounts]
  );

  const branchTitle = branchLabel || branchId || 'current workspace branch';

  const reset = () => {
    setFile(null);
    setRows([]);
    setPreviewMeta(null);
    setBusy('');
    setError('');
    setResult(null);
    setConfirmed(false);
    setRequireTreasury(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const close = () => {
    if (busy) return;
    reset();
    onClose?.();
  };

  const downloadTemplate = async () => {
    setBusy('template');
    setError('');
    try {
      const r = await fetch(apiUrl('/api/expenses/import/template'), { credentials: 'include' });
      if (!r.ok) {
        setError('Could not download template.');
        return;
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Expenses import.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy('');
    }
  };

  const applyPreviewResponse = (data) => {
    setPreviewMeta(data);
    setRows(
      (data.previewTable || []).map((r) => ({
        ...r,
        include: r.include !== false,
        treasuryAccountId: r.treasuryAccountId != null ? String(r.treasuryAccountId) : '',
        accountKey: r.accountKey || '',
        missingFields: Array.isArray(r.missingFields) ? r.missingFields : [],
      }))
    );
    if (data?.message && data.needsUpdateCount > 0) {
      setError(data.message);
    } else if (!data?.needsUpdateCount) {
      setError('');
    }
  };

  const runPreviewFromFile = async (selectedFile) => {
    if (!selectedFile) return;
    setBusy('preview');
    setError('');
    setResult(null);
    setConfirmed(false);
    try {
      const fileBase64 = await fileToBase64(selectedFile);
      const { ok, data } = await apiFetch('/api/expenses/import/preview', {
        method: 'POST',
        body: JSON.stringify({ fileBase64, requireTreasury }),
      });
      if (!ok || !data?.ok) {
        setError(data?.error || 'Preview failed.');
        setRows([]);
        setPreviewMeta(null);
        return;
      }
      applyPreviewResponse(data);
    } finally {
      setBusy('');
    }
  };

  const runPreviewFromRows = async (nextRows = rows) => {
    if (!nextRows.length) return;
    setBusy('preview');
    setError('');
    setConfirmed(false);
    try {
      const payloadRows = nextRows.map((r) => ({
        row: r.row,
        include: r.include !== false,
        date: r.date,
        amountNgn: r.amountNgn,
        category: r.category,
        accountKey: r.accountKey,
        treasuryAccountId: r.treasuryAccountId || null,
        reference: r.reference,
        paymentMethod: r.paymentMethod,
        description: r.description,
        expenseID: r.expenseID,
      }));
      const { ok, data } = await apiFetch('/api/expenses/import/preview', {
        method: 'POST',
        body: JSON.stringify({ rows: payloadRows, requireTreasury }),
      });
      if (!ok || !data?.ok) {
        setError(data?.error || 'Preview refresh failed.');
        return;
      }
      applyPreviewResponse(data);
    } finally {
      setBusy('');
    }
  };

  useEffect(() => {
    if (!open || !file || result) return;
    const t = setTimeout(() => {
      void runPreviewFromFile(file);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-preview when file or treasury rule changes
  }, [open, file, requireTreasury]);

  const patchRow = (idx, patch) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    setConfirmed(false);
  };

  const removeRow = (idx) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
    setConfirmed(false);
  };

  const validCount = rows.filter((r) => r.include !== false && r.status === 'ok').length;
  const incompleteCount = rows.filter((r) => r.include !== false && r.status === 'incomplete').length;
  const invalidCount = rows.filter((r) => r.include !== false && r.status === 'error').length;
  const needsUpdateCount = rows.filter((r) => r.include !== false && r.needsUpdate).length;
  const totalAmount = rows
    .filter((r) => r.include !== false && r.status === 'ok')
    .reduce((s, r) => s + (Number(r.amountNgn) || 0), 0);
  const canPost = validCount > 0 && needsUpdateCount === 0 && incompleteCount === 0 && invalidCount === 0;

  const runCommit = async () => {
    if (!rows.length || !confirmed || !canPost) return;
    if (needsUpdateCount > 0 || incompleteCount > 0 || invalidCount > 0) {
      setError(
        `${needsUpdateCount || incompleteCount + invalidCount} row(s) still need updates in the preview. Fix highlighted fields or uncheck those rows.`
      );
      return;
    }
    const okConfirm = await appConfirm({
      message: `Post ${validCount} expense(s) totaling ${formatNgn(totalAmount)} to ${branchTitle}?\n\nExpenses and treasury outflows are recorded for this workspace branch only. Incomplete rows must be fixed in the preview first.`,
    });
    if (!okConfirm) return;

    setBusy('commit');
    setError('');
    setResult(null);
    try {
      const payloadRows = rows.map((r) => ({
        row: r.row,
        include: r.include !== false,
        date: r.date,
        amountNgn: r.amountNgn,
        category: r.category,
        accountKey: r.accountKey,
        treasuryAccountId: r.treasuryAccountId || null,
        reference: r.reference,
        paymentMethod: r.paymentMethod,
        description: r.description,
        expenseID: r.expenseID,
      }));
      const { ok, data } = await apiFetch('/api/expenses/import/commit', {
        method: 'POST',
        body: JSON.stringify({ rows: payloadRows, requireTreasury }),
      });
      if (!ok || !data?.ok) {
        setError(data?.error || 'Import failed.');
        if (data?.preview) applyPreviewResponse(data.preview);
        return;
      }
      setResult(data);
      await onImported?.(data);
    } catch (e) {
      setError(String(e?.message || e || 'Import failed.'));
    } finally {
      setBusy('');
    }
  };

  if (!open) return null;

  return (
    <ModalFrame isOpen={open} onClose={close} title="Import expenses" closeDisabled={!!busy} surface="plain">
      <div className="z-modal-panel z-modal-scroll-y flex max-h-[min(92dvh,960px)] w-full max-w-[min(1100px,calc(100dvw-1.5rem))] flex-col overflow-hidden bg-white">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-6">
          <div>
            <h3 className="text-lg font-bold text-zarewa-teal">Import expenses</h3>
            <p className="mt-0.5 text-xs text-slate-600">
              Posts only to <strong>{branchTitle}</strong>
              {branchId ? <span className="font-mono text-slate-500"> ({branchId})</span> : null}. Incomplete rows stay
              in preview until you update them.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={!!busy}
            className="rounded-xl p-2 text-slate-400 hover:text-red-500 disabled:opacity-40"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="z-btn-secondary inline-flex items-center gap-1.5 text-xs"
              onClick={downloadTemplate}
              disabled={!!busy}
            >
              <Download size={14} /> Download Excel template
            </button>
            <button
              type="button"
              className="z-btn-secondary inline-flex items-center gap-1.5 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={!!busy || !!result}
            >
              <Upload size={14} /> Upload filled workbook
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setFile(f);
                setResult(null);
                setConfirmed(false);
              }}
            />
            {file ? (
              <span className="self-center text-[11px] font-semibold text-slate-500">{file.name}</span>
            ) : null}
          </div>

          <label className="flex items-start gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={requireTreasury}
              disabled={!!busy || !!result}
              onChange={(e) => {
                setRequireTreasury(e.target.checked);
                setConfirmed(false);
              }}
            />
            <span>
              Require a treasury account on every row (accounts limited to <strong>{branchTitle}</strong>).
            </span>
          </label>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-slate-600"
              onClick={() => setShowCategories((v) => !v)}
            >
              All expense categories ({categories.length})
              <span className="font-semibold text-zarewa-teal">{showCategories ? 'Hide' : 'Show'}</span>
            </button>
            {showCategories ? (
              <ul className="grid max-h-40 grid-cols-2 gap-1 overflow-y-auto border-t border-slate-200 px-3 py-2 sm:grid-cols-3 md:grid-cols-4">
                {categories.map((c) => (
                  <li key={c} className="truncate text-[11px] font-medium text-slate-700">
                    {c}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950">
              {error}
              {needsUpdateCount > 0 ? (
                <span className="mt-1 block font-medium text-amber-800">
                  Highlighted cells need an update in the preview table below, then click Re-validate edits.
                </span>
              ) : null}
            </div>
          ) : null}

          {result?.ok ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
              Posted {result.createdCount} expense(s) to {branchTitle}
              {result.totalAmountNgn != null ? ` · ${formatNgn(result.totalAmountNgn)}` : ''}.
              They appear under Payouts &amp; expenses for this branch.
            </div>
          ) : null}

          {rows.length > 0 && !result?.ok ? (
            <>
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-600">
                <span>
                  Preview · {rows.length} row(s) · {validCount} ready
                  {incompleteCount ? ` · ${incompleteCount} incomplete` : ''}
                  {invalidCount ? ` · ${invalidCount} error(s)` : ''} · {formatNgn(totalAmount)}
                </span>
                <button
                  type="button"
                  className="text-zarewa-teal underline-offset-2 hover:underline"
                  disabled={!!busy}
                  onClick={() => void runPreviewFromRows()}
                >
                  Re-validate edits
                </button>
              </div>

              {needsUpdateCount > 0 ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50/90 px-3 py-2 text-xs text-amber-950">
                  <strong>Update required:</strong> {needsUpdateCount} row(s) have missing or invalid data. Edit the
                  amber fields in the preview (or uncheck the row), then re-validate before posting.
                </div>
              ) : null}

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-[960px] w-full border-collapse text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-2 py-2">Use</th>
                      <th className="px-2 py-2">Date</th>
                      <th className="px-2 py-2">Amount</th>
                      <th className="px-2 py-2">Category</th>
                      <th className="px-2 py-2">Treasury</th>
                      <th className="px-2 py-2">Reference</th>
                      <th className="px-2 py-2">Method</th>
                      <th className="px-2 py-2">Description</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => (
                      <tr
                        key={`${r.row}-${idx}`}
                        className={`border-t border-slate-100 align-top ${
                          r.include !== false && r.status === 'incomplete'
                            ? 'bg-amber-50/50'
                            : r.include !== false && r.status === 'error'
                              ? 'bg-red-50/40'
                              : ''
                        }`}
                      >
                        <td className="px-2 py-1.5">
                          <input
                            type="checkbox"
                            checked={r.include !== false}
                            disabled={!!busy}
                            onChange={(e) => patchRow(idx, { include: e.target.checked })}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="date"
                            className={fieldClass(r, 'date')}
                            value={r.date || ''}
                            disabled={!!busy}
                            onChange={(e) => patchRow(idx, { date: e.target.value })}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            className={fieldClass(r, 'amount')}
                            value={r.amountNgn ?? ''}
                            disabled={!!busy}
                            onChange={(e) =>
                              patchRow(idx, { amountNgn: Math.round(Number(e.target.value) || 0) })
                            }
                          />
                        </td>
                        <td className="px-2 py-1.5 min-w-[10rem]">
                          <select
                            className={fieldClass(r, 'category')}
                            value={r.category || ''}
                            disabled={!!busy}
                            onChange={(e) => patchRow(idx, { category: e.target.value })}
                          >
                            <option value="">Select…</option>
                            {categories.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1.5 min-w-[11rem]">
                          <select
                            className={fieldClass(r, 'treasury')}
                            value={r.treasuryAccountId || ''}
                            disabled={!!busy}
                            onChange={(e) => {
                              const id = e.target.value;
                              patchRow(idx, {
                                treasuryAccountId: id,
                                accountKey: id || r.accountKey,
                              });
                            }}
                          >
                            <option value="">
                              {r.accountKey && !r.treasuryAccountId
                                ? `Update: ${r.accountKey}`
                                : 'Select account…'}
                            </option>
                            {treasuryOptions.map((t) => (
                              <option key={t.id} value={String(t.id)}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            className={FIELD}
                            value={r.reference || ''}
                            disabled={!!busy}
                            onChange={(e) => patchRow(idx, { reference: e.target.value })}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            className={FIELD}
                            value={r.paymentMethod || ''}
                            disabled={!!busy}
                            onChange={(e) => patchRow(idx, { paymentMethod: e.target.value })}
                          />
                        </td>
                        <td className="px-2 py-1.5 min-w-[12rem]">
                          <input
                            className={fieldClass(r, 'description')}
                            value={r.description || ''}
                            disabled={!!busy}
                            onChange={(e) => patchRow(idx, { description: e.target.value })}
                          />
                        </td>
                        <td className="px-2 py-1.5 text-[10px] font-semibold">
                          {r.include === false ? (
                            <span className="text-slate-400">Skipped</span>
                          ) : r.status === 'ok' ? (
                            <span className="text-emerald-700">Ready</span>
                          ) : r.status === 'incomplete' ? (
                            <span className="text-amber-800" title={(r.errors || []).join(' · ')}>
                              Update preview
                            </span>
                          ) : (
                            <span className="text-red-700" title={(r.errors || []).join(' · ')}>
                              {(r.errors || [])[0] || 'Error'}
                            </span>
                          )}
                          {(r.errors || []).length && r.status === 'incomplete' ? (
                            <div className="mt-0.5 font-medium text-amber-800">{r.errors[0]}</div>
                          ) : null}
                          {(r.warnings || []).length ? (
                            <div className="mt-0.5 font-medium text-amber-700">{r.warnings[0]}</div>
                          ) : null}
                        </td>
                        <td className="px-2 py-1.5">
                          <button
                            type="button"
                            className="rounded p-1 text-slate-400 hover:text-red-600"
                            disabled={!!busy}
                            onClick={() => removeRow(idx)}
                            aria-label="Remove row"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <label className="flex items-start gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={confirmed}
                  disabled={!!busy || !canPost}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                <span>
                  I updated incomplete rows in the preview. Post {validCount} ready row(s) to{' '}
                  <strong>{branchTitle}</strong> only.
                </span>
              </label>
            </>
          ) : null}

          {!rows.length && !busy && !result ? (
            <p className="text-xs text-slate-500">
              Upload an Excel file to open the editable preview. Incomplete cells can be fixed here before posting to{' '}
              {branchTitle}.
            </p>
          ) : null}

          {busy === 'preview' || busy === 'commit' ? (
            <p className="text-xs font-semibold text-zarewa-teal">
              {busy === 'preview' ? 'Building preview…' : 'Posting expenses…'}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-4 py-3 sm:px-6">
          <button type="button" className="z-btn-secondary text-xs" onClick={close} disabled={!!busy}>
            {result?.ok ? 'Close' : 'Cancel'}
          </button>
          {!result?.ok ? (
            <button
              type="button"
              className="z-btn-primary text-xs"
              disabled={!!busy || !confirmed || !canPost}
              onClick={() => void runCommit()}
            >
              Post {validCount || ''} expense{validCount === 1 ? '' : 's'}
            </button>
          ) : null}
        </div>
      </div>
    </ModalFrame>
  );
}
