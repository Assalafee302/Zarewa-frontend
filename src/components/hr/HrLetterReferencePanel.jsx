import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { canManageHrSettings } from '../../lib/hrAccess';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HR_FIELD_CLASS } from './hrFormStyles';
import { HrAlert, HrCard, HrButton, HrAddButton, HR_BTN_PRIMARY, HR_BTN_SECONDARY } from './hrPageUi';

export function HrLetterReferencePanel() {
  const ws = useWorkspace();
  const canManage = canManageHrSettings(ws?.permissions);
  const [config, setConfig] = useState(null);
  const [preview, setPreview] = useState([]);
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { ok, data } = await apiFetch('/api/hr/settings/letter-references');
    if (ok && data?.ok) {
      setConfig(data.config || {});
      setPreview(data.previewNext || []);
    }
  };

  useEffect(() => {
    if (canManage) load();
  }, [canManage]);

  const saveConfig = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    const { ok, data } = await apiFetch('/api/hr/settings/letter-references', {
      method: 'PUT',
      body: JSON.stringify(config || {}),
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not save settings.');
      return;
    }
    setMessage('Letter reference settings saved.');
    await load();
  };

  const resetForLive = async () => {
    if (confirm !== 'RESET LETTER REFERENCES') {
      setError('Type RESET LETTER REFERENCES to confirm.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    const { ok, data } = await apiFetch('/api/hr/settings/letter-references/reset', {
      method: 'POST',
      body: JSON.stringify({ confirmPhrase: confirm, archiveTestLetters: true }),
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Reset failed.');
      return;
    }
    setMessage(`Sequence reset. Next reference: ${data.nextReference || '—'}`);
    setConfirm('');
    await load();
  };

  if (!canManage) {
    return <p className="text-sm text-slate-600">Letter reference settings require HR administration access.</p>;
  }

  return (
    <div className="space-y-6">
      {error ? <HrAlert tone="error">{error}</HrAlert> : null}
      {message ? <HrAlert tone="success">{message}</HrAlert> : null}

      <HrCard
        title="Letter references"
        subtitle="Format: prefix / letter type / year / sequence — assigned when a letter is issued"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">
            Prefix
            <input className={HR_FIELD_CLASS} value={config?.prefix || 'ZAR/HR'} onChange={(e) => setConfig({ ...config, prefix: e.target.value })} />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Sequence reset
            <select className={HR_FIELD_CLASS} value={config?.resetMode || 'yearly'} onChange={(e) => setConfig({ ...config, resetMode: e.target.value })}>
              <option value="yearly">Reset each calendar year</option>
              <option value="manual">Manual reset only</option>
              <option value="never">Never reset</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Current year
            <input className={HR_FIELD_CLASS} value={config?.year || new Date().getFullYear()} onChange={(e) => setConfig({ ...config, year: e.target.value })} />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Starting sequence
            <input type="number" className={HR_FIELD_CLASS} value={config?.startingSequence ?? 1} onChange={(e) => setConfig({ ...config, startingSequence: Number(e.target.value) })} />
          </label>
        </div>
        {config?.lastIssuedReference ? (
          <p className="mt-3 text-xs text-slate-500">
            Last issued: <span className="font-mono font-semibold text-slate-700">{config.lastIssuedReference}</span>
          </p>
        ) : null}
        {preview?.length ? (
          <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <p className="text-xs font-semibold text-slate-500">Next appointment reference preview</p>
            {preview.map((ref) => (
              <p key={ref} className="mt-1 font-mono text-sm text-slate-800">
                {ref}
              </p>
            ))}
          </div>
        ) : null}
        <button type="button" onClick={saveConfig} disabled={busy} className={`${HR_BTN_SECONDARY} mt-4`}>
          Save reference settings
        </button>
      </HrCard>

      <details className="rounded-2xl border border-amber-100 bg-amber-50/30 shadow-sm">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-amber-950 sm:px-5">
          Production reset (executive confirmation required)
        </summary>
        <div className="border-t border-amber-100/80 px-4 pb-4 pt-3 sm:px-5">
          <p className="mb-3 text-xs text-amber-900/90">
            Archives test and draft letters and starts a clean live sequence. Use once before go-live or after UAT.
          </p>
          <label className="text-xs font-semibold text-slate-600 block max-w-md">
            Type <span className="font-mono">RESET LETTER REFERENCES</span> to confirm
            <input className={HR_FIELD_CLASS} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </label>
          <button type="button" onClick={resetForLive} disabled={busy} className={`${HR_BTN_PRIMARY} mt-3`}>
            Reset live sequence
          </button>
        </div>
      </details>
    </div>
  );
}

export default HrLetterReferencePanel;
