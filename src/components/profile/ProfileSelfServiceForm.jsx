import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { useUserProfile } from '../../context/UserProfileContext';
import { staffToForm, updateMyHrProfile } from '../../lib/hrStaff';
import { HR_GENDERS } from '../../lib/hrStaffConstants';
import { HR_MARITAL_STATUSES } from '../../lib/hrStaffFormMeta';
import { HR_BTN_PRIMARY, HR_FIELD_CLASS, HR_TEXTAREA_CLASS } from '../hr/hrFormStyles';

const SECTIONS = [
  { id: 'personal', label: 'Personal' },
  { id: 'nok', label: 'Next of kin' },
  { id: 'qualifications', label: 'Qualifications' },
];

function Field({ label, children, className = '' }) {
  return (
    <label className={`block text-xs font-bold uppercase tracking-wider text-gray-500 ${className}`}>
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export function ProfileSelfServiceForm() {
  const { show: showToast } = useToast();
  const { me, hr, reload } = useUserProfile();
  const [active, setActive] = useState('personal');
  const [busy, setBusy] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const dirtyRef = useRef(false);

  const staff = useMemo(() => {
    if (!hr || !me?.user?.id) return null;
    return { ...hr, email: me.user.email, userId: me.user.id };
  }, [hr, me?.user?.id, me?.user?.email]);

  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!staff) return;
    if (dirtyRef.current) return;
    setForm(staffToForm(staff));
  }, [staff]);

  const set = (key, value) => {
    dirtyRef.current = true;
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  if (!form) {
    return (
      <p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Your HR employment file is not open yet. Contact HR, then return here to complete your details.
      </p>
    );
  }

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const { ok, data } = await updateMyHrProfile(form);
    setBusy(false);
    if (!ok || !data?.ok) {
      showToast(data?.error || 'Could not save profile.', { variant: 'error' });
      return;
    }
    dirtyRef.current = false;
    showToast('Profile saved. HR will verify documents on file.');
    await reload?.();
  };

  return (
    <section className="rounded-2xl border border-teal-100 bg-teal-50/30 p-4 sm:p-5">
      <h3 className="text-base font-black text-slate-900 sm:text-sm">Your HR details</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-600 sm:text-xs">
        Fill in personal, next of kin, and qualification information. Job title and salary are maintained by HR.
        For bank or NIN changes, use the HR approval request form on this page.
      </p>

      <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 snap-x snap-mandatory custom-scrollbar [-webkit-overflow-scrolling:touch]">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActive(s.id)}
            className={`shrink-0 snap-start rounded-xl px-4 py-2.5 min-h-11 text-xs font-bold uppercase tracking-wide border transition-colors ${
              active === s.id
                ? 'border-[#134e4a] bg-[#134e4a] text-white'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <form className="mt-5 space-y-4" onSubmit={save}>
        {active === 'personal' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name">
              <input className={HR_FIELD_CLASS} value={form.firstName || ''} onChange={(e) => set('firstName', e.target.value)} />
            </Field>
            <Field label="Middle name">
              <input className={HR_FIELD_CLASS} value={form.middleName || ''} onChange={(e) => set('middleName', e.target.value)} />
            </Field>
            <Field label="Surname">
              <input className={HR_FIELD_CLASS} value={form.surname || ''} onChange={(e) => set('surname', e.target.value)} />
            </Field>
            <Field label="NIN (11 digits)">
              <input
                className={`${HR_FIELD_CLASS} font-mono`}
                value={form.ninNumber || ''}
                onChange={(e) => set('ninNumber', e.target.value.replace(/\D/g, '').slice(0, 11))}
                inputMode="numeric"
              />
            </Field>
            <Field label="BVN (11 digits)">
              <input
                className={`${HR_FIELD_CLASS} font-mono`}
                value={form.bvnNumber || ''}
                onChange={(e) => set('bvnNumber', e.target.value.replace(/\D/g, '').slice(0, 11))}
                inputMode="numeric"
              />
            </Field>
            <Field label="Phone">
              <input className={HR_FIELD_CLASS} value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} inputMode="tel" />
            </Field>
            <Field label="Personal email">
              <input type="email" className={HR_FIELD_CLASS} value={form.personalEmail || ''} onChange={(e) => set('personalEmail', e.target.value)} />
            </Field>
            <Field label="Gender">
              <select className={HR_FIELD_CLASS} value={form.gender || ''} onChange={(e) => set('gender', e.target.value)}>
                {HR_GENDERS.map((g) => (
                  <option key={g.value || 'blank'} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date of birth">
              <input type="date" className={HR_FIELD_CLASS} value={form.dateOfBirthIso || ''} onChange={(e) => set('dateOfBirthIso', e.target.value)} />
            </Field>
            <Field label="Marital status">
              <select className={HR_FIELD_CLASS} value={form.maritalStatus || ''} onChange={(e) => set('maritalStatus', e.target.value)}>
                <option value="">Select</option>
                {HR_MARITAL_STATUSES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Residential address" className="sm:col-span-2">
              <input className={HR_FIELD_CLASS} value={form.residentialAddress || ''} onChange={(e) => set('residentialAddress', e.target.value)} />
            </Field>
            {showAdvanced ? (
              <>
                <Field label="State of origin">
                  <input className={HR_FIELD_CLASS} value={form.stateOfOrigin || ''} onChange={(e) => set('stateOfOrigin', e.target.value)} />
                </Field>
                <Field label="Local government">
                  <input className={HR_FIELD_CLASS} value={form.localGovernment || ''} onChange={(e) => set('localGovernment', e.target.value)} />
                </Field>
                <Field label="Nationality">
                  <input className={HR_FIELD_CLASS} value={form.nationality || 'Nigerian'} onChange={(e) => set('nationality', e.target.value)} />
                </Field>
                <Field label="Blood group">
                  <input className={HR_FIELD_CLASS} value={form.bloodGroup || ''} onChange={(e) => set('bloodGroup', e.target.value)} />
                </Field>
              </>
            ) : null}
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="text-[11px] font-bold uppercase tracking-wide text-[#134e4a] hover:underline"
              >
                {showAdvanced ? 'Hide optional fields' : 'Show optional fields (state, LGA, blood group)'}
              </button>
            </div>
          </div>
        ) : null}

        {active === 'nok' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <input className={HR_FIELD_CLASS} value={form.nextOfKinName || ''} onChange={(e) => set('nextOfKinName', e.target.value)} required />
            </Field>
            <Field label="Relationship">
              <input className={HR_FIELD_CLASS} value={form.nextOfKinRelationship || ''} onChange={(e) => set('nextOfKinRelationship', e.target.value)} required />
            </Field>
            <Field label="Phone">
              <input className={HR_FIELD_CLASS} value={form.nextOfKinPhone || ''} onChange={(e) => set('nextOfKinPhone', e.target.value)} inputMode="tel" required />
            </Field>
            <Field label="Alternate phone">
              <input className={HR_FIELD_CLASS} value={form.nextOfKinAltPhone || ''} onChange={(e) => set('nextOfKinAltPhone', e.target.value)} inputMode="tel" />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <input className={HR_FIELD_CLASS} value={form.nextOfKinAddress || ''} onChange={(e) => set('nextOfKinAddress', e.target.value)} />
            </Field>
          </div>
        ) : null}

        {active === 'qualifications' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Highest qualification">
              <input className={HR_FIELD_CLASS} value={form.minimumQualification || ''} onChange={(e) => set('minimumQualification', e.target.value)} />
            </Field>
            <Field label="Institution">
              <input className={HR_FIELD_CLASS} value={form.institution || ''} onChange={(e) => set('institution', e.target.value)} />
            </Field>
            <Field label="Course / field">
              <input
                className={HR_FIELD_CLASS}
                value={form.courseField || form.academicQualification || ''}
                onChange={(e) => {
                  const v = e.target.value;
                  dirtyRef.current = true;
                  setForm((prev) => (prev ? { ...prev, courseField: v, academicQualification: v } : prev));
                }}
              />
            </Field>
            <Field label="Year completed">
              <input
                type="number"
                min={1950}
                max={2100}
                className={HR_FIELD_CLASS}
                value={form.yearCompleted || ''}
                onChange={(e) => set('yearCompleted', e.target.value)}
              />
            </Field>
            <Field label="Professional certificates" className="sm:col-span-2">
              <textarea
                className={HR_TEXTAREA_CLASS}
                value={form.professionalCertificates || ''}
                onChange={(e) => set('professionalCertificates', e.target.value)}
                rows={3}
              />
            </Field>
          </div>
        ) : null}

        <div className="sticky bottom-0 -mx-4 border-t border-teal-100 bg-teal-50/95 px-4 py-3 backdrop-blur-sm sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:pt-2">
          <button type="submit" disabled={busy} className={`${HR_BTN_PRIMARY} w-full min-h-12`}>
            {busy ? 'Saving…' : 'Save my details'}
          </button>
        </div>
      </form>
    </section>
  );
}
