import { HrButton, HrAddButton } from '../../components/hr/hrPageUi';
import React, { useEffect, useState } from 'react';
import { patchDisciplineCase } from '../../lib/hrDisciplineCases';
import { HR_FIELD_CLASS } from './hrFormStyles';

export default function HrCaseAssetLinkPanel({ caseId, detail, canManage, onSaved }) {
  const [assetId, setAssetId] = useState(detail?.assetId || '');
  const [machineId, setMachineId] = useState(detail?.machineId || '');
  const [location, setLocation] = useState('');
  const [shift, setShift] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    setAssetId(detail?.assetId || '');
    setMachineId(detail?.machineId || '');
    try {
      const meta = detail?.meta && typeof detail.meta === 'object' ? detail.meta : JSON.parse(detail?.metaJson || '{}');
      setLocation(meta?.location || '');
      setShift(meta?.shift || '');
    } catch {
      setLocation('');
      setShift('');
    }
  }, [detail?.assetId, detail?.machineId, detail?.meta, detail?.metaJson]);

  const save = async () => {
    setErr('');
    setBusy(true);
    const { ok, data } = await patchDisciplineCase(caseId, {
      assetId: assetId.trim() || null,
      machineId: machineId.trim() || null,
      meta: { location: location.trim() || null, shift: shift.trim() || null },
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setErr(data?.error || 'Could not save asset link.');
      return;
    }
    onSaved?.();
  };

  return (
    <div className="space-y-3 border-t border-slate-200 pt-4 mt-4">
      <h4 className="text-sm font-semibold text-slate-800">Asset & location</h4>
      <p className="text-xs text-slate-500">Link the missing or damaged item before custody logging and audit export.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-600">
          Asset ID
          <input className={HR_FIELD_CLASS} value={assetId} disabled={!canManage} onChange={(e) => setAssetId(e.target.value)} placeholder="e.g. PUMP-FACT-002" />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Machine ID
          <input className={HR_FIELD_CLASS} value={machineId} disabled={!canManage} onChange={(e) => setMachineId(e.target.value)} placeholder="Optional" />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Location
          <input className={HR_FIELD_CLASS} value={location} disabled={!canManage} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. factory store" />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Shift
          <input className={HR_FIELD_CLASS} value={shift} disabled={!canManage} onChange={(e) => setShift(e.target.value)} placeholder="e.g. night shift" />
        </label>
      </div>
      {err ? <p className="text-sm text-red-700">{err}</p> : null}
      {canManage ? (
        <HrButton type="button" variant="secondary" disabled={busy} onClick={save}>
          Save asset link
        </HrButton>
      ) : null}
    </div>
  );
}
