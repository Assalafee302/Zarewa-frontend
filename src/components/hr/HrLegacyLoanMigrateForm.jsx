import React, { useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { migrateLegacyStaffLoan } from '../../lib/hrStaffObligations';
import { ProfileFormActions, ProfileFormField } from '../profile/profileFormUi';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from './hrFormStyles';

/**
 * HR registers a pre-ERP staff loan — no finance payout; payroll collection only.
 */
export function HrLegacyLoanMigrateForm({ staffOptions: staffOptionsProp = [], defaultUserId = '', onSuccess, onCancel }) {
  const [staffLocal, setStaffLocal] = useState([]);
  const staffOptions = staffOptionsProp.length ? staffOptionsProp : staffLocal;

  useHrListLoad(async () => {
    if (staffOptionsProp.length) return { hasData: true };
    const { ok, data } = await apiFetch('/api/hr/staff');
    if (!ok || !data?.ok) {
      setStaffLocal([]);
      return { hasData: false };
    }
    setStaffLocal(data.staff || []);
    return { hasData: true };
  }, [staffOptionsProp.length]);
  const [userId, setUserId] = useState(defaultUserId);
  const [principalOriginalNgn, setPrincipalOriginalNgn] = useState('');
  const [amountRepaidNgn, setAmountRepaidNgn] = useState('0');
  const [installmentNgn, setInstallmentNgn] = useState('');
  const [termMonths, setTermMonths] = useState('12');
  const [title, setTitle] = useState('Legacy staff loan');
  const [disbursedAtIso, setDisbursedAtIso] = useState('');
  const [note, setNote] = useState('Pre-ERP loan register');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await migrateLegacyStaffLoan({
        userId,
        principalOriginalNgn: Math.round(Number(principalOriginalNgn) || 0),
        amountRepaidNgn: Math.round(Number(amountRepaidNgn) || 0),
        installmentNgn: Math.round(Number(installmentNgn) || 0),
        termMonths: Math.round(Number(termMonths) || 0),
        title: title.trim(),
        disbursedAtIso: disbursedAtIso || undefined,
        note: note.trim(),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Could not register legacy loan.');
        return;
      }
      onSuccess?.(data.account);
    } catch {
      setError('Network error.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? <p className="text-sm text-red-600 font-medium">{error}</p> : null}
      <ProfileFormField label="Employee">
        <select
          className={HR_FIELD_CLASS}
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          required
        >
          <option value="">Select staff…</option>
          {staffOptions.map((s) => (
            <option key={s.userId || s.id} value={s.userId || s.id}>
              {s.displayName || s.name} {s.employeeNo ? `(${s.employeeNo})` : ''}
            </option>
          ))}
        </select>
      </ProfileFormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <ProfileFormField label="Original loan amount (₦)">
          <input
            type="number"
            min="1"
            className={HR_FIELD_CLASS}
            value={principalOriginalNgn}
            onChange={(e) => setPrincipalOriginalNgn(e.target.value)}
            required
          />
        </ProfileFormField>
        <ProfileFormField label="Already repaid before system (₦)">
          <input
            type="number"
            min="0"
            className={HR_FIELD_CLASS}
            value={amountRepaidNgn}
            onChange={(e) => setAmountRepaidNgn(e.target.value)}
          />
        </ProfileFormField>
        <ProfileFormField label="Monthly payroll deduction (₦)">
          <input
            type="number"
            min="1"
            className={HR_FIELD_CLASS}
            value={installmentNgn}
            onChange={(e) => setInstallmentNgn(e.target.value)}
            required
          />
        </ProfileFormField>
        <ProfileFormField label="Repayment term (months)">
          <input
            type="number"
            min="1"
            className={HR_FIELD_CLASS}
            value={termMonths}
            onChange={(e) => setTermMonths(e.target.value)}
          />
        </ProfileFormField>
        <ProfileFormField label="Original disbursement date">
          <input
            type="date"
            className={HR_FIELD_CLASS}
            value={disbursedAtIso}
            onChange={(e) => setDisbursedAtIso(e.target.value)}
          />
        </ProfileFormField>
        <ProfileFormField label="Title / reference">
          <input className={HR_FIELD_CLASS} value={title} onChange={(e) => setTitle(e.target.value)} />
        </ProfileFormField>
      </div>
      <ProfileFormField label="Notes">
        <textarea className={HR_FIELD_CLASS} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </ProfileFormField>
      <p className="text-xs text-slate-500">
        No cashier payout is created. The balance appears on the staff profile, creditors register, and the next payroll
        run.
      </p>
      <ProfileFormActions>
        <button type="button" className={HR_BTN_SECONDARY} onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className={HR_BTN_PRIMARY} disabled={busy}>
          {busy ? 'Saving…' : 'Register legacy loan'}
        </button>
      </ProfileFormActions>
    </form>
  );
}
