import React, { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { MainPanel, PageHeader } from '../components/layout';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import { apiFetch, apiUrl } from '../lib/apiBase';
import { Printer } from 'lucide-react';

export default function PricingPolicyAdmin() {
  const ws = useWorkspace();
  const { show: showToast } = useToast();
  const canPolicy = ws?.hasPermission?.('pricing.policy.manage') || ws?.hasPermission?.('*');
  const canView = canPolicy || ws?.hasPermission?.('pricing.manage') || ws?.hasPermission?.('md.price_exception.approve');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaultBand, setDefaultBand] = useState('50');
  const [tiers, setTiers] = useState([]);
  const [ridgeAddOns, setRidgeAddOns] = useState([]);
  const [aliases, setAliases] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { ok, data } = await apiFetch('/api/pricing/policy');
    setLoading(false);
    if (!ok || !data?.ok) {
      showToast(data?.error || 'Could not load pricing policy.', { variant: 'error' });
      return;
    }
    setDefaultBand(String(data.policy?.defaultTradingBandNgn ?? 50));
    setTiers(Array.isArray(data.tiers) ? data.tiers : []);
    setRidgeAddOns(Array.isArray(data.ridgeAddOns) ? data.ridgeAddOns : []);
    setAliases(Array.isArray(data.profileAliases) ? data.profileAliases : []);
  }, [showToast]);

  useEffect(() => {
    if (!canView) return;
    void load();
  }, [canView, load]);

  const save = async (e) => {
    e.preventDefault();
    if (!canPolicy) return;
    setSaving(true);
    const { ok, data } = await apiFetch('/api/pricing/policy', {
      method: 'PATCH',
      body: JSON.stringify({
        defaultTradingBandNgn: Math.round(Number(defaultBand) || 0),
        tiers: tiers.map((t) => ({
          id: t.id,
          gaugeMinMm: Number(t.gaugeMinMm),
          gaugeMaxMm: Number(t.gaugeMaxMm),
          bandNgn: Math.round(Number(t.bandNgn) || 0),
        })),
        ridgeAddOns: ridgeAddOns.map((r) => ({
          id: r.id,
          girthMm: Number(r.girthMm),
          materialFamily: r.materialFamily || '',
          addOnNgn: Math.round(Number(r.addOnNgn) || 0),
          ...(String(r.listAddOnNgn ?? '').trim() !== '' && Number.isFinite(Number(r.listAddOnNgn))
            ? { listAddOnNgn: Math.max(0, Math.round(Number(r.listAddOnNgn))) }
            : {}),
        })),
        profileAliases: aliases.map((a) => ({
          id: a.id,
          aliasKey: a.aliasKey,
          canonicalDesignKey: a.canonicalDesignKey,
          canonicalProfileKey: a.canonicalProfileKey || '',
        })),
      }),
    });
    setSaving(false);
    if (!ok || !data?.ok) {
      showToast(data?.error || 'Could not save.', { variant: 'error' });
      return;
    }
    showToast('Pricing policy saved.');
    void load();
  };

  const openCustomerPriceBook = () => {
    const u = apiUrl('/api/pricing/customer-price-book.html');
    window.open(u, '_blank', 'noopener,noreferrer');
  };

  if (!canView) {
    return <Navigate to="/" replace />;
  }

  return (
    <MainPanel className="min-w-0">
      <PageHeader
        title="Pricing policy"
        subtitle="Trading bands (₦/m below recommended without MD), ridge add-ons, and profile aliases. MD and administrators may edit."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={openCustomerPriceBook}
          className="inline-flex items-center gap-2 rounded-xl border border-[#134e4a]/30 bg-[#134e4a]/5 px-4 py-2 text-[11px] font-black uppercase text-[#134e4a]"
        >
          <Printer size={16} />
          Customer price book (print)
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-600">Loading…</p>
      ) : (
        <form onSubmit={save} className="max-w-4xl space-y-8">
          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-3">
            <h2 className="text-xs font-black uppercase text-[#134e4a]">Default trading band</h2>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              When no gauge tier matches, this ₦/m allowance below <strong>recommended</strong> (but not below <strong>floor</strong>) applies without MD approval.
            </p>
            <label className="block text-[10px] font-bold text-slate-500 uppercase">
              ₦ / metre
              <input
                type="number"
                min={0}
                className="mt-1 w-40 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"
                value={defaultBand}
                onChange={(e) => setDefaultBand(e.target.value)}
                disabled={!canPolicy}
              />
            </label>
          </section>

          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-3">
            <h2 className="text-xs font-black uppercase text-[#134e4a]">Gauge tiers</h2>
            <p className="text-[11px] text-slate-600">First matching row wins (by sort order). Gauge mm parsed from label (e.g. 0.55 full → 0.55).</p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-[10px] font-bold uppercase text-slate-500">
                    <th className="py-2 pr-3">Min mm</th>
                    <th className="py-2 pr-3">Max mm</th>
                    <th className="py-2 pr-3">Band ₦/m</th>
                  </tr>
                </thead>
                <tbody>
                  {tiers.map((t, i) => (
                    <tr key={t.id || i} className="border-t border-slate-100">
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          step="0.001"
                          className="w-24 rounded border border-slate-200 px-2 py-1"
                          value={t.gaugeMinMm}
                          onChange={(e) => {
                            const next = [...tiers];
                            next[i] = { ...next[i], gaugeMinMm: e.target.value };
                            setTiers(next);
                          }}
                          disabled={!canPolicy}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          step="0.001"
                          className="w-24 rounded border border-slate-200 px-2 py-1"
                          value={t.gaugeMaxMm}
                          onChange={(e) => {
                            const next = [...tiers];
                            next[i] = { ...next[i], gaugeMaxMm: e.target.value };
                            setTiers(next);
                          }}
                          disabled={!canPolicy}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={0}
                          className="w-24 rounded border border-slate-200 px-2 py-1"
                          value={t.bandNgn}
                          onChange={(e) => {
                            const next = [...tiers];
                            next[i] = { ...next[i], bandNgn: e.target.value };
                            setTiers(next);
                          }}
                          disabled={!canPolicy}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-3">
            <h2 className="text-xs font-black uppercase text-[#134e4a]">Ridge add-ons</h2>
            <p className="text-[11px] text-slate-600">
              <strong>Add-on ₦/m</strong> is used in ridge floor math. <strong>Customer list ₦/m</strong> is optional: when set, that value is
              what appears on the customer price list / print for the add-on row; leave blank to use the same as add-on.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {canPolicy ? (
                <button
                  type="button"
                  onClick={() =>
                    setRidgeAddOns((prev) => [...prev, { id: '', girthMm: '', materialFamily: '', addOnNgn: '', listAddOnNgn: '' }])
                  }
                  className="rounded-lg border border-dashed border-[#134e4a]/40 bg-teal-50/80 px-3 py-2 text-[10px] font-black uppercase text-[#134e4a]"
                >
                  Add ridge row
                </button>
              ) : null}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-[10px] font-bold uppercase text-slate-500">
                    <th className="py-2 pr-3">Girth mm</th>
                    <th className="py-2 pr-3">Material family</th>
                    <th className="py-2 pr-3">Add-on ₦/m</th>
                    <th className="py-2 pr-3">Customer list ₦/m</th>
                  </tr>
                </thead>
                <tbody>
                  {ridgeAddOns.map((r, i) => (
                    <tr key={r.id || i} className="border-t border-slate-100">
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          className="w-24 rounded border border-slate-200 px-2 py-1"
                          value={r.girthMm}
                          onChange={(e) => {
                            const next = [...ridgeAddOns];
                            next[i] = { ...next[i], girthMm: e.target.value };
                            setRidgeAddOns(next);
                          }}
                          disabled={!canPolicy}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          className="w-40 rounded border border-slate-200 px-2 py-1"
                          value={r.materialFamily}
                          onChange={(e) => {
                            const next = [...ridgeAddOns];
                            next[i] = { ...next[i], materialFamily: e.target.value };
                            setRidgeAddOns(next);
                          }}
                          disabled={!canPolicy}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={0}
                          className="w-24 rounded border border-slate-200 px-2 py-1"
                          value={r.addOnNgn}
                          onChange={(e) => {
                            const next = [...ridgeAddOns];
                            next[i] = { ...next[i], addOnNgn: e.target.value };
                            setRidgeAddOns(next);
                          }}
                          disabled={!canPolicy}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={0}
                          placeholder="Same as add-on"
                          className="w-28 rounded border border-slate-200 px-2 py-1"
                          value={r.listAddOnNgn ?? ''}
                          onChange={(e) => {
                            const next = [...ridgeAddOns];
                            next[i] = { ...next[i], listAddOnNgn: e.target.value };
                            setRidgeAddOns(next);
                          }}
                          disabled={!canPolicy}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-3">
            <h2 className="text-xs font-black uppercase text-[#134e4a]">Profile / design aliases</h2>
            <p className="text-[11px] text-slate-600">Map what sales types (e.g. steptiles) to a canonical design key that matches your price list rows.</p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-[10px] font-bold uppercase text-slate-500">
                    <th className="py-2 pr-3">Alias</th>
                    <th className="py-2 pr-3">Canonical design</th>
                    <th className="py-2 pr-3">Canonical profile</th>
                  </tr>
                </thead>
                <tbody>
                  {aliases.map((a, i) => (
                    <tr key={a.id || i} className="border-t border-slate-100">
                      <td className="py-2 pr-2">
                        <input
                          className="w-36 rounded border border-slate-200 px-2 py-1"
                          value={a.aliasKey}
                          onChange={(e) => {
                            const next = [...aliases];
                            next[i] = { ...next[i], aliasKey: e.target.value };
                            setAliases(next);
                          }}
                          disabled={!canPolicy}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          className="w-48 rounded border border-slate-200 px-2 py-1"
                          value={a.canonicalDesignKey}
                          onChange={(e) => {
                            const next = [...aliases];
                            next[i] = { ...next[i], canonicalDesignKey: e.target.value };
                            setAliases(next);
                          }}
                          disabled={!canPolicy}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          className="w-40 rounded border border-slate-200 px-2 py-1"
                          value={a.canonicalProfileKey}
                          onChange={(e) => {
                            const next = [...aliases];
                            next[i] = { ...next[i], canonicalProfileKey: e.target.value };
                            setAliases(next);
                          }}
                          disabled={!canPolicy}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {canPolicy ? (
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#134e4a] px-5 py-2.5 text-[11px] font-black uppercase text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save policy'}
            </button>
          ) : (
            <p className="text-[11px] text-slate-500">You can view this page; only MD / admin may save changes.</p>
          )}
        </form>
      )}
    </MainPanel>
  );
}
