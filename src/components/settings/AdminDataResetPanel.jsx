import React, { useEffect, useMemo, useState } from 'react';
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
  const [branchName, setBranchName] = useState('');
  const [branchResetBlocked, setBranchResetBlocked] = useState(false);
  const [branchResetBlockedReason, setBranchResetBlockedReason] = useState('');

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
        setBranchName(String(data.branchName || data.branchId || '').trim());
        setBranchResetBlocked(Boolean(data.branchResetBlocked));
        setBranchResetBlockedReason(String(data.branchResetBlockedReason || '').trim());
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

  const selectedPresets = useMemo(
    () => presets.filter((p) => selected[p.id]),
    [presets, selected]
  );

  const runReset = async () => {
    if (branchResetBlocked) {
      showToast(
        branchResetBlockedReason ||
          'Select a single branch in the workspace switcher before running data reset.',
        { variant: 'error' }
      );
      return;
    }
    const presetIds = selectedPresets.map((p) => p.id);
    if (!presetIds.length) {
      showToast('Select at least one category.', { variant: 'error' });
      return;
    }
    const label = branchName || ws?.branchScope || 'this branch';
    const categoryList = selectedPresets.map((p) => `• ${p.label}`).join('\n');
    if (
      !window.confirm(
        `Only the ${presetIds.length} category(ies) you ticked will be deleted for ${label}.\n\n${categoryList}\n\nOther categories and other branches are NOT affected.\n\nThis cannot be undone. Continue?`
      )
    ) {
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
      const skipped = Array.isArray(data.skippedTables) ? data.skippedTables : [];
      const scopeNote = data.branchName ? ` for ${data.branchName}` : '';
      showToast(
        skipped.length
          ? `Cleared selected categories${scopeNote}. Skipped (not branch-scoped): ${skipped.join(', ')}.`
          : `Selected categories were cleared${scopeNote}. Refreshing workspace.`,
        { variant: skipped.length ? 'info' : 'success' }
      );
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
            Tick only the categories you want to clear. <strong>Unchecked options are never touched.</strong> All deletions
            are scoped to{' '}
            <strong className="text-[#134e4a]">{branchName || 'your current workspace branch'}</strong> — other branches
            stay intact. Users, branches, suppliers, and catalog products are never removed unless you tick a category
            that includes them.
          </p>
        </div>
      </div>

      {branchResetBlocked ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 leading-relaxed">
          {branchResetBlockedReason ||
            'Switch the workspace to a single branch (not “all branches”) before using data reset.'}
        </p>
      ) : (
        <p className="rounded-xl border border-teal-200/80 bg-teal-50/60 px-4 py-3 text-[11px] text-teal-950 leading-relaxed">
          Active scope: <strong>{branchName}</strong>. Only ticked categories for this branch will be deleted.
        </p>
      )}

      <div className="space-y-3">
        {presets.map((p) => (
          <label
            key={p.id}
            className={`flex items-start gap-3 rounded-xl border p-4 shadow-sm transition-colors ${
              selected[p.id]
                ? 'border-amber-300 bg-amber-50/80'
                : 'border-slate-200/80 bg-white hover:border-teal-200/80'
            } ${branchResetBlocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <input
              type="checkbox"
              checked={Boolean(selected[p.id])}
              onChange={() => toggle(p.id)}
              disabled={branchResetBlocked}
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

      {selectedPresets.length ? (
        <div className="rounded-xl border border-amber-200 bg-white px-4 py-3 text-xs text-amber-950">
          <p className="font-bold">Will delete ({selectedPresets.length} selected)</p>
          <ul className="mt-1 list-disc pl-4 space-y-0.5">
            {selectedPresets.map((p) => (
              <li key={p.id}>{p.label}</li>
            ))}
          </ul>
          {selectedPresets.some((p) => p.id === 'hr_staff_payroll') ? (
            <p className="mt-2 rounded-lg border border-teal-200/80 bg-teal-50/70 px-3 py-2 text-[11px] text-teal-950 leading-relaxed">
              <strong>Usernames are safe:</strong> Team &amp; access logins (usernames, passwords, roles) are not
              removed or renamed. Only HR employee data for this branch is cleared — you can re-import staff and link
              the same usernames again.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-slate-500">No categories selected — nothing will be deleted.</p>
      )}

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
            disabled={branchResetBlocked}
            className="z-input font-mono text-sm"
            placeholder={expectedPhrase}
          />
        </label>
        <button
          type="button"
          disabled={busy || branchResetBlocked || !selectedPresets.length}
          onClick={() => void runReset()}
          className="z-btn-secondary border-red-200 text-red-800 hover:bg-red-50 disabled:opacity-50"
        >
          {busy
            ? 'Working…'
            : selectedPresets.length
              ? `Delete ${selectedPresets.length} selected categor${selectedPresets.length === 1 ? 'y' : 'ies'} (${branchName || 'branch'})`
              : 'Select categories to delete'}
        </button>
      </div>
    </section>
  );
}
