import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { canManageHrSettings } from '../../lib/hrAccess';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HR_FIELD_CLASS } from './hrFormStyles';
import { HrAlert, HrCard, HrButton, HrAddButton, HR_BTN_PRIMARY, HR_BTN_SECONDARY } from './hrPageUi';
import { HrResponsiveTable } from './HrResponsiveTable';

function formatPreviewId(config) {
  const pad = Math.max(3, Math.min(6, Number(config?.padWidth) || 3));
  const start = Math.max(1, Number(config?.startingNumber) || 6);
  const format = config?.format || 'branch_prefixed';
  if (format === 'numeric') return String(start).padStart(pad, '0');
  if (format === 'branch_prefixed') {
    const company = String(config?.companyPrefix || config?.prefix || 'ZAP').trim().toUpperCase();
    const branch = String(config?.reservedBranchCode || 'KD').trim().toUpperCase();
    return `${company}${branch}${String(start).padStart(pad, '0')}`;
  }
  const prefix = String(config?.prefix || 'ZAP').trim();
  return `${prefix}${String(start).padStart(pad, '0')}`;
}

export function HrStaffNumberingPanel() {
  const ws = useWorkspace();
  const canManage = canManageHrSettings(ws?.permissions);
  const [config, setConfig] = useState(null);
  const [preview, setPreview] = useState(null);
  const [sampleNextNumber, setSampleNextNumber] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { ok, data } = await apiFetch('/api/hr/settings/staff-numbering');
    if (ok && data?.ok) {
      setConfig(data.config || {});
      setPreview(data.preview || null);
      setSampleNextNumber(data.sampleNextNumber || '');
    }
  };

  useEffect(() => {
    if (canManage) load();
  }, [canManage]);

  const formatSample = useMemo(() => formatPreviewId(config || {}), [config]);

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
    setMessage('Employee ID format saved.');
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
    setMessage(`Renumbering applied to ${data.updated ?? data.applied ?? 0} staff. Previous numbers kept in history.`);
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
        title="Employee ID format"
        subtitle="Branch IDs like ZAPKD001 (Kaduna), ZAPYL002 (Yola) — sequence is per branch"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">
            Format
            <select
              className={HR_FIELD_CLASS}
              value={config?.format || 'branch_prefixed'}
              onChange={(e) => setConfig({ ...config, format: e.target.value })}
            >
              <option value="branch_prefixed">Branch code + number (ZAPKD001) — recommended</option>
              <option value="prefixed">Single company prefix + number</option>
              <option value="numeric">Numeric only</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Company prefix
            <input
              className={HR_FIELD_CLASS}
              value={config?.companyPrefix || config?.prefix || 'ZAP'}
              disabled={config?.format === 'numeric'}
              onChange={(e) =>
                setConfig({ ...config, companyPrefix: e.target.value.toUpperCase(), prefix: e.target.value.toUpperCase() })
              }
              placeholder="ZAP"
            />
          </label>
          {config?.format === 'branch_prefixed' ? (
            <label className="text-xs font-semibold text-slate-600">
              Executive reserved branch
              <input
                className={HR_FIELD_CLASS}
                value={config?.reservedBranchCode || 'KD'}
                onChange={(e) => setConfig({ ...config, reservedBranchCode: e.target.value.toUpperCase() })}
                placeholder="KD"
              />
            </label>
          ) : (
            <label className="text-xs font-semibold text-slate-600">
              Prefix (legacy single-prefix mode)
              <input
                className={HR_FIELD_CLASS}
                value={config?.prefix || 'ZAP'}
                disabled={config?.format === 'numeric'}
                onChange={(e) => setConfig({ ...config, prefix: e.target.value })}
                placeholder="ZAP"
              />
            </label>
          )}
          <label className="text-xs font-semibold text-slate-600">
            Sequence width (per branch)
            <select
              className={HR_FIELD_CLASS}
              value={config?.padWidth ?? 3}
              onChange={(e) => setConfig({ ...config, padWidth: Number(e.target.value) })}
            >
              <option value={3}>3 digits (001)</option>
              <option value={4}>4 digits (0001)</option>
              <option value={5}>5 digits (00001)</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            First assignable number
            <input
              type="number"
              min={1}
              className={HR_FIELD_CLASS}
              value={config?.startingNumber ?? 6}
              onChange={(e) => setConfig({ ...config, startingNumber: Number(e.target.value) })}
            />
          </label>
        </div>
        <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
          Examples: <span className="font-mono font-bold text-teal-900">ZAPKD001</span>,{' '}
          <span className="font-mono font-bold text-teal-900">ZAPYL002</span>,{' '}
          <span className="font-mono font-bold text-teal-900">ZAPMDG003</span>
          {formatSample ? (
            <>
              {' '}
              · First assignable at HQ/Kaduna slot:{' '}
              <span className="font-mono font-bold text-teal-900">{formatSample}</span>
            </>
          ) : null}
          {sampleNextNumber ? (
            <>
              {' '}
              · Next for your workspace branch:{' '}
              <span className="font-mono font-bold text-teal-900">{sampleNextNumber}</span>
            </>
          ) : null}
        </p>
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-slate-500">Reserved for executive roles</p>
          {(config?.reserved || []).length ? (
            (config?.reserved || []).map((r, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <span className="min-w-[5.5rem] font-mono font-bold text-slate-800">{r.number}</span>
                <span className="text-slate-600">{r.label}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500">ZAPKD001–ZAPKD005 reserved for CEO, MD, and directors at HQ/Kaduna.</p>
          )}
        </div>
        <button type="button" onClick={saveConfig} disabled={busy} className={`${HR_BTN_SECONDARY} mt-4`}>
          Save ID format
        </button>
      </HrCard>

      {previewRows.length ? (
        <HrCard title="Renumbering preview" subtitle="Review proposed IDs before applying — history is retained">
          <HrResponsiveTable
            columns={[
              { key: 'staff', label: 'Staff' },
              { key: 'current', label: 'Current' },
              { key: 'newNo', label: 'Proposed ID' },
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
            Updates display employee IDs for all in-scope staff. Internal user IDs used by payroll are unchanged.
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
