import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';

/**
 * Company-wide operational defaults (manager targets + store restock mins).
 * Personal dashboard prefs stay out of admin Settings.
 */
export default function OrganizationSettingsPanel() {
  const { show: showToast } = useToast();
  const ws = useWorkspace();
  const canEdit = Boolean(ws?.hasPermission?.('settings.view'));

  const [orgMtNaira, setOrgMtNaira] = useState('');
  const [orgMtMeters, setOrgMtMeters] = useState('');
  const [orgMtBusy, setOrgMtBusy] = useState(false);
  const [storeCoilMinKg, setStoreCoilMinKg] = useState('700');
  const [storeStoneMinM, setStoreStoneMinM] = useState('400');
  const [storeSpecOverrides, setStoreSpecOverrides] = useState(
    /** @type {{ family: string, colour: string, gauge: string, minKg: string }[]} */ ([])
  );
  const [storeRestockBusy, setStoreRestockBusy] = useState(false);

  useEffect(() => {
    const o = ws?.snapshot?.orgManagerTargets;
    setOrgMtNaira(o?.nairaTargetPerMonth != null ? String(o.nairaTargetPerMonth) : '');
    setOrgMtMeters(o?.meterTargetPerMonth != null ? String(o.meterTargetPerMonth) : '');
  }, [ws?.snapshot?.orgManagerTargets, ws?.refreshEpoch]);

  useEffect(() => {
    const s = ws?.snapshot?.orgStoreRestock;
    setStoreCoilMinKg(s?.coilRestockMinKg != null ? String(s.coilRestockMinKg) : '700');
    setStoreStoneMinM(s?.stoneRestockMinM != null ? String(s.stoneRestockMinM) : '400');
    const overrides = Array.isArray(s?.specMinOverrides) ? s.specMinOverrides : [];
    setStoreSpecOverrides(
      overrides.map((r) => ({
        family: r.family === 'aluminium' ? 'aluminium' : 'aluzinc',
        colour: String(r.colour || ''),
        gauge: String(r.gauge || ''),
        minKg: String(r.minKg ?? ''),
      }))
    );
  }, [ws?.snapshot?.orgStoreRestock, ws?.refreshEpoch]);

  const persistOrgManagerTargets = async () => {
    setOrgMtBusy(true);
    try {
      const nRaw = orgMtNaira.trim() === '' ? null : Number(String(orgMtNaira).replace(/,/g, ''));
      const mRaw = orgMtMeters.trim() === '' ? null : Number(String(orgMtMeters).replace(/,/g, ''));
      const { ok, data } = await apiFetch('/api/setup/org-manager-targets', {
        method: 'PATCH',
        body: JSON.stringify({
          nairaTargetPerMonth: nRaw,
          meterTargetPerMonth: mRaw,
        }),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not save company targets.', { variant: 'error' });
        return;
      }
      showToast('Company manager targets saved.');
      await ws?.refresh?.();
    } catch (e) {
      showToast(String(e.message || e), { variant: 'error' });
    } finally {
      setOrgMtBusy(false);
    }
  };

  const clearOrgManagerTargets = async () => {
    setOrgMtBusy(true);
    try {
      const { ok, data } = await apiFetch('/api/setup/org-manager-targets', {
        method: 'PATCH',
        body: JSON.stringify({ clear: true }),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not clear company targets.', { variant: 'error' });
        return;
      }
      showToast('Company manager targets cleared.');
      setOrgMtNaira('');
      setOrgMtMeters('');
      await ws?.refresh?.();
    } catch (e) {
      showToast(String(e.message || e), { variant: 'error' });
    } finally {
      setOrgMtBusy(false);
    }
  };

  const persistOrgStoreRestock = async () => {
    setStoreRestockBusy(true);
    try {
      const coil = Number(String(storeCoilMinKg).replace(/,/g, ''));
      const stone = Number(String(storeStoneMinM).replace(/,/g, ''));
      const specMinOverrides = storeSpecOverrides
        .map((r) => ({
          family: r.family === 'aluminium' ? 'aluminium' : 'aluzinc',
          colour: String(r.colour || '').trim(),
          gauge: String(r.gauge || '').trim(),
          minKg: Number(String(r.minKg).replace(/,/g, '')),
        }))
        .filter((r) => r.colour && r.gauge && Number.isFinite(r.minKg) && r.minKg > 0);
      const { ok, data } = await apiFetch('/api/setup/org-store-restock', {
        method: 'PATCH',
        body: JSON.stringify({
          coilRestockMinKg: coil,
          stoneRestockMinM: stone,
          specMinOverrides,
        }),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not save store restock mins.', { variant: 'error' });
        return;
      }
      showToast('Store restock mins saved.');
      await ws?.refresh?.();
    } catch (e) {
      showToast(String(e.message || e), { variant: 'error' });
    } finally {
      setStoreRestockBusy(false);
    }
  };

  if (!canEdit) {
    return (
      <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
        <p className="text-sm font-semibold text-slate-700">Organization defaults need settings access</p>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
          Ask an administrator if you need to change company targets or store restock mins.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-8 rounded-md border border-slate-200/90 bg-white p-6 shadow-sm">
      <div>
        <h3 className="z-section-title mb-1">Company manager targets</h3>
        <p className="mb-4 max-w-xl text-xs leading-relaxed text-slate-500">
          Applies to all users on the Manager dashboard unless they use a personal override on their account.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-ui-xs font-medium text-slate-500">Produced sales target (₦ / month)</span>
            <input
              type="number"
              min={1}
              step={1000}
              value={orgMtNaira}
              onChange={(e) => setOrgMtNaira(e.target.value)}
              className="z-input w-full tabular-nums"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-ui-xs font-medium text-slate-500">Production metres target (m / month)</span>
            <input
              type="number"
              min={1}
              step={1000}
              value={orgMtMeters}
              onChange={(e) => setOrgMtMeters(e.target.value)}
              className="z-input w-full tabular-nums"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={orgMtBusy}
            onClick={() => void persistOrgManagerTargets()}
            className="z-btn-primary gap-2 disabled:opacity-50"
          >
            <Save size={16} /> Save company targets
          </button>
          <button
            type="button"
            disabled={orgMtBusy}
            onClick={() => void clearOrgManagerTargets()}
            className="z-btn-secondary disabled:opacity-50"
          >
            Clear company targets
          </button>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-6">
        <h3 className="z-section-title mb-1">Store restock mins</h3>
        <p className="mb-4 max-w-xl text-xs leading-relaxed text-slate-500">
          On-hand desk and Clear now alert when free + in-transit stock falls below these mins. Defaults: 700 kg
          coils · 400 m stone. Per-spec overrides win over the coil default.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-ui-xs font-medium text-slate-500">Coil restock min (kg)</span>
            <input
              type="number"
              min={1}
              step={50}
              value={storeCoilMinKg}
              onChange={(e) => setStoreCoilMinKg(e.target.value)}
              className="z-input w-full tabular-nums"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-ui-xs font-medium text-slate-500">Stone restock min (m)</span>
            <input
              type="number"
              min={1}
              step={10}
              value={storeStoneMinM}
              onChange={(e) => setStoreStoneMinM(e.target.value)}
              className="z-input w-full tabular-nums"
            />
          </label>
        </div>

        <div className="mt-5">
          <h4 className="mb-2 text-ui-xs font-medium text-slate-500">Per-spec coil mins (optional)</h4>
          {storeSpecOverrides.length === 0 ? (
            <p className="mb-2 text-xs leading-relaxed text-slate-500">
              No per-spec overrides — restock alerts use the coil default above.
            </p>
          ) : null}
          <div className="space-y-2">
            {storeSpecOverrides.map((row, idx) => (
              <div key={`ovr-${idx}`} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-12">
                <label className="block space-y-1 sm:col-span-3">
                  <span className="text-[10px] font-medium text-slate-500">Family</span>
                  <select
                    value={row.family}
                    onChange={(e) => {
                      const v = e.target.value === 'aluminium' ? 'aluminium' : 'aluzinc';
                      setStoreSpecOverrides((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, family: v } : r))
                      );
                    }}
                    className="z-input w-full"
                  >
                    <option value="aluzinc">Aluzinc</option>
                    <option value="aluminium">Aluminium</option>
                  </select>
                </label>
                <label className="block space-y-1 sm:col-span-3">
                  <span className="text-[10px] font-medium text-slate-500">Colour</span>
                  <input
                    type="text"
                    value={row.colour}
                    placeholder="e.g. Gray Beige"
                    onChange={(e) => {
                      const v = e.target.value;
                      setStoreSpecOverrides((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, colour: v } : r))
                      );
                    }}
                    className="z-input w-full"
                  />
                </label>
                <label className="block space-y-1 sm:col-span-2">
                  <span className="text-[10px] font-medium text-slate-500">Gauge</span>
                  <input
                    type="text"
                    value={row.gauge}
                    placeholder="0.28"
                    onChange={(e) => {
                      const v = e.target.value;
                      setStoreSpecOverrides((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, gauge: v } : r))
                      );
                    }}
                    className="z-input w-full tabular-nums"
                  />
                </label>
                <label className="block space-y-1 sm:col-span-2">
                  <span className="text-[10px] font-medium text-slate-500">Min kg</span>
                  <input
                    type="number"
                    min={1}
                    step={50}
                    value={row.minKg}
                    placeholder="Min kg"
                    onChange={(e) => {
                      const v = e.target.value;
                      setStoreSpecOverrides((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, minKg: v } : r))
                      );
                    }}
                    className="z-input w-full tabular-nums"
                  />
                </label>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    className="z-btn-secondary w-full text-xs"
                    onClick={() => setStoreSpecOverrides((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="z-btn-secondary mt-2 text-xs"
            onClick={() =>
              setStoreSpecOverrides((prev) => [
                ...prev,
                { family: 'aluzinc', colour: '', gauge: '', minKg: '' },
              ])
            }
          >
            Add spec override
          </button>
        </div>

        <div className="mt-4">
          <button
            type="button"
            disabled={storeRestockBusy}
            onClick={() => void persistOrgStoreRestock()}
            className="z-btn-primary gap-2 disabled:opacity-50"
          >
            <Save size={16} /> Save store restock mins
          </button>
        </div>
      </div>
    </section>
  );
}
