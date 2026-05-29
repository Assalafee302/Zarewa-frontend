import React, { useState } from 'react';
import { HrSalaryMatrixPanel } from '../../components/hr/HrSalaryMatrixPanel';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { apiFetch } from '../../lib/apiBase';
import { canManageHrSettings } from '../../lib/hrAccess';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrAddFormButton, HrFormModal } from '../../components/hr/HrFormModal';
import { HR_BTN_PRIMARY, HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';

export default function HrSettings() {
  const ws = useWorkspace();
  const canManage = canManageHrSettings(ws?.permissions);
  const [holidays, setHolidays] = useState([]);
  const [holidayForm, setHolidayForm] = useState({ dayIso: '', label: '' });
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
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
      setHolidayModalOpen(false);
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
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-black text-slate-800">Public holidays</h2>
          {canManage ? <HrAddFormButton onClick={() => setHolidayModalOpen(true)}>Add holiday</HrAddFormButton> : null}
        </div>
        <HrFormModal isOpen={holidayModalOpen} onClose={() => setHolidayModalOpen(false)} title="Add public holiday" size="sm">
          <form onSubmit={saveHoliday} className="space-y-3">
            <label className="text-xs font-semibold text-slate-600 block">
              Date
              <input
                type="date"
                className={HR_FIELD_CLASS}
                value={holidayForm.dayIso}
                onChange={(e) => setHolidayForm({ ...holidayForm, dayIso: e.target.value })}
                required
              />
            </label>
            <label className="text-xs font-semibold text-slate-600 block">
              Label
              <input
                className={HR_FIELD_CLASS}
                value={holidayForm.label}
                onChange={(e) => setHolidayForm({ ...holidayForm, label: e.target.value })}
                required
              />
            </label>
            <button type="submit" className={HR_BTN_PRIMARY}>
              Save holiday
            </button>
          </form>
        </HrFormModal>
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
