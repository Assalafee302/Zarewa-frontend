import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { canManageHrSettings } from '../../lib/hrAccess';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from './hrFormStyles';
import { HrAlert, HrCard } from './hrPageUi';
import { HrResponsiveTable } from './HrResponsiveTable';

export function HrStaffNumberingPanel() {
  const ws = useWorkspace();
  const canManage = canManageHrSettings(ws?.permissions);
  const [config, setConfig] = useState(null);
  const [preview, setPreview] = useState(null);
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { ok, data } = await apiFetch('/api/hr/settings/staff-numbering');
    if (ok && data?.ok) {
      setConfig(data.config || {});
      setPreview(data.preview || null);
    }
  };

  useEffect(() => {
    if (canManage) load();
  }, [canManage]);

  const saveConfig = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    const { ok, data } = await apiFetch('/api/hr/settings/staff-numbering', {
      method: 'PUT',
      body: JSON.stringify(config || {}),
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not save settings.');
      return;
    }
    setMessage('Employee number format saved.');
    await load();
  };

  const applyRenumber = async () => {
    if (confirm !== 'RESET LIVE STAFF NUMBERS') {
      setError('Type RESET LIVE STAFF NUMBERS to confirm.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    const { ok, data } = await apiFetch('/api/hr/settings/staff-numbering/apply', {
      method: 'POST',
      body: JSON.stringify({ confirmPhrase: confirm, config }),
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || data?.conflicts?.length ? 'Conflicts detected — resolve before applying.' : 'Apply failed.');
      return;
    }
    setMessage(`Renumbering applied to ${data.updated ?? 0} staff. Previous numbers kept in history.`);
    setConfirm('');
    await load();
  };

  if (!canManage) {
    return <p className="text-sm text-slate-600">Staff numbering requires HR administration access.</p>;
  }

  const previewRows = (preview?.mappings || []).slice(0, 50).map((m) => ({
    staff: m.displayName || m.userId,
    current: m.currentEmployeeNo || '—',
    newNo: m.newEmployeeNo,
    note: m.reserved ? 'Reserved' : '',
  }));

  return (
    <div className="space-y-6">
      {error ? <HrAlert tone="error">{error}</HrAlert> : null}
      {message ? <HrAlert tone="success">{message}</HrAlert> : null}

      <HrCard
        title="Employee numbers"
        subtitle="Display reference on ID cards and letters — payroll and audit use internal user IDs"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">
            Format
            <select className={HR_FIELD_CLASS} value={config?.format || 'numeric'} onChange={(e) => setConfig({ ...config, format: e.target.value })}>
              <option value="numeric">Numeric only</option>
              <option value="prefixed">Prefix + number</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Prefix (if prefixed)
            <input className={HR_FIELD_CLASS} value={config?.prefix || ''} onChange={(e) => setConfig({ ...config, prefix: e.target.value })} placeholder="ZAR-" />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            First assignable number
            <input type="number" min={6} className={HR_FIELD_CLASS} value={config?.startingNumber ?? 6} onChange={(e) => setConfig({ ...config, startingNumber: Number(e.target.value) })} />
          </label>
        </div>
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-slate-500">Reserved for executive roles</p>
          {(config?.reserved || []).length ? (
            (config?.reserved || []).map((r, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <span className="w-8 font-mono font-bold">{r.number}</span>
                <span className="text-slate-600">{r.label}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500">Numbers 1–5 are typically reserved for CEO, MD, and directors.</p>
          )}
        </div>
        <button type="button" onClick={saveConfig} disabled={busy} className={`${HR_BTN_SECONDARY} mt-4`}>
          Save number format
        </button>
      </HrCard>

      {previewRows.length ? (
        <HrCard title="Renumbering preview" subtitle="Review proposed numbers before applying — history is retained">
          <HrResponsiveTable
            columns={[
              { key: 'staff', label: 'Staff' },
              { key: 'current', label: 'Current' },
              { key: 'newNo', label: 'Proposed' },
              { key: 'note', label: 'Note' },
            ]}
            rows={previewRows}
            mobileCards
          />
          {preview?.conflicts?.length ? (
            <p className="mt-2 text-xs text-red-800">{preview.conflicts.length} conflict(s) must be resolved before apply.</p>
          ) : null}
        </HrCard>
      ) : null}

      <details className="rounded-2xl border border-red-100 bg-red-50/20 shadow-sm">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-red-950 sm:px-5">
          Apply live renumbering (confirmation required)
        </summary>
        <div className="border-t border-red-100/80 px-4 pb-4 pt-3 sm:px-5">
          <p className="mb-3 text-xs text-red-900/90">
            Updates display employee numbers for all in-scope staff. Internal user IDs used by payroll are unchanged.
          </p>
          <label className="text-xs font-semibold text-slate-600 block max-w-md">
            Type <span className="font-mono">RESET LIVE STAFF NUMBERS</span> to confirm
            <input className={HR_FIELD_CLASS} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </label>
          <button type="button" onClick={applyRenumber} disabled={busy || preview?.conflicts?.length} className={`${HR_BTN_PRIMARY} mt-3`}>
            Apply renumbering
          </button>
        </div>
      </details>
    </div>
  );
}

export default HrStaffNumberingPanel;
