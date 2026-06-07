import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { canManageHrSettings } from '../../lib/hrAccess';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from './hrFormStyles';
import { HrCard } from './hrPageUi';

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
    const { ok, data } = await apiFetch('/api/hr/settings/letter-references/reset', {
      method: 'POST',
      body: JSON.stringify({ confirmPhrase: confirm, archiveTestLetters: true }),
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Reset failed.');
      return;
    }
    setMessage(`Letter references reset. Next reference: ${data.nextReference || '—'}`);
    setConfirm('');
    await load();
  };

  if (!canManage) {
    return <p className="text-sm text-slate-600">Letter reference settings require HR settings permission.</p>;
  }

  return (
    <div className="space-y-4">
      <HrCard title="Letter reference numbering" subtitle="Official references assigned on issue only — ZAR/HR/{TYPE}/{YEAR}/{SEQ}">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">
            Prefix
            <input className={HR_FIELD_CLASS} value={config?.prefix || 'ZAR/HR'} onChange={(e) => setConfig({ ...config, prefix: e.target.value })} />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Reset mode
            <select className={HR_FIELD_CLASS} value={config?.resetMode || 'yearly'} onChange={(e) => setConfig({ ...config, resetMode: e.target.value })}>
              <option value="yearly">Yearly reset</option>
              <option value="manual">Manual reset</option>
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
          <p className="mt-2 text-xs text-slate-500">Last issued: <span className="font-mono font-semibold">{config.lastIssuedReference}</span></p>
        ) : null}
        {preview?.length ? (
          <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
            <p className="font-bold text-slate-600 mb-1">Preview next references (appointment)</p>
            {preview.map((ref) => (
              <p key={ref} className="font-mono">{ref}</p>
            ))}
          </div>
        ) : null}
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={saveConfig} disabled={busy} className={HR_BTN_SECONDARY}>Save settings</button>
        </div>
      </HrCard>

      <HrCard title="Reset for live use" subtitle="MD/Admin only — archives test letters and starts clean sequence">
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
          This action resets live letter reference sequences. Existing test/draft letters can be archived.
        </p>
        <label className="text-xs font-semibold text-slate-600 block max-w-md">
          Type <span className="font-mono">RESET LETTER REFERENCES</span> to confirm
          <input className={HR_FIELD_CLASS} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </label>
        <button type="button" onClick={resetForLive} disabled={busy} className={`${HR_BTN_PRIMARY} mt-3`}>
          Reset letter references for live use
        </button>
      </HrCard>

      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
    </div>
  );
}

export default HrLetterReferencePanel;
