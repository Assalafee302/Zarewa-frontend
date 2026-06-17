import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrDetailGrid } from '../../components/hr/HrDetailGrid';
import { HrStaffFormFields } from '../../components/hr/HrStaffFormFields';
import { HrSensitiveGate } from '../../components/hr/HrSensitiveGate';
import { useHrSensitiveAccess } from '../../hooks/useHrSensitiveAccess';
import { canManageHrStaff, canViewOrgSensitiveHr, hrHasPermission } from '../../lib/hrAccess';
import { formatNgn, payrollGroupLabel, yearsOfServiceFromIso } from '../../lib/hrFormat';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';
import { HrSalaryIncrementPanel } from '../../components/hr/HrSalaryIncrementPanel';
import { HrPromotionFromMatrix } from '../../components/hr/HrPromotionFromMatrix';
import { HrFormModal } from '../../components/hr/HrFormModal';
import { HrIdCardApplyFields } from '../../components/hr/HrIdCardApplyFields';
import { HrStaffDocumentsPanel } from '../../components/hr/HrStaffDocumentsPanel';
import { HrProfileCompleteness } from '../../components/hr/HrProfileCompleteness';
import { HrCard } from '../../components/hr/hrPageUi';
import { HrStaffFileChecklist } from '../../components/hr/HrStaffFileChecklist';
import { HrSkillsMatrixPanel } from '../../components/hr/HrSkillsMatrixPanel';
import { CRITICAL_MISSING_LABELS } from '../../lib/hrStaffDocumentKinds';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY } from '../../components/hr/hrFormStyles';
import { formToProfilePatch, staffToForm, updateHrStaffProfile, downloadStaffRegistrationFormPdf } from '../../lib/hrStaff';
import { createHrIdCardRequest } from '../../lib/hrIdCards';
import {
  blankIdCardApplyForm,
  bloodGroupFromStaff,
  emergencyContactFromStaff,
  idCardApplyPayload,
  validateIdCardApplyForm,
} from '../../lib/hrIdCardForm';
import { fetchStaffLoanSchedule } from '../../lib/hrMasterData';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'employment', label: 'Employment' },
  { id: 'compensation', label: 'Compensation' },
  { id: 'leave', label: 'Leave' },
  { id: 'loans', label: 'Loans' },
  { id: 'documents', label: 'Documents' },
  { id: 'transfers', label: 'Transfers' },
  { id: 'audit', label: 'Audit' },
];

function TabBar({ active, onChange }) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-px">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`rounded-t-lg px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
            active === t.id
              ? 'border border-b-white border-slate-200 bg-white text-[#134e4a] -mb-px'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function MissingBanner({ items }) {
  if (!items?.length) return null;
  return (
    <div className="flex gap-3 rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
      <AlertTriangle size={18} className="shrink-0 text-amber-600" aria-hidden />
      <div>
        <p className="font-semibold">Profile incomplete</p>
        <p className="mt-0.5 text-xs text-amber-900/90">
          Missing: {items.map((k) => CRITICAL_MISSING_LABELS[k] || k).join(' · ')}
        </p>
      </div>
    </div>
  );
}

function ProfileWarningsBanner({ warnings, onFixTab }) {
  if (!warnings?.length) return null;
  return (
    <div className="flex gap-3 rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
      <AlertTriangle size={18} className="shrink-0 text-amber-600" aria-hidden />
      <div className="space-y-1">
        <p className="font-semibold">Profile review needed</p>
        {warnings.map((w) => (
          <p key={w.id || w.message} className="text-xs text-amber-900/90">
            {w.message}
            {w.fixTab && onFixTab ? (
              <>
                {' '}
                <button type="button" className="font-bold text-[#134e4a] hover:underline" onClick={() => onFixTab(w.fixTab)}>
                  Review
                </button>
              </>
            ) : null}
          </p>
        ))}
      </div>
    </div>
  );
}

function ProfileSectionCard({ title, subtitle, rows, onEdit, editLabel = 'Edit section' }) {
  return (
    <HrCard
      title={title}
      subtitle={subtitle}
      actions={
        onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg border border-[#134e4a]/20 bg-[#134e4a]/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#134e4a] hover:bg-[#134e4a]/10"
          >
            {editLabel}
          </button>
        ) : null
      }
    >
      <HrDetailGrid rows={rows} />
    </HrCard>
  );
}

function CompensationTab({ staff, showSensitiveInline }) {
  const ebp = staff?.executiveBenefitsPayroll;
  const body = (
    <div className="space-y-4">
      {ebp ? (
        <ProfileSectionCard
          title={ebp.label || 'Executive benefits pay'}
          subtitle={ebp.note}
          rows={[
            {
              label: 'Pay channel',
              value: ebp.payChannel === 'executive_stipend' ? 'Monthly allowance' : 'Domestic monthly salary',
            },
            {
              label: 'Linked in Executive benefits',
              value: ebp.linked ? 'Yes' : 'Not linked yet',
            },
            {
              label: 'Monthly amount',
              value:
                staff?.compensationRedacted || ebp.monthlyAmountNgn == null
                  ? ebp.monthlyAmountNgn == null
                    ? '—'
                    : 'Hidden'
                  : formatNgn(ebp.monthlyAmountNgn),
            },
            ebp.lastPaidPeriod
              ? { label: 'Last paid period', value: ebp.lastPaidPeriod }
              : null,
            ebp.assignedExecutive
              ? { label: 'Assigned executive', value: ebp.assignedExecutive }
              : null,
            ebp.status ? { label: 'Benefits status', value: ebp.status } : null,
          ].filter(Boolean)}
        />
      ) : null}
      {ebp ? (
        <div className="rounded-xl border border-teal-100 bg-teal-50/60 px-4 py-3 text-sm text-teal-950">
          <p>
            HQ payroll runs do not include this person. Manage monthly pay in{' '}
            <Link to={ebp.managePath || '/executive-hr/benefits'} className="font-bold text-[#134e4a] underline">
              Executive benefits
            </Link>
            {ebp.payChannel === 'executive_stipend' ? ' → Monthly allowances' : ' → Domestic Staff'}.
          </p>
        </div>
      ) : null}
      <ProfileSectionCard
        title="Salary & payroll"
        subtitle={
          ebp
            ? 'Personnel record — monthly pay is in Executive benefits above'
            : 'Monthly compensation and payroll grouping'
        }
        rows={[
          { label: 'Payroll group', value: payrollGroupLabel(staff) },
          {
            label: 'Salary level / step',
            value:
              staff?.salaryLevel != null
                ? `Level ${staff.salaryLevel}${staff.salaryStep != null ? ` · Step ${staff.salaryStep}` : ''}`
                : staff?.promotionGrade || staff?.normalized?.taxonomy?.gradeBand || '—',
          },
          {
            label: 'Base salary (monthly)',
            value: staff?.compensationRedacted ? 'Hidden' : formatNgn(staff?.baseSalaryNgn),
          },
          {
            label: 'Housing allowance',
            value: staff?.compensationRedacted ? 'Hidden' : formatNgn(staff?.housingAllowanceNgn),
          },
          {
            label: 'Transport allowance',
            value: staff?.compensationRedacted ? 'Hidden' : formatNgn(staff?.transportAllowanceNgn),
          },
          {
            label: 'Standard matrix total',
            value: staff?.compensationRedacted
              ? 'Hidden'
              : staff?.compensation?.matrixTotalNgn != null
                ? formatNgn(staff.compensation.matrixTotalNgn)
                : '—',
          },
          {
            label: 'Pay addition',
            value: staff?.compensationRedacted
              ? 'Hidden'
              : staff?.compensation?.payAdditionNgn > 0
                ? formatNgn(staff.compensation.payAdditionNgn)
                : '—',
          },
          {
            label: 'Actual monthly pay',
            value: staff?.compensationRedacted
              ? 'Hidden'
              : formatNgn(
                  (Number(staff?.baseSalaryNgn) || 0) +
                    (Number(staff?.housingAllowanceNgn) || 0) +
                    (Number(staff?.transportAllowanceNgn) || 0)
                ),
          },
          {
            label: 'Pay vs matrix',
            value: staff?.compensationRedacted
              ? 'Hidden'
              : staff?.compensation?.aboveMatrix
                ? `+${formatNgn(staff.compensation.varianceNgn)} (${staff.profileExtra?.compensationVariance?.type || 'undocumented'})`
                : 'On matrix',
          },
          ...(staff?.profileExtra?.employmentMeta?.corporateTitle
            ? [
                {
                  label: 'Corporate title',
                  value: staff.profileExtra.employmentMeta.corporateTitle,
                },
              ]
            : []),
          ...(Array.isArray(staff?.compensation?.mergedOffices) && staff.compensation.mergedOffices.length
            ? [
                {
                  label: 'Merged desks',
                  value: staff.compensation.mergedOffices
                    .map(
                      (o) =>
                        `${o.role || o.label || 'Desk'}${o.label && o.role !== o.label ? '' : ''}${o.branchId ? ` · ${o.branchId}` : ''}${o.acting ? ' (acting)' : o.primary ? ' (primary)' : ''}`
                    )
                    .join('; '),
                },
              ]
            : []),
          {
            label: 'Salary status',
            value: staff?.profileExtra?.employmentMeta?.salaryStatus || 'active',
          },
        ]}
      />
      <ProfileSectionCard
        title="Bank details"
        subtitle="Masked account shown unless payroll export role"
        rows={[
          {
            label: 'Bank',
            value: staff?.compensationRedacted
              ? 'Hidden'
              : [staff?.bankName, staff?.bankAccountName, staff?.bankAccountNoMasked].filter(Boolean).join(' · ') || '—',
          },
        ]}
      />
      <ProfileSectionCard
        title="Tax, pension & NHIS"
        subtitle="Statutory deduction references"
        rows={[
          {
            label: 'Monthly PAYE (₦)',
            value:
              staff?.compensationRedacted ? 'Hidden'
              : staff?.isNonBranchStaff ? 'N/A (not branch payroll)'
              : staff?.payeTaxNgn != null
                ? formatNgn(staff.payeTaxNgn)
                : '—',
          },
          { label: 'Pension', value: staff?.compensationRedacted ? 'Hidden' : 'Company policy rate (if eligible)' },
          { label: 'Tax ID', value: staff?.compensationRedacted ? 'Hidden' : staff?.taxId || '—' },
          { label: 'RSA PIN', value: staff?.compensationRedacted ? 'Hidden' : staff?.pensionRsaPin || '—' },
          { label: 'Pension administrator', value: staff?.profileExtra?.statutory?.pensionAdministrator || '—' },
          { label: 'NHIS provider', value: staff?.nhisProvider || '—' },
          {
            label: 'NHIS deduction',
            value: staff?.compensationRedacted ? 'Hidden' : formatNgn(staff?.nhisDeductionNgn ?? staff?.nhisMonthlyDeductionNgn),
          },
        ]}
      />
    </div>
  );
  if (showSensitiveInline) return body;
  return <HrSensitiveGate label="View compensation and bank details">{body}</HrSensitiveGate>;
}

export default function HrStaffProfile() {
  const { userId } = useParams();
  const ws = useWorkspace();
  const sensitive = useHrSensitiveAccess();
  const perms = ws?.permissions || [];
  const showSensitiveInline = canViewOrgSensitiveHr(perms);
  const canManage = canManageHrStaff(perms);
  const canManageLeave = hrHasPermission(perms, 'hr.leave.manage') || canManage;

  const branches = useMemo(() => {
    const list = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
    return list.map((b) => ({ id: b.id, name: b.name || b.id }));
  }, [ws?.snapshot?.workspaceBranches, ws?.session?.branches]);

  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [staff, setStaff] = useState(null);
  const [branchHistory, setBranchHistory] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState(null);
  const [auditEvents, setAuditEvents] = useState(null);
  const [loanSchedule, setLoanSchedule] = useState([]);
  const [severance, setSeverance] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [originalBranchId, setOriginalBranchId] = useState('');
  const [editFormTab, setEditFormTab] = useState('personal');
  const [idCardModal, setIdCardModal] = useState(false);
  const [idCardForm, setIdCardForm] = useState(blankIdCardApplyForm);
  const [idCardErr, setIdCardErr] = useState('');
  const [idCardBusy, setIdCardBusy] = useState(false);
  const [idCardMsg, setIdCardMsg] = useState('');
  const [formPdfBusy, setFormPdfBusy] = useState(false);

  useEffect(() => {
    setStaff(null);
    setLoading(true);
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userId) return;
      setError('');
      const fetcher = showSensitiveInline || sensitive.isUnlocked ? sensitive.fetchWithSensitive : apiFetch;
      const { ok, data } = await fetcher(`/api/hr/staff/${encodeURIComponent(userId)}`);
      if (cancelled) return;
      if (!ok || !data?.ok) {
        setError(data?.error || 'Could not load staff profile.');
        setStaff(null);
        setBranchHistory([]);
      } else {
        setStaff(data.staff);
        setBranchHistory(data.branchHistory || []);
        setOriginalBranchId(data.staff?.branchId || data.staff?.normalized?.branchId || '');
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, sensitive.isUnlocked, showSensitiveInline, sensitive.fetchWithSensitive]);

  const reloadProfile = async () => {
    const fetcher = showSensitiveInline || sensitive.isUnlocked ? sensitive.fetchWithSensitive : apiFetch;
    const { ok, data } = await fetcher(`/api/hr/staff/${encodeURIComponent(userId)}`);
    if (ok && data?.ok) {
      setStaff(data.staff);
      setBranchHistory(data.branchHistory || []);
      setOriginalBranchId(data.staff?.branchId || data.staff?.normalized?.branchId || '');
    }
  };

  const startEdit = (sectionTab = 'personal') => {
    setEditForm(staffToForm(staff));
    setEditFormTab(sectionTab);
    setSaveError('');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditForm(null);
    setSaveError('');
  };

  const openIdCardModal = () => {
    setIdCardForm({
      ...blankIdCardApplyForm(),
      bloodGroup: bloodGroupFromStaff(staff),
      emergencyContact: emergencyContactFromStaff(staff),
    });
    setIdCardErr('');
    setIdCardMsg('');
    setIdCardModal(true);
  };

  const downloadRegistrationForm = async () => {
    if (!userId) return;
    setFormPdfBusy(true);
    const { ok, error: err } = await downloadStaffRegistrationFormPdf(userId);
    setFormPdfBusy(false);
    if (!ok) setError(err || 'Could not download staff form.');
  };

  const submitIdCardRequest = async (e) => {
    e.preventDefault();
    if (!userId) return;
    const validation = validateIdCardApplyForm(idCardForm);
    if (!validation.ok) {
      setIdCardErr(validation.error);
      return;
    }
    setIdCardBusy(true);
    setIdCardErr('');
    try {
      const { ok, data } = await createHrIdCardRequest(idCardApplyPayload(idCardForm, userId));
      if (!ok || !data?.ok) {
        setIdCardErr(data?.error || 'Could not create ID card request.');
        return;
      }
      setIdCardMsg('ID card request created for this employee.');
      setIdCardModal(false);
    } catch {
      setIdCardErr('Could not create ID card request.');
    } finally {
      setIdCardBusy(false);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!editForm) return;
    setSaving(true);
    setSaveError('');
    const { ok, data } = await updateHrStaffProfile(
      userId,
      formToProfilePatch(editForm, { originalBranchId })
    );
    setSaving(false);
    if (!ok || !data?.ok) {
      setSaveError(data?.error || 'Could not save profile.');
      return;
    }
    setEditing(false);
    setEditForm(null);
    await reloadProfile();
  };

  useEffect(() => {
    if (tab !== 'leave' || !userId || !canManageLeave) return;
    let cancelled = false;
    (async () => {
      const { ok, data } = await apiFetch(`/api/hr/leave/balances?userId=${encodeURIComponent(userId)}`);
      if (cancelled) return;
      setLeaveBalances(ok && data?.ok ? data.balances : []);
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, userId, canManageLeave]);

  useEffect(() => {
    if (tab !== 'employment' || !userId || !canManage) return;
    let cancelled = false;
    (async () => {
      try {
        const { ok, data } = await apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}/severance-preview`);
        if (cancelled) return;
        setSeverance(ok && data?.ok ? data.severance : null);
      } catch {
        // ignore — severance preview is informational only
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, userId, canManage]);

  useEffect(() => {
    if (tab !== 'audit' || !userId) return;
    let cancelled = false;
    (async () => {
      const { ok, data } = await apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}/audit-events`);
      if (cancelled) return;
      setAuditEvents(ok && data?.ok ? data.events : []);
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, userId]);

  const yrs = useMemo(() => yearsOfServiceFromIso(staff?.dateJoinedIso), [staff?.dateJoinedIso]);
  const loanNotes = staff?.profileExtra?.activeLoansSummary;

  useEffect(() => {
    if (tab !== 'loans' || !userId) return;
    (async () => {
      const { ok, data } = await fetchStaffLoanSchedule(userId);
      if (ok && data?.ok) setLoanSchedule(data.schedule || []);
    })();
  }, [tab, userId]);
  const disciplinary = staff?.profileExtra?.disciplinaryEvents;

  if (loading && !staff) return <p className="text-sm text-slate-600">Loading employee profile…</p>;
  if (error) {
    return (
      <div className="space-y-4">
        <Link to={HR_EMPLOYEES} className="inline-flex items-center gap-1 text-sm font-semibold text-[#134e4a] hover:underline">
          <ArrowLeft size={16} aria-hidden /> Back to staff directory
        </Link>
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      </div>
    );
  }
  if (!staff) return null;

  const personal = staff.profileExtra?.personal || {};
  const empMeta = staff.profileExtra?.employmentMeta || {};
  const fullName = [personal.firstName, personal.middleName, personal.surname].filter(Boolean).join(' ') || staff.displayName;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to={HR_EMPLOYEES} className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-[#134e4a] hover:underline">
            <ArrowLeft size={14} aria-hidden /> Staff directory
          </Link>
          <div className="mt-2 flex items-center gap-3">
            {staff.avatarUrl && (staff.avatarUrl.startsWith('https://') || staff.avatarUrl.startsWith('data:image/')) ? (
              <img
                src={staff.avatarUrl}
                alt=""
                className="h-12 w-12 rounded-xl border border-slate-200 object-cover bg-slate-100"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-[9px] text-slate-400">
                Photo
              </div>
            )}
            <h2 className="text-xl font-black text-slate-900">{staff.displayName || staff.username}</h2>
          </div>
          <p className="text-sm text-slate-600">
            {staff.employeeNo ? `${staff.employeeNo} · ` : ''}
            {staff.jobTitle || 'No job title'} · {staff.branchId || staff.normalized?.branchId || '—'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start">
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase ${
              staff.status === 'active'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-slate-200 bg-slate-100 text-slate-600'
            }`}
          >
            {staff.status || 'unknown'}
          </span>
          {canManage && !editing ? (
            <>
              <button
                type="button"
                onClick={downloadRegistrationForm}
                disabled={formPdfBusy}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {formPdfBusy ? 'Preparing…' : 'Staff form PDF'}
              </button>
              <button
                type="button"
                onClick={openIdCardModal}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
              >
                Request ID card
              </button>
              <button
                type="button"
                onClick={startEdit}
                className="rounded-xl border border-[#134e4a]/30 bg-[#134e4a]/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#134e4a] hover:bg-[#134e4a]/10"
              >
                Edit profile
              </button>
            </>
          ) : null}
        </div>
      </div>

      <MissingBanner items={staff.criticalMissing} />
      <ProfileWarningsBanner
        warnings={staff.profileCompleteness?.profileWarnings}
        onFixTab={(fixTab) => {
          if (fixTab === 'compensation') setTab('compensation');
          else if (fixTab === 'documents') setTab('documents');
          else setTab('employment');
        }}
      />
      {canManage ? <HrStaffFileChecklist completeness={staff.fileCompleteness} /> : null}

      <HrFormModal
        isOpen={editing && !!editForm}
        onClose={cancelEdit}
        title="Edit employee profile"
        size="xl"
      >
        {editForm ? (
          <form onSubmit={saveProfile} className="space-y-4">
            {saveError ? (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{saveError}</div>
            ) : null}
            <HrStaffFormFields
              form={editForm}
              setForm={setEditForm}
              branches={branches}
              mode="edit"
              showCompensation={showSensitiveInline || sensitive.isUnlocked || !staff.compensationRedacted}
              canViewFullBank={showSensitiveInline}
              originalBranchId={originalBranchId}
              editUserId={userId}
              initialTab={editFormTab}
            />
            {staff.compensationRedacted && !showSensitiveInline && !sensitive.isUnlocked ? (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                Unlock sensitive HR access to view or edit salary and bank fields on this form.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <button type="submit" disabled={saving} className={HR_BTN_PRIMARY}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button type="button" onClick={cancelEdit} className={HR_BTN_SECONDARY}>
                Cancel
              </button>
            </div>
          </form>
        ) : null}
      </HrFormModal>

      <TabBar active={tab} onChange={setTab} />

      {tab === 'overview' ? (
        <div className="space-y-4">
          <HrProfileCompleteness
            completeness={staff.profileCompleteness}
            staffBasePath={HR_EMPLOYEES}
            userId={userId}
            onFixSection={(fixTab) => {
              if (fixTab === 'compensation') setTab('compensation');
              else if (fixTab === 'documents') setTab('documents');
              else setTab('employment');
              if (canManage) startEdit(fixTab === 'compensation' ? 'payroll' : fixTab === 'documents' ? 'personal' : fixTab);
            }}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <ProfileSectionCard
              title="Personal data"
              subtitle="Contact and identity"
              onEdit={canManage ? () => startEdit('personal') : undefined}
              rows={[
                { label: 'Full name', value: fullName },
                { label: 'Gender', value: staff.gender || '—' },
                { label: 'Date of birth', value: staff.dateOfBirthIso?.slice(0, 10) || '—' },
                { label: 'Phone', value: personal.phone || '—' },
                { label: 'Email', value: staff.email || personal.email || '—' },
                { label: 'NIN', value: staff.ninNumber || '—' },
                { label: 'BVN', value: staff.bvnNumber || '—' },
                { label: 'Address', value: personal.residentialAddress || '—' },
              ]}
            />
            <ProfileSectionCard
              title="Employment summary"
              subtitle="Role, branch, and reporting"
              onEdit={canManage ? () => startEdit('employment') : undefined}
              rows={[
                { label: 'Employee ID', value: staff.employeeNo || '—' },
                { label: 'Department', value: staff.department || '—' },
                { label: 'Job title', value: staff.jobTitle || '—' },
                { label: 'Branch', value: staff.branchId || staff.normalized?.branchId || '—' },
                { label: 'Employment type', value: staff.employmentType || '—' },
                { label: 'Status', value: empMeta.employmentStatus || staff.status || '—' },
                { label: 'Date joined', value: staff.dateJoinedIso?.slice(0, 10) || '—' },
                {
                  label: 'Years of service',
                  value:
                    staff.tenure?.yearsOfService != null
                      ? `${staff.tenure.yearsOfService} yrs (${staff.tenure.yearsInCurrentLevel} at current level/step)`
                      : yrs != null
                        ? `${yrs} yrs`
                        : '—',
                },
                {
                  label: 'Pay rank',
                  value:
                    staff.salaryLevel != null
                      ? `L${staff.salaryLevel} / Step ${staff.salaryStep ?? 1} · ${staff.promotionGrade || '—'}`
                      : '—',
                },
                { label: 'Line manager', value: staff.lineManagerDisplayName || staff.lineManagerUserId || '—' },
              ]}
            />
            <ProfileSectionCard
              title="Next of kin"
              subtitle="Emergency contact"
              onEdit={canManage ? () => startEdit('nok') : undefined}
              rows={[
                {
                  label: 'Contact',
                  value: staff.nextOfKin
                    ? [staff.nextOfKin.name, staff.nextOfKin.relationship, staff.nextOfKin.phone].filter(Boolean).join(' · ')
                    : '—',
                },
                { label: 'Address', value: staff.nextOfKin?.address || '—' },
              ]}
            />
            <ProfileSectionCard
              title="Account & compliance"
              subtitle="System access and policy status"
              rows={[
                { label: 'Username', value: staff.username },
                { label: 'System role', value: staff.roleKey },
                { label: 'Self-service', value: staff.selfServiceEligible ? 'Yes' : 'No' },
                { label: 'Handbook', value: staff.complianceBadges?.handbookAcknowledged ? 'Acknowledged' : 'Pending' },
                { label: 'Years of service', value: yrs != null ? `${yrs} years` : '—' },
              ]}
            />
          </div>
        </div>
      ) : null}

      {tab === 'employment' ? (
        <div className="space-y-6">
          <HrDetailGrid
            rows={[
              { label: 'Department', value: staff.department },
              { label: 'Employment type', value: staff.employmentType || staff.normalized?.taxonomy?.employmentType },
              { label: 'Role family', value: staff.normalized?.taxonomy?.roleFamily },
              { label: 'Grade band', value: staff.normalized?.taxonomy?.gradeBand || staff.promotionGrade },
              { label: 'Seniority', value: staff.normalized?.taxonomy?.seniority },
              { label: 'Date joined', value: staff.dateJoinedIso },
              { label: 'Probation ends', value: staff.probationEndIso },
              { label: 'Leave entitlement band', value: staff.leaveEntitlementBand },
              { label: 'Line manager ID', value: staff.lineManagerUserId },
              { label: 'Minimum qualification', value: staff.minimumQualification },
              { label: 'Academic qualification', value: staff.academicQualification },
              { label: 'Training summary', value: staff.trainingSummary },
              { label: 'Welfare notes', value: staff.welfareNotes },
            ]}
          />
          <HrSkillsMatrixPanel userId={userId} canEdit={canManage} />
          {canManage ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Severance Preview</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Based on handbook policy</p>
              </div>
              {severance ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Years of service</span><span className="font-semibold">{severance.yearsOfService} yrs</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Annual salary</span><span className="font-semibold">₦{severance.annualSalary?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Entitlement</span><span className="font-semibold text-teal-800">{severance.description}</span></div>
                  {severance.severanceNgn > 0 && (
                    <div className="flex justify-between border-t border-slate-100 pt-2 mt-2">
                      <span className="font-bold text-slate-700">Severance Amount</span>
                      <span className="font-bold text-lg text-teal-800">₦{severance.severanceNgn?.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              ) : <p className="text-sm text-slate-400">Loading…</p>}
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'compensation' ? (
        <div className="space-y-6">
          <CompensationTab staff={staff} showSensitiveInline={showSensitiveInline} />
          {canManage ? (
            <>
              <HrPromotionFromMatrix
                userId={userId}
                staff={staff}
                canViewAmounts={showSensitiveInline || sensitive.isUnlocked || !staff.compensationRedacted}
                onUpdated={reloadProfile}
              />
              <HrSalaryIncrementPanel
                userId={userId}
                staff={staff}
                permissions={ws?.permissions || []}
                canViewAmounts={showSensitiveInline || sensitive.isUnlocked || !staff.compensationRedacted}
                onUpdated={reloadProfile}
              />
            </>
          ) : null}
        </div>
      ) : null}

      {tab === 'leave' ? (
        <div className="space-y-4">
          {!canManageLeave ? (
            <p className="text-sm text-slate-600">Leave balances for other staff require HR leave permissions.</p>
          ) : leaveBalances == null ? (
            <p className="text-sm text-slate-600">Loading leave balances…</p>
          ) : leaveBalances.length === 0 ? (
            <p className="text-sm text-slate-600">No leave balance records for this period.</p>
          ) : (
            <AppTableWrap>
              <AppTable role="numeric">
                <AppTableThead>
                  <AppTableTh>Leave type</AppTableTh>
                  <AppTableTh>Period</AppTableTh>
                  <AppTableTh align="right">Opening</AppTableTh>
                  <AppTableTh align="right">Accrued</AppTableTh>
                  <AppTableTh align="right">Used</AppTableTh>
                  <AppTableTh align="right">Closing</AppTableTh>
                </AppTableThead>
                <AppTableBody>
                  {leaveBalances.map((b) => (
                    <AppTableTr key={`${b.leaveType}-${b.periodYyyymm}`}>
                      <AppTableTd>{b.leaveType}</AppTableTd>
                      <AppTableTd>{b.periodYyyymm}</AppTableTd>
                      <AppTableTd align="right">{b.openingDays}</AppTableTd>
                      <AppTableTd align="right">{b.accruedDays}</AppTableTd>
                      <AppTableTd align="right">{b.usedDays}</AppTableTd>
                      <AppTableTd align="right">{b.closingDays}</AppTableTd>
                    </AppTableTr>
                  ))}
                </AppTableBody>
              </AppTable>
            </AppTableWrap>
          )}
          <p className="text-xs text-slate-500">Leave applications and approvals are managed in HR Requests (Phase 4).</p>
        </div>
      ) : null}

      {tab === 'loans' ? (
        <div className="space-y-4 text-sm text-slate-700">
          {loanSchedule.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {loanSchedule.map((loan) => (
                <HrCard key={loan.requestId} className="!p-4">
                  <p className="font-bold text-slate-900">{loan.title}</p>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <dt className="text-slate-500">Amount</dt><dd className="font-semibold tabular-nums">{formatNgn(loan.amountNgn)}</dd>
                    <dt className="text-slate-500">Outstanding</dt><dd className="font-semibold text-[#134e4a]">{formatNgn(loan.outstandingNgn)}</dd>
                    <dt className="text-slate-500">Monthly</dt><dd>{formatNgn(loan.monthlyDeductionNgn)}</dd>
                    <dt className="text-slate-500">Status</dt><dd className="capitalize">{loan.status?.replace(/_/g, ' ')}</dd>
                  </dl>
                </HrCard>
              ))}
            </div>
          ) : loanNotes ? (
            <pre className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs overflow-auto">{JSON.stringify(loanNotes, null, 2)}</pre>
          ) : (
            <p>No active loan schedule. Staff loan requests appear in HR Requests once submitted.</p>
          )}
        </div>
      ) : null}

      {tab === 'documents' ? (
        <HrStaffDocumentsPanel
          userId={userId}
          displayName={staff.displayName || staff.username}
          avatarUrl={staff.avatarUrl}
          canEdit={canManage}
          canVerify={canManage}
          onboardingChecklist={staff.onboardingChecklist}
          onUpdated={reloadProfile}
        />
      ) : null}

      {tab === 'transfers' ? (
        <div className="space-y-3">
          {canManage ? (
            <p className="text-xs text-slate-500">
              To transfer: use <strong>Edit profile</strong> and change branch (add a reason). Or use{' '}
              <Link to="/hr/transfers" className="font-semibold text-[#134e4a] hover:underline">
                HR → Transfers
              </Link>
              .
            </p>
          ) : null}
        {branchHistory.length === 0 ? (
          <p className="text-sm text-slate-600">No branch transfer history recorded.</p>
        ) : (
          <AppTableWrap>
            <AppTable>
              <AppTableThead>
                <AppTableTh>From</AppTableTh>
                <AppTableTh>To</AppTableTh>
                <AppTableTh>Effective</AppTableTh>
                <AppTableTh>Reason</AppTableTh>
              </AppTableThead>
              <AppTableBody>
                {branchHistory.map((h) => (
                  <AppTableTr key={h.id}>
                    <AppTableTd>{h.fromBranchId || '—'}</AppTableTd>
                    <AppTableTd>{h.toBranchId || '—'}</AppTableTd>
                    <AppTableTd>{h.effectiveFromIso || '—'}</AppTableTd>
                    <AppTableTd title={h.reason}>{h.reason || '—'}</AppTableTd>
                  </AppTableTr>
                ))}
              </AppTableBody>
            </AppTable>
          </AppTableWrap>
        )}
        </div>
      ) : null}

      {tab === 'audit' ? (
        auditEvents == null ? (
          <p className="text-sm text-slate-600">Loading audit trail…</p>
        ) : auditEvents.length === 0 ? (
          <p className="text-sm text-slate-600">No audit events for this employee.</p>
        ) : (
          <AppTableWrap>
            <AppTable>
              <AppTableThead>
                <AppTableTh>When</AppTableTh>
                <AppTableTh>Actor</AppTableTh>
                <AppTableTh>Action</AppTableTh>
                <AppTableTh>Entity</AppTableTh>
              </AppTableThead>
              <AppTableBody>
                {auditEvents.map((e) => (
                  <AppTableTr key={e.id}>
                    <AppTableTd monospace>{e.atIso?.slice(0, 19) || '—'}</AppTableTd>
                    <AppTableTd>{e.actorDisplayName || e.actorUserId || '—'}</AppTableTd>
                    <AppTableTd>{e.action}</AppTableTd>
                    <AppTableTd>
                      {e.entityKind}
                      {e.entityId ? ` · ${e.entityId}` : ''}
                    </AppTableTd>
                  </AppTableTr>
                ))}
              </AppTableBody>
            </AppTable>
          </AppTableWrap>
        )
      ) : null}

      {idCardMsg ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{idCardMsg}</div>
      ) : null}

      <HrFormModal isOpen={idCardModal} onClose={() => setIdCardModal(false)} title="Request ID card for employee" size="md">
        <form onSubmit={submitIdCardRequest} className="space-y-4">
          {idCardErr ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{idCardErr}</div>
          ) : null}
          <p className="text-xs text-slate-500">
            Create an ID card request on behalf of {staff.displayName || staff.username}. Manage it from Employees → ID Cards.
          </p>
          <HrIdCardApplyFields form={idCardForm} setForm={setIdCardForm} />
          <div className="flex flex-wrap gap-2 justify-end">
            <Link
              to={`/hr/letters?letterKind=id_card_approval&userId=${encodeURIComponent(userId)}`}
              className={HR_BTN_SECONDARY}
            >
              Issue collection letter
            </Link>
            <button type="button" onClick={() => setIdCardModal(false)} className={HR_BTN_SECONDARY}>
              Cancel
            </button>
            <button type="submit" disabled={idCardBusy} className={HR_BTN_PRIMARY}>
              {idCardBusy ? 'Submitting…' : 'Create request'}
            </button>
          </div>
        </form>
      </HrFormModal>

      {Array.isArray(disciplinary) && disciplinary.length > 0 && tab === 'overview' ? (
        <section className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Discipline (summary)</h3>
          <p className="mt-1 text-xs text-slate-600">
            {disciplinary.length} event(s) on file.{' '}
            <Link to="/hr/discipline" className="font-semibold text-[#134e4a] hover:underline">
              View discipline register
            </Link>
          </p>
        </section>
      ) : null}
    </div>
  );
}
