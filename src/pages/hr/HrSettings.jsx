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
      <section>
        <h2 className="text-sm font-black text-slate-800 mb-3">Statutory Deductions</h2>
        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Employer statutory costs — fixed by law, not configurable
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-1">ITF — Industrial Training Fund</p>
              <p className="text-sm font-semibold text-slate-800">1% of gross payroll</p>
              <p className="text-xs text-slate-500 mt-0.5">Employer cost · Paid to ITF</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-1">NSITF — Nigeria Social Insurance Trust Fund</p>
              <p className="text-sm font-semibold text-slate-800">1% of gross payroll</p>
              <p className="text-xs text-slate-500 mt-0.5">Employer cost · Paid to NSITF</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 sm:col-span-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">NHIS — Health Insurance</p>
              <p className="text-xs text-slate-600">Optional — configure per staff in their profile. Individual deductions appear on payslips.</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            ITF and NSITF are employer costs and appear in statutory export packs. They are <strong>not</strong> deducted from staff salaries.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-black text-slate-800 mb-3">Working Hours Policy</h2>
        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-3 text-sm text-slate-700">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Reference only — set by company handbook</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Monday – Friday</p>
              <p className="font-semibold">8:00 AM – 5:00 PM</p>
              <p className="text-xs text-slate-500">9 hours · 1 hr lunch break</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Saturday</p>
              <p className="font-semibold">9:00 AM – 4:00 PM</p>
              <p className="text-xs text-slate-500">7 hours</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Overtime</p>
              <p className="text-xs text-slate-600">Applies beyond 9 hrs Mon–Fri or 7 hrs Saturday</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Salary payment day</p>
              <p className="font-semibold">25th of each month</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
