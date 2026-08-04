import React from 'react';

export function OtWorkDetailsFields({ value = {}, onChange, disabled = false }) {
  const v = value || {};
  const set = (key, raw) => onChange({ ...v, [key]: raw });

  return (
    <div className="space-y-3">
      <h4 className="text-ui-xs font-bold uppercase tracking-widest text-zarewa-teal">Work details</h4>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="min-w-0 sm:col-span-2">
          <span className="z-field-label text-ui-xs font-bold uppercase text-slate-500">Work done</span>
          <input
            type="text"
            disabled={disabled}
            className="z-input mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-semibold"
            value={v.workDone || ''}
            onChange={(e) => set('workDone', e.target.value)}
            placeholder="What was produced / offloaded"
          />
        </label>
        <label className="min-w-0">
          <span className="z-field-label text-ui-xs font-bold uppercase text-slate-500">Material type</span>
          <input
            type="text"
            disabled={disabled}
            className="z-input mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-semibold"
            value={v.materialType || ''}
            onChange={(e) => set('materialType', e.target.value)}
          />
        </label>
        <label className="min-w-0">
          <span className="z-field-label text-ui-xs font-bold uppercase text-slate-500">Machine / area</span>
          <input
            type="text"
            disabled={disabled}
            className="z-input mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-semibold"
            value={v.machineArea || ''}
            onChange={(e) => set('machineArea', e.target.value)}
          />
        </label>
        <label className="min-w-0">
          <span className="z-field-label text-ui-xs font-bold uppercase text-slate-500">Quantity</span>
          <input
            type="number"
            min="0"
            step="any"
            disabled={disabled}
            className="z-input mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-semibold tabular-nums"
            value={v.quantity ?? ''}
            onChange={(e) => set('quantity', e.target.value)}
          />
        </label>
        <label className="min-w-0">
          <span className="z-field-label text-ui-xs font-bold uppercase text-slate-500">Unit</span>
          <input
            type="text"
            disabled={disabled}
            className="z-input mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-semibold"
            value={v.quantityUnit || ''}
            onChange={(e) => set('quantityUnit', e.target.value)}
            placeholder="m, sheets…"
          />
        </label>
        <label className="min-w-0">
          <span className="z-field-label text-ui-xs font-bold uppercase text-slate-500">Actual completion</span>
          <input
            type="time"
            disabled={disabled}
            className="z-input mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-semibold"
            value={v.actualCompletionTime || ''}
            onChange={(e) => set('actualCompletionTime', e.target.value)}
          />
        </label>
        <label className="min-w-0">
          <span className="z-field-label text-ui-xs font-bold uppercase text-slate-500">Factory locked by</span>
          <input
            type="text"
            disabled={disabled}
            className="z-input mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-semibold"
            value={v.factoryLockedBy || ''}
            onChange={(e) => set('factoryLockedBy', e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
