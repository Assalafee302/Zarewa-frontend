/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { Columns3 } from 'lucide-react';

const COLUMN_DEFS = [
  { id: 'employeeNo', label: 'Staff ID' },
  { id: 'branch', label: 'Branch' },
  { id: 'department', label: 'Department' },
  { id: 'jobTitle', label: 'Job title' },
  { id: 'manager', label: 'Manager' },
  { id: 'profile', label: 'Profile %' },
  { id: 'docs', label: 'Documents' },
  { id: 'group', label: 'Payroll group' },
  { id: 'salary', label: 'Base salary' },
  { id: 'joined', label: 'Joined' },
  { id: 'status', label: 'Status' },
];

const STORAGE_KEY = 'zarewa-hr-directory-columns';

export function defaultVisibleColumns(showSalary) {
  const all = COLUMN_DEFS.map((c) => c.id).filter((id) => (id === 'salary' ? showSalary : true));
  return new Set(all);
}

export function loadVisibleColumns(showSalary) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultVisibleColumns(showSalary);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultVisibleColumns(showSalary);
    const set = new Set(parsed);
    if (!showSalary) set.delete('salary');
    return set.size ? set : defaultVisibleColumns(showSalary);
  } catch {
    return defaultVisibleColumns(showSalary);
  }
}

export function persistVisibleColumns(cols) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...cols]));
  } catch {
    /* ignore */
  }
}

export function HrStaffDirectoryColumnPicker({ visible, showSalary, onChange }) {
  const [open, setOpen] = React.useState(false);
  const options = COLUMN_DEFS.filter((c) => c.id !== 'salary' || showSalary);

  const toggle = (id) => {
    const next = new Set(visible);
    if (next.has(id)) {
      if (next.size <= 4) return;
      next.delete(id);
    } else next.add(id);
    persistVisibleColumns(next);
    onChange(next);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold uppercase text-slate-600 hover:bg-slate-50"
        aria-expanded={open}
      >
        <Columns3 size={14} aria-hidden />
        Columns
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 min-w-[180px] rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          {options.map((c) => (
            <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-slate-50">
              <input
                type="checkbox"
                checked={visible.has(c.id)}
                onChange={() => toggle(c.id)}
              />
              {c.label}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
