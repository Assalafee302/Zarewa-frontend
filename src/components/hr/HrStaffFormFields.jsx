import React, { useEffect, useMemo, useState } from 'react';
import {
  HR_EMPLOYMENT_TYPES,
  HR_GENDERS,
  HR_LEAVE_BANDS,
  HR_PAYROLL_GROUPS,
  HR_REGISTERABLE_ROLES,
} from '../../lib/hrStaffConstants';
import {
  HR_EMPLOYMENT_STATUSES,
  HR_MARITAL_STATUSES,
  HR_STAFF_FORM_TABS,
} from '../../lib/hrStaffFormMeta';
import { fetchHrDepartments, fetchHrDesignations } from '../../lib/hrMasterData';
import { HrManagerPicker } from './HrManagerPicker';
import { apiFetch } from '../../lib/apiBase';

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

function branchMatchesScope(dept, branchId) {
  if (!dept?.branchScope) return true;
  const scope = String(dept.branchScope).trim().toUpperCase();
  if (scope === 'HQ') return String(branchId).toUpperCase() === 'HQ';
  if (scope === 'BRANCH') return String(branchId).toUpperCase() !== 'HQ';
  return String(dept.branchScope) === String(branchId);
}

/**
 * Shared staff profile fields (register + edit).
 */
export function HrStaffFormFields({
  form,
  setForm,
  branches,
  mode,
  showCompensation = true,
  originalBranchId = '',
  canViewFullBank = false,
  editUserId = '',
  initialTab = 'personal',
}) {
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const [activeTab, setActiveTab] = useState(initialTab);
  const [staffRoster, setStaffRoster] = useState([]);
  const branchChanged =
    mode === 'edit' && originalBranchId && String(form.branchId) !== String(originalBranchId);

  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [masterLoading, setMasterLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setMasterLoading(true);
      const { ok, data } = await fetchHrDepartments(false);
      if (!cancelled && ok && data?.ok) setDepartments(data.departments || []);
      setMasterLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const params = form.departmentId ? { departmentId: form.departmentId } : {};
      const { ok, data } = await fetchHrDesignations(params);
      if (!cancelled && ok && data?.ok) setDesignations(data.designations || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [form.departmentId]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { ok, data } = await apiFetch('/api/hr/staff');
      if (!cancelled && ok && data?.ok) setStaffRoster(data.staff || []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleTabs = HR_STAFF_FORM_TABS.filter((t) => showCompensation || !['payroll', 'bank', 'statutory'].includes(t.id));

  const filteredDepartments = useMemo(
    () => departments.filter((d) => d.active !== false && branchMatchesScope(d, form.branchId)),
    [departments, form.branchId]
  );

  const filteredDesignations = useMemo(() => {
    if (!form.departmentId) return designations.filter((d) => d.active !== false);
    return designations.filter((d) => d.active !== false && d.departmentId === form.departmentId);
  }, [designations, form.departmentId]);

  const selectedDesignation = useMemo(
    () => designations.find((d) => d.id === form.designationId) || null,
    [designations, form.designationId]
  );

  const legacyDepartment = Boolean(form.department && !form.departmentId && departments.length);

  const onDepartmentChange = (deptId) => {
    const dept = departments.find((d) => d.id === deptId);
    setForm((f) => ({
      ...f,
      departmentId: deptId || '',
      department: dept?.name || '',
      designationId: '',
      jobTitle: '',
    }));
  };

  const onDesignationChange = (desId) => {
    const des = designations.find((d) => d.id === desId);
    setForm((f) => ({
      ...f,
      designationId: desId || '',
      jobTitle: des?.title || f.jobTitle,
      promotionGrade: des?.seniorityBand || f.promotionGrade,
      salaryLevel: des?.defaultSalaryLevel != null ? String(des.defaultSalaryLevel) : f.salaryLevel,
      salaryStep: des?.defaultSalaryStep != null ? String(des.defaultSalaryStep) : f.salaryStep,
      jobDescriptionPreview: des?.jobDescription || '',
    }));
  };

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

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              activeTab === tab.id
                ? 'bg-[#134e4a] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'personal' ? (
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wide text-[#134e4a]">Personal data</h3>
            <p className="mt-1 text-xs text-slate-500">Legal name, contact, and demographic details for HR records.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name">
              <input className={fieldCls} value={form.firstName || ''} onChange={(e) => set('firstName', e.target.value)} />
            </Field>
            <Field label="Middle name">
              <input className={fieldCls} value={form.middleName || ''} onChange={(e) => set('middleName', e.target.value)} />
            </Field>
            <Field label="Surname">
              <input className={fieldCls} value={form.surname || ''} onChange={(e) => set('surname', e.target.value)} />
            </Field>
            {mode !== 'register' ? (
              <Field label="Display name">
                <input className={fieldCls} value={form.displayName || ''} onChange={(e) => set('displayName', e.target.value)} />
              </Field>
            ) : null}
            <Field label="Gender">
              <select className={fieldCls} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                {HR_GENDERS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Date of birth">
              <input type="date" className={fieldCls} value={form.dateOfBirthIso} onChange={(e) => set('dateOfBirthIso', e.target.value)} />
            </Field>
            <Field label="Marital status">
              <select className={fieldCls} value={form.maritalStatus || ''} onChange={(e) => set('maritalStatus', e.target.value)}>
                <option value="">Select</option>
                {HR_MARITAL_STATUSES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Phone">
              <input className={fieldCls} value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} />
            </Field>
            <Field label="Email">
              <input type="email" className={fieldCls} value={form.personalEmail || ''} onChange={(e) => set('personalEmail', e.target.value)} />
            </Field>
            <Field label="Residential address">
              <input className={fieldCls} value={form.residentialAddress || ''} onChange={(e) => set('residentialAddress', e.target.value)} />
            </Field>
            <Field label="State of origin">
              <input className={fieldCls} value={form.stateOfOrigin || ''} onChange={(e) => set('stateOfOrigin', e.target.value)} />
            </Field>
            <Field label="Local government">
              <input className={fieldCls} value={form.localGovernment || ''} onChange={(e) => set('localGovernment', e.target.value)} />
            </Field>
            <Field label="Nationality">
              <input className={fieldCls} value={form.nationality || 'Nigerian'} onChange={(e) => set('nationality', e.target.value)} />
            </Field>
            <Field label="NIN (11 digits)">
              <input
                className={fieldCls}
                value={form.ninNumber}
                onChange={(e) => set('ninNumber', e.target.value.replace(/\D/g, '').slice(0, 11))}
                inputMode="numeric"
              />
            </Field>
          </div>
        </section>
      ) : null}

      {activeTab === 'employment' ? (
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wide text-[#134e4a]">Employment details</h3>
          <p className="mt-1 text-xs text-slate-500">Branch, department, reporting structure, and employment status.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Branch / location" hint="HQ for head office staff; branch for field staff.">
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
          <Field label="Department" hint={legacyDepartment ? 'Legacy free-text department — select master data to link.' : undefined}>
            <select
              className={fieldCls}
              value={form.departmentId || ''}
              onChange={(e) => onDepartmentChange(e.target.value)}
              disabled={masterLoading}
            >
              <option value="">{legacyDepartment ? `Legacy: ${form.department}` : 'Select department'}</option>
              {filteredDepartments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}{d.code ? ` (${d.code})` : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Designation / job title">
            <select
              className={fieldCls}
              value={form.designationId || ''}
              onChange={(e) => onDesignationChange(e.target.value)}
              required={Boolean(filteredDesignations.length)}
            >
              <option value="">
                {form.jobTitle && !form.designationId ? `Legacy: ${form.jobTitle}` : 'Select designation'}
              </option>
              {filteredDesignations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                  {d.seniorityBand ? ` · ${d.seniorityBand}` : ''}
                </option>
              ))}
            </select>
          </Field>
          {!form.designationId && form.jobTitle ? (
            <Field label="Job title (legacy text)">
              <input className={fieldCls} value={form.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} />
            </Field>
          ) : null}
          {selectedDesignation?.jobDescription || form.jobDescriptionPreview ? (
            <div className="sm:col-span-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <p className="font-bold uppercase tracking-wide text-slate-400 mb-1">Job description</p>
              <p className="whitespace-pre-wrap">{selectedDesignation?.jobDescription || form.jobDescriptionPreview}</p>
            </div>
          ) : null}
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
          <Field label="Employment status">
            <select
              className={fieldCls}
              value={form.employmentStatus || 'active'}
              onChange={(e) => set('employmentStatus', e.target.value)}
            >
              {HR_EMPLOYMENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
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
          <Field label="Confirmation date">
            <input
              type="date"
              className={fieldCls}
              value={form.confirmationDateIso || ''}
              onChange={(e) => set('confirmationDateIso', e.target.value)}
            />
          </Field>
          {form.employmentType === 'contract' ? (
            <Field label="Contract end date">
              <input
                type="date"
                className={fieldCls}
                value={form.contractEndIso}
                onChange={(e) => set('contractEndIso', e.target.value)}
              />
            </Field>
          ) : null}
          <Field label="Line manager">
            <HrManagerPicker
              staff={staffRoster}
              value={form.lineManagerUserId}
              onChange={(id) => set('lineManagerUserId', id)}
              excludeUserId={editUserId}
              className={fieldCls}
            />
          </Field>
          <Field label="Department head / supervisor">
            <input
              className={fieldCls}
              value={form.supervisorName || ''}
              onChange={(e) => set('supervisorName', e.target.value)}
              placeholder="Optional — name or user reference"
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
      ) : null}

      {showCompensation && activeTab === 'payroll' ? (
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wide text-[#134e4a]">Salary & payroll</h3>
            <p className="mt-1 text-xs text-slate-500">Payroll group, salary structure, and monthly compensation.</p>
          </div>
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
            <Field label="Senior / junior band">
              <input
                className={fieldCls}
                value={form.promotionGrade}
                onChange={(e) => set('promotionGrade', e.target.value)}
                placeholder="From designation or manual"
              />
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
            <Field label="Salary status">
              <select className={fieldCls} value={form.salaryStatus || 'active'} onChange={(e) => set('salaryStatus', e.target.value)}>
                <option value="active">Active</option>
                <option value="held">Held</option>
                <option value="suspended">Suspended</option>
                <option value="exited">Exited</option>
              </select>
            </Field>
            <Field label="Payroll remarks">
              <textarea
                className={`${fieldCls} min-h-[72px] sm:col-span-2`}
                value={form.payrollRemarks || ''}
                onChange={(e) => set('payrollRemarks', e.target.value)}
                placeholder="Internal payroll notes"
              />
            </Field>
          </div>
        </section>
      ) : null}

      {showCompensation && activeTab === 'bank' ? (
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wide text-[#134e4a]">Bank details</h3>
            <p className="mt-1 text-xs text-slate-500">Salary disbursement account. Masked in general HR views.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
            <Field label="Account no. (display)" hint="Last 4 digits shown in general HR views.">
              <input
                className={fieldCls}
                value={form.bankAccountNoMasked}
                readOnly
                placeholder="Auto-filled when full account is saved"
              />
            </Field>
            {canViewFullBank ? (
              <>
                <Field label="Full account no. (payroll export)">
                  <input
                    className={fieldCls}
                    value={form.bankAccountNo || ''}
                    onChange={(e) => set('bankAccountNo', e.target.value)}
                    placeholder="10-digit NUBAN for bank upload"
                    inputMode="numeric"
                  />
                </Field>
                <Field label="Bank code (NUBAN)">
                  <input
                    className={fieldCls}
                    value={form.bankCode || ''}
                    onChange={(e) => set('bankCode', e.target.value)}
                    placeholder="e.g. 058 for GTBank"
                  />
                </Field>
              </>
            ) : (
              <p className="sm:col-span-2 text-xs text-slate-500 rounded-lg bg-slate-50 px-3 py-2">
                Full bank account numbers are restricted to payroll export roles. Only masked digits are shown here.
              </p>
            )}
          </div>
        </section>
      ) : null}

      {showCompensation && activeTab === 'statutory' ? (
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wide text-[#134e4a]">Tax, pension & NHIS</h3>
            <p className="mt-1 text-xs text-slate-500">Statutory deductions and compliance references.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tax ID / PAYE reference">
              <input className={fieldCls} value={form.taxId} onChange={(e) => set('taxId', e.target.value)} />
            </Field>
            <Field label="PAYE % (required for payroll)">
              <input
                type="number"
                min={0}
                step="0.1"
                className={fieldCls}
                value={form.payeTaxPercent}
                onChange={(e) => set('payeTaxPercent', e.target.value)}
                placeholder="e.g. 7.5"
              />
            </Field>
            <Field label="Pension administrator">
              <input className={fieldCls} value={form.pensionAdministrator || ''} onChange={(e) => set('pensionAdministrator', e.target.value)} />
            </Field>
            <Field label="RSA PIN">
              <input className={fieldCls} value={form.pensionRsaPin} onChange={(e) => set('pensionRsaPin', e.target.value)} />
            </Field>
            <Field label="Pension % override (optional)">
              <input
                type="number"
                min={0}
                step="0.1"
                className={fieldCls}
                value={form.pensionPercentOverride}
                onChange={(e) => set('pensionPercentOverride', e.target.value)}
                placeholder="Uses company default if blank"
              />
            </Field>
            <Field label="NHIS number">
              <input className={fieldCls} value={form.nhisNumber || ''} onChange={(e) => set('nhisNumber', e.target.value)} />
            </Field>
            <Field label="HMO / NHIS provider">
              <input
                className={fieldCls}
                value={form.nhisProvider}
                onChange={(e) => set('nhisProvider', e.target.value)}
                placeholder="e.g. HMO provider name"
              />
            </Field>
            <Field label="Monthly NHIS deduction (₦)">
              <input
                type="number"
                min={0}
                className={fieldCls}
                value={form.nhisMonthlyDeductionNgn}
                onChange={(e) => set('nhisMonthlyDeductionNgn', e.target.value)}
                placeholder="0 if not enrolled"
              />
            </Field>
          </div>
        </section>
      ) : null}

      {activeTab === 'nok' ? (
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wide text-[#134e4a]">Next of kin & emergency contact</h3>
          <p className="mt-1 text-xs text-slate-500">Primary emergency contact for HR and safety records.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <input className={fieldCls} value={form.nextOfKinName} onChange={(e) => set('nextOfKinName', e.target.value)} />
          </Field>
          <Field label="Relationship">
            <input
              className={fieldCls}
              value={form.nextOfKinRelationship}
              onChange={(e) => set('nextOfKinRelationship', e.target.value)}
              placeholder="e.g. Spouse, Parent"
            />
          </Field>
          <Field label="Phone">
            <input
              className={fieldCls}
              value={form.nextOfKinPhone}
              onChange={(e) => set('nextOfKinPhone', e.target.value)}
              placeholder="+234…"
            />
          </Field>
          <Field label="Alternative contact">
            <input
              className={fieldCls}
              value={form.nextOfKinAltPhone || ''}
              onChange={(e) => set('nextOfKinAltPhone', e.target.value)}
            />
          </Field>
          <Field label="Address">
            <input
              className={fieldCls}
              value={form.nextOfKinAddress}
              onChange={(e) => set('nextOfKinAddress', e.target.value)}
            />
          </Field>
        </div>
      </section>
      ) : null}

      {activeTab === 'qualifications' ? (
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wide text-[#134e4a]">Qualifications</h3>
          <p className="mt-1 text-xs text-slate-500">Education, certifications, and professional training summary.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Highest qualification">
            <input
              className={fieldCls}
              value={form.minimumQualification}
              onChange={(e) => set('minimumQualification', e.target.value)}
            />
          </Field>
          <Field label="Institution">
            <input className={fieldCls} value={form.institution || ''} onChange={(e) => set('institution', e.target.value)} />
          </Field>
          <Field label="Course / field">
            <input
              className={fieldCls}
              value={form.courseField || form.academicQualification || ''}
              onChange={(e) => {
                set('courseField', e.target.value);
                set('academicQualification', e.target.value);
              }}
            />
          </Field>
          <Field label="Year completed">
            <input
              type="number"
              min={1950}
              max={2100}
              className={fieldCls}
              value={form.yearCompleted || ''}
              onChange={(e) => set('yearCompleted', e.target.value)}
            />
          </Field>
          <Field label="Professional certificates">
            <textarea
              className={`${fieldCls} min-h-[72px] sm:col-span-2`}
              value={form.professionalCertificates || ''}
              onChange={(e) => set('professionalCertificates', e.target.value)}
              placeholder="List certifications, one per line"
            />
          </Field>
          <Field label="Training summary">
            <textarea
              className={`${fieldCls} min-h-[72px] sm:col-span-2`}
              value={form.trainingSummary}
              onChange={(e) => set('trainingSummary', e.target.value)}
            />
          </Field>
        </div>
      </section>
      ) : null}

      {activeTab === 'notes' ? (
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wide text-[#134e4a]">HR notes & remarks</h3>
          <p className="mt-1 text-xs text-slate-500">Internal HR-only information — not visible to staff self-service.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Internal remarks">
            <textarea
              className={`${fieldCls} min-h-[72px] sm:col-span-2`}
              value={form.hrInternalNotes || ''}
              onChange={(e) => set('hrInternalNotes', e.target.value)}
            />
          </Field>
          <Field label="Special conditions">
            <textarea
              className={`${fieldCls} min-h-[72px] sm:col-span-2`}
              value={form.specialConditions || ''}
              onChange={(e) => set('specialConditions', e.target.value)}
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
      ) : null}
    </div>
  );
}
