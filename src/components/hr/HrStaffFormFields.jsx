import React from 'react';
import {
  HR_EMPLOYMENT_TYPES,
  HR_LEAVE_BANDS,
  HR_PAYROLL_GROUPS,
  HR_REGISTERABLE_ROLES,
} from '../../lib/hrStaffConstants';

const fieldCls =
  'mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[#134e4a] focus:outline-none focus:ring-2 focus:ring-[#134e4a]/15';

function Field({ label, children, hint }) {
  return (
    <label className="block text-xs font-semibold text-slate-600">
      {label}
      {children}
      {hint ? <span className="mt-1 block font-normal text-slate-400">{hint}</span> : null}
    </label>
  );
}

/**
 * Shared staff profile fields (register + edit).
 * @param {{
 *   form: object;
 *   setForm: (fn: (f: object) => object) => void;
 *   branches: { id: string; name: string }[];
 *   mode: 'register' | 'edit';
 *   showCompensation?: boolean;
 *   originalBranchId?: string;
 * }} props
 */
export function HrStaffFormFields({
  form,
  setForm,
  branches,
  mode,
  showCompensation = true,
  originalBranchId = '',
}) {
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const branchChanged =
    mode === 'edit' && originalBranchId && String(form.branchId) !== String(originalBranchId);

  return (
    <div className="space-y-8">
      {mode === 'register' ? (
        <section className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wide text-[#134e4a]">Login account</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Username">
              <input
                className={fieldCls}
                value={form.username}
                onChange={(e) => set('username', e.target.value)}
                autoComplete="off"
                required
              />
            </Field>
            <Field label="Display name">
              <input
                className={fieldCls}
                value={form.displayName}
                onChange={(e) => set('displayName', e.target.value)}
                required
              />
            </Field>
            <Field label="Temporary password" hint="Staff should change on first login.">
              <input
                type="password"
                className={fieldCls}
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                required
                minLength={8}
              />
            </Field>
            <Field label="System role">
              <select className={fieldCls} value={form.roleKey} onChange={(e) => set('roleKey', e.target.value)} required>
                {HR_REGISTERABLE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wide text-[#134e4a]">Employment</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Branch">
            <select className={fieldCls} value={form.branchId} onChange={(e) => set('branchId', e.target.value)} required>
              <option value="">Select branch</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
          {branchChanged ? (
            <Field label="Transfer reason" hint="Required when branch changes — recorded in transfer history.">
              <input
                className={fieldCls}
                value={form.branchChangeReason}
                onChange={(e) => set('branchChangeReason', e.target.value)}
                placeholder="e.g. Branch restructuring"
                required
              />
            </Field>
          ) : null}
          <Field label="Staff ID / employee no.">
            <input className={fieldCls} value={form.employeeNo} onChange={(e) => set('employeeNo', e.target.value)} />
          </Field>
          <Field label="Job title">
            <input className={fieldCls} value={form.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} required />
          </Field>
          <Field label="Department">
            <input className={fieldCls} value={form.department} onChange={(e) => set('department', e.target.value)} required />
          </Field>
          <Field label="Employment type">
            <select
              className={fieldCls}
              value={form.employmentType}
              onChange={(e) => set('employmentType', e.target.value)}
            >
              {HR_EMPLOYMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date joined">
            <input
              type="date"
              className={fieldCls}
              value={form.dateJoinedIso}
              onChange={(e) => set('dateJoinedIso', e.target.value)}
            />
          </Field>
          <Field label="Probation ends">
            <input
              type="date"
              className={fieldCls}
              value={form.probationEndIso}
              onChange={(e) => set('probationEndIso', e.target.value)}
            />
          </Field>
          <Field label="Line manager (user ID)">
            <input
              className={fieldCls}
              value={form.lineManagerUserId}
              onChange={(e) => set('lineManagerUserId', e.target.value)}
              placeholder="Optional — USR-…"
            />
          </Field>
          <Field label="Leave entitlement band">
            <select
              className={fieldCls}
              value={form.leaveEntitlementBand}
              onChange={(e) => set('leaveEntitlementBand', e.target.value)}
            >
              {HR_LEAVE_BANDS.map((b) => (
                <option key={b.value || 'default'} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.selfServiceEligible}
              onChange={(e) => set('selfServiceEligible', e.target.checked)}
            />
            Self-service eligible (My profile leave & payslips)
          </label>
        </div>
      </section>

      {showCompensation ? (
        <section className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wide text-[#134e4a]">Compensation</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Payroll group">
              <select
                className={fieldCls}
                value={form.payrollGroup}
                onChange={(e) => set('payrollGroup', e.target.value)}
              >
                {HR_PAYROLL_GROUPS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Salary level">
              <input
                type="number"
                min={1}
                className={fieldCls}
                value={form.salaryLevel}
                onChange={(e) => set('salaryLevel', e.target.value)}
              />
            </Field>
            <Field label="Salary step">
              <input
                type="number"
                min={1}
                className={fieldCls}
                value={form.salaryStep}
                onChange={(e) => set('salaryStep', e.target.value)}
              />
            </Field>
            <Field label="Base salary (₦ / month)">
              <input
                type="number"
                min={0}
                className={fieldCls}
                value={form.baseSalaryNgn}
                onChange={(e) => set('baseSalaryNgn', e.target.value)}
              />
            </Field>
            <Field label="Housing allowance (₦)">
              <input
                type="number"
                min={0}
                className={fieldCls}
                value={form.housingAllowanceNgn}
                onChange={(e) => set('housingAllowanceNgn', e.target.value)}
              />
            </Field>
            <Field label="Transport allowance (₦)">
              <input
                type="number"
                min={0}
                className={fieldCls}
                value={form.transportAllowanceNgn}
                onChange={(e) => set('transportAllowanceNgn', e.target.value)}
              />
            </Field>
            <Field label="PAYE %">
              <input
                type="number"
                min={0}
                step="0.1"
                className={fieldCls}
                value={form.payeTaxPercent}
                onChange={(e) => set('payeTaxPercent', e.target.value)}
              />
            </Field>
            <Field label="Pension override %">
              <input
                type="number"
                min={0}
                step="0.1"
                className={fieldCls}
                value={form.pensionPercentOverride}
                onChange={(e) => set('pensionPercentOverride', e.target.value)}
              />
            </Field>
            <Field label="Tax ID">
              <input className={fieldCls} value={form.taxId} onChange={(e) => set('taxId', e.target.value)} />
            </Field>
            <Field label="RSA PIN">
              <input className={fieldCls} value={form.pensionRsaPin} onChange={(e) => set('pensionRsaPin', e.target.value)} />
            </Field>
            <Field label="Bank name">
              <input className={fieldCls} value={form.bankName} onChange={(e) => set('bankName', e.target.value)} />
            </Field>
            <Field label="Account name">
              <input
                className={fieldCls}
                value={form.bankAccountName}
                onChange={(e) => set('bankAccountName', e.target.value)}
              />
            </Field>
            <Field label="Account no. (masked on file)">
              <input
                className={fieldCls}
                value={form.bankAccountNoMasked}
                onChange={(e) => set('bankAccountNoMasked', e.target.value)}
                placeholder="Last 4 digits or masked"
              />
            </Field>
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wide text-[#134e4a]">Identity & next of kin</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="NIN (11 digits)">
            <input
              className={fieldCls}
              value={form.ninNumber}
              onChange={(e) => set('ninNumber', e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="National Identification Number"
              inputMode="numeric"
            />
          </Field>
          <Field label="Next of kin — full name">
            <input className={fieldCls} value={form.nextOfKinName} onChange={(e) => set('nextOfKinName', e.target.value)} />
          </Field>
          <Field label="Next of kin — phone">
            <input
              className={fieldCls}
              value={form.nextOfKinPhone}
              onChange={(e) => set('nextOfKinPhone', e.target.value)}
              placeholder="+234…"
            />
          </Field>
          <Field label="Relationship">
            <input
              className={fieldCls}
              value={form.nextOfKinRelationship}
              onChange={(e) => set('nextOfKinRelationship', e.target.value)}
              placeholder="e.g. Spouse, Parent"
            />
          </Field>
          <Field label="Next of kin — address" hint="Optional">
            <input
              className={fieldCls}
              value={form.nextOfKinAddress}
              onChange={(e) => set('nextOfKinAddress', e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wide text-[#134e4a]">Qualifications & notes</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Minimum qualification">
            <input
              className={fieldCls}
              value={form.minimumQualification}
              onChange={(e) => set('minimumQualification', e.target.value)}
            />
          </Field>
          <Field label="Academic qualification">
            <input
              className={fieldCls}
              value={form.academicQualification}
              onChange={(e) => set('academicQualification', e.target.value)}
            />
          </Field>
          <Field label="Grade / promotion band">
            <input
              className={fieldCls}
              value={form.promotionGrade}
              onChange={(e) => set('promotionGrade', e.target.value)}
            />
          </Field>
          <Field label="Training summary">
            <textarea
              className={`${fieldCls} min-h-[72px]`}
              value={form.trainingSummary}
              onChange={(e) => set('trainingSummary', e.target.value)}
            />
          </Field>
          <Field label="Welfare notes">
            <textarea
              className={`${fieldCls} min-h-[72px] sm:col-span-2`}
              value={form.welfareNotes}
              onChange={(e) => set('welfareNotes', e.target.value)}
            />
          </Field>
        </div>
      </section>
    </div>
  );
}
