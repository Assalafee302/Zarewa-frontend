import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Upload, X, Trash2 } from 'lucide-react';
import { ModalFrame } from '../layout/ModalFrame';
import { apiFetch, apiUrl } from '../../lib/apiBase';
import { formatNgn } from '../../Data/mockData';
import { EXPENSE_CATEGORY_OPTIONS } from '../../shared/expenseCategories.js';

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

/** Immediate local recognition of preview edits (before server re-validate). */
function assessRowLocally(row, requireTreasury) {
  if (row.include === false) {
    return {
      ...row,
      missingFields: [],
      needsUpdate: false,
      status: 'skipped',
      errors: [],
    };
  }
  const missingFields = [];
  const errors = [];
  const date = String(row.date || '').trim();
  const amountNgn = Math.round(Number(row.amountNgn) || 0);
  const category = String(row.category || '').trim();
  const treasuryAccountId = String(row.treasuryAccountId || '').trim();
  const accountKey = String(row.accountKey || '').trim();
  const description = String(row.description || '').trim();

  if (!date) {
    missingFields.push('date');
    errors.push('Set the expense date (YYYY-MM-DD). It is never filled with today automatically.');
  }
  if (!(amountNgn > 0)) {
    missingFields.push('amount');
    errors.push('Update amount in the preview (must be greater than zero).');
  }
  if (!category) {
    missingFields.push('category');
    errors.push('Update category in the preview — pick from the category list.');
  }
  if (requireTreasury && !treasuryAccountId && !accountKey) {
    missingFields.push('treasury');
    errors.push('Update treasury account in the preview (required for this import).');
  }
  if (/^others$/i.test(category) && description.length < 40) {
    missingFields.push('description');
    errors.push('Others needs a clear explanation (at least 40 characters) — update description.');
  }

  const needsUpdate = missingFields.length > 0;
  return {
    ...row,
    date,
    amountNgn,
    category,
    missingFields,
    errors,
    needsUpdate,
    status: needsUpdate ? 'incomplete' : 'ok',
    errorCount: errors.length,
  };
}

function toPayloadRows(list) {
  return list.map((r) => ({
    row: r.row,
    include: r.include !== false,
    date: r.date,
    amountNgn: r.amountNgn,
    category: r.category,
    accountKey: r.accountKey || '',
    treasuryAccountId:
      r.treasuryAccountId != null && String(r.treasuryAccountId).trim() !== ''
        ? Number(r.treasuryAccountId) || String(r.treasuryAccountId).trim()
        : null,
    reference: r.reference,
    paymentMethod: r.paymentMethod,
    description: r.description,
    expenseID: r.expenseID,
  }));
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
  const rowsRef = useRef([]);
  const confirmedRef = useRef(false);
  const skipNextFilePreviewRef = useRef(false);
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [previewMeta, setPreviewMeta] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [requireTreasury, setRequireTreasury] = useState(true);
  const [showCategories, setShowCategories] = useState(false);
  const [rowsDirty, setRowsDirty] = useState(0);
  const [bulkDate, setBulkDate] = useState('');

  useEffect(() => {
    confirmedRef.current = confirmed;
  }, [confirmed]);

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

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const reset = () => {
    setFile(null);
    setRows([]);
    rowsRef.current = [];
    setPreviewMeta(null);
    setBusy('');
    setError('');
    setResult(null);
    setConfirmed(false);
    confirmedRef.current = false;
    setRequireTreasury(true);
    setRowsDirty(0);
    setBulkDate('');
    skipNextFilePreviewRef.current = false;
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
    const next = (data.previewTable || []).map((r) => ({
      ...r,
      include: r.include !== false,
      treasuryAccountId: r.treasuryAccountId != null ? String(r.treasuryAccountId) : '',
      accountKey: r.accountKey || '',
      missingFields: Array.isArray(r.missingFields) ? r.missingFields : [],
      expenseID: r.expenseID || '',
    }));
    setRows(next);
    rowsRef.current = next;
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
        rowsRef.current = [];
        setPreviewMeta(null);
        return;
      }
      applyPreviewResponse(data);
    } finally {
      setBusy('');
    }
  };

  const runPreviewFromRows = async (nextRows) => {
    const list = Array.isArray(nextRows) ? nextRows : rowsRef.current;
    if (!list.length) return;
    setBusy('preview');
    setError('');
    try {
      const { ok, data } = await apiFetch('/api/expenses/import/preview', {
        method: 'POST',
        body: JSON.stringify({ rows: toPayloadRows(list), requireTreasury }),
      });
      if (!ok || !data?.ok) {
        setError(data?.error || 'Preview refresh failed.');
        return;
      }
      applyPreviewResponse(data);
      // Only clear confirmation if rows still need fixes — do not wipe it on every auto-check.
      if (Number(data.needsUpdateCount) > 0 || Number(data.incompleteCount) > 0 || Number(data.invalidCount) > 0) {
        setConfirmed(false);
        confirmedRef.current = false;
      }
    } finally {
      setBusy('');
    }
  };

  // Initial / file / requireTreasury change → parse from workbook (unless user already edited rows).
  useEffect(() => {
    if (!open || !file || result) return;
    if (skipNextFilePreviewRef.current) {
      skipNextFilePreviewRef.current = false;
      void runPreviewFromRows(rowsRef.current);
      return;
    }
    const t = setTimeout(() => {
      void runPreviewFromFile(file);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, file, requireTreasury]);

  // After preview edits, re-validate on the server so corrections are recognized.
  useEffect(() => {
    if (!open || !rowsDirty || result || !rowsRef.current.length) return;
    const t = setTimeout(() => {
      void runPreviewFromRows(rowsRef.current);
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsDirty, requireTreasury, open]);

  const patchRow = (idx, patch) => {
    setRows((prev) => {
      const next = prev.map((r, i) => {
        if (i !== idx) return r;
        return assessRowLocally({ ...r, ...patch }, requireTreasury);
      });
      rowsRef.current = next;
      return next;
    });
    setConfirmed(false);
    confirmedRef.current = false;
    setRowsDirty((n) => n + 1);
  };

  const removeRow = (idx) => {
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      rowsRef.current = next;
      return next;
    });
    setConfirmed(false);
    confirmedRef.current = false;
    setRowsDirty((n) => n + 1);
  };

  const applyBulkDate = (mode) => {
    const d = String(bulkDate || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      setError('Pick a date first (example: 2026-07-15 for July expenses).');
      return;
    }
    setRows((prev) => {
      const next = prev.map((r) => {
        if (r.include === false) return r;
        if (mode === 'blank' && String(r.date || '').trim()) return r;
        return assessRowLocally({ ...r, date: d }, requireTreasury);
      });
      rowsRef.current = next;
      return next;
    });
    setConfirmed(false);
    confirmedRef.current = false;
    setError('');
    setRowsDirty((n) => n + 1);
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
    const list = rowsRef.current;
    if (busy === 'commit') return;

    if (!list.length) {
      setError('No rows to post. Upload a workbook first.');
      return;
    }

    const localReady = list.every(
      (r) => r.include === false || (r.status === 'ok' && !r.needsUpdate)
    );
    const readyRows = list.filter((r) => r.include !== false && r.status === 'ok' && !r.needsUpdate);
    if (!localReady || !readyRows.length) {
      setError(
        'Some rows still need updates in the preview. Fix highlighted fields or uncheck those rows, then try Post again.'
      );
      setRowsDirty((n) => n + 1);
      return;
    }

    if (!confirmedRef.current) {
      setError('Tick the confirmation checkbox under the preview table, then click Post.');
      return;
    }

    setBusy('commit');
    setError('');
    setResult(null);
    try {
      const { ok, status, data } = await apiFetch('/api/expenses/import/commit', {
        method: 'POST',
        body: JSON.stringify({ rows: toPayloadRows(list), requireTreasury }),
      });
      if (!ok || !data?.ok) {
        const detail =
          data?.error ||
          (status === 403
            ? 'Not allowed to post. Turn off “All branches”, pick one branch, then try again.'
            : status === 0
              ? 'Network error — is the API server running?'
              : 'Import failed.');
        const failedHint =
          Array.isArray(data?.failed) && data.failed.length
            ? ` First failure (row ${data.failed[0].row}): ${data.failed[0].error}`
            : '';
        setError(detail + failedHint);
        if (data?.preview) applyPreviewResponse(data.preview);
        return;
      }
      if (data.warning) {
        setError(data.warning);
      }
      const postedSource = readyRows;
      const createdFromServer = Array.isArray(data.created) ? data.created : [];
      const created =
        createdFromServer.length > 0
          ? createdFromServer.map((c, i) => {
              const src = postedSource.find((r) => Number(r.row) === Number(c.row)) || postedSource[i] || {};
              return {
                ...src,
                ...c,
                expenseID: c.expenseID || src.expenseID || '',
                date: c.date || src.date || '',
                amountNgn: c.amountNgn ?? src.amountNgn ?? 0,
                category: c.category || src.category || '',
                reference: c.reference ?? src.reference ?? '',
                description: c.description ?? src.description ?? '',
                paymentMethod: c.paymentMethod || src.paymentMethod || '',
                treasuryAccountId: c.treasuryAccountId ?? src.treasuryAccountId ?? null,
              };
            })
          : postedSource.map((r) => ({
              row: r.row,
              expenseID: r.expenseID || '',
              date: r.date,
              amountNgn: r.amountNgn,
              category: r.category,
              reference: r.reference,
              description: r.description,
              paymentMethod: r.paymentMethod,
              treasuryAccountId: r.treasuryAccountId,
            }));
      setResult({
        ...data,
        created,
        createdCount: data.createdCount ?? created.length,
        totalAmountNgn:
          data.totalAmountNgn ?? created.reduce((s, r) => s + (Number(r.amountNgn) || 0), 0),
      });
      void onImported?.(data);
    } catch (e) {
      setError(String(e?.message || e || 'Import failed.'));
    } finally {
      setBusy('');
    }
  };

  if (!open) return null;

  return (
    <ModalFrame isOpen={open} onClose={close} title="Import expenses" closeDisabled={!!busy} surface="plain" showCloseButton={false}>
      <div className="z-modal-panel z-modal-scroll-y flex max-h-[min(92dvh,960px)] w-full max-w-[min(1100px,calc(100dvw-1.5rem))] flex-col overflow-hidden bg-white">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-6">
          <div>
            <h3 className="text-lg font-bold text-zarewa-teal">Import expenses</h3>
            <p className="mt-0.5 text-xs text-slate-600">
              Posts only to <strong>{branchTitle}</strong>
              {branchId ? <span className="font-mono text-slate-500"> ({branchId})</span> : null}. Turn off{' '}
              <strong>All branches</strong> before posting. Set each row’s <strong>Date</strong> yourself (e.g. July
              2026) — never auto-filled to today — so last-month expense packs stay complete.
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
                skipNextFilePreviewRef.current = false;
                setFile(f);
                setResult(null);
                setConfirmed(false);
                setRowsDirty(0);
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
                if (rowsRef.current.length) skipNextFilePreviewRef.current = true;
                setRequireTreasury(e.target.checked);
                setConfirmed(false);
                setRows((prev) => {
                  const next = prev.map((r) => assessRowLocally(r, e.target.checked));
                  rowsRef.current = next;
                  return next;
                });
                setRowsDirty((n) => n + 1);
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
                  Edit the amber fields below — your changes are applied as you type.
                </span>
              ) : null}
            </div>
          ) : null}

          {result?.ok ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
                Import successful — posted {result.createdCount} expense(s) to {branchTitle}
                {result.totalAmountNgn != null ? ` · ${formatNgn(result.totalAmountNgn)}` : ''}.
              </div>
              <div className="overflow-x-auto rounded-xl border border-emerald-200">
                <table className="min-w-[720px] w-full border-collapse text-left">
                  <thead className="bg-emerald-50 text-[10px] uppercase tracking-wide text-emerald-900/70">
                    <tr>
                      <th className="px-2 py-2">#</th>
                      <th className="px-2 py-2">Expense ID</th>
                      <th className="px-2 py-2">Date</th>
                      <th className="px-2 py-2">Amount</th>
                      <th className="px-2 py-2">Category</th>
                      <th className="px-2 py-2">Treasury</th>
                      <th className="px-2 py-2">Reference</th>
                      <th className="px-2 py-2">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(result.created) ? result.created : []).map((item, i) => {
                      const treasuryLabel =
                        treasuryOptions.find((t) => Number(t.id) === Number(item.treasuryAccountId))?.label ||
                        (item.treasuryAccountId != null ? `#${item.treasuryAccountId}` : '—');
                      return (
                        <tr key={item.expenseID || i} className="border-t border-emerald-100 text-[11px] text-slate-800">
                          <td className="px-2 py-1.5 font-semibold text-slate-500">{i + 1}</td>
                          <td className="px-2 py-1.5 font-mono font-bold text-zarewa-teal">
                            {item.expenseID || '—'}
                          </td>
                          <td className="px-2 py-1.5">{item.date || '—'}</td>
                          <td className="px-2 py-1.5 font-semibold">{formatNgn(item.amountNgn || 0)}</td>
                          <td className="px-2 py-1.5">{item.category || '—'}</td>
                          <td className="px-2 py-1.5">{treasuryLabel}</td>
                          <td className="px-2 py-1.5">{item.reference || '—'}</td>
                          <td className="px-2 py-1.5 max-w-[14rem] truncate" title={item.description || ''}>
                            {item.description || '—'}
                          </td>
                        </tr>
                      );
                    })}
                    {!result.created?.length ? (
                      <tr>
                        <td colSpan={8} className="px-2 py-3 text-center text-[11px] text-slate-500">
                          Posted successfully, but the detail list was empty. Check Payouts &amp; expenses for new rows.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-slate-600">
                These expenses are on <strong>{branchTitle}</strong>. You can also find them under{' '}
                <strong>Payouts &amp; expenses</strong>.
              </p>
              <button
                type="button"
                className="z-btn-secondary text-xs"
                onClick={() => {
                  reset();
                }}
              >
                Import another file
              </button>
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
                  onClick={() => void runPreviewFromRows(rowsRef.current)}
                >
                  Re-check now
                </button>
                {busy === 'preview' ? <span className="text-zarewa-teal">Checking edits…</span> : null}
              </div>

              {needsUpdateCount > 0 ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50/90 px-3 py-2 text-xs text-amber-950">
                  <strong>Update required:</strong> {needsUpdateCount} row(s) still need data. Fix amber cells (or
                  uncheck the row). Status updates as soon as you edit.
                </div>
              ) : null}

              <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
                <div className="min-w-[10rem]">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Expense date (not today)
                  </label>
                  <input
                    type="date"
                    className={FIELD}
                    value={bulkDate}
                    disabled={!!busy && busy !== 'preview'}
                    onChange={(e) => setBulkDate(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="z-btn-secondary text-xs"
                  disabled={!!busy && busy !== 'preview'}
                  onClick={() => applyBulkDate('blank')}
                >
                  Fill blank dates
                </button>
                <button
                  type="button"
                  className="z-btn-secondary text-xs"
                  disabled={!!busy && busy !== 'preview'}
                  onClick={() => applyBulkDate('all')}
                >
                  Set all row dates
                </button>
                <p className="basis-full text-[11px] text-slate-600">
                  For July expenses use a July date (e.g. <strong>2026-07-15</strong>). Dates are never auto-filled to
                  today — that keeps last-month reports complete.
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-[1080px] w-full border-collapse text-left">
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
                      <th className="px-2 py-2">Expense ID</th>
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
                            disabled={!!busy && busy !== 'preview'}
                            onChange={(e) => patchRow(idx, { include: e.target.checked })}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="date"
                            className={fieldClass(r, 'date')}
                            value={r.date || ''}
                            disabled={!!busy && busy !== 'preview'}
                            onChange={(e) => patchRow(idx, { date: e.target.value })}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            className={fieldClass(r, 'amount')}
                            value={r.amountNgn ?? ''}
                            disabled={!!busy && busy !== 'preview'}
                            onChange={(e) =>
                              patchRow(idx, { amountNgn: Math.round(Number(e.target.value) || 0) })
                            }
                          />
                        </td>
                        <td className="px-2 py-1.5 min-w-[10rem]">
                          <select
                            className={fieldClass(r, 'category')}
                            value={r.category || ''}
                            disabled={!!busy && busy !== 'preview'}
                            onChange={(e) => patchRow(idx, { category: e.target.value, categoryRaw: e.target.value })}
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
                            disabled={!!busy && busy !== 'preview'}
                            onChange={(e) => {
                              const id = e.target.value;
                              patchRow(idx, {
                                treasuryAccountId: id,
                                accountKey: id,
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
                            disabled={!!busy && busy !== 'preview'}
                            onChange={(e) => patchRow(idx, { reference: e.target.value })}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            className={FIELD}
                            value={r.paymentMethod || ''}
                            disabled={!!busy && busy !== 'preview'}
                            onChange={(e) => patchRow(idx, { paymentMethod: e.target.value })}
                          />
                        </td>
                        <td className="px-2 py-1.5 min-w-[12rem]">
                          <input
                            className={fieldClass(r, 'description')}
                            value={r.description || ''}
                            disabled={!!busy && busy !== 'preview'}
                            onChange={(e) => patchRow(idx, { description: e.target.value })}
                          />
                        </td>
                        <td className="px-2 py-1.5 min-w-[8rem]">
                          <input
                            className={FIELD}
                            value={r.expenseID || ''}
                            placeholder="optional"
                            disabled={!!busy && busy !== 'preview'}
                            onChange={(e) => patchRow(idx, { expenseID: e.target.value })}
                            title="Clear sample IDs if they already exist in the system"
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
                          {(r.errors || []).length && r.status !== 'ok' ? (
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
                            disabled={!!busy && busy !== 'preview'}
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
                  disabled={busy === 'commit' || !canPost}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setConfirmed(on);
                    confirmedRef.current = on;
                    if (on) setError('');
                  }}
                />
                <span>
                  I confirm these {validCount} ready row(s) should be posted to <strong>{branchTitle}</strong> only.
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

          {busy === 'commit' ? (
            <p className="text-xs font-semibold text-zarewa-teal">Posting expenses…</p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-slate-100 px-4 py-3 sm:px-6">
          {!result?.ok && rows.length > 0 ? (
            <p className="text-[11px] text-slate-500">
              {!canPost
                ? 'Post stays available after every row is Ready. Fix amber/red rows or uncheck them.'
                : !confirmed
                  ? 'Tick the confirmation checkbox above, then click Post.'
                  : `Ready to post ${validCount} expense(s) · ${formatNgn(totalAmount)}.`}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button type="button" className="z-btn-secondary text-xs" onClick={close} disabled={busy === 'commit'}>
              {result?.ok ? 'Close' : 'Cancel'}
            </button>
            {!result?.ok ? (
              <button
                type="button"
                className="z-btn-primary text-xs"
                disabled={busy === 'commit' || !canPost}
                onClick={() => void runCommit()}
              >
                {busy === 'commit' ? 'Posting…' : `Post ${validCount || ''} expense${validCount === 1 ? '' : 's'}`}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </ModalFrame>
  );
}
