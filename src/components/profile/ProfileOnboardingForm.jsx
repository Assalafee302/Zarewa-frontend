import React, { useEffect, useMemo, useRef, useState } from 'react';
import { User, Phone, MapPin, Users, GraduationCap, CreditCard } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useUserProfile } from '../../context/UserProfileContext';
import { staffToForm, submitMyHrProfile, updateMyHrProfile } from '../../lib/hrStaff';
import { HR_GENDERS } from '../../lib/hrStaffConstants';
import { HR_MARITAL_STATUSES } from '../../lib/hrStaffFormMeta';
import { composeLegalDisplayName, validateEmployeeProfileSubmit } from '../../lib/hrLegalDisplayName';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY } from '../hr/hrFormStyles';
import {
  PROFILE_INPUT_CLASS,
  PROFILE_TEXTAREA_CLASS,
  ProfileFormActions,
  ProfileFormField,
  ProfileFormSection,
  ProfilePageAnchors,
} from './profileFormUi';
import { ProfileLockedNotice, ProfileOnboardingStatus } from './ProfileOnboardingStatus';

const ANCHORS = [
  { id: 'legal-name', label: 'Legal name' },
  { id: 'contact', label: 'Contact' },
  { id: 'identity', label: 'Identity' },
  { id: 'address', label: 'Address' },
  { id: 'next-of-kin', label: 'Next of kin' },
  { id: 'qualifications', label: 'Qualifications' },
  { id: 'bank', label: 'Bank' },
];

function buildStaffForValidation(form, hr) {
  if (!form || !hr) return null;
  return {
    ...hr,
    gender: form.gender,
    dateOfBirthIso: form.dateOfBirthIso,
    ninNumber: form.ninNumber,
    bvnNumber: form.bvnNumber,
    minimumQualification: form.minimumQualification,
    academicQualification: form.academicQualification,
    profileExtra: {
      ...(hr.profileExtra || {}),
      personal: {
        ...(hr.profileExtra?.personal || {}),
        firstName: form.firstName,
        middleName: form.middleName,
        surname: form.surname,
        phone: form.phone,
        residentialAddress: form.residentialAddress,
      },
    },
    nextOfKin: {
      name: form.nextOfKinName,
      phone: form.nextOfKinPhone,
      relationship: form.nextOfKinRelationship,
    },
  };
}

/**
 * Employee self-service onboarding form — save draft, submit for HR lock.
 * @param {{ variant?: 'page' | 'modal'; onSubmitted?: () => void }} props
 */
export function ProfileOnboardingForm({ variant = 'page', onSubmitted }) {
  const { show: showToast } = useToast();
  const { me, hr, reload } = useUserProfile();
  const profileLocked = Boolean(hr?.profileLocked);
  const profileSubmittedAtIso = hr?.profileSubmittedAtIso || null;
  const profileVerifiedAtIso = hr?.profileVerifiedAtIso || null;

  const [busy, setBusy] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const dirtyRef = useRef(false);

  const staff = useMemo(() => {
    if (!hr || !me?.user?.id) return null;
    return { ...hr, email: me.user.email, userId: me.user.id };
  }, [hr, me?.user?.id, me?.user?.email]);

  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!staff || profileLocked) return;
    if (dirtyRef.current) return;
    setForm(staffToForm(staff));
  }, [staff, profileLocked]);

  const set = (key, value) => {
    dirtyRef.current = true;
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const legalName = useMemo(() => {
    if (!form) return '';
    return composeLegalDisplayName({
      firstName: form.firstName,
      middleName: form.middleName,
      surname: form.surname,
    });
  }, [form]);

  const validation = useMemo(() => {
    const s = buildStaffForValidation(form, hr);
    return validateEmployeeProfileSubmit(s);
  }, [form, hr]);

  if (!hr) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Your HR employment file is not open yet. Contact HR, then return here to complete your details.
      </p>
    );
  }

  if (profileLocked) {
    return (
      <div className="space-y-4">
        <ProfileOnboardingStatus
          profileLocked={profileLocked}
          profileSubmittedAtIso={profileSubmittedAtIso}
          profileVerifiedAtIso={profileVerifiedAtIso}
        />
        <ProfileLockedNotice />
      </div>
    );
  }

  if (!form) {
    return <div className="h-32 animate-pulse rounded-xl bg-slate-100" aria-busy="true" />;
  }

  const save = async () => {
    setBusy(true);
    const { ok, data } = await updateMyHrProfile(form);
    setBusy(false);
    if (!ok || !data?.ok) {
      showToast(data?.error || 'Could not save profile.', { variant: 'error' });
      return;
    }
    dirtyRef.current = false;
    showToast('Progress saved.');
    await reload?.();
  };

  const submit = async () => {
    if (!validation.ok) {
      showToast(`Complete required fields: ${validation.missing.map((m) => m.label).join(', ')}`, {
        variant: 'error',
      });
      return;
    }
    setSubmitBusy(true);
    if (dirtyRef.current) {
      const saved = await updateMyHrProfile(form);
      if (!saved.ok || !saved.data?.ok) {
        setSubmitBusy(false);
        showToast(saved.data?.error || 'Save failed before submit.', { variant: 'error' });
        return;
      }
      dirtyRef.current = false;
    }
    const { ok, data } = await submitMyHrProfile();
    setSubmitBusy(false);
    setShowConfirmSubmit(false);
    if (!ok || !data?.ok) {
      if (data?.missing?.length) {
        showToast(`Still missing: ${data.missing.map((m) => m.label).join(', ')}`, { variant: 'error' });
      } else {
        showToast(data?.error || 'Could not submit profile.', { variant: 'error' });
      }
      return;
    }
    showToast('Profile submitted. HR will review your record.');
    await reload?.();
    onSubmitted?.();
  };

  const progressPct = validation.ok
    ? 100
    : Math.min(95, Math.max(8, 100 - validation.missing.length * 6));

  const sectionProps = variant === 'modal' ? { compact: true, flat: true } : {};

  const formSections = (
    <>
      <ProfileFormSection
        id="legal-name"
        icon={<User size={16} />}
        title="Legal name"
        subtitle="Your official full name — used on payslips, ID card, and directory"
        {...sectionProps}
      >
          <div
            className={`mb-4 rounded-lg border px-3 py-2.5 ${
              variant === 'modal'
                ? 'border-teal-100 bg-teal-50/50'
                : 'border-slate-200 bg-slate-50'
            }`}
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Full name preview</p>
            <p className="mt-0.5 text-base font-semibold text-slate-900">{legalName || '—'}</p>
            <p className="mt-1 text-[11px] text-slate-500">Generated from the fields below. Not editable separately.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileFormField label="First name" required>
              <input
                className={PROFILE_INPUT_CLASS}
                value={form.firstName || ''}
                onChange={(e) => set('firstName', e.target.value)}
                autoComplete="given-name"
                required
              />
            </ProfileFormField>
            <ProfileFormField label="Middle name" hint="Optional">
              <input
                className={PROFILE_INPUT_CLASS}
                value={form.middleName || ''}
                onChange={(e) => set('middleName', e.target.value)}
                autoComplete="additional-name"
              />
            </ProfileFormField>
            <ProfileFormField label="Surname" required className="sm:col-span-2">
              <input
                className={PROFILE_INPUT_CLASS}
                value={form.surname || ''}
                onChange={(e) => set('surname', e.target.value)}
                autoComplete="family-name"
                required
              />
            </ProfileFormField>
          </div>
        </ProfileFormSection>

        <ProfileFormSection
          id="contact"
          icon={<Phone size={16} />}
          title="Contact & personal"
          subtitle="How HR and payroll can reach you"
          {...sectionProps}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileFormField label="Phone number" required>
              <input
                className={PROFILE_INPUT_CLASS}
                value={form.phone || ''}
                onChange={(e) => set('phone', e.target.value)}
                inputMode="tel"
                autoComplete="tel"
                required
              />
            </ProfileFormField>
            <ProfileFormField label="Personal email">
              <input
                type="email"
                className={PROFILE_INPUT_CLASS}
                value={form.personalEmail || ''}
                onChange={(e) => set('personalEmail', e.target.value)}
                autoComplete="email"
              />
            </ProfileFormField>
            <ProfileFormField label="Gender" required>
              <select
                className={PROFILE_INPUT_CLASS}
                value={form.gender || ''}
                onChange={(e) => set('gender', e.target.value)}
                required
              >
                {HR_GENDERS.map((g) => (
                  <option key={g.value || 'blank'} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </ProfileFormField>
            <ProfileFormField label="Date of birth" required>
              <input
                type="date"
                className={PROFILE_INPUT_CLASS}
                value={form.dateOfBirthIso || ''}
                onChange={(e) => set('dateOfBirthIso', e.target.value)}
                required
              />
            </ProfileFormField>
            <ProfileFormField label="Marital status">
              <select
                className={PROFILE_INPUT_CLASS}
                value={form.maritalStatus || ''}
                onChange={(e) => set('maritalStatus', e.target.value)}
              >
                <option value="">Select</option>
                {HR_MARITAL_STATUSES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </ProfileFormField>
            <ProfileFormField label="Nationality">
              <input
                className={PROFILE_INPUT_CLASS}
                value={form.nationality || 'Nigerian'}
                onChange={(e) => set('nationality', e.target.value)}
              />
            </ProfileFormField>
          </div>
        </ProfileFormSection>

        <ProfileFormSection
          id="identity"
          icon={<User size={16} />}
          title="Identity numbers"
          subtitle="11-digit NIN and BVN as on your official documents"
          {...sectionProps}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileFormField label="NIN" required hint="National Identification Number">
              <input
                className={`${PROFILE_INPUT_CLASS} font-mono tracking-wide`}
                value={form.ninNumber || ''}
                onChange={(e) => set('ninNumber', e.target.value.replace(/\D/g, '').slice(0, 11))}
                inputMode="numeric"
                maxLength={11}
                required
              />
            </ProfileFormField>
            <ProfileFormField label="BVN" required hint="Bank Verification Number">
              <input
                className={`${PROFILE_INPUT_CLASS} font-mono tracking-wide`}
                value={form.bvnNumber || ''}
                onChange={(e) => set('bvnNumber', e.target.value.replace(/\D/g, '').slice(0, 11))}
                inputMode="numeric"
                maxLength={11}
                required
              />
            </ProfileFormField>
          </div>
        </ProfileFormSection>

        <ProfileFormSection
          id="address"
          icon={<MapPin size={16} />}
          title="Residential address"
          subtitle="Your current home address"
          {...sectionProps}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileFormField label="Street address" required className="sm:col-span-2">
              <input
                className={PROFILE_INPUT_CLASS}
                value={form.residentialAddress || ''}
                onChange={(e) => set('residentialAddress', e.target.value)}
                autoComplete="street-address"
                required
              />
            </ProfileFormField>
            <ProfileFormField label="State of origin">
              <input
                className={PROFILE_INPUT_CLASS}
                value={form.stateOfOrigin || ''}
                onChange={(e) => set('stateOfOrigin', e.target.value)}
              />
            </ProfileFormField>
            <ProfileFormField label="Local government">
              <input
                className={PROFILE_INPUT_CLASS}
                value={form.localGovernment || ''}
                onChange={(e) => set('localGovernment', e.target.value)}
              />
            </ProfileFormField>
          </div>
        </ProfileFormSection>

        <ProfileFormSection
          id="next-of-kin"
          icon={<Users size={16} />}
          title="Next of kin"
          subtitle="Emergency contact on your HR file"
          {...sectionProps}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileFormField label="Full name" required>
              <input
                className={PROFILE_INPUT_CLASS}
                value={form.nextOfKinName || ''}
                onChange={(e) => set('nextOfKinName', e.target.value)}
                required
              />
            </ProfileFormField>
            <ProfileFormField label="Relationship" required>
              <input
                className={PROFILE_INPUT_CLASS}
                value={form.nextOfKinRelationship || ''}
                onChange={(e) => set('nextOfKinRelationship', e.target.value)}
                placeholder="e.g. Spouse, Parent, Sibling"
                required
              />
            </ProfileFormField>
            <ProfileFormField label="Phone" required>
              <input
                className={PROFILE_INPUT_CLASS}
                value={form.nextOfKinPhone || ''}
                onChange={(e) => set('nextOfKinPhone', e.target.value)}
                inputMode="tel"
                required
              />
            </ProfileFormField>
            <ProfileFormField label="Alternate phone">
              <input
                className={PROFILE_INPUT_CLASS}
                value={form.nextOfKinAltPhone || ''}
                onChange={(e) => set('nextOfKinAltPhone', e.target.value)}
                inputMode="tel"
              />
            </ProfileFormField>
            <ProfileFormField label="Address" className="sm:col-span-2">
              <input
                className={PROFILE_INPUT_CLASS}
                value={form.nextOfKinAddress || ''}
                onChange={(e) => set('nextOfKinAddress', e.target.value)}
              />
            </ProfileFormField>
          </div>
        </ProfileFormSection>

        <ProfileFormSection
          id="qualifications"
          icon={<GraduationCap size={16} />}
          title="Education & qualifications"
          subtitle="Highest qualification and professional certificates"
          {...sectionProps}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileFormField label="Highest qualification" required>
              <input
                className={PROFILE_INPUT_CLASS}
                value={form.minimumQualification || ''}
                onChange={(e) => set('minimumQualification', e.target.value)}
                placeholder="e.g. B.Sc, HND, SSCE"
                required
              />
            </ProfileFormField>
            <ProfileFormField label="Institution">
              <input
                className={PROFILE_INPUT_CLASS}
                value={form.institution || ''}
                onChange={(e) => set('institution', e.target.value)}
              />
            </ProfileFormField>
            <ProfileFormField label="Course / field">
              <input
                className={PROFILE_INPUT_CLASS}
                value={form.courseField || form.academicQualification || ''}
                onChange={(e) => {
                  const v = e.target.value;
                  dirtyRef.current = true;
                  setForm((prev) => (prev ? { ...prev, courseField: v, academicQualification: v } : prev));
                }}
              />
            </ProfileFormField>
            <ProfileFormField label="Year completed">
              <input
                type="number"
                min={1950}
                max={2100}
                className={PROFILE_INPUT_CLASS}
                value={form.yearCompleted || ''}
                onChange={(e) => set('yearCompleted', e.target.value)}
              />
            </ProfileFormField>
            <ProfileFormField label="Professional certificates" className="sm:col-span-2">
              <textarea
                className={PROFILE_TEXTAREA_CLASS}
                value={form.professionalCertificates || ''}
                onChange={(e) => set('professionalCertificates', e.target.value)}
                rows={3}
                placeholder="List any professional certifications (optional)"
              />
            </ProfileFormField>
          </div>
        </ProfileFormSection>

        <ProfileFormSection
          id="bank"
          icon={<CreditCard size={16} />}
          title="Bank details"
          subtitle="Salary account — HR will verify before payroll"
          {...sectionProps}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileFormField label="Bank name">
              <input
                className={PROFILE_INPUT_CLASS}
                value={form.bankName || ''}
                onChange={(e) => set('bankName', e.target.value)}
              />
            </ProfileFormField>
            <ProfileFormField label="Account name" hint="Should match your legal name">
              <input
                className={PROFILE_INPUT_CLASS}
                value={form.bankAccountName || ''}
                onChange={(e) => set('bankAccountName', e.target.value)}
              />
            </ProfileFormField>
            <ProfileFormField label="Account number" className="sm:col-span-2">
              <input
                className={`${PROFILE_INPUT_CLASS} font-mono`}
                value={form.bankAccountNo || ''}
                onChange={(e) => set('bankAccountNo', e.target.value.replace(/\D/g, '').slice(0, 10))}
                inputMode="numeric"
                maxLength={10}
              />
            </ProfileFormField>
          </div>
        </ProfileFormSection>
    </>
  );

  const missingBlock =
    validation.missing.length > 0 ? (
      <div
        className={`rounded-lg border px-3 py-2.5 text-xs ${
          variant === 'modal'
            ? 'border-amber-100 bg-amber-50/80 text-amber-950'
            : 'border-slate-200 bg-slate-50 text-slate-600'
        }`}
      >
        <p className="font-semibold text-slate-800">Required before submit</p>
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {validation.missing.map((m) => (
            <li
              key={m.id}
              className="rounded-md bg-white/80 px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200/80"
            >
              {m.label}
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  const actionFooter = (
    <ProfileFormActions className={variant === 'modal' ? '!border-t-0 !pt-0' : ''}>
      <button
        type="button"
        disabled={busy || submitBusy}
        onClick={() => void save()}
        className={`${HR_BTN_SECONDARY} min-h-11 w-full sm:w-auto`}
      >
        {busy ? 'Saving…' : 'Save progress'}
      </button>
      {!showConfirmSubmit ? (
        <button
          type="button"
          disabled={busy || submitBusy || !validation.ok}
          onClick={() => setShowConfirmSubmit(true)}
          className={`${HR_BTN_PRIMARY} min-h-11 w-full sm:w-auto`}
        >
          Submit to HR
        </button>
      ) : (
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
          <p className="text-xs text-slate-600 sm:flex-1">
            After submit you cannot edit directly — only through HR-approved requests.
          </p>
          <button type="button" onClick={() => setShowConfirmSubmit(false)} className={HR_BTN_SECONDARY}>
            Cancel
          </button>
          <button type="button" disabled={submitBusy} onClick={() => void submit()} className={HR_BTN_PRIMARY}>
            {submitBusy ? 'Submitting…' : 'Confirm submit'}
          </button>
        </div>
      )}
    </ProfileFormActions>
  );

  if (variant === 'modal') {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-slate-100 bg-slate-50/90 px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-slate-600">
              {validation.ok ? 'Ready to submit' : `${validation.missing.length} required field(s) left`}
            </span>
            <span className="font-bold tabular-nums text-[#134e4a]">{progressPct}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/90">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#134e4a] to-teal-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <ProfilePageAnchors items={ANCHORS} variant="modal" />

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto custom-scrollbar bg-slate-50/40 px-4 py-4 sm:space-y-4 sm:px-6 sm:py-5">
          {formSections}
        </div>

        <footer className="shrink-0 space-y-3 border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.12)] sm:px-6 sm:py-4">
          {missingBlock}
          {actionFooter}
        </footer>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ProfileOnboardingStatus missingCount={validation.missing.length} />
      <ProfilePageAnchors items={ANCHORS} />

      <div className="max-h-none space-y-4 overflow-visible sm:max-h-[calc(100vh-14rem)] sm:overflow-y-auto sm:pr-1 sm:[scrollbar-gutter:stable] custom-scrollbar">
        {formSections}
      </div>

      {missingBlock}

      <div className="sticky bottom-0 z-10 -mx-1 border-t border-slate-200 bg-[#F8FAFC]/95 px-1 py-3 backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        {actionFooter}
      </div>
    </div>
  );
}

export default ProfileOnboardingForm;
