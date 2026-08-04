import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { OtStaffPicker } from './OtLookups';

/**
 * Multi-staff lines — roster pickers only.
 */
export function OtStaffLinesEditor({ staffLines = [], onChange, disabled = false }) {
  const lines = Array.isArray(staffLines) && staffLines.length ? staffLines : [
    { staffUserId: '', roleLabel: '', startTime: '18:00', endTime: '22:00' },
  ];

  const patch = (idx, partial) => {
    const next = lines.map((row, i) => (i === idx ? { ...row, ...partial } : row));
    onChange(next);
  };

  const remove = (idx) => {
    if (lines.length <= 1) return;
    onChange(lines.filter((_, i) => i !== idx));
  };

  const add = () => {
    onChange([
      ...lines,
      { staffUserId: '', roleLabel: '', startTime: '18:00', endTime: '22:00', displayName: '' },
    ]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-ui-xs font-bold uppercase tracking-widest text-zarewa-teal">Staff on OT</h4>
        {!disabled ? (
          <button
            type="button"
            onClick={add}
            className="inline-flex items-center gap-1 rounded-lg border border-zarewa-teal/25 bg-white px-2 py-1 text-ui-xs font-bold uppercase text-zarewa-teal hover:bg-teal-50"
          >
            <Plus size={12} aria-hidden /> Add staff
          </button>
        ) : null}
      </div>
      {lines.map((line, idx) => (
        <div
          key={`staff-${idx}-${line.staffUserId || 'new'}`}
          className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-ui-xs font-bold uppercase text-slate-400">Line {idx + 1}</span>
            {!disabled && lines.length > 1 ? (
              <button
                type="button"
                onClick={() => remove(idx)}
                className="rounded p-1 text-rose-600 hover:bg-rose-50"
                aria-label="Remove staff line"
              >
                <Trash2 size={14} />
              </button>
            ) : null}
          </div>
          <OtStaffPicker
            value={line.staffUserId}
            displayValue={line.displayName || ''}
            disabled={disabled}
            onChange={(id, row) =>
              patch(idx, {
                staffUserId: id,
                displayName: row ? row.displayName || row.username || id : '',
              })
            }
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label className="min-w-0">
              <span className="z-field-label text-ui-xs font-bold uppercase text-slate-500">Role on job</span>
              <input
                type="text"
                disabled={disabled}
                className="z-input mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-semibold"
                value={line.roleLabel || ''}
                onChange={(e) => patch(idx, { roleLabel: e.target.value })}
                placeholder="Operator / helper…"
              />
            </label>
            <label className="min-w-0">
              <span className="z-field-label text-ui-xs font-bold uppercase text-slate-500">Start</span>
              <input
                type="time"
                disabled={disabled}
                className="z-input mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-semibold"
                value={line.startTime || ''}
                onChange={(e) => patch(idx, { startTime: e.target.value })}
              />
            </label>
            <label className="min-w-0">
              <span className="z-field-label text-ui-xs font-bold uppercase text-slate-500">End</span>
              <input
                type="time"
                disabled={disabled}
                className="z-input mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-semibold"
                value={line.endTime || ''}
                onChange={(e) => patch(idx, { endTime: e.target.value })}
              />
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}
