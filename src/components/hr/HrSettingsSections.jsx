import React, { useState } from 'react';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { apiFetch } from '../../lib/apiBase';
import { canManageHrSettings } from '../../lib/hrAccess';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrAddFormButton, HrFormModal } from './HrFormModal';
import { HR_BTN_PRIMARY, HR_FIELD_CLASS } from './hrFormStyles';
import { HrCard } from './hrPageUi';

/** Reusable public holidays CRUD — used in Leave hub and Settings hub. */
export function HrPublicHolidaysSection({ embedded = false }) {
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

  const body = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        {!embedded ? <h2 className="text-sm font-black text-slate-800">Public holidays</h2> : null}
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
      {holidays.length === 0 ? (
        <p className="text-sm text-slate-500">No public holidays configured.</p>
      ) : (
        <ul className="text-sm text-slate-700 space-y-1">
          {holidays.map((h) => (
            <li key={h.dayIso || h.id}>
              {h.dayIso} — {h.label}
            </li>
          ))}
        </ul>
      )}
    </>
  );

  if (embedded) return body;
  return <HrCard title="Public holidays">{body}</HrCard>;
}

/** Working hours + statutory reference cards from handbook. */
export function HrPolicyConfigSection() {
  return (
    <div className="space-y-6">
      <HrCard title="Working hours policy" subtitle="Reference only — set by company handbook">
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
            <p className="text-xs text-slate-600">Applies beyond 9 hrs Mon–Fri or 7 hrs Saturday (Phase 2 workflow)</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Salary payment day</p>
            <p className="font-semibold">25th of each month</p>
          </div>
        </div>
      </HrCard>
      <HrCard title="Statutory deductions" subtitle="Employer costs — fixed by law">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-1">ITF</p>
            <p className="text-sm font-semibold text-slate-800">1% of gross payroll</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-1">NSITF</p>
            <p className="text-sm font-semibold text-slate-800">1% of gross payroll</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 sm:col-span-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">NHIS</p>
            <p className="text-xs text-slate-600">Optional — configure per staff in their profile.</p>
          </div>
        </div>
      </HrCard>
    </div>
  );
}

/** Module health probe from /api/hr/health */
export function HrModuleHealthSection() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');

  useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/health');
    if (!ok || !data?.ok) {
      setHealth(null);
      setError(data?.error || 'Could not load module health.');
      return { error: data?.error, hasData: false };
    }
    setHealth(data);
    setError('');
    return { hasData: true };
  }, []);

  if (error) {
    return <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>;
  }
  if (!health) return <p className="text-sm text-slate-600">Loading module health…</p>;

  const modules = health.modules || {};
  return (
    <HrCard title="Module health" subtitle="Schema readiness from /api/hr/health">
      <p className="text-sm font-semibold text-slate-800 mb-2">
        Production ready:{' '}
        <span className={health.productionReady ? 'text-emerald-700' : 'text-amber-700'}>
          {health.productionReady ? 'Yes' : 'No'}
        </span>
      </p>
      <ul className="text-sm text-slate-700 space-y-1">
        {Object.entries(modules).map(([key, ready]) => (
          <li key={key} className="flex items-center gap-2">
            <span className={ready ? 'text-emerald-600' : 'text-red-600'} aria-hidden>{ready ? '✓' : '✗'}</span>
            <span className="capitalize">{key.replace(/_/g, ' ')}</span>
          </li>
        ))}
      </ul>
      {Array.isArray(health.blockers) && health.blockers.length > 0 ? (
        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          <p className="font-bold mb-1">Blockers</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {health.blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </HrCard>
  );
}
