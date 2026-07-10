import React, { useState } from 'react';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { apiFetch } from '../../lib/apiBase';
import { canEditLeavePolicy } from '../../lib/hrAccess';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrAlert, HrCard, HrButton, HrAddButton, HR_BTN_PRIMARY } from './hrPageUi';
import { HR_FIELD_CLASS } from './hrFormStyles';

/** Staff purchase credit limits — stored in HR policy config (`staffPurchaseCredit`). */
export function HrStaffPurchaseCreditPolicySection() {
  const ws = useWorkspace();
  const canEdit = canEditLeavePolicy(ws?.permissions);
  const [enabled, setEnabled] = useState(true);
  const [minServiceYears, setMinServiceYears] = useState('1');
  const [maxOutstandingNgn, setMaxOutstandingNgn] = useState('5000000');
  const [maxSinglePurchaseNgn, setMaxSinglePurchaseNgn] = useState('2000000');
  const [maxRepaymentMonths, setMaxRepaymentMonths] = useState('12');
  const [maxConcurrentActive, setMaxConcurrentActive] = useState('1');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/policy-config');
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not load policy.');
      return { hasData: false };
    }
    const p = data.policy?.staffPurchaseCredit || {};
    setEnabled(p.enabled !== false);
    setMinServiceYears(String(p.minServiceYears ?? 1));
    setMaxOutstandingNgn(String(p.maxOutstandingNgn ?? 5_000_000));
    setMaxSinglePurchaseNgn(String(p.maxSinglePurchaseNgn ?? 2_000_000));
    setMaxRepaymentMonths(String(p.maxRepaymentMonths ?? 12));
    setMaxConcurrentActive(String(p.maxConcurrentActive ?? 1));
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
        staffPurchaseCredit: {
          enabled,
          minServiceYears: Number(minServiceYears),
          maxOutstandingNgn: Math.round(Number(maxOutstandingNgn)),
          maxSinglePurchaseNgn: Math.round(Number(maxSinglePurchaseNgn)),
          maxRepaymentMonths: Math.round(Number(maxRepaymentMonths)),
          maxConcurrentActive: Math.round(Number(maxConcurrentActive)),
        },
      }),
    });
    setSaving(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not save.');
      return;
    }
    setMessage('Staff purchase credit policy saved.');
  };

  return (
    <HrCard
      title="Staff purchase credit"
      subtitle="Roofing and materials on credit for staff — eligibility and limits for sales quotations."
    >
      {error ? (
        <div className="mb-3">
          <HrAlert tone="error">{error}</HrAlert>
        </div>
      ) : null}
      {message ? (
        <div className="mb-3">
          <HrAlert tone="success">{message}</HrAlert>
        </div>
      ) : null}
      <label className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} disabled={!canEdit} />
        Enable staff purchase credit requests
      </label>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs font-semibold text-slate-600">
          Min service (years)
          <input
            type="number"
            min={0}
            className={`mt-1 ${HR_FIELD_CLASS}`}
            value={minServiceYears}
            onChange={(e) => setMinServiceYears(e.target.value)}
            disabled={!canEdit}
          />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Max outstanding (₦)
          <input
            type="number"
            min={0}
            className={`mt-1 ${HR_FIELD_CLASS}`}
            value={maxOutstandingNgn}
            onChange={(e) => setMaxOutstandingNgn(e.target.value)}
            disabled={!canEdit}
          />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Max single purchase (₦)
          <input
            type="number"
            min={0}
            className={`mt-1 ${HR_FIELD_CLASS}`}
            value={maxSinglePurchaseNgn}
            onChange={(e) => setMaxSinglePurchaseNgn(e.target.value)}
            disabled={!canEdit}
          />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Max repayment months
          <span className="mt-0.5 block font-normal text-slate-400">Staff materials on credit — up to 12 months (1 year)</span>
          <input
            type="number"
            min={1}
            max={12}
            className={`mt-1 ${HR_FIELD_CLASS}`}
            value={maxRepaymentMonths}
            onChange={(e) => setMaxRepaymentMonths(e.target.value)}
            disabled={!canEdit}
          />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Max concurrent active credits
          <input
            type="number"
            min={1}
            max={5}
            className={`mt-1 ${HR_FIELD_CLASS}`}
            value={maxConcurrentActive}
            onChange={(e) => setMaxConcurrentActive(e.target.value)}
            disabled={!canEdit}
          />
        </label>
      </div>
      {canEdit ? (
        <button type="button" onClick={save} disabled={saving} className={`mt-4 ${HR_BTN_PRIMARY}`}>
          {saving ? 'Saving…' : 'Save purchase credit policy'}
        </button>
      ) : null}
    </HrCard>
  );
}
