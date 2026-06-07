import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { canManageHrSettings } from '../../lib/hrAccess';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from './hrFormStyles';
import { HrCard } from './hrPageUi';
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
    const { ok, data } = await apiFetch('/api/hr/settings/staff-numbering', {
      method: 'PUT',
      body: JSON.stringify(config || {}),
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not save settings.');
      return;
    }
    setMessage('Staff numbering settings saved.');
    await load();
  };

  const applyRenumber = async () => {
    if (confirm !== 'RESET LIVE STAFF NUMBERS') {
      setError('Type RESET LIVE STAFF NUMBERS to confirm.');
      return;
    }
    setBusy(true);
    setError('');
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
    return <p className="text-sm text-slate-600">Staff numbering requires HR settings permission.</p>;
  }

  const previewRows = (preview?.mappings || []).slice(0, 50).map((m) => ({
    staff: m.displayName || m.userId,
    current: m.currentEmployeeNo || '—',
    newNo: m.newEmployeeNo,
    note: m.reserved ? 'Reserved' : '',
  }));

  return (
    <div className="space-y-4">
      <HrCard title="Staff numbering" subtitle="Reserve 1–5 for CEO/MD/Directors; live numbers start from 6">
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
            Starting number
            <input type="number" min={6} className={HR_FIELD_CLASS} value={config?.startingNumber ?? 6} onChange={(e) => setConfig({ ...config, startingNumber: Number(e.target.value) })} />
          </label>
        </div>
        <div className="mt-3 space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase">Reserved numbers</p>
          {(config?.reserved || []).map((r, i) => (
            <div key={i} className="flex gap-2 text-xs">
              <span className="font-mono font-bold w-8">{r.number}</span>
              <span className="text-slate-600">{r.label}</span>
            </div>
          ))}
        </div>
        <button type="button" onClick={saveConfig} disabled={busy} className={`${HR_BTN_SECONDARY} mt-3`}>Save configuration</button>
      </HrCard>

      {previewRows.length ? (
        <HrCard title="Renumbering preview" subtitle="Review before applying — old numbers kept in audit history">
          <HrResponsiveTable
            columns={[
              { key: 'staff', label: 'Staff' },
              { key: 'current', label: 'Current No' },
              { key: 'newNo', label: 'New No' },
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

      <HrCard title="Apply live renumbering" subtitle="Final action — requires confirmation">
        <p className="text-xs text-red-800 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">
          I understand this will reset live staff employee numbers. Payroll and letters use internal user IDs — employee numbers are display references.
        </p>
        <label className="text-xs font-semibold text-slate-600 block max-w-md">
          Type <span className="font-mono">RESET LIVE STAFF NUMBERS</span> to confirm
          <input className={HR_FIELD_CLASS} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </label>
        <button type="button" onClick={applyRenumber} disabled={busy || preview?.conflicts?.length} className={`${HR_BTN_PRIMARY} mt-3`}>
          Apply renumbering
        </button>
      </HrCard>

      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
    </div>
  );
}

export default HrStaffNumberingPanel;
