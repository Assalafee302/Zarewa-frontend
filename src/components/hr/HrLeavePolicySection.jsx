import React, { useState } from 'react';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { apiFetch } from '../../lib/apiBase';
import { canAccessExecutiveHr, canManageHrSettings } from '../../lib/hrAccess';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrCard } from './hrPageUi';
import { HR_BTN_PRIMARY, HR_FIELD_CLASS } from './hrFormStyles';

/** Executive / HR settings — default annual leave days per entitlement band. */
export function HrLeavePolicySection({ executive = false }) {
  const ws = useWorkspace();
  const canEdit = executive ? canAccessExecutiveHr(ws?.permissions) : canManageHrSettings(ws?.permissions);
  const [policy, setPolicy] = useState(null);
  const [annualSenior, setAnnualSenior] = useState('21');
  const [annualJunior, setAnnualJunior] = useState('14');
  const [casualDays, setCasualDays] = useState('7');
  const [maternityDays, setMaternityDays] = useState('60');
  const [loanMinYears, setLoanMinYears] = useState('3');
  const [loanMaxMonths, setLoanMaxMonths] = useState('4');
  const [loanMaxSalaryMonths, setLoanMaxSalaryMonths] = useState('4');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/policy-config');
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not load policy.');
      return { hasData: false };
    }
    const p = data.policy || {};
    setPolicy(p);
    setAnnualSenior(String(p.annualLeaveDaysSenior ?? 21));
    setAnnualJunior(String(p.annualLeaveDaysJunior ?? 14));
    setCasualDays(String(p.casualLeaveDaysPerYear ?? 7));
    setMaternityDays(String(p.maternityLeaveDays ?? 60));
    setLoanMinYears(String(p.loanMinServiceYears ?? 3));
    setLoanMaxMonths(String(p.loanMaxRepaymentMonths ?? 4));
    setLoanMaxSalaryMonths(String(p.loanMaxSalaryMonths ?? 4));
    return { hasData: true };
  }, []);

  const save = async () => {
    if (!canEdit) return;
    setSaving(true);
    setMessage('');
    setError('');
    const { ok, data } = await apiFetch('/api/hr/policy-config', {
      method: 'PATCH',
      body: JSON.stringify({
        annualLeaveDaysSenior: Number(annualSenior),
        annualLeaveDaysJunior: Number(annualJunior),
        casualLeaveDaysPerYear: Number(casualDays),
        maternityLeaveDays: Number(maternityDays),
        loanMinServiceYears: Number(loanMinYears),
        loanMaxRepaymentMonths: Number(loanMaxMonths),
        loanMaxSalaryMonths: Number(loanMaxSalaryMonths),
      }),
    });
    setSaving(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not save.');
      return;
    }
    setPolicy(data.policy);
    setMessage('Leave and loan policy saved. Recompute leave balances to apply new entitlements.');
  };

  return (
    <HrCard
      title={executive ? 'Leave & loan policy (company defaults)' : 'Leave entitlement defaults'}
      subtitle="Annual days by band, casual leave, and staff loan limits used across the company."
    >
      {error ? <div className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null}
      {message ? <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{message}</div> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs font-semibold text-slate-600">
          Annual leave — senior band (days)
          <input type="number" min={0} className={HR_FIELD_CLASS} value={annualSenior} onChange={(e) => setAnnualSenior(e.target.value)} disabled={!canEdit} />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Annual leave — junior band (days)
          <input type="number" min={0} className={HR_FIELD_CLASS} value={annualJunior} onChange={(e) => setAnnualJunior(e.target.value)} disabled={!canEdit} />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Casual leave per year (days)
          <input type="number" min={0} className={HR_FIELD_CLASS} value={casualDays} onChange={(e) => setCasualDays(e.target.value)} disabled={!canEdit} />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Maternity leave (days)
          <input type="number" min={0} className={HR_FIELD_CLASS} value={maternityDays} onChange={(e) => setMaternityDays(e.target.value)} disabled={!canEdit} />
        </label>
        {executive ? (
          <>
            <label className="text-xs font-semibold text-slate-600">
              Min service years for loan
              <input type="number" min={0} step="0.5" className={HR_FIELD_CLASS} value={loanMinYears} onChange={(e) => setLoanMinYears(e.target.value)} disabled={!canEdit} />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Max loan repayment (months)
              <input type="number" min={1} max={12} className={HR_FIELD_CLASS} value={loanMaxMonths} onChange={(e) => setLoanMaxMonths(e.target.value)} disabled={!canEdit} />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Max loan = gross salary ×
              <input type="number" min={1} max={12} className={HR_FIELD_CLASS} value={loanMaxSalaryMonths} onChange={(e) => setLoanMaxSalaryMonths(e.target.value)} disabled={!canEdit} />
            </label>
          </>
        ) : null}
      </div>
      {canEdit ? (
        <button type="button" onClick={save} disabled={saving} className={`${HR_BTN_PRIMARY} mt-4`}>
          {saving ? 'Saving…' : 'Save policy'}
        </button>
      ) : (
        <p className="mt-4 text-xs text-slate-500">View only — contact HR settings admin to change.</p>
      )}
      {policy ? (
        <p className="mt-3 text-[11px] text-slate-500">
          Per-staff band is set on the employee profile. These values are the company defaults for accrual.
        </p>
      ) : null}
    </HrCard>
  );
}
