import React, { useRef, useState } from 'react';
import { Download, RotateCcw, Upload } from 'lucide-react';
import { apiFetch, apiUrl } from '../../lib/apiBase';
import { HrFormModal } from './HrFormModal';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from './hrFormStyles';

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

  const reset = () => {
    setFile(null);
    setImportMode('update');
    setPreview(null);
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

  const runPreview = async () => {
    if (!file) return;
    setBusy('preview');
    setError('');
    setPreview(null);
    setResult(null);
    const fileBase64 = await fileToBase64(file);
    const { ok, data } = await apiFetch('/api/hr/staff-import/preview', {
      method: 'POST',
      body: JSON.stringify({ fileBase64, importMode }),
    });
    setBusy('');
    if (!ok || !data?.ok) {
      setError(data?.error || 'Preview failed.');
      return;
    }
    setPreview(data);
  };

  const runCommit = async () => {
    if (!file || !preview?.validCount) return;
    if (importMode === 'replace') {
      const count = preview.staffToSuspend ?? preview.summary?.staffToSuspend ?? 0;
      const ok = window.confirm(
        `Replace mode will suspend ${count} active employee account(s) not in the file, then import your Excel.\n\nStaff in the file with matching employee numbers will be updated and reactivated. New rows will be created.\n\nAdmin and MD accounts are never suspended.\n\nContinue?`
      );
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
          Upload the full staff list. Blank or invalid cells are ignored. Each new person gets login{' '}
          <strong>surname.employee-id</strong> with password <strong>Zarewa@123</strong> (change on first login).
          Optional org/comp columns: designation code, payroll group, salary level/step, pay addition, variance type/notes.
        </p>

        <fieldset className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
          <legend className="px-1 text-xs font-bold text-[#134e4a]">Import mode</legend>
          <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="radio"
              name="importMode"
              value="update"
              checked={importMode === 'update'}
              onChange={() => {
                setImportMode('update');
                setPreview(null);
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
          Upload completed Excel (.xlsx)
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className={`${HR_FIELD_CLASS} mt-1`}
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setPreview(null);
              setResult(null);
              setError('');
            }}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={runPreview} disabled={!file || !!busy} className={HR_BTN_SECONDARY}>
            <Upload size={14} className="inline mr-1" aria-hidden />
            {busy === 'preview' ? 'Validating…' : 'Preview & validate'}
          </button>
          <button
            type="button"
            onClick={runCommit}
            disabled={!preview?.validCount || !!busy || !!result}
            className={HR_BTN_PRIMARY}
          >
            {busy === 'commit' ? 'Importing…' : `Import ${preview?.validCount ?? 0} valid row(s)`}
          </button>
          {result ? (
            <button type="button" onClick={close} className={HR_BTN_PRIMARY}>
              Done — view staff list
            </button>
          ) : null}
        </div>

        {busy === 'commit' ? (
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <p className="font-bold">Import in progress</p>
            <p className="mt-1 text-xs">
              Creating {preview?.validCount ?? 0} staff account(s). This can take a minute — please keep this window
              open.
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        ) : null}

        {preview ? (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm space-y-2">
            <p className="font-bold text-[#134e4a]">Validation summary ({preview.importMode === 'replace' ? 'clean & replace' : 'update & add'})</p>
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div><span className="text-slate-500">Total rows</span><p className="font-bold">{preview.totalRows ?? 0}</p></div>
              <div><span className="text-slate-500">Valid</span><p className="font-bold text-emerald-700">{preview.validCount ?? 0}</p></div>
              <div><span className="text-slate-500">New</span><p className="font-bold">{preview.createCount ?? 0}</p></div>
              <div><span className="text-slate-500">Updates</span><p className="font-bold text-blue-700">{preview.updateCount ?? 0}</p></div>
              <div><span className="text-slate-500">Failed</span><p className="font-bold text-red-700">{preview.failedCount ?? 0}</p></div>
              {preview.importMode === 'replace' ? (
                <div className="sm:col-span-3">
                  <span className="text-slate-500">Will suspend before import</span>
                  <p className="font-bold text-amber-700">{preview.staffToSuspend ?? 0} active employee(s)</p>
                </div>
              ) : null}
            </div>
            {preview.errors?.length ? (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-red-100 bg-white p-2 text-xs">
                {preview.errors.slice(0, 30).map((e, i) => (
                  <p key={i} className="text-red-800">
                    Row {e.row}: {e.column ? `${e.column} — ` : ''}{e.message}
                  </p>
                ))}
                {preview.errors.length > 30 ? <p className="text-slate-500">…and {preview.errors.length - 30} more</p> : null}
              </div>
            ) : null}
            {preview.titlesCorrected > 0 ? (
              <p className="text-xs text-blue-800">{preview.titlesCorrected} job title(s) will be corrected on import.</p>
            ) : null}
            {preview.defaultPasswordNote ? (
              <p className="text-xs text-slate-600">{preview.defaultPasswordNote}</p>
            ) : null}
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
            {result.results?.filter((r) => r.status === 'failed').length ? (
              <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-amber-200 bg-white p-2 text-xs">
                {result.results
                  .filter((r) => r.status === 'failed')
                  .slice(0, 20)
                  .map((r) => (
                    <p key={r.rowNum}>
                      Row {r.rowNum}: {r.error || 'Failed'}
                    </p>
                  ))}
              </div>
            ) : null}
            <p className="mt-2 text-xs text-slate-600">
              Click <strong>Done — view staff list</strong> when you are ready. The directory will refresh behind this
              window.
            </p>
          </div>
        ) : null}
      </div>
    </HrFormModal>
  );
}

export default HrBulkStaffImportModal;
