import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { apiFetch } from '../../lib/apiBase';
import { seedZarewaOrgStandard, previewLegacyPayBackfill, runLegacyPayBackfill, fetchOrgCatalogMeta, previewMatrixRevisionApply, runMatrixRevisionApply } from '../../lib/hrCompensation';
import { fetchHrDepartments } from '../../lib/hrMasterData';
import { canEditPensionPolicyRates, canManageHrSettings } from '../../lib/hrAccess';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HR_DOCUMENTS, HR_EMPLOYEES, HR_LEAVE, HR_PAYROLL, hrTabPath } from '../../lib/hrRoutes';
import { HrAddFormButton, HrFormModal } from './HrFormModal';
import { HR_BTN_PRIMARY, HR_FIELD_CLASS } from './hrFormStyles';
import { HrAlert, HrCard } from './hrPageUi';

function PolicyMetric({ label, value, detail }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
      {detail ? <p className="mt-0.5 text-xs text-slate-500">{detail}</p> : null}
    </div>
  );
}

/** Reusable public holidays CRUD — used in Leave hub and Settings hub. */
export function HrPublicHolidaysSection({ embedded = false }) {
  const ws = useWorkspace();
  const canManage = canManageHrSettings(ws?.permissions);
  const [holidays, setHolidays] = useState([]);
  const [holidayForm, setHolidayForm] = useState({ dayIso: '', label: '' });
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [message, setMessage] = useState('');

  const { reload } = useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/public-holidays');
    if (ok && data?.ok) setHolidays(data.holidays || []);
    return { hasData: true };
  }, []);

  const saveHoliday = async (e) => {
    e.preventDefault();
    if (!canManage) return;
    const { ok, data } = await apiFetch('/api/hr/public-holidays', {
      method: 'PUT',
      body: JSON.stringify({ dayIso: holidayForm.dayIso, label: holidayForm.label.trim() }),
    });
    if (ok && data?.ok) {
      setMessage('Holiday saved.');
      setHolidayForm({ dayIso: '', label: '' });
      setHolidayModalOpen(false);
      await reload();
    }
  };

  const body = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!embedded ? null : (
          <p className="text-sm text-slate-600 max-w-2xl">
            Company-wide non-working days used for leave and attendance calculations.
          </p>
        )}
        {canManage ? <HrAddFormButton onClick={() => setHolidayModalOpen(true)}>Add holiday</HrAddFormButton> : null}
      </div>

      <HrFormModal isOpen={holidayModalOpen} onClose={() => setHolidayModalOpen(false)} title="Add public holiday" size="sm">
        <form onSubmit={saveHoliday} className="space-y-3">
          <label className="text-xs font-semibold text-slate-600 block">
            Date
            <input
              type="date"
              className={HR_FIELD_CLASS}
              value={holidayForm.dayIso}
              onChange={(e) => setHolidayForm({ ...holidayForm, dayIso: e.target.value })}
              required
            />
          </label>
          <label className="text-xs font-semibold text-slate-600 block">
            Label
            <input
              className={HR_FIELD_CLASS}
              value={holidayForm.label}
              onChange={(e) => setHolidayForm({ ...holidayForm, label: e.target.value })}
              required
            />
          </label>
          <button type="submit" className={HR_BTN_PRIMARY}>
            Save holiday
          </button>
        </form>
      </HrFormModal>

      {message ? <div className="mb-3"><HrAlert tone="success">{message}</HrAlert></div> : null}

      {holidays.length === 0 ? (
        <p className="text-sm text-slate-500">No public holidays configured.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-100">
          {holidays.map((h) => (
            <li key={h.dayIso || h.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <span className="font-medium text-slate-800">{h.label}</span>
              <span className="tabular-nums text-slate-500">{h.dayIso}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );

  if (embedded) {
    return (
      <HrCard title="Public holidays" subtitle="Non-working days for leave and attendance">
        {body}
      </HrCard>
    );
  }
  return <HrCard title="Public holidays">{body}</HrCard>;
}

/** Editable pension and year-end bonus rates (stored in HR policy config). */
export function HrPensionPolicySection() {
  const ws = useWorkspace();
  const canEditPension = canEditPensionPolicyRates(ws?.permissions);
  const [policy, setPolicy] = useState(null);
  const [employeePct, setEmployeePct] = useState('8');
  const [employerPct, setEmployerPct] = useState('10');
  const [bonusRate, setBonusRate] = useState('50');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/policy-config');
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not load pension policy.');
      return { error: data?.error, hasData: false };
    }
    const p = data.policy || {};
    setPolicy(p);
    setEmployeePct(String(p.pensionEmployeePercent ?? 8));
    setEmployerPct(String(p.pensionEmployerPercent ?? 10));
    setBonusRate(String(Math.round((Number(p.halfMonthBonusRate ?? 0.5) || 0.5) * 100)));
    setError('');
    return { hasData: true };
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    const { ok, data } = await apiFetch('/api/hr/policy-config', {
      method: 'PATCH',
      body: JSON.stringify({
        pensionEmployeePercent: Number(employeePct),
        pensionEmployerPercent: Number(employerPct),
        halfMonthBonusRate: Number(bonusRate) / 100,
      }),
    });
    setSaving(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not save pension policy.');
      return;
    }
    setPolicy(data.policy);
    setMessage('Rates saved. Recompute draft payroll runs to apply changes.');
  };

  return (
    <HrCard
      title="Pension & year-end bonus"
      subtitle="Company-wide rates applied to eligible branch staff on payroll. PAYE is set per staff profile."
    >
      {error ? <div className="mb-3"><HrAlert tone="error">{error}</HrAlert></div> : null}
      {message ? <div className="mb-3"><HrAlert tone="success">{message}</HrAlert></div> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-xs font-semibold text-slate-600">
          Employee pension %
          <input
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={employeePct}
            onChange={(e) => setEmployeePct(e.target.value)}
            disabled={!canEditPension}
            className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
          />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Employer pension %
          <input
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={employerPct}
            onChange={(e) => setEmployerPct(e.target.value)}
            disabled={!canEditPension}
            className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
          />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          December bonus (% of base)
          <input
            type="number"
            min={0}
            max={200}
            step="1"
            value={bonusRate}
            onChange={(e) => setBonusRate(e.target.value)}
            disabled={!canEditPension}
            className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
          />
        </label>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Employer pension is an employer cost and is not deducted from net pay. December runs apply the year-end bonus automatically.
        {policy ? ` Current: ${policy.pensionEmployeePercent}% employee / ${policy.pensionEmployerPercent}% employer.` : ''}
        {!canEditPension ? ' Pension changes require HR Executive access.' : ''}
      </p>
      <button
        type="button"
        onClick={save}
        disabled={saving || !canEditPension}
        className={`${HR_BTN_PRIMARY} mt-4`}
      >
        {saving ? 'Saving…' : canEditPension ? 'Save rates' : 'Executive access required'}
      </button>
    </HrCard>
  );
}

/** Points to payroll, leave, and reports — kept for Leave hub embed; settings uses hrSettingsUi module links. */
export function HrSettingsRelatedLinks() {
  const links = [
    {
      label: 'Public holidays',
      hint: 'Non-working days for leave and attendance',
      to: hrTabPath(HR_LEAVE, 'holidays'),
    },
    {
      label: 'Salary matrix',
      hint: 'Level and step amounts by payroll group',
      to: hrTabPath(HR_PAYROLL, 'salary-matrix'),
    },
    {
      label: 'Pension & statutory reference',
      hint: 'Pension rates, ITF/NSITF, and handbook schedules',
      to: hrTabPath(HR_PAYROLL, 'statutory'),
    },
    {
      label: 'PAYE & pension profiles',
      hint: 'Individual staff tax and pension setup',
      to: hrTabPath(HR_PAYROLL, 'tax-pension'),
    },
    {
      label: 'HR reports',
      hint: 'Exports, compliance packs, and salary variance',
      to: hrTabPath(HR_DOCUMENTS, 'reports'),
    },
  ];

  return (
    <HrCard title="Configured elsewhere" subtitle="Day-to-day payroll, leave, and reporting tools live in their own modules">
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
        {links.map((item) => (
          <li key={item.to}>
            <Link to={item.to} className="flex flex-col gap-0.5 px-4 py-3 hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-semibold text-[#134e4a]">{item.label}</span>
              <span className="text-xs text-slate-500">{item.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </HrCard>
  );
}

/** Preview and run legacy above-matrix pay → payAdditionNgn backfill. */
export function HrLegacyPayBackfillSection({ embedded = false }) {
  const ws = useWorkspace();
  const canManage = canManageHrSettings(ws?.permissions);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [autoDocument, setAutoDocument] = useState(true);

  if (!canManage) return null;

  const runPreview = async () => {
    setBusy('preview');
    setMessage('');
    setError('');
    setPreview(null);
    const { ok, data } = await previewLegacyPayBackfill();
    setBusy('');
    if (ok && data?.ok) {
      setPreview(data);
    } else {
      setError(data?.error || 'Preview failed.');
    }
  };

  const runExecute = async () => {
    if (!preview?.updatedCount && !window.confirm('No rows matched in preview. Run anyway?')) return;
    setBusy('run');
    setMessage('');
    setError('');
    const { ok, data } = await runLegacyPayBackfill({ autoDocument });
    setBusy('');
    if (ok && data?.ok) {
      setPreview(data);
      setMessage(`Backfill complete: ${data.updatedCount} profile(s) updated, ${data.skippedCount} skipped.`);
    } else {
      setError(data?.error || 'Backfill failed.');
    }
  };

  return (
    <HrCard
      title={embedded ? undefined : 'Legacy pay backfill'}
      subtitle={embedded ? undefined : 'Convert inflated base pay into matrix + pay addition for staff already on level/step.'}
    >
      {embedded ? (
        <>
          <h4 className="text-sm font-semibold text-slate-800">Legacy pay backfill</h4>
          <p className="mt-0.5 text-xs text-slate-500">One-time migration for staff paid above matrix without pay addition.</p>
        </>
      ) : null}
      {error ? <div className="mb-3"><HrAlert tone="error">{error}</HrAlert></div> : null}
      {message ? <div className="mb-3"><HrAlert tone="success">{message}</HrAlert></div> : null}
      <p className="text-xs text-slate-600">
        Run preview first. Staff who already have <code className="text-[11px]">payAdditionNgn</code> set are skipped.
      </p>
      <label className="mt-3 flex items-center gap-2 text-xs text-slate-700">
        <input type="checkbox" checked={autoDocument} onChange={(e) => setAutoDocument(e.target.checked)} />
        Auto-document variance as multi-role consolidation when missing
      </label>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={HR_BTN_PRIMARY} disabled={Boolean(busy)} onClick={runPreview}>
          {busy === 'preview' ? 'Previewing…' : 'Preview backfill'}
        </button>
        <button
          type="button"
          className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-60"
          disabled={Boolean(busy) || !preview}
          onClick={runExecute}
        >
          {busy === 'run' ? 'Running…' : 'Run backfill'}
        </button>
      </div>
      {preview ? (
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs text-slate-700">
          <p>
            Scanned {preview.scanned} · Would update {preview.updatedCount} · Skip {preview.skippedCount}
            {preview.dryRun === false ? ' (executed)' : ' (preview only)'}
          </p>
          {(preview.updated || []).slice(0, 8).map((u) => (
            <p key={u.userId} className="mt-1 tabular-nums">
              {u.displayName}: addition ₦{(u.payAdditionNgn || 0).toLocaleString()} (was ₦{(u.previousTotalNgn || 0).toLocaleString()} total)
            </p>
          ))}
          {(preview.updated || []).length > 8 ? (
            <p className="mt-1 text-slate-500">+ {(preview.updated || []).length - 8} more</p>
          ) : null}
        </div>
      ) : null}
    </HrCard>
  );
}

/** Re-apply matrix rates to staff profiles (keeps pay addition). */
export function HrMatrixRevisionSection({ embedded = false }) {
  const ws = useWorkspace();
  const canManage = canManageHrSettings(ws?.permissions);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [payrollGroup, setPayrollGroup] = useState('');

  if (!canManage) return null;

  const runPreview = async () => {
    setBusy('preview');
    setMessage('');
    setError('');
    setPreview(null);
    const { ok, data } = await previewMatrixRevisionApply({ payrollGroup: payrollGroup || undefined });
    setBusy('');
    if (ok && data?.ok) setPreview(data);
    else setError(data?.error || 'Preview failed.');
  };

  const runExecute = async () => {
    if (!preview?.updatedCount && !window.confirm('No profiles would change. Run anyway?')) return;
    setBusy('run');
    setMessage('');
    setError('');
    const { ok, data } = await runMatrixRevisionApply({ payrollGroup: payrollGroup || undefined });
    setBusy('');
    if (ok && data?.ok) {
      setPreview(data);
      setMessage(`Matrix revision applied: ${data.updatedCount} profile(s) updated.`);
    } else {
      setError(data?.error || 'Apply failed.');
    }
  };

  const inner = (
    <>
      {error ? <div className="mb-3"><HrAlert tone="error">{error}</HrAlert></div> : null}
      {message ? <div className="mb-3"><HrAlert tone="success">{message}</HrAlert></div> : null}
      <p className="text-xs text-slate-600">
        After reloading the catalog or editing matrix rows, preview then apply new matrix base/housing/transport to all
        staff on level/step. Existing <code className="text-[11px]">payAdditionNgn</code> is preserved.
      </p>
      <label className="mt-3 block text-xs font-semibold text-slate-600">
        Payroll group (optional)
        <select
          className={`${HR_FIELD_CLASS} mt-1`}
          value={payrollGroup}
          onChange={(e) => setPayrollGroup(e.target.value)}
        >
          <option value="">All groups</option>
          <option value="branch_ops">branch_ops</option>
          <option value="hq_admin">hq_admin</option>
          <option value="mining_div">mining_div</option>
          <option value="scholarship">scholarship</option>
          <option value="chairman_staffs">chairman_staffs</option>
        </select>
      </label>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={HR_BTN_PRIMARY} disabled={Boolean(busy)} onClick={runPreview}>
          {busy === 'preview' ? 'Previewing…' : 'Preview matrix apply'}
        </button>
        <button
          type="button"
          className="rounded-xl border border-teal-300 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-950 hover:bg-teal-100 disabled:opacity-60"
          disabled={Boolean(busy) || !preview}
          onClick={runExecute}
        >
          {busy === 'run' ? 'Applying…' : 'Apply to profiles'}
        </button>
      </div>
      {preview ? (
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs text-slate-700">
          <p>
            Scanned {preview.scanned} · Would update {preview.updatedCount} · Skip {preview.skippedCount}
            {preview.dryRun === false ? ' (applied)' : ' (preview only)'}
          </p>
          {(preview.updated || []).slice(0, 6).map((u) => (
            <p key={u.userId} className="mt-1 tabular-nums">
              {u.displayName}: {u.previousTotalNgn?.toLocaleString()} → {u.newTotalNgn?.toLocaleString()} (
              {u.deltaNgn >= 0 ? '+' : ''}
              {u.deltaNgn?.toLocaleString()})
            </p>
          ))}
        </div>
      ) : null}
    </>
  );

  if (embedded) {
    return (
      <div>
        <h4 className="text-sm font-semibold text-slate-800">Apply matrix revision</h4>
        <p className="mt-0.5 text-xs text-slate-500">Push updated matrix rates to staff profiles.</p>
        <div className="mt-3">{inner}</div>
      </div>
    );
  }

  return (
    <HrCard title="Apply matrix revision" subtitle="Sync profile pay to current matrix (keeps pay additions)">
      {inner}
    </HrCard>
  );
}

/** Points HR admins to bulk staff import with org/comp columns. */
export function HrStaffImportGuideSection({ embedded = false }) {
  const ws = useWorkspace();
  const canManage = canManageHrSettings(ws?.permissions);
  if (!canManage) return null;

  const body = (
    <>
      <p className="text-sm text-slate-600">
        Use <strong>HR → Employees → Bulk Register Staff</strong> to upload the Excel template. Optional columns support
        designation code, payroll group, salary level/step, pay addition, and variance notes.
      </p>
      <Link to="/hr/employees" className={`${HR_BTN_PRIMARY} mt-4 inline-flex`}>
        Open staff directory
      </Link>
    </>
  );

  if (embedded) {
    return (
      <div>
        <h4 className="text-sm font-semibold text-slate-800">Import live staff</h4>
        <p className="mt-0.5 text-xs text-slate-500">Bulk register existing employees, then complete profiles.</p>
        <div className="mt-3">{body}</div>
      </div>
    );
  }

  return (
    <HrCard title="Import live staff" subtitle="Bulk register existing employees, then complete profiles in the directory.">
      {body}
    </HrCard>
  );
}

const GO_LIVE_STEPS = [
  { id: 'catalog', label: 'Load standard org catalog (departments, designations, all payroll matrices)' },
  { id: 'import', label: 'Bulk import live staff (optional designation code + level/step + pay addition columns)' },
  { id: 'backfill', label: 'Preview and run legacy pay backfill for inflated base salaries' },
  { id: 'matrix', label: 'After matrix changes: preview and apply matrix revision to staff profiles' },
  { id: 'profiles', label: 'Configure multi-role profiles (primary + secondary desks + documented variance)' },
  { id: 'variance', label: 'Review salary variance report and dashboard compensation alerts' },
  { id: 'payroll', label: 'Run payroll preview — payslip shows matrix lines + pay addition separately' },
];

const GO_LIVE_STORAGE_KEY = 'zarewa-hr-org-go-live-checklist-v1';

/** Local checklist for org/comp cutover — in-app only, no external notifications. */
export function HrOrgGoLiveChecklistSection({ embedded = false }) {
  const ws = useWorkspace();
  const canManage = canManageHrSettings(ws?.permissions);
  const [done, setDone] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(GO_LIVE_STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  });

  if (!canManage) return null;

  const toggle = (id) => {
    setDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(GO_LIVE_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const completed = GO_LIVE_STEPS.filter((s) => done[s.id]).length;

  const body = (
    <>
      <p className="text-xs text-slate-600">
        Track org and compensation cutover on this machine. Alerts stay in the HR dashboard and bell only.
      </p>
      <ul className="mt-3 space-y-2">
        {GO_LIVE_STEPS.map((step) => (
          <li key={step.id}>
            <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" className="mt-1" checked={Boolean(done[step.id])} onChange={() => toggle(step.id)} />
              <span>{step.label}</span>
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs font-semibold text-[#134e4a]">
        {completed} of {GO_LIVE_STEPS.length} complete
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <Link to={hrTabPath(HR_PAYROLL, 'salary-matrix')} className="font-semibold text-[#134e4a] hover:underline">
          Salary matrix & variance →
        </Link>
        <Link to={HR_EMPLOYEES} className="font-semibold text-[#134e4a] hover:underline">
          Staff directory →
        </Link>
      </div>
    </>
  );

  if (embedded) {
    return (
      <div>
        <h4 className="text-sm font-semibold text-slate-800">Org & pay cutover checklist</h4>
        <div className="mt-3">{body}</div>
      </div>
    );
  }

  return (
    <HrCard title="Org & pay cutover checklist" subtitle="One-time setup after deploy — in-app alerts only">
      {body}
    </HrCard>
  );
}

/** Initial org setup — shown when no departments exist; reload tucked in details after setup. */
export function HrOrgCatalogSection({ onCatalogUpdated }) {
  const ws = useWorkspace();
  const canManage = canManageHrSettings(ws?.permissions);
  const [seedBusy, setSeedBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [departmentCount, setDepartmentCount] = useState(null);
  const [catalogMeta, setCatalogMeta] = useState(null);

  useHrListLoad(async () => {
    const [deptRes, metaRes] = await Promise.all([fetchHrDepartments(true), fetchOrgCatalogMeta()]);
    if (deptRes.ok && deptRes.data?.ok) {
      setDepartmentCount((deptRes.data.departments || []).length);
    }
    if (metaRes.ok && metaRes.data?.ok) {
      setCatalogMeta(metaRes.data.catalog || null);
    }
    return { hasData: true };
  }, []);

  if (!canManage) return null;

  const runOrgSeed = async () => {
    setSeedBusy(true);
    setMessage('');
    setError('');
    const { ok, data } = await seedZarewaOrgStandard();
    setSeedBusy(false);
    if (ok && data?.ok) {
      setDepartmentCount(Math.max(departmentCount || 0, data.departmentsUpserted || 1));
      setMessage(
        `Catalog loaded: ${data.departmentsUpserted} departments, ${data.designationsUpserted} designations, ${data.matrixUpserted} salary matrix rows.`
      );
      if (data.catalog) setCatalogMeta(data.catalog);
      onCatalogUpdated?.();
    } else {
      setError(data?.error || 'Could not load organization catalog.');
    }
  };

  const seedControls = (
    <>
      {error ? <div className="mb-3"><HrAlert tone="error">{error}</HrAlert></div> : null}
      {message ? <div className="mb-3"><HrAlert tone="success">{message}</HrAlert></div> : null}
      {catalogMeta?.matrixPayrollGroupScales ? (
        <div className="mb-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs text-slate-700">
          <p className="font-semibold text-slate-800">Payroll group matrix scales (on branch baseline)</p>
          <ul className="mt-2 space-y-1">
            {Object.entries(catalogMeta.matrixPayrollGroupScales).map(([group, cfg]) => (
              <li key={group}>
                <span className="font-mono text-[#134e4a]">{group}</span>
                {' — '}
                {Math.round((cfg.scale ?? 1) * 100)}%
                {cfg.label ? ` · ${cfg.label}` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <button type="button" className={HR_BTN_PRIMARY} disabled={seedBusy} onClick={runOrgSeed}>
        {seedBusy ? 'Loading catalog…' : 'Load standard catalog'}
      </button>
    </>
  );

  if (departmentCount === 0) {
    return (
      <HrCard
        title="Set up organization structure"
        subtitle="Start with the standard Zarewa department and job title catalog, then adjust as needed."
      >
        {seedControls}
      </HrCard>
    );
  }

  if (departmentCount == null) return null;

  return (
    <details className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700 sm:px-5">
        Advanced: reload standard catalog
      </summary>
      <div className="border-t border-slate-50 px-4 pb-4 pt-3 sm:px-5">
        <p className="mb-3 text-xs text-slate-500">
          Re-imports master departments, designations, and salary matrix levels. Existing records are updated safely.
        </p>
        {seedControls}
      </div>
    </details>
  );
}

/** Pension, working hours, and statutory reference — used in Payroll hub. */
export function HrPolicyConfigSection() {
  return (
    <div className="space-y-6">
      <HrPensionPolicySection />

      <HrCard title="Working hours" subtitle="Reference schedule from the company handbook">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <PolicyMetric label="Monday – Friday" value="8:00 AM – 5:00 PM" detail="9 hours incl. 1 hr lunch" />
          <PolicyMetric label="Saturday" value="9:00 AM – 4:00 PM" detail="7 hours" />
          <PolicyMetric label="Salary payment day" value="25th of each month" />
        </div>
      </HrCard>

      <HrCard title="Statutory employer costs" subtitle="Fixed by law — not configurable in this screen">
        <div className="grid gap-3 sm:grid-cols-2">
          <PolicyMetric
            label="ITF (Industrial Training Fund)"
            value="1% of gross payroll"
            detail="Employer cost · paid to ITF"
          />
          <PolicyMetric
            label="NSITF (Social Insurance Trust Fund)"
            value="1% of gross payroll"
            detail="Employer cost · paid to NSITF"
          />
          <div className="sm:col-span-2">
            <PolicyMetric
              label="NHIS (health insurance)"
              value="Optional per staff"
              detail="Configure on individual staff profiles; deductions appear on payslips."
            />
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          ITF and NSITF are employer costs included in statutory export packs. They are not deducted from staff salaries.
        </p>
      </HrCard>
    </div>
  );
}
