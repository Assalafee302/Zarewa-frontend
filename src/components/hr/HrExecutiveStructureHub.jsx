import { InlineLoader } from '../../components/ui/PageLoader';
import React, { useMemo, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { useToast } from '../../context/ToastContext';
import { canManageHrSettings } from '../../lib/hrAccess';
import { hasPermissionInList } from '../../lib/moduleAccess';
import {
  fetchHrDepartments,
  fetchHrDesignations,
  saveHrDepartment,
  saveHrDesignation,
} from '../../lib/hrMasterData';
import {
  PAY_LADDER_LEVELS,
  PAYROLL_MATRIX_GROUPS,
  MATRIX_STEPS,
  deleteHrDepartment,
  deleteHrDesignation,
  deleteSalaryMatrixRow,
  fetchSalaryMatrix,
  matrixRowKey,
  saveSalaryMatrixRow,
  totalMatrixPay,
} from '../../lib/hrCompensationStructure';
import { HR_FUNCTIONAL_OFFICES, TITLE_TIERS } from '../../lib/hrOrgConstants';
import { formatNgn } from '../../lib/hrFormat';
import { appConfirm } from '../../lib/appConfirm';
import { HrAddFormButton, HrFormModal } from './HrFormModal';
import { HrCard, HrEmptyState, HrButton, HrAddButton } from './hrPageUi';
import { HR_FIELD_CLASS } from './hrFormStyles';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../ui/AppDataTable';

const PROMOTION_GRADES = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'];
const SENIORITY_BANDS = ['Junior', 'Standard', 'Senior', 'Executive'];
const SECTIONS = [
  { id: 'roles', label: 'Roles & terms' },
  { id: 'departments', label: 'Departments' },
  { id: 'matrix', label: 'Salary matrix' },
  { id: 'ladder', label: 'Pay grade ladder' },
];

const emptyDept = () => ({ name: '', code: '', branchScope: '', description: '', active: true });
const emptyDesig = () => ({
  title: '',
  departmentId: '',
  gradeCategory: '',
  seniorityBand: '',
  defaultSalaryLevel: '',
  defaultSalaryStep: '',
  minServiceYears: '',
  titleTier: '',
  functionalOfficeKey: '',
  isActing: false,
  jobDescription: '',
  dutiesResponsibilities: '',
  reportingLine: '',
  requiredQualification: '',
  skillsRequired: '',
  workingConditions: '',
  salaryRangeNote: '',
  active: true,
});

const emptyMatrix = () => ({
  id: '',
  payrollGroup: 'branch_ops',
  salaryLevel: '3',
  salaryStep: '1',
  baseSalaryNgn: '',
  housingAllowanceNgn: '',
  transportAllowanceNgn: '',
  notes: '',
});

function SectionTabs({ section, onChange }) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Structure sections">
      {SECTIONS.map((s) => (
        <button
          key={s.id}
          type="button"
          role="tab"
          aria-selected={section === s.id}
          onClick={() => onChange(s.id)}
          className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
            section === s.id
              ? 'bg-zarewa-teal text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-600 hover:border-zarewa-teal/30'
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

function StatPill({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <p className="text-ui-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-xl font-black text-zarewa-teal">{value}</p>
    </div>
  );
}

function RolesTermsManager({ canEdit }) {
  const { show: toast } = useToast();
  const [rows, setRows] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [modal, setModal] = useState(false);
  const [termsModal, setTermsModal] = useState(false);
  const [viewRow, setViewRow] = useState(null);
  const [form, setForm] = useState(emptyDesig());
  const [editId, setEditId] = useState('');
  const [busy, setBusy] = useState(false);

  const { loading, error, reload } = useHrListLoad(async () => {
    const [dRes, desRes] = await Promise.all([fetchHrDepartments(true), fetchHrDesignations({ includeInactive: true })]);
    if (dRes.ok && dRes.data?.ok) setDepartments(dRes.data.departments || []);
    if (!desRes.ok || !desRes.data?.ok) {
      setRows([]);
      return { error: desRes.data?.error || 'Could not load roles.', hasData: false };
    }
    setRows(desRes.data.designations || []);
    return { hasData: true };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (deptFilter && r.departmentId !== deptFilter) return false;
      if (statusFilter === 'active' && !r.active) return false;
      if (statusFilter === 'inactive' && r.active) return false;
      if (!q) return true;
      const hay = [
        r.title,
        r.departmentName,
        r.gradeCategory,
        r.seniorityBand,
        r.titleTier,
        r.functionalOfficeKey,
        r.reportingLine,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search, deptFilter, statusFilter]);

  const stats = useMemo(
    () => ({
      total: rows.length,
      active: rows.filter((r) => r.active).length,
      staffed: rows.filter((r) => (r.staffCount || 0) > 0).length,
    }),
    [rows]
  );

  const openNew = () => {
    setEditId('');
    setForm(emptyDesig());
    setModal(true);
  };

  const openEdit = (row) => {
    setEditId(row.id);
    setForm({
      title: row.title || '',
      departmentId: row.departmentId || '',
      gradeCategory: row.gradeCategory || '',
      seniorityBand: row.seniorityBand || '',
      defaultSalaryLevel: row.defaultSalaryLevel ?? '',
      defaultSalaryStep: row.defaultSalaryStep ?? '',
      minServiceYears: row.minServiceYears ?? '',
      titleTier: row.titleTier || '',
      functionalOfficeKey: row.functionalOfficeKey || '',
      isActing: Boolean(row.isActing),
      jobDescription: row.jobDescription || '',
      dutiesResponsibilities: row.dutiesResponsibilities || '',
      reportingLine: row.reportingLine || '',
      requiredQualification: row.requiredQualification || '',
      skillsRequired: row.skillsRequired || '',
      workingConditions: row.workingConditions || '',
      salaryRangeNote: row.salaryRangeNote || '',
      active: row.active !== false,
    });
    setModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const { ok, data } = await saveHrDesignation({
      ...form,
      id: editId || undefined,
      defaultSalaryLevel: form.defaultSalaryLevel === '' ? null : Number(form.defaultSalaryLevel),
      defaultSalaryStep: form.defaultSalaryStep === '' ? null : Number(form.defaultSalaryStep),
      minServiceYears: form.minServiceYears === '' ? null : Number(form.minServiceYears),
      isActing: Boolean(form.isActing),
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      toast(data?.error || 'Save failed.', { variant: 'error' });
      return;
    }
    toast('Role saved.', { variant: 'success' });
    setModal(false);
    reload();
  };

  const deactivate = async (row) => {
    if (!(await appConfirm({ message: `Deactivate "${row.title}"? Staff already on this title keep their record; new assignments will hide it.`, variant: 'danger' }))) return;
    const { ok, data } = await deleteHrDesignation(row.id);
    if (!ok || !data?.ok) {
      toast(data?.error || 'Could not deactivate.', { variant: 'error' });
      return;
    }
    toast('Role deactivated.', { variant: 'success' });
    reload();
  };

  const removePermanent = async (row) => {
    if ((row.staffCount || 0) > 0) {
      toast(`Cannot delete — ${row.staffCount} staff still use this title. Deactivate or reassign first.`, { variant: 'error' });
      return;
    }
    if (!(await appConfirm({ message: `Permanently delete "${row.title}"? This cannot be undone.`, variant: 'danger' }))) return;
    const { ok, data } = await deleteHrDesignation(row.id, { hard: true });
    if (!ok || !data?.ok) {
      toast(data?.error || 'Could not delete.', { variant: 'error' });
      return;
    }
    toast('Role deleted.', { variant: 'success' });
    reload();
  };

  return (
    <HrCard
      title="Roles & terms of reference"
      subtitle="Every job title with grade, tenure gate, default pay level, and full terms (duties, qualifications, reporting)."
      actions={canEdit ? <HrAddFormButton onClick={openNew}>Add role</HrAddFormButton> : null}
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatPill label="Catalog roles" value={stats.total} />
        <StatPill label="Active" value={stats.active} />
        <StatPill label="With staff assigned" value={stats.staffed} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          className={`${HR_FIELD_CLASS} min-w-[12rem] flex-1`}
          placeholder="Search title, department, grade, office…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={HR_FIELD_CLASS} value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select className={HR_FIELD_CLASS} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
          <button type="button" className="ml-2 underline" onClick={reload}>Retry</button>
        </div>
      ) : null}
      {loading && !rows.length ? <InlineLoader message="Loading roles…" /> : null}
      {!loading && !filtered.length ? (
        <HrEmptyState
          title="No roles match"
          description={rows.length ? 'Try clearing filters.' : 'Add your first job title or seed the org catalog.'}
          action={canEdit && !rows.length ? <HrButton type="button" onClick={openNew}>Add role</HrButton> : null}
        />
      ) : (
        <AppTableWrap>
          <AppTable>
            <AppTableThead>
              <AppTableTh>Title</AppTableTh>
                <AppTableTh>Department</AppTableTh>
                <AppTableTh>Grade</AppTableTh>
                <AppTableTh>L / Step</AppTableTh>
                <AppTableTh>Min yrs</AppTableTh>
                <AppTableTh>Tier</AppTableTh>
                <AppTableTh align="right">Staff</AppTableTh>
                <AppTableTh>Status</AppTableTh>
                <AppTableTh>Actions</AppTableTh>
            </AppTableThead>
            <AppTableBody>
              {filtered.map((r) => (
                <AppTableTr key={r.id}>
                  <AppTableTd>
                    <span className="font-semibold text-slate-900">{r.title}</span>
                    {r.isActing ? <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-ui-xs font-bold uppercase text-amber-900">Acting</span> : null}
                  </AppTableTd>
                  <AppTableTd>{r.departmentName || '—'}</AppTableTd>
                  <AppTableTd>{r.gradeCategory || r.seniorityBand || '—'}</AppTableTd>
                  <AppTableTd>
                    {r.defaultSalaryLevel != null ? `L${r.defaultSalaryLevel}` : '—'}
                    {r.defaultSalaryStep != null ? ` / S${r.defaultSalaryStep}` : ''}
                  </AppTableTd>
                  <AppTableTd>{r.minServiceYears != null ? r.minServiceYears : '—'}</AppTableTd>
                  <AppTableTd>{r.titleTier || '—'}</AppTableTd>
                  <AppTableTd align="right">{r.staffCount ?? 0}</AppTableTd>
                  <AppTableTd>{r.active ? 'Active' : 'Inactive'}</AppTableTd>
                  <AppTableTd>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="text-xs font-bold text-zarewa-teal hover:underline" onClick={() => { setViewRow(r); setTermsModal(true); }}>
                        Terms
                      </button>
                      {canEdit ? (
                        <>
                          <button type="button" className="text-xs font-semibold text-slate-600 hover:underline" onClick={() => openEdit(r)}>Edit</button>
                          {r.active ? (
                            <button type="button" className="text-xs font-semibold text-amber-800 hover:underline" onClick={() => deactivate(r)}>Deactivate</button>
                          ) : null}
                          <button type="button" className="text-xs font-semibold text-red-700 hover:underline" onClick={() => removePermanent(r)}>Delete</button>
                        </>
                      ) : null}
                    </div>
                  </AppTableTd>
                </AppTableTr>
              ))}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      )}

      <HrFormModal isOpen={modal} onClose={() => setModal(false)} title={editId ? 'Edit role & terms' : 'Add role & terms'} size="xl">
        <form onSubmit={save} className="space-y-5">
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500 sm:col-span-2">Identity</legend>
            <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
              Job title
              <input className={HR_FIELD_CLASS} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Department
              <select className={HR_FIELD_CLASS} value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                <option value="">—</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 self-end text-xs font-semibold text-slate-600">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Active in catalog
            </label>
          </fieldset>

          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500 sm:col-span-2">Classification & tenure</legend>
            <label className="block text-xs font-semibold text-slate-600">
              Promotion grade (G1–G7)
              <select className={HR_FIELD_CLASS} value={form.gradeCategory} onChange={(e) => setForm({ ...form, gradeCategory: e.target.value })}>
                <option value="">—</option>
                {PROMOTION_GRADES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Seniority band
              <select className={HR_FIELD_CLASS} value={form.seniorityBand} onChange={(e) => setForm({ ...form, seniorityBand: e.target.value })}>
                <option value="">—</option>
                {SENIORITY_BANDS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Title tier
              <select className={HR_FIELD_CLASS} value={form.titleTier} onChange={(e) => setForm({ ...form, titleTier: e.target.value })}>
                <option value="">—</option>
                {TITLE_TIERS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Functional office
              <select className={HR_FIELD_CLASS} value={form.functionalOfficeKey} onChange={(e) => setForm({ ...form, functionalOfficeKey: e.target.value })}>
                <option value="">—</option>
                {HR_FUNCTIONAL_OFFICES.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Min years of service
              <input type="number" min="0" step="0.5" className={HR_FIELD_CLASS} value={form.minServiceYears} onChange={(e) => setForm({ ...form, minServiceYears: e.target.value })} />
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <input type="checkbox" checked={Boolean(form.isActing)} onChange={(e) => setForm({ ...form, isActing: e.target.checked })} />
              Acting (temporary) title
            </label>
          </fieldset>

          <fieldset className="grid gap-3 sm:grid-cols-3">
            <legend className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500 sm:col-span-3">Default pay rank</legend>
            <label className="block text-xs font-semibold text-slate-600">
              Salary level (1–7)
              <input type="number" min={1} max={7} className={HR_FIELD_CLASS} value={form.defaultSalaryLevel} onChange={(e) => setForm({ ...form, defaultSalaryLevel: e.target.value })} />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Salary step (1–3)
              <input type="number" min={1} max={3} className={HR_FIELD_CLASS} value={form.defaultSalaryStep} onChange={(e) => setForm({ ...form, defaultSalaryStep: e.target.value })} />
            </label>
            <label className="block text-xs font-semibold text-slate-600 sm:col-span-1">
              Salary range note
              <input className={HR_FIELD_CLASS} value={form.salaryRangeNote} onChange={(e) => setForm({ ...form, salaryRangeNote: e.target.value })} placeholder="e.g. L3–L4 band" />
            </label>
          </fieldset>

          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500 sm:col-span-2">Terms of reference</legend>
            <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
              Role summary
              <textarea className={HR_FIELD_CLASS} rows={2} value={form.jobDescription} onChange={(e) => setForm({ ...form, jobDescription: e.target.value })} />
            </label>
            <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
              Duties & responsibilities
              <textarea className={HR_FIELD_CLASS} rows={4} value={form.dutiesResponsibilities} onChange={(e) => setForm({ ...form, dutiesResponsibilities: e.target.value })} />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Reporting line
              <input className={HR_FIELD_CLASS} value={form.reportingLine} onChange={(e) => setForm({ ...form, reportingLine: e.target.value })} />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Required qualification
              <input className={HR_FIELD_CLASS} value={form.requiredQualification} onChange={(e) => setForm({ ...form, requiredQualification: e.target.value })} />
            </label>
            <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
              Skills required
              <textarea className={HR_FIELD_CLASS} rows={2} value={form.skillsRequired} onChange={(e) => setForm({ ...form, skillsRequired: e.target.value })} />
            </label>
            <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
              Working conditions
              <textarea className={HR_FIELD_CLASS} rows={2} value={form.workingConditions} onChange={(e) => setForm({ ...form, workingConditions: e.target.value })} />
            </label>
          </fieldset>

          <div className="flex flex-wrap gap-2">
            <HrButton type="submit" disabled={busy} >{busy ? 'Saving…' : 'Save role'}</HrButton>
            <HrButton type="button" variant="secondary" onClick={() => setModal(false)}>Cancel</HrButton>
          </div>
        </form>
      </HrFormModal>

      <HrFormModal isOpen={termsModal} onClose={() => setTermsModal(false)} title={viewRow?.title || 'Terms of reference'} size="lg">
        {viewRow ? (
          <div className="space-y-4 text-sm text-slate-700">
            <div className="grid gap-2 sm:grid-cols-2">
              <p><span className="font-semibold text-slate-500">Department:</span> {viewRow.departmentName || '—'}</p>
              <p><span className="font-semibold text-slate-500">Grade:</span> {viewRow.gradeCategory || '—'} ({viewRow.seniorityBand || '—'})</p>
              <p><span className="font-semibold text-slate-500">Default pay:</span> L{viewRow.defaultSalaryLevel ?? '—'} / S{viewRow.defaultSalaryStep ?? '—'}</p>
              <p><span className="font-semibold text-slate-500">Min service:</span> {viewRow.minServiceYears ?? '—'} yrs</p>
              <p><span className="font-semibold text-slate-500">Reporting:</span> {viewRow.reportingLine || '—'}</p>
              <p><span className="font-semibold text-slate-500">Qualification:</span> {viewRow.requiredQualification || '—'}</p>
            </div>
            {viewRow.jobDescription ? (
              <div>
                <p className="text-xs font-black uppercase text-slate-400">Summary</p>
                <p className="mt-1 whitespace-pre-wrap">{viewRow.jobDescription}</p>
              </div>
            ) : null}
            <div>
              <p className="text-xs font-black uppercase text-slate-400">Duties</p>
              <pre className="mt-1 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-xs">{viewRow.dutiesResponsibilities || 'No duties recorded.'}</pre>
            </div>
            {viewRow.skillsRequired ? (
              <div>
                <p className="text-xs font-black uppercase text-slate-400">Skills</p>
                <p className="mt-1 whitespace-pre-wrap">{viewRow.skillsRequired}</p>
              </div>
            ) : null}
            {viewRow.workingConditions ? (
              <div>
                <p className="text-xs font-black uppercase text-slate-400">Working conditions</p>
                <p className="mt-1 whitespace-pre-wrap">{viewRow.workingConditions}</p>
              </div>
            ) : null}
            {canEdit ? (
              <HrButton type="button" variant="secondary" onClick={() => { setTermsModal(false); openEdit(viewRow); }}>Edit this role</HrButton>
            ) : null}
          </div>
        ) : null}
      </HrFormModal>
    </HrCard>
  );
}

function DepartmentsManager({ canEdit }) {
  const ws = useWorkspace();
  const { show: toast } = useToast();
  const [rows, setRows] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyDept());
  const [editId, setEditId] = useState('');
  const [busy, setBusy] = useState(false);

  const branches = (ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? []).map((b) => ({
    id: b.id,
    name: b.name || b.id,
  }));

  const { loading, error, reload } = useHrListLoad(async () => {
    const { ok, data } = await fetchHrDepartments(true);
    if (!ok || !data?.ok) {
      setRows([]);
      return { error: data?.error || 'Could not load departments.', hasData: false };
    }
    setRows(data.departments || []);
    return { hasData: true };
  }, []);

  const openNew = () => {
    setEditId('');
    setForm(emptyDept());
    setModal(true);
  };

  const openEdit = (row) => {
    setEditId(row.id);
    setForm({
      name: row.name || '',
      code: row.code || '',
      branchScope: row.branchScope || '',
      description: row.description || '',
      active: row.active !== false,
    });
    setModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const { ok, data } = await saveHrDepartment({ ...form, id: editId || undefined });
    setBusy(false);
    if (!ok || !data?.ok) {
      toast(data?.error || 'Save failed.', { variant: 'error' });
      return;
    }
    toast('Department saved.', { variant: 'success' });
    setModal(false);
    reload();
  };

  const deactivate = async (row) => {
    if (!(await appConfirm({ message: `Deactivate department "${row.name}"?`, variant: 'danger' }))) return;
    const { ok, data } = await deleteHrDepartment(row.id);
    if (!ok || !data?.ok) {
      toast(data?.error || 'Could not deactivate.', { variant: 'error' });
      return;
    }
    toast('Department deactivated.', { variant: 'success' });
    reload();
  };

  const removePermanent = async (row) => {
    if (!(await appConfirm({ message: `Permanently delete "${row.name}"?`, variant: 'danger' }))) return;
    const { ok, data } = await deleteHrDepartment(row.id, { hard: true });
    if (!ok || !data?.ok) {
      toast(data?.error || 'Could not delete.', { variant: 'error' });
      return;
    }
    toast('Department deleted.', { variant: 'success' });
    reload();
  };

  return (
    <HrCard title="Departments" subtitle="HQ and branch departments linked to roles and staff profiles">
      <div className="mb-4 flex justify-end">
        {canEdit ? <HrAddFormButton onClick={openNew}>Add department</HrAddFormButton> : null}
      </div>
      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
          <button type="button" className="ml-2 underline" onClick={reload}>Retry</button>
        </div>
      ) : null}
      {loading && !rows.length ? <InlineLoader message="Loading…" /> : null}
      {!loading && !rows.length ? (
        <HrEmptyState title="No departments" action={canEdit ? <HrButton type="button" onClick={openNew}>Add department</HrButton> : null} />
      ) : (
        <AppTableWrap>
          <AppTable>
            <AppTableThead>
              <AppTableTh>Code</AppTableTh>
                <AppTableTh>Name</AppTableTh>
                <AppTableTh>Scope</AppTableTh>
                <AppTableTh>Status</AppTableTh>
                {canEdit ? <AppTableTh>Actions</AppTableTh> : null}
            </AppTableThead>
            <AppTableBody>
              {rows.map((r) => (
                <AppTableTr key={r.id}>
                  <AppTableTd>{r.code}</AppTableTd>
                  <AppTableTd>{r.name}</AppTableTd>
                  <AppTableTd>{r.branchScope || 'All'}</AppTableTd>
                  <AppTableTd>{r.active ? 'Active' : 'Inactive'}</AppTableTd>
                  {canEdit ? (
                    <AppTableTd>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="text-xs font-bold text-zarewa-teal" onClick={() => openEdit(r)}>Edit</button>
                        {r.active ? (
                          <button type="button" className="text-xs font-semibold text-amber-800" onClick={() => deactivate(r)}>Deactivate</button>
                        ) : null}
                        <button type="button" className="text-xs font-semibold text-red-700" onClick={() => removePermanent(r)}>Delete</button>
                      </div>
                    </AppTableTd>
                  ) : null}
                </AppTableTr>
              ))}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      )}
      <HrFormModal isOpen={modal} onClose={() => setModal(false)} title={editId ? 'Edit department' : 'Add department'}>
        <form onSubmit={save} className="space-y-3">
          <label className="block text-xs font-semibold text-slate-600">
            Name
            <input className={HR_FIELD_CLASS} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Code
            <input className={HR_FIELD_CLASS} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Branch scope
            <select className={HR_FIELD_CLASS} value={form.branchScope} onChange={(e) => setForm({ ...form, branchScope: e.target.value })}>
              <option value="">All branches / HQ</option>
              <option value="HQ">HQ only</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Description
            <textarea className={HR_FIELD_CLASS} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Active
          </label>
          <HrButton type="submit" disabled={busy} >{busy ? 'Saving…' : 'Save'}</HrButton>
        </form>
      </HrFormModal>
    </HrCard>
  );
}

function SalaryMatrixManager({ canEdit }) {
  const { show: toast } = useToast();
  const [rows, setRows] = useState([]);
  const [group, setGroup] = useState('branch_ops');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyMatrix());
  const [busy, setBusy] = useState(false);

  const { loading, error, reload } = useHrListLoad(async () => {
    const { ok, data } = await fetchSalaryMatrix();
    if (!ok || !data?.ok) {
      setRows([]);
      return { error: data?.error || 'Could not load salary matrix.', hasData: false };
    }
    setRows(data.matrix || []);
    return { hasData: true };
  }, []);

  const groupRows = useMemo(() => rows.filter((r) => r.payrollGroup === group), [rows, group]);
  const byKey = useMemo(() => {
    const m = new Map();
    for (const r of groupRows) m.set(matrixRowKey(r), r);
    return m;
  }, [groupRows]);

  const levels = useMemo(() => {
    const fromData = [...new Set(groupRows.map((r) => Number(r.salaryLevel)))].filter((n) => n > 0);
    const base = [1, 2, 3, 4, 5, 6, 7];
    return [...new Set([...base, ...fromData])].sort((a, b) => a - b);
  }, [groupRows]);

  const openCell = (level, step) => {
    const existing = byKey.get(`${group}|${level}|${step}`);
    if (existing) {
      setForm({
        id: existing.id,
        payrollGroup: existing.payrollGroup,
        salaryLevel: String(existing.salaryLevel),
        salaryStep: String(existing.salaryStep),
        baseSalaryNgn: existing.baseSalaryNgn ?? '',
        housingAllowanceNgn: existing.housingAllowanceNgn ?? '',
        transportAllowanceNgn: existing.transportAllowanceNgn ?? '',
        notes: existing.notes || '',
      });
    } else {
      setForm({ ...emptyMatrix(), payrollGroup: group, salaryLevel: String(level), salaryStep: String(step) });
    }
    setModal(true);
  };

  const openNew = () => {
    setForm({ ...emptyMatrix(), payrollGroup: group });
    setModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const { ok, data } = await saveSalaryMatrixRow({
      payrollGroup: form.payrollGroup,
      salaryLevel: Number(form.salaryLevel),
      salaryStep: Number(form.salaryStep),
      baseSalaryNgn: Number(form.baseSalaryNgn) || 0,
      housingAllowanceNgn: Number(form.housingAllowanceNgn) || 0,
      transportAllowanceNgn: Number(form.transportAllowanceNgn) || 0,
      notes: form.notes.trim() || null,
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      toast(data?.error || 'Could not save.', { variant: 'error' });
      return;
    }
    toast('Matrix row saved.', { variant: 'success' });
    setModal(false);
    reload();
  };

  const remove = async () => {
    if (!form.id) return;
    if (!(await appConfirm({ message: 'Delete this salary matrix cell?', variant: 'danger' }))) return;
    setBusy(true);
    const { ok, data } = await deleteSalaryMatrixRow(form.id);
    setBusy(false);
    if (!ok || !data?.ok) {
      toast(data?.error || 'Could not delete.', { variant: 'error' });
      return;
    }
    toast('Matrix row deleted.', { variant: 'success' });
    setModal(false);
    reload();
  };

  const groupMeta = PAYROLL_MATRIX_GROUPS.find((g) => g.value === group);

  return (
    <HrCard
      title="Salary matrix"
      subtitle="Base pay, housing, and transport by payroll group × level × step. Click a cell to edit."
      actions={canEdit ? <HrAddFormButton onClick={openNew}>Add / update row</HrAddFormButton> : null}
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {PAYROLL_MATRIX_GROUPS.map((g) => (
          <button
            key={g.value}
            type="button"
            onClick={() => setGroup(g.value)}
            className={`rounded-lg px-3 py-2 text-left text-xs font-semibold ${
              group === g.value ? 'bg-zarewa-teal text-white' : 'border border-slate-200 bg-white text-slate-700'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>
      {groupMeta?.hint ? <p className="mb-3 text-xs text-slate-500">{groupMeta.hint}</p> : null}

      {error ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      {loading ? <InlineLoader message="Loading matrix…" /> : null}

      {!loading ? (
        <>
          <AppTableWrap className="mb-6">
            <AppTable role="numeric">
              <AppTableThead>
                <AppTableTh>Level</AppTableTh>
                  {MATRIX_STEPS.map((s) => (
                    <AppTableTh key={s} align="right">Step {s} (total ₦)</AppTableTh>
                  ))}
              </AppTableThead>
              <AppTableBody>
                {levels.map((level) => (
                  <AppTableTr key={level}>
                    <AppTableTd className="font-semibold">L{level}</AppTableTd>
                    {MATRIX_STEPS.map((step) => {
                      const row = byKey.get(`${group}|${level}|${step}`);
                      const total = row ? totalMatrixPay(row) : null;
                      return (
                        <AppTableTd key={step} align="right">
                          {row ? (
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => openCell(level, step)}
                              className={`text-right ${canEdit ? 'hover:underline' : ''}`}
                            >
                              <span className="block font-semibold text-slate-900">{formatNgn(total)}</span>
                              <span className="block text-ui-xs text-slate-500">
                                B {formatNgn(row.baseSalaryNgn)} · H {formatNgn(row.housingAllowanceNgn)}
                              </span>
                            </button>
                          ) : canEdit ? (
                            <button type="button" className="text-xs text-slate-400 hover:text-zarewa-teal" onClick={() => openCell(level, step)}>
                              + Set
                            </button>
                          ) : (
                            '—'
                          )}
                        </AppTableTd>
                      );
                    })}
                  </AppTableTr>
                ))}
              </AppTableBody>
            </AppTable>
          </AppTableWrap>

          <AppTableWrap>
            <AppTable role="numeric">
              <AppTableThead>
                <AppTableTh>Level</AppTableTh>
                  <AppTableTh>Step</AppTableTh>
                  <AppTableTh align="right">Base</AppTableTh>
                  <AppTableTh align="right">Housing</AppTableTh>
                  <AppTableTh align="right">Transport</AppTableTh>
                  <AppTableTh align="right">Total</AppTableTh>
                  {canEdit ? <AppTableTh /> : null}
              </AppTableThead>
              <AppTableBody>
                {groupRows.length === 0 ? (
                  <AppTableTr>
                    <AppTableTd colSpan={canEdit ? 7 : 6} align="center">
                      <span className="text-slate-500">No rows for this group yet.</span>
                    </AppTableTd>
                  </AppTableTr>
                ) : (
                  groupRows
                    .sort((a, b) => a.salaryLevel - b.salaryLevel || a.salaryStep - b.salaryStep)
                    .map((r) => (
                      <AppTableTr key={r.id}>
                        <AppTableTd>L{r.salaryLevel}</AppTableTd>
                        <AppTableTd>S{r.salaryStep}</AppTableTd>
                        <AppTableTd align="right">{formatNgn(r.baseSalaryNgn)}</AppTableTd>
                        <AppTableTd align="right">{formatNgn(r.housingAllowanceNgn)}</AppTableTd>
                        <AppTableTd align="right">{formatNgn(r.transportAllowanceNgn)}</AppTableTd>
                        <AppTableTd align="right" className="font-semibold">{formatNgn(totalMatrixPay(r))}</AppTableTd>
                        {canEdit ? (
                          <AppTableTd>
                            <button type="button" className="text-xs font-bold text-zarewa-teal" onClick={() => openCell(r.salaryLevel, r.salaryStep)}>Edit</button>
                          </AppTableTd>
                        ) : null}
                      </AppTableTr>
                    ))
                )}
              </AppTableBody>
            </AppTable>
          </AppTableWrap>
        </>
      ) : null}

      <HrFormModal isOpen={modal} onClose={() => setModal(false)} title="Salary matrix cell" size="lg">
        <form onSubmit={save} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-xs font-semibold text-slate-600 sm:col-span-3">
              Payroll group
              <select className={HR_FIELD_CLASS} value={form.payrollGroup} onChange={(e) => setForm((f) => ({ ...f, payrollGroup: e.target.value }))} disabled={Boolean(form.id)}>
                {PAYROLL_MATRIX_GROUPS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Level
              <input type="number" min={1} max={7} className={HR_FIELD_CLASS} value={form.salaryLevel} onChange={(e) => setForm((f) => ({ ...f, salaryLevel: e.target.value }))} disabled={Boolean(form.id)} />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Step
              <input type="number" min={1} max={3} className={HR_FIELD_CLASS} value={form.salaryStep} onChange={(e) => setForm((f) => ({ ...f, salaryStep: e.target.value }))} disabled={Boolean(form.id)} />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Total preview
              <input
                className={HR_FIELD_CLASS}
                readOnly
                value={formatNgn(
                  (Number(form.baseSalaryNgn) || 0) +
                    (Number(form.housingAllowanceNgn) || 0) +
                    (Number(form.transportAllowanceNgn) || 0)
                )}
              />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Base salary ₦
              <input type="number" className={HR_FIELD_CLASS} value={form.baseSalaryNgn} onChange={(e) => setForm((f) => ({ ...f, baseSalaryNgn: e.target.value }))} />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Housing ₦
              <input type="number" className={HR_FIELD_CLASS} value={form.housingAllowanceNgn} onChange={(e) => setForm((f) => ({ ...f, housingAllowanceNgn: e.target.value }))} />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Transport ₦
              <input type="number" className={HR_FIELD_CLASS} value={form.transportAllowanceNgn} onChange={(e) => setForm((f) => ({ ...f, transportAllowanceNgn: e.target.value }))} />
            </label>
            <label className="block text-xs font-semibold text-slate-600 sm:col-span-3">
              Notes
              <input className={HR_FIELD_CLASS} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <HrButton type="submit" disabled={busy} >{busy ? 'Saving…' : 'Save'}</HrButton>
            {form.id && canEdit ? (
              <button type="button" disabled={busy} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-800" onClick={remove}>
                Delete row
              </button>
            ) : null}
          </div>
        </form>
      </HrFormModal>
    </HrCard>
  );
}

function PayGradeLadderReference() {
  return (
    <HrCard title="Pay grade ladder" subtitle="Company reference: salary levels map to promotion grades (G1–G7) and typical titles.">
      <AppTableWrap>
        <AppTable>
          <AppTableThead>
            <AppTableTh>Salary level</AppTableTh>
              <AppTableTh>Grades</AppTableTh>
              <AppTableTh>Typical titles</AppTableTh>
              <AppTableTh>Leave band</AppTableTh>
          </AppTableThead>
          <AppTableBody>
            {PAY_LADDER_LEVELS.map((row) => (
              <AppTableTr key={row.level}>
                <AppTableTd className="font-semibold">L{row.level}</AppTableTd>
                <AppTableTd>{row.grades}</AppTableTd>
                <AppTableTd>{row.typicalTitles}</AppTableTd>
                <AppTableTd>{row.leaveBand}</AppTableTd>
              </AppTableTr>
            ))}
          </AppTableBody>
        </AppTable>
      </AppTableWrap>
      <p className="mt-4 text-xs text-slate-500">
        Each role can set a default level/step and promotion grade. Staff pay rank uses payroll group + level + step from the matrix above.
      </p>
    </HrCard>
  );
}

/**
 * HR executive hub: roles/terms, departments, salary matrix, and pay grade reference.
 * @param {{ defaultSection?: 'roles'|'departments'|'matrix'|'ladder'; embedded?: boolean }} props
 */
export function HrExecutiveStructureHub({ defaultSection = 'roles', embedded = false } = {}) {
  const ws = useWorkspace();
  const permissions = ws?.permissions || [];
  const canEdit = canManageHrSettings(permissions);
  const canEditMatrix =
    canEdit ||
    hasPermissionInList(permissions, 'hr.payroll.manage') ||
    hasPermissionInList(permissions, '*');
  const [section, setSection] = useState(defaultSection);

  return (
    <div className={embedded ? 'space-y-6' : 'space-y-6'}>
      {!embedded ? (
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-zarewa-teal">Roles, grades & compensation structure</h2>
          <p className="max-w-3xl text-sm text-slate-600">
            Manage the full job catalog with terms of reference, department groupings, and the salary matrix that drives pay rank (level × step) across payroll groups.
          </p>
        </div>
      ) : null}
      <SectionTabs section={section} onChange={setSection} />
      {section === 'roles' ? <RolesTermsManager canEdit={canEdit} /> : null}
      {section === 'departments' ? <DepartmentsManager canEdit={canEdit} /> : null}
      {section === 'matrix' ? <SalaryMatrixManager canEdit={canEditMatrix} /> : null}
      {section === 'ladder' ? <PayGradeLadderReference /> : null}
    </div>
  );
}

export default HrExecutiveStructureHub;
