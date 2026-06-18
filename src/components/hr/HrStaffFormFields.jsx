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
  HR_BLOOD_GROUPS,
  HR_STAFF_FORM_TABS,
} from '../../lib/hrStaffFormMeta';
import { fetchHrDepartments, fetchHrDesignations, fetchDesignationTenureEligibility } from '../../lib/hrMasterData';
import { fetchMatrixCompensationLookup } from '../../lib/hrCompensation';
import { formatNgn, yearsOfServiceFromIso } from '../../lib/hrFormat';
import { leaveBandFromSalaryLevel, defaultProbationEndIso, leaveBandLabel } from '../../lib/hrPolicyConstants';
import { isActingDesignation } from '../../lib/hrOrgConstants';
import { HrCompensationExtrasPanel } from './HrCompensationExtrasPanel';
import { HrManagerPicker } from './HrManagerPicker';
import { FAMILY_BENEFITS } from '../../lib/familyBenefitsUi';
import { apiFetch } from '../../lib/apiBase';
import { isBranchEmployee, isErpAccessRestrictedPayrollGroup } from '../../shared/hrStaffCohorts';

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
  const set = (key, value) =>
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (mode === 'register' && key === 'employeeNo') {
        const login = String(value || '')
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9._-]/g, '');
        if (login) next.username = login;
      }
      return next;
    });
  const [activeTab, setActiveTab] = useState(initialTab);
  const [staffRoster, setStaffRoster] = useState([]);
  const branchChanged =
    mode === 'edit' && originalBranchId && String(form.branchId) !== String(originalBranchId);

  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [masterLoading, setMasterLoading] = useState(true);
  const [matrixPreview, setMatrixPreview] = useState(null);
  const [matrixBusy, setMatrixBusy] = useState(false);
  const [designationEligibility, setDesignationEligibility] = useState(null);

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
  const isRegister = mode === 'register';
  const erpRestricted = isErpAccessRestrictedPayrollGroup(form.payrollGroup);
  const registerableRoles = useMemo(
    () =>
      erpRestricted
        ? HR_REGISTERABLE_ROLES.filter((r) => r.value === 'hr_portal_only')
        : HR_REGISTERABLE_ROLES.filter((r) => r.value !== 'hr_portal_only'),
    [erpRestricted]
  );

  useEffect(() => {
    if (!isRegister) return;
    if (erpRestricted && form.roleKey !== 'hr_portal_only') {
      setForm((f) => ({ ...f, roleKey: 'hr_portal_only', selfServiceEligible: true }));
    }
  }, [erpRestricted, form.roleKey, isRegister, setForm]);

  useEffect(() => {
    if (!isRegister) return;
    if (form.employmentType !== 'permanent') return;
    if (form.probationEndIso) return;
    if (!form.dateJoinedIso) return;
    const end = defaultProbationEndIso(form.dateJoinedIso);
    if (end) setForm((f) => ({ ...f, probationEndIso: end }));
  }, [isRegister, form.dateJoinedIso, form.employmentType, form.probationEndIso, setForm]);

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

  const onDesignationChange = async (desId) => {
    const des = designations.find((d) => d.id === desId);
    const nextLevel = des?.defaultSalaryLevel != null ? String(des.defaultSalaryLevel) : form.salaryLevel;
    const nextStep = des?.defaultSalaryStep != null ? String(des.defaultSalaryStep) : form.salaryStep || '1';
    setForm((f) => ({
      ...f,
      designationId: desId || '',
      jobTitle: des?.title || f.jobTitle,
      promotionGrade: des?.gradeCategory || des?.seniorityBand || f.promotionGrade,
      salaryLevel: nextLevel,
      salaryStep: nextStep,
      leaveEntitlementBand: leaveBandFromSalaryLevel(nextLevel) || f.leaveEntitlementBand,
      payAdditionNgn: '',
      applyMatrixPay: true,
      jobDescriptionPreview: des?.jobDescription || '',
      actingEndDateIso: isActingDesignation(desId, designations) ? f.actingEndDateIso : '',
    }));
    if (!desId) {
      setMatrixPreview(null);
      setDesignationEligibility(null);
      return;
    }
    if (form.dateJoinedIso) {
      const { ok, data } = await fetchDesignationTenureEligibility(desId, {
        userId: editUserId || undefined,
        dateJoinedIso: form.dateJoinedIso,
      });
      if (ok && data?.ok) setDesignationEligibility(data);
      else setDesignationEligibility(null);
    } else {
      setDesignationEligibility(null);
    }
    if (!nextLevel) {
      setMatrixPreview(null);
      return;
    }
    setMatrixBusy(true);
    const { ok, data } = await fetchMatrixCompensationLookup({
      payrollGroup: form.payrollGroup || 'branch_ops',
      salaryLevel: nextLevel,
      salaryStep: nextStep,
    });
    setMatrixBusy(false);
    if (ok && data?.ok) {
      setMatrixPreview(data);
      setForm((f) => ({
        ...f,
        baseSalaryNgn: String(data.matrix.baseSalaryNgn ?? ''),
        housingAllowanceNgn: String(data.matrix.housingAllowanceNgn ?? ''),
        transportAllowanceNgn: String(data.matrix.transportAllowanceNgn ?? ''),
        payAdditionNgn: '',
        applyMatrixPay: true,
      }));
    }
  };

  const refreshMatrixPreview = async (level, step, payrollGroup) => {
    if (!level) {
      setMatrixPreview(null);
      return null;
    }
    setMatrixBusy(true);
    const { ok, data } = await fetchMatrixCompensationLookup({
      payrollGroup: payrollGroup || 'branch_ops',
      salaryLevel: level,
      salaryStep: step || 1,
    });
    setMatrixBusy(false);
    if (ok && data?.ok) {
      setMatrixPreview(data);
      return data;
    }
    setMatrixPreview(null);
    return null;
  };

  useEffect(() => {
    if (!showCompensation || activeTab !== 'payroll' || !form.salaryLevel) return;
    let cancelled = false;
    (async () => {
      const data = await refreshMatrixPreview(form.salaryLevel, form.salaryStep || 1, form.payrollGroup);
      if (cancelled || !data?.matrix) return;
      setForm((f) => ({
        ...f,
        baseSalaryNgn: String(data.matrix.baseSalaryNgn ?? f.baseSalaryNgn ?? ''),
        housingAllowanceNgn: String(data.matrix.housingAllowanceNgn ?? f.housingAllowanceNgn ?? ''),
        transportAllowanceNgn: String(data.matrix.transportAllowanceNgn ?? f.transportAllowanceNgn ?? ''),
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, [form.salaryLevel, form.salaryStep, form.payrollGroup, showCompensation, activeTab, setForm]);

  const payAdditionNgn = Number(form.payAdditionNgn) || 0;
  const matrixComponentTotal =
    matrixPreview?.totalNgn ??
    (Number(form.baseSalaryNgn) || 0) +
      (Number(form.housingAllowanceNgn) || 0) +
      (Number(form.transportAllowanceNgn) || 0) -
      payAdditionNgn;
  const actualPayTotal = matrixComponentTotal + payAdditionNgn;

  const applyMatrixPay = async () => {
    if (!form.salaryLevel) return;
    const data = await refreshMatrixPreview(form.salaryLevel, form.salaryStep || 1, form.payrollGroup);
    if (data?.matrix) {
      setForm((f) => ({
        ...f,
        baseSalaryNgn: String(data.matrix.baseSalaryNgn ?? ''),
        housingAllowanceNgn: String(data.matrix.housingAllowanceNgn ?? ''),
        transportAllowanceNgn: String(data.matrix.transportAllowanceNgn ?? ''),
        payAdditionNgn: '',
        applyMatrixPay: true,
      }));
    }
  };

  return (
    <div className="space-y-8">
      {mode === 'register' ? (
        <section className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wide text-[#134e4a]">Login account</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Login username" hint="Same as employee ID — used to sign in. Auto-filled when you enter employee ID.">
              <input
                className={fieldCls}
                value={form.username}
                onChange={(e) => set('username', e.target.value)}
                autoComplete="off"
                readOnly={Boolean(String(form.employeeNo || '').trim())}
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
              <select
                className={fieldCls}
                value={form.roleKey}
                onChange={(e) => set('roleKey', e.target.value)}
                required
                disabled={erpRestricted}
              >
                {registerableRoles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              {erpRestricted ? (
                <p className="mt-1 text-[11px] text-amber-800">
                  Domestic, scholarship, and mining staff cannot access sales, finance, or operations — HR portal only.
                </p>
              ) : null}
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
            <Field label="Blood group">
              <select className={fieldCls} value={form.bloodGroup || ''} onChange={(e) => set('bloodGroup', e.target.value)}>
                {HR_BLOOD_GROUPS.map((b) => (
                  <option key={b.value || 'none'} value={b.value}>{b.label}</option>
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
            <Field label="BVN (11 digits)">
              <input
                className={fieldCls}
                value={form.bvnNumber || ''}
                onChange={(e) => set('bvnNumber', e.target.value.replace(/\D/g, '').slice(0, 11))}
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
          <Field label="Employee ID" hint="Branch format e.g. ZAPKD006, ZAPYL002 — leave blank to auto-assign on save">
            <input
              className={fieldCls}
              value={form.employeeNo}
              onChange={(e) => set('employeeNo', e.target.value)}
              placeholder="ZAPKD006"
            />
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
          {form.dateJoinedIso && yearsOfServiceFromIso(form.dateJoinedIso) != null ? (
            <div className="sm:col-span-2 rounded-xl border border-teal-100 bg-teal-50/60 px-3 py-2 text-xs text-teal-900">
              <span className="font-bold">Years of service:</span> ~{yearsOfServiceFromIso(form.dateJoinedIso)} yrs
              {selectedDesignation?.minServiceYears > 0 ? (
                <span className="ml-2 text-teal-700">
                  · Title requires {selectedDesignation.minServiceYears}+ yrs
                </span>
              ) : null}
            </div>
          ) : null}
          {designationEligibility && !designationEligibility.eligible ? (
            <div className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <p className="font-semibold">Tenure gate</p>
              <p>
                {designationEligibility.designationTitle} needs {designationEligibility.minServiceYears} year(s) of service.
                Current: ~{designationEligibility.yearsOfService} yrs (short by {designationEligibility.shortfallYears}).
                Use an Assistant/Trainee title, or record a tenure override below.
              </p>
            </div>
          ) : null}
          {isActingDesignation(form.designationId, designations) ? (
            <Field label="Acting appointment end date" hint="Required for acting titles; max 6 months per policy">
              <input
                type="date"
                className={fieldCls}
                value={form.actingEndDateIso || ''}
                onChange={(e) => set('actingEndDateIso', e.target.value)}
                required
              />
            </Field>
          ) : null}
          {designationEligibility && !designationEligibility.eligible ? (
            <>
              <Field label="Tenure override (HR)">
                <input
                  type="checkbox"
                  className="mt-2"
                  checked={Boolean(form.tenureOverride)}
                  onChange={(e) => set('tenureOverride', e.target.checked)}
                />
              </Field>
              {form.tenureOverride ? (
                <Field label="Override reason" hint="Min 12 characters — board letter, MD approval, etc.">
                  <textarea
                    className={fieldCls}
                    rows={2}
                    value={form.tenureOverrideReason || ''}
                    onChange={(e) => set('tenureOverrideReason', e.target.value)}
                  />
                </Field>
              ) : null}
            </>
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
          <Field label="Leave entitlement band" hint={`Auto: ${leaveBandLabel(leaveBandFromSalaryLevel(form.salaryLevel))} from salary level`}>
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
            Self-service eligible (HR services — leave & payslips)
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
                onChange={(e) => {
                  const pg = e.target.value;
                  setForm((f) => ({
                    ...f,
                    payrollGroup: pg,
                    ...(isErpAccessRestrictedPayrollGroup(pg)
                      ? { roleKey: 'hr_portal_only', selfServiceEligible: true }
                      : {}),
                  }));
                }}
              >
                {HR_PAYROLL_GROUPS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </Field>
            {form.payrollGroup === 'scholarship' ? (
              <div className="sm:col-span-2 rounded-2xl border border-violet-100 bg-violet-50/40 p-4 space-y-3">
                <p className="text-xs font-black uppercase tracking-wide text-violet-800">{FAMILY_BENEFITS.staffFormSection}</p>
                <p className="text-xs text-violet-900/80">
                  Link the executive benefits record so payments and self-service stay in sync.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Benefits beneficiary ID" hint="From Chairman Accounts → Beneficiaries (e.g. EXBEN-…).">
                    <input
                      className={fieldCls}
                      value={form.schoolBeneficiaryId || ''}
                      onChange={(e) => set('schoolBeneficiaryId', e.target.value)}
                      placeholder="EXBEN-…"
                    />
                  </Field>
                  <Field label="School name">
                    <input
                      className={fieldCls}
                      value={form.schoolNameProfile || ''}
                      onChange={(e) => set('schoolNameProfile', e.target.value)}
                    />
                  </Field>
                  <Field label="Class / level">
                    <input
                      className={fieldCls}
                      value={form.schoolClassLevel || ''}
                      onChange={(e) => set('schoolClassLevel', e.target.value)}
                    />
                  </Field>
                  <Field label="Academic session">
                    <input
                      className={fieldCls}
                      value={form.schoolAcademicSession || ''}
                      onChange={(e) => set('schoolAcademicSession', e.target.value)}
                      placeholder="2025/2026"
                    />
                  </Field>
                  <Field label="Current term">
                    <input
                      className={fieldCls}
                      value={form.schoolCurrentTerm || ''}
                      onChange={(e) => set('schoolCurrentTerm', e.target.value)}
                      placeholder="Term 1"
                    />
                  </Field>
                  <Field label="Term school fees (₦)">
                    <input
                      type="number"
                      min={0}
                      className={fieldCls}
                      value={form.schoolFeesNgnProfile || ''}
                      onChange={(e) => set('schoolFeesNgnProfile', e.target.value)}
                    />
                  </Field>
                  <Field label="Term starts">
                    <input
                      type="date"
                      className={fieldCls}
                      value={form.schoolTermStartIso || ''}
                      onChange={(e) => set('schoolTermStartIso', e.target.value)}
                    />
                  </Field>
                  <Field label="Term ends">
                    <input
                      type="date"
                      className={fieldCls}
                      value={form.schoolTermEndIso || ''}
                      onChange={(e) => set('schoolTermEndIso', e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            ) : null}
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
            <Field label="Salary step" hint="Step 1 = entry · 2 = experienced · 3 = long service">
              <input
                type="number"
                min={1}
                max={3}
                className={fieldCls}
                value={form.salaryStep}
                onChange={(e) => set('salaryStep', e.target.value)}
              />
            </Field>
            <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <p className="text-xs font-black uppercase tracking-wide text-[#134e4a]">Standard matrix pay</p>
              <div className="grid gap-3 sm:grid-cols-3 text-xs">
                <div>
                  <span className="text-slate-500">Base</span>
                  <p className="font-semibold tabular-nums text-slate-800">{formatNgn(matrixPreview?.matrix?.baseSalaryNgn ?? form.baseSalaryNgn)}</p>
                </div>
                <div>
                  <span className="text-slate-500">Housing</span>
                  <p className="font-semibold tabular-nums text-slate-800">{formatNgn(matrixPreview?.matrix?.housingAllowanceNgn ?? form.housingAllowanceNgn)}</p>
                </div>
                <div>
                  <span className="text-slate-500">Transport</span>
                  <p className="font-semibold tabular-nums text-slate-800">{formatNgn(matrixPreview?.matrix?.transportAllowanceNgn ?? form.transportAllowanceNgn)}</p>
                </div>
              </div>
              <p className="text-xs text-slate-600">
                Matrix total: <span className="font-bold tabular-nums">{formatNgn(matrixComponentTotal)}</span>
              </p>
            </div>
            <Field label="Pay addition (₦ / month)" hint="Manual top-up above matrix — multi-role, director emolument, retention, etc. Leave blank if on matrix only.">
              <input
                type="number"
                min={0}
                className={fieldCls}
                value={form.payAdditionNgn}
                onChange={(e) => set('payAdditionNgn', e.target.value)}
                placeholder="0"
              />
            </Field>
            <Field label="Actual monthly pay (computed)">
              <input className={`${fieldCls} bg-slate-50 font-semibold tabular-nums`} readOnly value={formatNgn(actualPayTotal)} />
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
          <HrCompensationExtrasPanel
            form={form}
            setForm={setForm}
            branches={branches}
            designations={designations}
            matrixPreview={matrixPreview}
            matrixComponentTotal={matrixComponentTotal}
            actualPayTotal={actualPayTotal}
            onApplyMatrix={applyMatrixPay}
            matrixBusy={matrixBusy}
          />
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
            <p className="mt-1 text-xs text-slate-500">
              {isBranchEmployee(form.payrollGroup)
                ? 'Monthly PAYE deduction (₦) is entered manually per staff. Pension is deducted from payroll using company policy rates for eligible branch staff.'
                : 'Domestic, executive family, mining, and HQ special staff are not on branch payroll — no PAYE or pension deductions.'}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {isBranchEmployee(form.payrollGroup) ? (
              <>
                <Field label="Tax ID / PAYE reference">
                  <input className={fieldCls} value={form.taxId} onChange={(e) => set('taxId', e.target.value)} />
                </Field>
                <Field label="Monthly PAYE deduction (₦)">
                  <input
                    type="number"
                    min={0}
                    step="1"
                    className={fieldCls}
                    value={form.payeTaxNgn}
                    onChange={(e) => set('payeTaxNgn', e.target.value)}
                    placeholder="e.g. 45000 — fixed amount per month"
                  />
                </Field>
                <Field label="Pension administrator (PFA)">
                  <input className={fieldCls} value={form.pensionAdministrator || ''} onChange={(e) => set('pensionAdministrator', e.target.value)} />
                </Field>
                <Field label="RSA PIN">
                  <input className={fieldCls} value={form.pensionRsaPin} onChange={(e) => set('pensionRsaPin', e.target.value)} />
                </Field>
              </>
            ) : null}
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
