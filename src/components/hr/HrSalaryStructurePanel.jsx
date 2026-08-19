import React, { useMemo, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { formatNgn } from '../../lib/hrFormat';
import { canApproveSalaryStructure, canProposeSalaryStructure } from '../../lib/hrAccess';
import { paySourceLabel } from '../../lib/hrSalaryStructure';
import { HrFormModal, HrAddFormButton } from './HrFormModal';
import { HrStatusBadge } from './HrStatusBadge';
import { HrButton, HR_FIELD_CLASS, HR_SECTION_TITLE } from './hrPageUi';
import { HrSalaryMatrixPanel } from './HrSalaryMatrixPanel';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../ui/AppDataTable';
import { InlineLoader } from '../ui/PageLoader';
import { EmptyState } from '../ui/EmptyState';
import { ConfirmDialog } from '../ui/ConfirmDialog';

const SUB = [
  { id: 'current', label: 'Current salaries' },
  { id: 'proposed', label: 'Awaiting approval' },
  { id: 'register', label: 'Who is paid' },
  { id: 'history', label: 'Old matrix' },
];

export function HrSalaryStructurePanel() {
  const ws = useWorkspace();
  const perms = ws?.permissions || [];
  const roleKey = ws?.session?.user?.roleKey;
  const canPropose = canProposeSalaryStructure(perms, roleKey);
  const canApprove = canApproveSalaryStructure(perms, roleKey);
  const branches = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];

  const [sub, setSub] = useState('current');
  const [versions, setVersions] = useState([]);
  const [register, setRegister] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [form, setForm] = useState({
    designationId: '',
    branchId: '',
    amountNgn: '',
    effectiveFromIso: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(null);

  const { loading, reload } = useHrListLoad(async () => {
    const [vRes, rRes, dRes] = await Promise.all([
      apiFetch('/api/hr/salary-structure'),
      apiFetch('/api/hr/salary-structure/register'),
      apiFetch('/api/hr/designations'),
    ]);
    if (!vRes.ok || !vRes.data?.ok) {
      setVersions([]);
      return { error: vRes.data?.error || 'Could not load salary structure.', hasData: false };
    }
    setVersions(vRes.data.versions || []);
    setRegister(rRes.ok && rRes.data?.ok ? rRes.data.register || [] : []);
    setDesignations(dRes.ok && dRes.data?.ok ? dRes.data.designations || [] : []);
    return { hasData: true };
  }, []);

  const current = useMemo(() => versions.filter((v) => v.status === 'current'), [versions]);
  const proposed = useMemo(() => versions.filter((v) => v.status === 'proposed'), [versions]);
  const missing = useMemo(() => register.filter((r) => r.paySource !== 'structure'), [register]);

  const runAction = async (path, method = 'POST', body) => {
    setBusy(true);
    setError('');
    const { ok, data } = await apiFetch(path, {
      method,
      ...(body != null ? { body: JSON.stringify(body) } : {}),
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Action failed.');
      return false;
    }
    setMessage(data.version ? 'Salary structure updated.' : 'Done.');
    await reload();
    return true;
  };

  const submitPropose = async (e) => {
    e.preventDefault();
    const ok = await runAction('/api/hr/salary-structure', 'POST', {
      designationId: form.designationId,
      branchId: form.branchId,
      amountNgn: Number(String(form.amountNgn).replace(/,/g, '')),
      effectiveFromIso: form.effectiveFromIso,
      notes: form.notes,
    });
    if (ok) {
      setProposeOpen(false);
      setSub('proposed');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={HR_SECTION_TITLE}>Salary structure</p>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            One approved monthly amount per job title. Company-wide unless you add a branch override. Propose a new
            version to change pay — the current figure is never overwritten.
          </p>
        </div>
        {canPropose ? (
          <HrAddFormButton onClick={() => setProposeOpen(true)}>Propose salary</HrAddFormButton>
        ) : null}
      </div>

      {error ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      {message ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {SUB.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSub(t.id)}
            className={`min-h-10 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide ${
              sub === t.id ? 'bg-zarewa-teal text-white' : 'border border-slate-200 bg-white text-slate-600'
            }`}
          >
            {t.label}
            {t.id === 'proposed' && proposed.length ? ` (${proposed.length})` : ''}
            {t.id === 'register' && missing.length ? ` (${missing.length} gaps)` : ''}
          </button>
        ))}
      </div>

      {loading ? <InlineLoader message="Loading salary structure…" /> : null}

      {!loading && sub === 'current' ? (
        current.length === 0 ? (
          <EmptyState
            title="No approved salaries yet"
            description="Propose a monthly amount for each job title. Until that is approved, payroll still uses the figure stored on the staff profile."
            actionLabel={canPropose ? 'Propose salary' : undefined}
            onAction={canPropose ? () => setProposeOpen(true) : undefined}
          />
        ) : (
          <AppTableWrap>
            <AppTable role="numeric">
              <AppTableThead>
                <AppTableTh>Job title</AppTableTh>
                <AppTableTh>Scope</AppTableTh>
                <AppTableTh align="right">Monthly salary</AppTableTh>
                <AppTableTh>Effective</AppTableTh>
              </AppTableThead>
              <AppTableBody>
                {current.map((v) => (
                  <AppTableTr key={v.id}>
                    <AppTableTd>{v.designationTitle || v.designationId}</AppTableTd>
                    <AppTableTd>{v.branchLabel}</AppTableTd>
                    <AppTableTd align="right" className="font-semibold">
                      {formatNgn(v.amountNgn)}
                    </AppTableTd>
                    <AppTableTd>{v.effectiveFromIso || '—'}</AppTableTd>
                  </AppTableTr>
                ))}
              </AppTableBody>
            </AppTable>
          </AppTableWrap>
        )
      ) : null}

      {!loading && sub === 'proposed' ? (
        proposed.length === 0 ? (
          <EmptyState title="Nothing waiting" description="New proposals appear here for GM HR or MD approval." />
        ) : (
          <AppTableWrap>
            <AppTable role="numeric">
              <AppTableThead>
                <AppTableTh>Job title</AppTableTh>
                <AppTableTh>Scope</AppTableTh>
                <AppTableTh align="right">Proposed amount</AppTableTh>
                <AppTableTh>Effective</AppTableTh>
                <AppTableTh>Notes</AppTableTh>
                <AppTableTh align="right">Actions</AppTableTh>
              </AppTableThead>
              <AppTableBody>
                {proposed.map((v) => (
                  <AppTableTr key={v.id}>
                    <AppTableTd>{v.designationTitle || v.designationId}</AppTableTd>
                    <AppTableTd>{v.branchLabel}</AppTableTd>
                    <AppTableTd align="right">{formatNgn(v.amountNgn)}</AppTableTd>
                    <AppTableTd>{v.effectiveFromIso || '—'}</AppTableTd>
                    <AppTableTd>{v.notes || '—'}</AppTableTd>
                    <AppTableTd align="right" truncate={false}>
                      <div className="flex flex-wrap justify-end gap-2">
                        {canApprove ? (
                          <HrButton
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              setConfirm({
                                title: 'Approve this salary?',
                                description: `${v.designationTitle} · ${v.branchLabel} · ${formatNgn(v.amountNgn)} from ${v.effectiveFromIso}. This becomes the current amount and the previous current row is kept as history.`,
                                confirmLabel: 'Approve',
                                onConfirm: async () => {
                                  await runAction(`/api/hr/salary-structure/${encodeURIComponent(v.id)}/approve`);
                                  setConfirm(null);
                                },
                              })
                            }
                          >
                            Approve
                          </HrButton>
                        ) : null}
                        {canPropose ? (
                          <HrButton
                            type="button"
                            variant="secondary"
                            disabled={busy}
                            onClick={() =>
                              setConfirm({
                                title: 'Withdraw proposal?',
                                description: 'This proposed row will be deleted. Approved salaries cannot be deleted.',
                                confirmLabel: 'Withdraw',
                                variant: 'danger',
                                onConfirm: async () => {
                                  await runAction(`/api/hr/salary-structure/${encodeURIComponent(v.id)}/withdraw`);
                                  setConfirm(null);
                                },
                              })
                            }
                          >
                            Withdraw
                          </HrButton>
                        ) : null}
                      </div>
                    </AppTableTd>
                  </AppTableTr>
                ))}
              </AppTableBody>
            </AppTable>
          </AppTableWrap>
        )
      ) : null}

      {!loading && sub === 'register' ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {register.length} payroll staff · {register.length - missing.length} on approved structure · {missing.length}{' '}
            still using a profile figure or missing a job title.
          </p>
          <AppTableWrap>
            <AppTable role="numeric">
              <AppTableThead>
                <AppTableTh>Staff</AppTableTh>
                <AppTableTh>Job title</AppTableTh>
                <AppTableTh>Branch</AppTableTh>
                <AppTableTh>Status</AppTableTh>
                <AppTableTh align="right">Pays from</AppTableTh>
              </AppTableThead>
              <AppTableBody>
                {register.length === 0 ? (
                  <AppTableTr>
                    <AppTableTd colSpan={5} align="center">
                      No payroll-eligible staff.
                    </AppTableTd>
                  </AppTableTr>
                ) : (
                  register.map((r) => (
                    <AppTableTr key={r.userId}>
                      <AppTableTd>
                        <span className="font-medium">{r.displayName}</span>
                        {r.employeeNo ? <span className="ml-2 text-xs text-slate-500">{r.employeeNo}</span> : null}
                      </AppTableTd>
                      <AppTableTd>{r.designationTitle || '—'}</AppTableTd>
                      <AppTableTd>{r.branchLabel}</AppTableTd>
                      <AppTableTd>
                        <HrStatusBadge
                          status={r.paySource === 'structure' ? 'paid' : 'pending'}
                          variant="benefit"
                          label={paySourceLabel(r.paySource)}
                        />
                      </AppTableTd>
                      <AppTableTd align="right">
                        {r.amountNgn != null ? formatNgn(r.amountNgn) : formatNgn(r.profileFallbackNgn)}
                      </AppTableTd>
                    </AppTableTr>
                  ))
                )}
              </AppTableBody>
            </AppTable>
          </AppTableWrap>
        </div>
      ) : null}

      {!loading && sub === 'history' ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Historical level × step matrix. It does not feed payroll. Use current salaries above.
          </p>
          <HrSalaryMatrixPanel />
        </div>
      ) : null}

      <HrFormModal
        isOpen={proposeOpen}
        onClose={() => setProposeOpen(false)}
        title="Propose a salary"
        description="Creates a proposed version. GM HR or MD must approve before payroll uses it."
        size="md"
      >
        <form className="space-y-4" onSubmit={submitPropose}>
          <label className="block text-sm font-semibold text-slate-700">
            Job title
            <select
              required
              className={HR_FIELD_CLASS}
              value={form.designationId}
              onChange={(e) => setForm((f) => ({ ...f, designationId: e.target.value }))}
            >
              <option value="">Select…</option>
              {designations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Scope
            <select
              className={HR_FIELD_CLASS}
              value={form.branchId}
              onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
            >
              <option value="">Company-wide</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name || b.id}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Monthly salary (₦)
            <input
              required
              inputMode="numeric"
              className={HR_FIELD_CLASS}
              value={form.amountNgn}
              onChange={(e) => setForm((f) => ({ ...f, amountNgn: e.target.value }))}
              placeholder="e.g. 250000"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Effective from
            <input
              required
              type="date"
              className={HR_FIELD_CLASS}
              value={form.effectiveFromIso}
              onChange={(e) => setForm((f) => ({ ...f, effectiveFromIso: e.target.value }))}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Notes
            <textarea
              className={HR_FIELD_CLASS}
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Why this amount (optional)"
            />
          </label>
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <HrButton type="button" variant="secondary" onClick={() => setProposeOpen(false)}>
              Cancel
            </HrButton>
            <HrButton type="submit" disabled={busy}>
              Submit for approval
            </HrButton>
          </div>
        </form>
      </HrFormModal>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title}
        description={confirm?.description}
        confirmLabel={confirm?.confirmLabel}
        variant={confirm?.variant === 'danger' ? 'danger' : 'primary'}
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={confirm?.onConfirm}
      />
    </div>
  );
}
