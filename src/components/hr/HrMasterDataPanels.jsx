import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { useToast } from '../../context/ToastContext';
import { canManageHrSettings } from '../../lib/hrAccess';
import { fetchHrDepartments, fetchHrDesignations, saveHrDepartment, saveHrDesignation } from '../../lib/hrMasterData';
import { HrAddFormButton, HrFormModal } from './HrFormModal';
import { HrCard, HrEmptyState } from './hrPageUi';
import { HR_BTN_PRIMARY, HR_FIELD_CLASS } from './hrFormStyles';
import { HrResponsiveTable } from './HrResponsiveTable';

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

export function HrDepartmentsPanel({ refreshKey = 0 }) {
  const ws = useWorkspace();
  const { show: toast } = useToast();
  const canEdit = canManageHrSettings(ws?.permissions || []);
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
  }, [refreshKey]);

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

  return (
    <HrCard title="Departments" subtitle="HQ and branch departments linked from staff profiles and reports">
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        {canEdit ? <HrAddFormButton onClick={openNew}>Add department</HrAddFormButton> : null}
      </div>
      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
          <button type="button" className="ml-2 underline" onClick={reload}>Retry</button>
        </div>
      ) : null}
      {loading && !rows.length ? <p className="text-sm text-slate-600">Loading departments…</p> : null}
      {!loading && !rows.length ? (
        <HrEmptyState
          title="No departments yet"
          description="Add your first department to standardise staff records."
          action={canEdit ? <button type="button" className={HR_BTN_PRIMARY} onClick={openNew}>Add department</button> : null}
        />
      ) : (
        <HrResponsiveTable
          columns={[
            { key: 'code', label: 'Code' },
            { key: 'name', label: 'Name' },
            { key: 'branchScope', label: 'Scope' },
            { key: 'active', label: 'Status' },
          ]}
          rows={rows.map((r) => ({
            ...r,
            branchScope: r.branchScope || 'All',
            active: r.active ? 'Active' : 'Inactive',
            _onClick: canEdit ? () => openEdit(r) : undefined,
          }))}
        />
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
            Branch scope (blank = all)
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
          <button type="submit" disabled={busy} className={HR_BTN_PRIMARY}>{busy ? 'Saving…' : 'Save'}</button>
        </form>
      </HrFormModal>
    </HrCard>
  );
}

export function HrDesignationsPanel({ refreshKey = 0 }) {
  const ws = useWorkspace();
  const { show: toast } = useToast();
  const canEdit = canManageHrSettings(ws?.permissions || []);
  const [rows, setRows] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [viewRow, setViewRow] = useState(null);
  const [form, setForm] = useState(emptyDesig());
  const [editId, setEditId] = useState('');
  const [busy, setBusy] = useState(false);

  const { loading, error, reload } = useHrListLoad(async () => {
    const [dRes, desRes] = await Promise.all([fetchHrDepartments(), fetchHrDesignations({ includeInactive: true })]);
    if (dRes.ok && dRes.data?.ok) setDepartments(dRes.data.departments || []);
    if (!desRes.ok || !desRes.data?.ok) {
      setRows([]);
      return { error: desRes.data?.error || 'Could not load designations.', hasData: false };
    }
    setRows(desRes.data.designations || []);
    return { hasData: true };
  }, [refreshKey]);

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
    toast('Designation saved.', { variant: 'success' });
    setModal(false);
    reload();
  };

  return (
    <HrCard title="Job titles & descriptions" subtitle="Designations with grades, duties, and default salary levels">
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        {canEdit ? <HrAddFormButton onClick={openNew}>Add designation</HrAddFormButton> : null}
      </div>
      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
          <button type="button" className="ml-2 underline" onClick={reload}>Retry</button>
        </div>
      ) : null}
      {loading && !rows.length ? <p className="text-sm text-slate-600">Loading designations…</p> : null}
      {!loading && !rows.length ? (
        <HrEmptyState
          title="No designations yet"
          description="Add job titles linked to departments."
          action={canEdit ? <button type="button" className={HR_BTN_PRIMARY} onClick={openNew}>Add designation</button> : null}
        />
      ) : (
        <>
        <HrResponsiveTable
          columns={[
            { key: 'title', label: 'Title' },
            { key: 'departmentName', label: 'Department' },
            { key: 'seniorityBand', label: 'Band' },
            { key: 'minServiceYears', label: 'Min yrs' },
            { key: 'titleTier', label: 'Tier' },
            { key: 'active', label: 'Status' },
            { key: 'actions', label: '' },
          ]}
          rows={rows.map((r) => ({
            ...r,
            departmentName: r.departmentName || '—',
            seniorityBand: r.seniorityBand || '—',
            minServiceYears: r.minServiceYears != null ? r.minServiceYears : '—',
            titleTier: r.titleTier || '—',
            active: r.active ? 'Active' : 'Inactive',
            actions: canEdit ? 'Edit' : 'View',
            _row: r,
          }))}
        />
        <div className="mt-2 flex flex-wrap gap-2 md:hidden">
          {rows.slice(0, 20).map((r) => (
            <div key={r.id} className="flex gap-2">
              <button type="button" className="text-xs font-bold text-zarewa-teal" onClick={() => { setViewRow(r); setViewModal(true); }}>View JD — {r.title}</button>
              {canEdit ? <button type="button" className="text-xs text-slate-600" onClick={() => openEdit(r)}>Edit</button> : null}
            </div>
          ))}
        </div>
        </>
      )}
      <HrFormModal isOpen={modal} onClose={() => setModal(false)} title={editId ? 'Edit designation' : 'Add designation'} size="lg">
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
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
          <label className="block text-xs font-semibold text-slate-600">
            Seniority band
            <input className={HR_FIELD_CLASS} value={form.seniorityBand} onChange={(e) => setForm({ ...form, seniorityBand: e.target.value })} placeholder="Junior / Senior / Manager" />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Min years of service
            <input type="number" min="0" step="0.5" className={HR_FIELD_CLASS} value={form.minServiceYears} onChange={(e) => setForm({ ...form, minServiceYears: e.target.value })} />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Title tier
            <input className={HR_FIELD_CLASS} value={form.titleTier} onChange={(e) => setForm({ ...form, titleTier: e.target.value })} placeholder="trainee / assistant / officer / manager" />
          </label>
          <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
            Functional office key
            <input className={HR_FIELD_CLASS} value={form.functionalOfficeKey} onChange={(e) => setForm({ ...form, functionalOfficeKey: e.target.value })} placeholder="sales / production / finance" />
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 sm:col-span-2">
            <input type="checkbox" checked={Boolean(form.isActing)} onChange={(e) => setForm({ ...form, isActing: e.target.checked })} />
            Acting (temporary) title
          </label>
          <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
            Duties & responsibilities
            <textarea className={HR_FIELD_CLASS} rows={3} value={form.dutiesResponsibilities} onChange={(e) => setForm({ ...form, dutiesResponsibilities: e.target.value })} />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Reporting line
            <input className={HR_FIELD_CLASS} value={form.reportingLine} onChange={(e) => setForm({ ...form, reportingLine: e.target.value })} />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Required qualification
            <input className={HR_FIELD_CLASS} value={form.requiredQualification} onChange={(e) => setForm({ ...form, requiredQualification: e.target.value })} />
          </label>
          <button type="submit" disabled={busy} className={`${HR_BTN_PRIMARY} sm:col-span-2`}>{busy ? 'Saving…' : 'Save designation'}</button>
        </form>
      </HrFormModal>
      <HrFormModal isOpen={viewModal} onClose={() => setViewModal(false)} title={viewRow?.title || 'Job description'} size="lg">
        {viewRow ? (
          <div className="space-y-3 text-sm text-slate-700">
            <p><span className="font-semibold text-slate-500">Department:</span> {viewRow.departmentName || '—'}</p>
            <p><span className="font-semibold text-slate-500">Reporting:</span> {viewRow.reportingLine || '—'}</p>
            <p><span className="font-semibold text-slate-500">Qualification:</span> {viewRow.requiredQualification || '—'}</p>
            <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-xs">{viewRow.dutiesResponsibilities || viewRow.jobDescription || 'No description recorded.'}</pre>
          </div>
        ) : null}
      </HrFormModal>
    </HrCard>
  );
}

export function HrBranchMappingPanel() {
  const ws = useWorkspace();
  const branches = (ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? []).map((b) => ({
    id: b.id,
    name: b.name || b.id,
  }));
  return (
    <HrCard title="Branch offices" subtitle="Sales branches and HQ offices used for staff assignment and transfers">
      <p className="mb-4 text-sm text-slate-600">
        Branch records are maintained in workspace governance. HR uses them for employee location, transfers, and
        branch-scoped departments.
      </p>
      {branches.length ? (
        <HrResponsiveTable
          columns={[
            { key: 'id', label: 'Branch ID' },
            { key: 'name', label: 'Office name' },
          ]}
          rows={branches}
        />
      ) : (
        <HrEmptyState title="No branches configured" description="Add branches in system governance settings." />
      )}
      <Link
        to="/settings/governance"
        className="mt-4 inline-flex text-xs font-semibold text-zarewa-teal hover:underline"
      >
        Open workspace governance →
      </Link>
    </HrCard>
  );
}
