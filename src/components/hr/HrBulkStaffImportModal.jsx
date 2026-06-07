import React, { useState } from 'react';
import { Download, Upload } from 'lucide-react';
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
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setError('');
    setResult(null);
    setBusy('');
  };

  const close = () => {
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
      body: JSON.stringify({ fileBase64 }),
    });
    setBusy('');
    if (!ok || !data?.ok) {
      setError(data?.error || 'Preview failed.');
      return;
    }
    setPreview(data);
  };

  const runCommit = async () => {
    if (!file) return;
    setBusy('commit');
    setError('');
    const fileBase64 = await fileToBase64(file);
    const { ok, data } = await apiFetch('/api/hr/staff-import/commit', {
      method: 'POST',
      body: JSON.stringify({ fileBase64 }),
    });
    setBusy('');
    if (!ok || !data?.ok) {
      setError(data?.error || 'Import failed.');
      return;
    }
    setResult(data);
    onImported?.(data);
  };

  return (
    <HrFormModal isOpen={open} onClose={close} title="Bulk Register Staff" size="xl">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Download the basic Excel template, fill in existing staff details, then upload for validation and import.
          HR can complete full profiles from employee tabs after import.
        </p>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={downloadTemplate} disabled={!!busy} className={HR_BTN_SECONDARY}>
            <Download size={14} className="inline mr-1" aria-hidden />
            Download template
          </button>
        </div>

        <label className="block text-xs font-semibold text-slate-600">
          Upload completed Excel (.xlsx)
          <input
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
            disabled={!preview?.validCount || !!busy}
            className={HR_BTN_PRIMARY}
          >
            {busy === 'commit' ? 'Importing…' : `Import ${preview?.validCount ?? 0} valid row(s)`}
          </button>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        ) : null}

        {preview ? (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm space-y-2">
            <p className="font-bold text-[#134e4a]">Validation summary</p>
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div><span className="text-slate-500">Total rows</span><p className="font-bold">{preview.totalRows ?? 0}</p></div>
              <div><span className="text-slate-500">Valid</span><p className="font-bold text-emerald-700">{preview.validCount ?? 0}</p></div>
              <div><span className="text-slate-500">Failed</span><p className="font-bold text-red-700">{preview.failedCount ?? 0}</p></div>
              <div><span className="text-slate-500">Duplicates</span><p className="font-bold text-amber-700">{preview.duplicateCount ?? 0}</p></div>
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
            {preview.needsCleanup?.length ? (
              <p className="text-xs text-amber-800">{preview.needsCleanup.length} row(s) flagged for master-data cleanup after import.</p>
            ) : null}
          </div>
        ) : null}

        {result ? (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-bold">Import complete</p>
            <p className="mt-1 text-xs">
              Imported {result.imported ?? 0}, skipped {result.skipped ?? 0}, failed {result.failed ?? 0}.
              Complete remaining profile details from employee profile tabs.
            </p>
          </div>
        ) : null}
      </div>
    </HrFormModal>
  );
}

export default HrBulkStaffImportModal;
