import React, { useState } from 'react';
import { HrSalaryMatrixPanel } from '../../components/hr/HrSalaryMatrixPanel';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { apiFetch } from '../../lib/apiBase';
import { canManageHrSettings } from '../../lib/hrAccess';
import { useWorkspace } from '../../context/WorkspaceContext';

const fieldCls =
  'mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[#134e4a] focus:outline-none focus:ring-2 focus:ring-[#134e4a]/15';

export default function HrSettings() {
  const ws = useWorkspace();
  const canManage = canManageHrSettings(ws?.permissions);
  const [holidays, setHolidays] = useState([]);
  const [holidayForm, setHolidayForm] = useState({ dayIso: '', label: '' });
  const [message, setMessage] = useState('');

  const { reload } = useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/public-holidays');
    if (ok && data?.ok) setHolidays(data.holidays || []);
    return { hasData: true };
  }, []);

  const saveHoliday = async (e) => {
    e.preventDefault();
    if (!canManage) return;
    const { ok, data } = await apiFetch('/api/hr/public-holidays', {
      method: 'PUT',
      body: JSON.stringify({ dayIso: holidayForm.dayIso, label: holidayForm.label.trim() }),
    });
    if (ok && data?.ok) {
      setMessage('Holiday saved.');
      setHolidayForm({ dayIso: '', label: '' });
      await reload();
    }
  };

  return (
    <div className="space-y-8">
      <p className="text-sm text-slate-600">
        HQ HR configuration — salary matrix, public holidays, and payroll planning references.
      </p>
      <section>
        <h2 className="text-sm font-black text-slate-800 mb-3">Salary matrix</h2>
        <HrSalaryMatrixPanel />
      </section>
      <section>
        <h2 className="text-sm font-black text-slate-800 mb-3">Public holidays</h2>
        {canManage ? (
          <form onSubmit={saveHoliday} className="mb-4 flex flex-wrap gap-3 items-end">
            <label className="text-xs font-semibold text-slate-600">
              Date
              <input type="date" className={fieldCls} value={holidayForm.dayIso} onChange={(e) => setHolidayForm({ ...holidayForm, dayIso: e.target.value })} required />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Label
              <input className={fieldCls} value={holidayForm.label} onChange={(e) => setHolidayForm({ ...holidayForm, label: e.target.value })} required />
            </label>
            <button type="submit" className="rounded-xl bg-[#134e4a] px-4 py-2 text-sm font-bold text-white">
              Add holiday
            </button>
          </form>
        ) : null}
        {message ? <p className="text-sm text-emerald-800 mb-2">{message}</p> : null}
        <ul className="text-sm text-slate-700 space-y-1">
          {holidays.map((h) => (
            <li key={h.dayIso || h.id}>
              {h.dayIso} — {h.label}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
