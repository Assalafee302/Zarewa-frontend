import React, { useMemo } from 'react';
import { HR_COMPENSATION_VARIANCE_TYPES } from '../../lib/hrStaffConstants';
import {
  DESIGNATION_APP_ROLE_HINTS,
  HR_FUNCTIONAL_OFFICES,
  inferSecondaryRoleFromDesignation,
  isDirectorCorporateEligible,
  OFFICE_APP_ROLE_HINTS,
  officeKeyLabel,
} from '../../lib/hrOrgConstants';

function recommendAppRoleKeysClient(form) {
  const suggested = new Set();
  const designationId = String(form.designationId || '').trim();
  if (DESIGNATION_APP_ROLE_HINTS[designationId]) suggested.add(DESIGNATION_APP_ROLE_HINTS[designationId]);
  for (const sr of form.secondaryRoles || []) {
    const desId = String(sr?.designationId || '').trim();
    if (DESIGNATION_APP_ROLE_HINTS[desId]) suggested.add(DESIGNATION_APP_ROLE_HINTS[desId]);
    const office = String(sr?.officeKey || '').trim();
    if (OFFICE_APP_ROLE_HINTS[office]) suggested.add(OFFICE_APP_ROLE_HINTS[office]);
  }
  const recommendedPrimary =
    (designationId && DESIGNATION_APP_ROLE_HINTS[designationId]) || form.roleKey || 'sales_staff';
  return { recommendedPrimary, suggestedRoleKeys: [...suggested], needsReview: suggested.size > 1 };
}
import { formatNgn } from '../../lib/hrFormat';

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
 * Multi-office hats, director-only corporate title, matrix pay addition / variance docs.
 */
export function HrCompensationExtrasPanel({
  form,
  setForm,
  branches,
  designations = [],
  matrixPreview,
  matrixComponentTotal,
  actualPayTotal,
  onApplyMatrix,
  matrixBusy,
}) {
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const secondaryRoles = useMemo(
    () => (Array.isArray(form.secondaryRoles) ? form.secondaryRoles : []),
    [form.secondaryRoles]
  );
  const payAdditionNgn = Number(form.payAdditionNgn) || 0;
  const matrixTotal = matrixComponentTotal ?? matrixPreview?.totalNgn ?? null;
  const actualTotal = actualPayTotal ?? (matrixTotal != null ? matrixTotal + payAdditionNgn : null);
  const aboveMatrix = payAdditionNgn > 0 || (matrixTotal != null && actualTotal > matrixTotal);

  const directorEligible = useMemo(
    () =>
      isDirectorCorporateEligible({
        designationId: form.designationId,
        compensationVarianceType: form.compensationVarianceType,
        corporateTitle: form.corporateTitle,
        boardMember: form.boardMember,
      }),
    [form.designationId, form.compensationVarianceType, form.corporateTitle, form.boardMember]
  );

  const roleHints = useMemo(() => recommendAppRoleKeysClient(form), [form]);

  const mergedOfficePreview = useMemo(() => {
    const keys = new Map();
    if (form.designationId) {
      const des = designations.find((d) => d.id === form.designationId);
      keys.set(`primary|${form.branchId}`, {
        label: des?.title || form.jobTitle || 'Primary role',
        office: officeKeyLabel(inferSecondaryRoleFromDesignation(form.designationId, designations).officeKey),
        branchId: form.branchId,
        primary: true,
      });
    }
    for (const sr of secondaryRoles) {
      if (!sr?.role && !sr?.designationId) continue;
      keys.set(`${sr.designationId || sr.role}|${sr.branchId}`, {
        label: sr.role || 'Secondary role',
        office: officeKeyLabel(sr.officeKey),
        branchId: sr.branchId,
        primary: false,
        acting: sr.acting,
      });
    }
    return [...keys.values()];
  }, [form.designationId, form.branchId, form.jobTitle, designations, secondaryRoles]);

  const updateRole = (idx, patch) => {
    setForm((f) => {
      const list = [...(Array.isArray(f.secondaryRoles) ? f.secondaryRoles : [])];
      list[idx] = { ...list[idx], ...patch };
      return { ...f, secondaryRoles: list };
    });
  };

  const onSecondaryDesignationChange = (idx, desId) => {
    const inferred = inferSecondaryRoleFromDesignation(desId, designations);
    updateRole(idx, {
      designationId: desId || '',
      role: inferred.role || '',
      officeKey: inferred.officeKey || '',
      acting: inferred.acting || false,
    });
  };

  const addRole = () => {
    setForm((f) => ({
      ...f,
      secondaryRoles: [
        ...(Array.isArray(f.secondaryRoles) ? f.secondaryRoles : []),
        {
          designationId: '',
          role: '',
          officeKey: '',
          branchId: f.branchId || '',
          acting: false,
          endDateIso: '',
          notes: '',
        },
      ],
    }));
  };

  const removeRole = (idx) => {
    setForm((f) => ({
      ...f,
      secondaryRoles: (f.secondaryRoles || []).filter((_, i) => i !== idx),
    }));
  };

  const varianceTypes = directorEligible
    ? HR_COMPENSATION_VARIANCE_TYPES.filter((t) => t.value === 'director_emolument' || !form.corporateTitle)
    : HR_COMPENSATION_VARIANCE_TYPES.filter((t) => t.value !== 'director_emolument');

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wide text-[#134e4a]">Offices & pay variance</h3>
          <p className="mt-1 text-xs text-slate-500">
            Merge functional desks under one person (primary designation + secondary hats). Standard matrix pay plus any
            manual addition equals actual pay.
          </p>
        </div>
        {onApplyMatrix ? (
          <button
            type="button"
            className="rounded-xl border border-[#134e4a]/30 bg-white px-3 py-2 text-xs font-bold text-[#134e4a] hover:bg-[#134e4a]/5 disabled:opacity-50"
            disabled={matrixBusy}
            onClick={onApplyMatrix}
          >
            {matrixBusy ? 'Loading matrix…' : 'Reset to matrix only'}
          </button>
        ) : null}
      </div>

      {matrixTotal != null ? (
        <p className="text-xs text-slate-600">
          Matrix L{form.salaryLevel || '—'}/S{form.salaryStep || '1'}:{' '}
          <span className="font-semibold tabular-nums">{formatNgn(matrixTotal)}</span>
          {payAdditionNgn > 0 ? (
            <span className="ml-2 font-semibold text-amber-800">
              + {formatNgn(payAdditionNgn)} addition → {formatNgn(actualTotal)} actual
            </span>
          ) : (
            <span className="ml-2 text-slate-500">Actual pay matches matrix</span>
          )}
        </p>
      ) : null}

      {mergedOfficePreview.length > 0 ? (
        <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-teal-900 mb-2">Merged functional desks</p>
          <ul className="space-y-1 text-xs text-teal-950">
            {mergedOfficePreview.map((o, i) => (
              <li key={i}>
                <strong>{o.label}</strong>
                {o.office ? ` · ${o.office}` : ''}
                {o.branchId ? ` · ${o.branchId}` : ''}
                {o.primary ? ' (primary)' : o.acting ? ' (acting)' : ' (secondary)'}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {form.designationId !== 'desig_md' ? (
        <label className="flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50/40 px-3 py-2 text-xs text-violet-950">
          <input
            type="checkbox"
            checked={Boolean(form.boardMember)}
            onChange={(e) => set('boardMember', e.target.checked)}
          />
          Board-appointed director (enables corporate title and director emolument fields)
        </label>
      ) : null}

      {roleHints.needsReview || roleHints.recommendedPrimary !== form.roleKey ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-950">
          <p className="font-bold">Suggested system role: {roleHints.recommendedPrimary}</p>
          <p className="mt-1">
            Based on primary designation and secondary desks. App login uses one role — also consider:{' '}
            {roleHints.suggestedRoleKeys.join(', ')}.
          </p>
          {roleHints.supplementalPermissions?.length ? (
            <p className="mt-1 text-amber-900/80">
              {roleHints.supplementalPermissions.length} supplemental permission(s) can merge from secondary desks.
            </p>
          ) : null}
          <label className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(form.applyRecommendedRoleKey)}
              onChange={(e) => set('applyRecommendedRoleKey', e.target.checked)}
            />
            Apply suggested role on save
          </label>
          <label className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.applyMultiRolePermissions !== false}
              onChange={(e) => set('applyMultiRolePermissions', e.target.checked)}
            />
            Merge supplemental permissions from secondary desks
          </label>
        </div>
      ) : null}

      {directorEligible ? (
        <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-violet-200 bg-violet-50/60 p-4">
          <p className="sm:col-span-2 text-xs font-black uppercase tracking-wide text-violet-900">Director / board treatment</p>
          <Field label="Corporate / board title" hint="Managing Director or board-appointed directors only.">
            <input
              className={fieldCls}
              value={form.corporateTitle || ''}
              onChange={(e) => {
                const v = e.target.value;
                setForm((f) => ({
                  ...f,
                  corporateTitle: v,
                  compensationVarianceType: String(v || '').trim() ? 'director_emolument' : f.compensationVarianceType,
                }));
              }}
              placeholder="Director"
            />
          </Field>
          <Field label="Board appointment / special conditions">
            <input
              className={fieldCls}
              value={form.specialConditions || ''}
              onChange={(e) => set('specialConditions', e.target.value)}
              placeholder="Board resolution ref…"
            />
          </Field>
        </div>
      ) : null}

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Secondary operational roles / offices</p>
          <button type="button" className="text-xs font-bold text-[#134e4a]" onClick={addRole}>
            + Add desk
          </button>
        </div>
        {secondaryRoles.length === 0 ? (
          <p className="text-xs text-slate-500">None — add Acting Branch Manager, Cashier, second branch desk, etc.</p>
        ) : (
          <ul className="space-y-3">
            {secondaryRoles.map((r, idx) => (
              <li key={idx} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2">
                <Field label="Designation (catalog)">
                  <select
                    className={fieldCls}
                    value={r.designationId || ''}
                    onChange={(e) => onSecondaryDesignationChange(idx, e.target.value)}
                  >
                    <option value="">Select designation</option>
                    {designations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Functional desk">
                  <select
                    className={fieldCls}
                    value={r.officeKey || ''}
                    onChange={(e) => updateRole(idx, { officeKey: e.target.value })}
                  >
                    <option value="">Auto from designation</option>
                    {HR_FUNCTIONAL_OFFICES.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Branch / site">
                  <select
                    className={fieldCls}
                    value={r.branchId || ''}
                    onChange={(e) => updateRole(idx, { branchId: e.target.value })}
                  >
                    <option value="">Branch</option>
                    {(branches || []).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name || b.id}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Role title">
                  <input className={fieldCls} value={r.role || ''} readOnly />
                </Field>
                <label className="flex items-center gap-2 text-xs text-slate-600 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={Boolean(r.acting)}
                    onChange={(e) => updateRole(idx, { acting: e.target.checked })}
                  />
                  Acting appointment (requires end date)
                </label>
                <input
                  type="date"
                  className={fieldCls}
                  value={r.endDateIso || ''}
                  onChange={(e) => updateRole(idx, { endDateIso: e.target.value })}
                  title="Review / end date"
                />
                <input
                  className={fieldCls}
                  placeholder="Notes"
                  value={r.notes || ''}
                  onChange={(e) => updateRole(idx, { notes: e.target.value })}
                />
                <button type="button" className="text-xs font-bold text-rose-700 sm:col-span-2" onClick={() => removeRole(idx)}>
                  Remove desk
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {aboveMatrix || form.compensationVarianceType || payAdditionNgn > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 border-t border-slate-200 pt-4">
          <Field label="Variance type" hint="Required when pay addition is above zero.">
            <select
              className={fieldCls}
              value={form.compensationVarianceType || ''}
              onChange={(e) => set('compensationVarianceType', e.target.value)}
            >
              <option value="">Select type</option>
              {varianceTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Review due">
            <input
              type="date"
              className={fieldCls}
              value={form.compensationVarianceReviewDueIso || ''}
              onChange={(e) => set('compensationVarianceReviewDueIso', e.target.value)}
            />
          </Field>
          <Field label="Memo / approval ref">
            <input
              className={fieldCls}
              value={form.compensationVarianceMemoRef || ''}
              onChange={(e) => set('compensationVarianceMemoRef', e.target.value)}
              placeholder="MD/HR/2026/014"
            />
          </Field>
          <Field label="Variance notes" hint="Explain why pay exceeds standard matrix.">
            <textarea
              className={`${fieldCls} min-h-[72px] sm:col-span-2`}
              value={form.compensationVarianceNotes || ''}
              onChange={(e) => set('compensationVarianceNotes', e.target.value)}
              placeholder="Multi-role: Head Accountant + Acting BM Kaduna + Cashier…"
            />
          </Field>
        </div>
      ) : null}
    </section>
  );
}
