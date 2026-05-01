import React, { useEffect, useState } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';

export default function AdminDataResetPanel() {
  const { show: showToast } = useToast();
  const ws = useWorkspace();
  const [presets, setPresets] = useState([]);
  const [expectedPhrase, setExpectedPhrase] = useState('');
  const [confirmInput, setConfirmInput] = useState('');
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { ok, data } = await apiFetch('/api/admin/data-reset-presets');
        if (cancelled) return;
        if (!ok || !data?.ok) {
          showToast(data?.error || 'Could not load reset options.', { variant: 'error' });
          return;
        }
        setPresets(Array.isArray(data.presets) ? data.presets : []);
        setExpectedPhrase(String(data.confirmPhrase || '').trim());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const toggle = (id) => {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  };

  const runReset = async () => {
    const presetIds = presets.filter((p) => selected[p.id]).map((p) => p.id);
    if (!presetIds.length) {
      showToast('Select at least one category.', { variant: 'error' });
      return;
    }
    setBusy(true);
    try {
      const { ok, data } = await apiFetch('/api/admin/data-reset', {
        method: 'POST',
        body: JSON.stringify({ presetIds, confirmPhrase: confirmInput.trim() }),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Reset failed.', { variant: 'error' });
        return;
      }
      showToast('Selected categories were cleared. Refreshing workspace.');
      setConfirmInput('');
      setSelected({});
      await ws?.refresh?.();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading reset options…</p>;
  }

  return (
    <section className="rounded-3xl border border-amber-200/90 bg-amber-50/40 p-6 shadow-sm space-y-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-amber-100 p-2 text-amber-800">
          <AlertTriangle size={18} />
        </div>
        <div>
          <h3 className="z-section-title flex items-center gap-2">
            <RotateCcw size={14} /> Admin data reset
          </h3>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Permanently deletes rows in the database for the categories you tick. Users, branches, catalog
            products, and core setup lists are not removed by these presets. Clearing sales/production does{' '}
            <span className="font-semibold text-slate-700">not</span> remove coil book rows unless you also tick{' '}
            <span className="font-semibold text-slate-700">Coil lots & coil stock</span>. Export anything you need
            before continuing.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {presets.map((p) => (
          <label
            key={p.id}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm hover:border-teal-200/80 transition-colors"
          >
            <input
              type="checkbox"
              checked={Boolean(selected[p.id])}
              onChange={() => toggle(p.id)}
              className="accent-[#134e4a] mt-0.5 w-4 h-4 shrink-0"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-800">{p.label}</span>
              {p.warning ? (
                <span className="mt-1 block text-[11px] text-slate-500 leading-snug">{p.warning}</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <label className="block space-y-1.5">
          <span className="z-field-label">Confirmation</span>
          <p className="text-[11px] text-slate-500">
            Type exactly: <span className="font-mono font-semibold text-slate-700">{expectedPhrase}</span>
          </p>
          <input
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            autoComplete="off"
            className="z-input font-mono text-sm"
            placeholder={expectedPhrase}
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void runReset()}
          className="z-btn-secondary border-red-200 text-red-800 hover:bg-red-50 disabled:opacity-50"
        >
          {busy ? 'Working…' : 'Delete selected data'}
        </button>
      </div>
    </section>
  );
}
