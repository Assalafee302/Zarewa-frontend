import React, { useEffect, useRef, useState } from 'react';
import { Download, RotateCcw, Upload } from 'lucide-react';
import { apiFetch, apiUrl } from '../../lib/apiBase';
import { appConfirm } from '../../lib/appConfirm';
import { HrFormModal } from './HrFormModal';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from './hrFormStyles';
import { HrResponsiveTable } from './HrResponsiveTable';

async function fileToBase64(file) {
  const buf = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function HrBulkStaffImportModal({ open, onClose, onImported }) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [importMode, setImportMode] = useState('update');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [previewConfirmed, setPreviewConfirmed] = useState(false);

  const reset = () => {
    setFile(null);
    setImportMode('update');
    setPreview(null);
    setPreviewConfirmed(false);
    setError('');
    setResult(null);
    setBusy('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const close = () => {
    if (busy) return;
    reset();
    onClose?.();
  };

  const downloadTemplate = async () => {
    setBusy('template');
    try {
      const r = await fetch(apiUrl('/api/hr/staff-import/template'), { credentials: 'include' });
      if (!r.ok) {
        setError('Could not download template.');
        return;
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'zarewa-staff-import-template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy('');
    }
  };

  const runPreview = async (selectedFile = file) => {
    if (!selectedFile) return;
    setBusy('preview');
    setError('');
    setPreview(null);
    setPreviewConfirmed(false);
    setResult(null);
    const fileBase64 = await fileToBase64(selectedFile);
    const { ok, data } = await apiFetch('/api/hr/staff-import/preview', {
      method: 'POST',
      body: JSON.stringify({ fileBase64, importMode }),
    });
    setBusy('');
    if (!ok || !data?.ok) {
      const extra =
        data?.unmatchedHeaders?.length && !data?.matchedColumns?.length
          ? ` Headers found: ${data.unmatchedHeaders.slice(0, 8).join(', ')}`
          : '';
      setError((data?.error || 'Preview failed.') + extra);
      return;
    }
    setPreview(data);
  };

  useEffect(() => {
    if (!file || result) return;
    const t = setTimeout(() => {
      void runPreview(file);
    }, 400);
    return () => clearTimeout(t);
  }, [file, importMode]);

  const runCommit = async () => {
    if (!file || !preview?.validCount || !previewConfirmed) return;
    if (importMode === 'replace') {
      const count = preview.staffToSuspend ?? preview.summary?.staffToSuspend ?? 0;
      const ok = await appConfirm({
        message: `Replace mode will suspend ${count} active employee account(s) not in the file, then import your Excel.\n\nStaff in the file with matching employee numbers will be updated and reactivated. New rows will be created.\n\nAdmin and MD accounts are never suspended.\n\nContinue?`,
      });
      if (!ok) return;
    }
    setBusy('commit');
    setError('');
    setResult(null);
    try {
      const fileBase64 = await fileToBase64(file);
      const { ok, data } = await apiFetch('/api/hr/staff-import/commit', {
        method: 'POST',
        body: JSON.stringify({ fileBase64, importMode }),
      });
      if (!ok || !data?.ok) {
        setError(data?.error || 'Import failed.');
        return;
      }
      setResult(data);
      await onImported?.(data);
    } catch (e) {
      setError(String(e?.message || e || 'Import failed — connection lost. Try again.'));
    } finally {
      setBusy('');
    }
  };

  const previewRows = (preview?.previewTable || []).map((r) => ({
    row: r.row,
    name: r.name,
    employeeId: r.employeeId,
    action: r.action,
    username: r.username,
    jobTitle: r.jobTitle,
    status: r.status,
    notes:
      r.errorCount > 0
        ? `${r.errorCount} error(s)`
        : r.warningCount > 0
          ? `${r.warningCount} note(s)`
          : '',
  }));

  return (
    <HrFormModal
      isOpen={open}
      onClose={close}
      title="Bulk Register Staff"
      size="xl"
      closeDisabled={!!busy}
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Upload your staff list — fill only the columns you have. <strong>Blank cells are skipped</strong> and leave
          that field empty on the employee record. Each new person gets login <strong>same as employee ID</strong> (e.g.{' '}
          <strong>zapkd001</strong>) with password <strong>Zarewa@123</strong>. Use the{' '}
          <strong>Username (existing login)</strong> column only to link someone who already has a login. Preview runs
          automatically before you can import.
        </p>

        <fieldset className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
          <legend className="px-1 text-xs font-bold text-zarewa-teal">Import mode</legend>
          <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="radio"
              name="importMode"
              value="update"
              checked={importMode === 'update'}
              onChange={() => {
                setImportMode('update');
                setPreview(null);
                setPreviewConfirmed(false);
                setResult(null);
              }}
              className="mt-1"
            />
            <span>
              <strong>Update &amp; add</strong> — keep existing staff; update rows with matching employee numbers; add new
              staff only.
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="radio"
              name="importMode"
              value="replace"
              checked={importMode === 'replace'}
              onChange={() => {
                setImportMode('replace');
                setPreview(null);
                setPreviewConfirmed(false);
                setResult(null);
              }}
              className="mt-1"
            />
            <span>
              <strong>Clean &amp; replace</strong> — suspend all current employee accounts first, then import fresh from
              Excel. Staff not in the file stay suspended.
            </span>
          </label>
        </fieldset>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={downloadTemplate} disabled={!!busy} className={HR_BTN_SECONDARY}>
            <Download size={14} className="inline mr-1" aria-hidden />
            Download template
          </button>
          <button type="button" onClick={reset} disabled={!!busy} className={HR_BTN_SECONDARY}>
            <RotateCcw size={14} className="inline mr-1" aria-hidden />
            Reset upload
          </button>
        </div>

        <label className="block text-xs font-semibold text-slate-600">
          Upload completed Excel (.xlsx, .xls, or .csv)
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            className={`${HR_FIELD_CLASS} mt-1`}
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setPreview(null);
              setPreviewConfirmed(false);
              setResult(null);
              setError('');
            }}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => runPreview()} disabled={!file || !!busy} className={HR_BTN_SECONDARY}>
            <Upload size={14} className="inline mr-1" aria-hidden />
            {busy === 'preview' ? 'Previewing…' : 'Refresh preview'}
          </button>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        ) : null}

        {preview ? (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm space-y-3">
            <p className="font-bold text-zarewa-teal">
              Step 1 — Preview ({preview.importMode === 'replace' ? 'clean & replace' : 'update & add'})
            </p>

            {preview.matchedColumns?.length ? (
              <p className="text-xs text-slate-500">
                Matched {preview.matchedColumns.length} column(s) from your file
                {preview.sheetName ? ` (sheet: ${preview.sheetName})` : ''}.
              </p>
            ) : null}

            {preview.unmatchedHeaders?.length ? (
              <p className="text-xs text-slate-500">
                Unrecognized headers (ignored): {preview.unmatchedHeaders.slice(0, 12).join(', ')}
                {preview.unmatchedHeaders.length > 12 ? '…' : ''}
              </p>
            ) : null}

            {!previewRows.length ? (
              <p className="text-xs text-amber-800 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
                No importable rows found. Check that employee names or IDs are filled in below the header row.
              </p>
            ) : null}

            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div>
                <span className="text-slate-500">Total rows</span>
                <p className="font-bold">{preview.totalRows ?? 0}</p>
              </div>
              <div>
                <span className="text-slate-500">Ready to import</span>
                <p className="font-bold text-emerald-700">{preview.validCount ?? 0}</p>
              </div>
              <div>
                <span className="text-slate-500">New</span>
                <p className="font-bold">{preview.createCount ?? 0}</p>
              </div>
              <div>
                <span className="text-slate-500">Updates</span>
                <p className="font-bold text-blue-700">{preview.updateCount ?? 0}</p>
              </div>
              <div>
                <span className="text-slate-500">Blocked</span>
                <p className="font-bold text-red-700">{preview.failedCount ?? 0}</p>
              </div>
              {preview.importMode === 'replace' ? (
                <div className="sm:col-span-3">
                  <span className="text-slate-500">Will suspend before import</span>
                  <p className="font-bold text-amber-700">{preview.staffToSuspend ?? 0} active employee(s)</p>
                </div>
              ) : null}
            </div>

            {previewRows.length ? (
              <div className="max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white">
                <HrResponsiveTable
                  columns={[
                    { key: 'row', label: 'Row' },
                    { key: 'name', label: 'Name' },
                    { key: 'employeeId', label: 'Employee ID' },
                    { key: 'action', label: 'Action' },
                    { key: 'username', label: 'Login' },
                    { key: 'jobTitle', label: 'Job title' },
                    { key: 'status', label: 'Status' },
                    { key: 'notes', label: 'Notes' },
                  ]}
                  rows={previewRows}
                  mobileCards
                />
              </div>
            ) : null}

            {preview.errors?.length ? (
              <div className="max-h-32 overflow-y-auto rounded-lg border border-red-100 bg-white p-2 text-xs">
                {preview.errors.slice(0, 20).map((e, i) => (
                  <p key={i} className="text-red-800">
                    Row {e.row}: {e.column ? `${e.column} — ` : ''}
                    {e.message}
                  </p>
                ))}
                {preview.errors.length > 20 ? (
                  <p className="text-slate-500">…and {preview.errors.length - 20} more</p>
                ) : null}
              </div>
            ) : null}

            {preview.defaultPasswordNote ? (
              <p className="text-xs text-slate-600">{preview.defaultPasswordNote}</p>
            ) : null}

            <div className="rounded-xl border border-teal-100 bg-teal-50/50 px-4 py-3 space-y-3">
              <p className="text-xs font-bold text-teal-950">Step 2 — Confirm import</p>
              <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={previewConfirmed}
                  onChange={(e) => setPreviewConfirmed(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  I have reviewed the preview. Import <strong>{preview.validCount ?? 0}</strong> ready row(s). Rows with
                  errors will be skipped; blank fields stay empty on each profile.
                </span>
              </label>
              <button
                type="button"
                onClick={runCommit}
                disabled={!preview?.validCount || !previewConfirmed || !!busy || !!result}
                className={HR_BTN_PRIMARY}
              >
                {busy === 'commit' ? 'Importing…' : `Import ${preview?.validCount ?? 0} row(s)`}
              </button>
            </div>
          </div>
        ) : file && busy === 'preview' ? (
          <p className="text-xs text-slate-500">Running preview — checking each row…</p>
        ) : null}

        {busy === 'commit' ? (
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <p className="font-bold">Import in progress</p>
            <p className="mt-1 text-xs">
              Creating {preview?.validCount ?? 0} staff account(s). This can take a minute — please keep this window
              open.
            </p>
          </div>
        ) : null}

        {result ? (
          <div
            className={`rounded-xl border p-4 text-sm ${
              (result.commitFailed ?? 0) > 0 || (result.failed ?? 0) > 0
                ? 'border-amber-100 bg-amber-50 text-amber-950'
                : 'border-emerald-100 bg-emerald-50 text-emerald-900'
            }`}
          >
            <p className="font-bold">
              {(result.imported ?? 0) + (result.updated ?? 0) > 0 ? 'Import finished' : 'Import could not complete'}
            </p>
            <p className="mt-1 text-xs">
              Imported {result.imported ?? 0}, updated {result.updated ?? 0}
              {result.suspended ? `, suspended ${result.suspended}` : ''}, skipped {result.skipped ?? 0}, failed{' '}
              {result.failed ?? 0}.
            </p>
            <button type="button" onClick={close} className={`${HR_BTN_PRIMARY} mt-3`}>
              Done — view staff list
            </button>
          </div>
        ) : null}
      </div>
    </HrFormModal>
  );
}

export default HrBulkStaffImportModal;
