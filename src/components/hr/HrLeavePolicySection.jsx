import React, { useState } from 'react';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { apiFetch } from '../../lib/apiBase';
import { canEditLeavePolicy } from '../../lib/hrAccess';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrAlert, HrCard } from './hrPageUi';
import { HrHandbookReferenceCard } from './HrHandbookReferenceCard';
import { HR_BTN_PRIMARY, HR_FIELD_CLASS } from './hrFormStyles';

function PolicyFieldGroup({ title, description, children }) {
  return (
    <div className="space-y-3 border-t border-slate-100 pt-5 first:border-t-0 first:pt-0">
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</h4>
        {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

/** Company-wide leave entitlements and staff loan limits (HR Settings). */
export function HrLeavePolicySection() {
  const ws = useWorkspace();
  const canEdit = canEditLeavePolicy(ws?.permissions);
  const [policy, setPolicy] = useState(null);
  const [annualSenior, setAnnualSenior] = useState('21');
  const [annualJunior, setAnnualJunior] = useState('14');
  const [casualDays, setCasualDays] = useState('7');
  const [maternityDays, setMaternityDays] = useState('60');
  const [loanMinYears, setLoanMinYears] = useState('3');
  const [loanMaxMonths, setLoanMaxMonths] = useState('12');
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
    setLoanMaxMonths(String(p.loanMaxRepaymentMonths ?? 12));
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
    setMessage('Policy saved. Recompute leave balances on the Leave module to apply new entitlements.');
  };

  return (
    <HrCard
      title="Company defaults"
      subtitle="Applied to branch payroll staff unless overridden on an individual profile."
    >
      {error ? <div className="mb-3"><HrAlert tone="error">{error}</HrAlert></div> : null}
      {message ? <div className="mb-3"><HrAlert tone="success">{message}</HrAlert></div> : null}

      <PolicyFieldGroup title="Leave entitlements" description="Annual days by seniority band set on each employee profile.">
        <label className="text-xs font-semibold text-slate-600">
          Senior band (days / year)
          <input type="number" min={0} className={HR_FIELD_CLASS} value={annualSenior} onChange={(e) => setAnnualSenior(e.target.value)} disabled={!canEdit} />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Junior band (days / year)
          <input type="number" min={0} className={HR_FIELD_CLASS} value={annualJunior} onChange={(e) => setAnnualJunior(e.target.value)} disabled={!canEdit} />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Casual leave (days / year)
          <input type="number" min={0} className={HR_FIELD_CLASS} value={casualDays} onChange={(e) => setCasualDays(e.target.value)} disabled={!canEdit} />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Maternity leave (days)
          <input type="number" min={0} className={HR_FIELD_CLASS} value={maternityDays} onChange={(e) => setMaternityDays(e.target.value)} disabled={!canEdit} />
        </label>
      </PolicyFieldGroup>

      <PolicyFieldGroup title="Staff loans" description="Limits enforced when branch staff submit loan requests.">
        <label className="text-xs font-semibold text-slate-600">
          Minimum service (years)
          <input type="number" min={0} step="0.5" className={HR_FIELD_CLASS} value={loanMinYears} onChange={(e) => setLoanMinYears(e.target.value)} disabled={!canEdit} />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Maximum repayment (months)
          <input type="number" min={1} max={12} className={HR_FIELD_CLASS} value={loanMaxMonths} onChange={(e) => setLoanMaxMonths(e.target.value)} disabled={!canEdit} />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Maximum amount (× gross salary)
          <input type="number" min={1} max={12} className={HR_FIELD_CLASS} value={loanMaxSalaryMonths} onChange={(e) => setLoanMaxSalaryMonths(e.target.value)} disabled={!canEdit} />
        </label>
      </PolicyFieldGroup>

      {canEdit ? (
        <button type="button" onClick={save} disabled={saving} className={`${HR_BTN_PRIMARY} mt-5`}>
          {saving ? 'Saving…' : 'Save company policy'}
        </button>
      ) : (
        <p className="mt-5 text-xs text-slate-500">View only — contact HR administration or Executive HR to request changes.</p>
      )}
      {policy ? (
        <p className="mt-3 text-xs text-slate-500">
          Executive family and household staff follow separate benefit rules under Executive HR.
        </p>
      ) : null}
      <HrHandbookReferenceCard />
    </HrCard>
  );
}
