import { InlineLoader } from '../../components/ui/PageLoader';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrUrlTab } from '../../hooks/useHrUrlTab';
import { HrDetailGrid } from '../../components/hr/HrDetailGrid';
import { HrStaffFormFields } from '../../components/hr/HrStaffFormFields';
import { HrSensitiveGate } from '../../components/hr/HrSensitiveGate';
import { useHrSensitiveAccess } from '../../hooks/useHrSensitiveAccess';
import { canManageHrStaff, canViewOrgSensitiveHr, hrHasPermission } from '../../lib/hrAccess';
import { formatNgn, payrollGroupLabel, yearsOfServiceFromIso } from '../../lib/hrFormat';
import { formatPayrollPeriodLabel } from '../../lib/hrPayroll';
import { HrStaffLifecyclePanel } from '../../components/hr/HrStaffLifecyclePanel';
import { HrStaffFeedbackPanel } from '../../components/hr/HrStaffFeedbackPanel';
import { HrStaffSalaryHistoryPanel } from '../../components/hr/HrStaffSalaryHistoryPanel';
import { HrStaffDisciplinePanel } from '../../components/hr/HrStaffDisciplinePanel';
import { HrStaffAppraisalSnapshot } from '../../components/hr/HrStaffAppraisalSnapshot';
import { HrStaffActivityStrip } from '../../components/hr/HrStaffActivityStrip';
import { HrStaffProbationPanel } from '../../components/hr/HrStaffProbationPanel';
import { HrStaffLeaveActionsPanel } from '../../components/hr/HrStaffLeaveActionsPanel';
import { HrStaffTransferQuickStart } from '../../components/hr/HrStaffTransferQuickStart';
import { PageHeader } from '../../components/layout/PageHeader';
import { PageTabs } from '../../components/layout/PageTabs';
import { HR_TALENT, HR_EMPLOYEES, HR_TIME_ABSENCE, HR_DISCIPLINE_EXIT, hrTabPath } from '../../lib/hrRoutes';
import { hrRequestKindLabel } from '../../lib/hrFormat';
import { HrStatusBadge } from '../../components/hr/HrStatusBadge';
import { fetchHrTransferRequests } from '../../lib/hrTransfers';
import { HrSalaryIncrementPanel } from '../../components/hr/HrSalaryIncrementPanel';
import { HrPromotionFromMatrix } from '../../components/hr/HrPromotionFromMatrix';
import { HrSkillsMatrixPanel } from '../../components/hr/HrSkillsMatrixPanel';
import { HrFormModal } from '../../components/hr/HrFormModal';
import { HrIdCardApplyFields } from '../../components/hr/HrIdCardApplyFields';
import { HrStaffDocumentsPanel } from '../../components/hr/HrStaffDocumentsPanel';
import { HrStaffSalesCustomerPanel } from '../../components/hr/HrStaffSalesCustomerPanel';
import { HrProfileCompleteness } from '../../components/hr/HrProfileCompleteness';
import { HrCard, HrButton, HrAddButton, HR_BTN_SECONDARY } from '../../components/hr/hrPageUi';
import { HrContextBreadcrumb } from '../../components/hr/HrContextBreadcrumb';
import { HrStaffFileChecklist } from '../../components/hr/HrStaffFileChecklist';
import { HrStaffReportingBlock } from '../../components/hr/HrStaffReportingBlock';
import { CRITICAL_MISSING_LABELS } from '../../lib/hrStaffDocumentKinds';
import { HR_BTN_PRIMARY } from '../../components/hr/hrFormStyles';
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
import { fetchStaffMoneySummary, obligationStatementPdfUrl } from '../../lib/hrStaffObligations';
import { StaffObligationBalanceCard } from '../../components/hr/StaffObligationBalanceCard';
import { normalizeObligationForPayback } from '../../lib/hrObligationPayUi';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

const PROFILE_GROUPS = [
  { id: 'overview', label: 'Overview', tabs: ['overview'] },
  { id: 'employment', label: 'Employment', tabs: ['employment', 'lifecycle'] },
  { id: 'pay', label: 'Pay & benefits', tabs: ['compensation', 'leave', 'loans'] },
  { id: 'compliance', label: 'Compliance', tabs: ['documents', 'cases'] },
  { id: 'history', label: 'History', tabs: ['transfers', 'notes', 'audit'] },
];

const PROFILE_TAB_LABELS = {
  overview: 'Overview',
  employment: 'Job details',
  lifecycle: 'Lifecycle',
  compensation: 'Compensation',
  leave: 'Leave',
  loans: 'Loans & credit',
  documents: 'Documents',
  cases: 'Cases',
  transfers: 'Transfers',
  notes: 'Notes',
  audit: 'Audit',
};

function groupForTab(tabId) {
  return PROFILE_GROUPS.find((g) => g.tabs.includes(tabId))?.id || 'overview';
}

function GroupedTabBar({ activeTab, onChange }) {
  const activeGroup = groupForTab(activeTab);
  const group = PROFILE_GROUPS.find((g) => g.id === activeGroup) || PROFILE_GROUPS[0];

  return (
    <div className="space-y-2">
      <PageTabs
        tabs={PROFILE_GROUPS.map((g) => ({ id: g.id, label: g.label }))}
        value={activeGroup}
        onChange={(groupId) => {
          const g = PROFILE_GROUPS.find((x) => x.id === groupId);
          if (g?.tabs?.length) onChange(g.tabs[0]);
        }}
      />
      {group.tabs.length > 1 ? (
        <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-px">
          {group.tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange(t)}
              className={`rounded-t-lg px-3 py-2 text-xs font-semibold transition-colors ${
                activeTab === t
                  ? 'border border-b-white border-slate-200 bg-white text-zarewa-teal -mb-px'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              {PROFILE_TAB_LABELS[t] || t}
            </button>
          ))}
        </div>
      ) : null}
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
                <button type="button" className="font-bold text-zarewa-teal hover:underline" onClick={() => onFixTab(w.fixTab)}>
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
            className="rounded-lg border border-zarewa-teal/20 bg-zarewa-teal/5 px-2.5 py-1 text-xs font-semibold text-zarewa-teal hover:bg-zarewa-teal/10"
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
            <Link to={ebp.managePath || '/executive-hr/benefits'} className="font-bold text-zarewa-teal underline">
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

  const { tab, setTab } = useHrUrlTab('overview', PROFILE_GROUPS.flatMap((g) => g.tabs));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [staff, setStaff] = useState(null);
  const [branchHistory, setBranchHistory] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState(null);
  const [staffTransfers, setStaffTransfers] = useState(null);
  const [auditEvents, setAuditEvents] = useState(null);
  const [loanSchedule, setLoanSchedule] = useState([]);
  const [moneySummary, setMoneySummary] = useState(null);
  const [loansLoading, setLoansLoading] = useState(false);
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
  const [overviewExpanded, setOverviewExpanded] = useState(false);
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
    if ((!['leave', 'overview'].includes(tab)) || !userId || !canManageLeave) return;
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
    if (tab !== 'leave' || !userId || !canManageLeave) return;
    let cancelled = false;
    (async () => {
      const { ok, data } = await apiFetch('/api/hr/requests?scope=all');
      if (cancelled) return;
      const rows = ok && data?.ok ? (data.requests || []).filter((r) => r.userId === userId && r.kind === 'leave') : [];
      setLeaveRequests(rows.slice(0, 8));
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, userId, canManageLeave]);

  useEffect(() => {
    if (tab !== 'transfers' || !userId) return;
    let cancelled = false;
    (async () => {
      const { ok, data } = await fetchHrTransferRequests({ userId });
      if (cancelled) return;
      setStaffTransfers(ok && data?.ok ? data.transfers || data.items || [] : []);
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, userId]);

  useEffect(() => {
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

  useEffect(() => {
    if (tab !== 'loans' || !userId) return;
    let cancelled = false;
    (async () => {
      setLoansLoading(true);
      const [schedRes, sumRes] = await Promise.all([
        fetchStaffLoanSchedule(userId),
        fetchStaffMoneySummary(userId),
      ]);
      if (cancelled) return;
      setLoansLoading(false);
      if (schedRes.ok && schedRes.data?.ok) setLoanSchedule(schedRes.data.schedule || []);
      else setLoanSchedule([]);
      if (sumRes.ok && sumRes.data?.ok) setMoneySummary(sumRes.data);
      else setMoneySummary(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, userId]);
  const disciplinary = staff?.profileExtra?.disciplinaryEvents;

  if (loading && !staff) return <InlineLoader message="Loading employee profile…" />;
  if (error) {
    return (
      <div className="space-y-4">
        <Link to={HR_EMPLOYEES} className="inline-flex items-center gap-1 text-sm font-semibold text-zarewa-teal hover:underline">
          <ArrowLeft size={16} aria-hidden /> Back to staff directory
        </Link>
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}{' '}
          <button type="button" className="font-bold underline" onClick={() => { setLoading(true); void reloadProfile().finally(() => setLoading(false)); }}>
            Retry
          </button>
        </div>
      </div>
    );
  }
  if (!staff) return null;

  const personal = staff.profileExtra?.personal || {};
  const empMeta = staff.profileExtra?.employmentMeta || {};
  const fullName = [personal.firstName, personal.middleName, personal.surname].filter(Boolean).join(' ') || staff.displayName;
  const activeTabLabel = PROFILE_TAB_LABELS[tab] || tab;
  const breadcrumbItems = [
    { label: 'HR operations', to: '/hr/dashboard' },
    { label: 'Employees', to: HR_EMPLOYEES },
    { label: staff.displayName || staff.username },
  ];
  if (tab !== 'overview') {
    breadcrumbItems.push({ label: activeTabLabel });
  }

  return (
    <div className="space-y-6">
      <HrContextBreadcrumb items={breadcrumbItems} />
      <PageHeader
        title={staff.displayName || staff.username}
        subtitle={
          <>
            {staff.employeeNo ? `${staff.employeeNo} · ` : ''}
            {staff.jobTitle || 'No job title'} · {staff.branchId || staff.normalized?.branchId || '—'}
            {staff.docExpirySummary?.nextExpiryIso ? (
              <span className="mt-1 block text-red-700">
                Document expiring {staff.docExpirySummary.nextExpiryIso} —{' '}
                <button type="button" className="font-bold underline" onClick={() => setTab('documents')}>
                  review documents
                </button>
              </span>
            ) : null}
          </>
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
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
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-ui-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {formPdfBusy ? 'Preparing…' : 'Staff form PDF'}
                </button>
                <button
                  type="button"
                  onClick={openIdCardModal}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-ui-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
                >
                  Request ID card
                </button>
                <button
                  type="button"
                  onClick={startEdit}
                  className="rounded-xl border border-zarewa-teal/30 bg-zarewa-teal/5 px-3 py-1 text-ui-xs font-bold uppercase tracking-wide text-zarewa-teal hover:bg-zarewa-teal/10"
                >
                  Edit profile
                </button>
              </>
            ) : null}
          </div>
        }
      />
      <HrStaffActivityStrip userId={userId} onOpenTab={setTab} />

      <MissingBanner items={staff.criticalMissing} />
      <ProfileWarningsBanner
        warnings={staff.profileCompleteness?.profileWarnings}
        onFixTab={(fixTab) => {
          if (fixTab === 'compensation') setTab('compensation');
          else if (fixTab === 'documents') setTab('documents');
          else if (fixTab === 'lifecycle') setTab('lifecycle');
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
              <HrButton type="submit" disabled={saving} >
                {saving ? 'Saving…' : 'Save changes'}
              </HrButton>
              <HrButton type="button" onClick={cancelEdit} variant="secondary">
                Cancel
              </HrButton>
            </div>
          </form>
        ) : null}
      </HrFormModal>

      <GroupedTabBar activeTab={tab} onChange={setTab} />

      {tab === 'overview' ? (
        <div className="space-y-4">
          {leaveBalances?.length ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {leaveBalances.slice(0, 3).map((b) => (
                <div key={`${b.leaveType}-${b.periodYyyymm}`} className="rounded-xl border border-slate-100 bg-white px-4 py-3">
                  <p className="z-meta-text font-semibold text-slate-500">{b.leaveType} leave</p>
                  <p className="mt-1 text-2xl font-black tabular-nums text-zarewa-teal">{b.closingDays ?? '—'}</p>
                  <p className="text-xs text-slate-500">days remaining · {formatPayrollPeriodLabel(b.periodYyyymm)}</p>
                </div>
              ))}
            </div>
          ) : null}
          <HrProfileCompleteness
            completeness={staff.profileCompleteness}
            staffBasePath={HR_EMPLOYEES}
            userId={userId}
            onFixSection={(fixTab) => {
              if (fixTab === 'compensation') setTab('compensation');
              else if (fixTab === 'documents') setTab('documents');
              else if (fixTab === 'lifecycle') setTab('lifecycle');
              else setTab('employment');
              if (canManage) startEdit(fixTab === 'compensation' ? 'payroll' : fixTab === 'documents' ? 'personal' : fixTab);
            }}
          />
          <div className="grid gap-4 lg:grid-cols-2">
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
              ]}
            />
            <ProfileSectionCard
              title="Personal data"
              subtitle="Contact and identity"
              onEdit={canManage ? () => startEdit('personal') : undefined}
              rows={[
                { label: 'Full name', value: fullName },
                { label: 'Phone', value: personal.phone || '—' },
                { label: 'Email', value: staff.email || personal.email || '—' },
                { label: 'Address', value: personal.residentialAddress || '—' },
              ]}
            />
          </div>
          {!overviewExpanded ? (
            <button
              type="button"
              onClick={() => setOverviewExpanded(true)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-zarewa-teal hover:bg-slate-50"
            >
              Show all profile details
            </button>
          ) : (
            <>
              <HrStaffReportingBlock
                staff={staff}
                staffBasePath={HR_EMPLOYEES}
                organogramPath={hrTabPath(HR_EMPLOYEES, 'org-chart', { focus: userId })}
              />
              {canManage ? (
                <HrStaffSalesCustomerPanel
                  userId={userId}
                  salesCustomerId={staff.salesCustomerId}
                  displayName={staff.displayName}
                />
              ) : null}
              <HrStaffAppraisalSnapshot userId={userId} compact />
              <div className="grid gap-4 lg:grid-cols-2">
                <ProfileSectionCard
                  title="Personal data (full)"
                  subtitle="Identity and verification"
                  onEdit={canManage ? () => startEdit('personal') : undefined}
                  rows={[
                    { label: 'Gender', value: staff.gender || '—' },
                    { label: 'Date of birth', value: staff.dateOfBirthIso?.slice(0, 10) || '—' },
                    { label: 'NIN', value: staff.ninNumber || '—' },
                    { label: 'BVN', value: staff.bvnNumber || '—' },
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
                  ]}
                />
              </div>
              <button
                type="button"
                onClick={() => setOverviewExpanded(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Show less
              </button>
            </>
          )}
        </div>
      ) : null}

      {tab === 'lifecycle' ? (
        <HrStaffLifecyclePanel
          userId={userId}
          staff={{ displayName: staff.displayName, username: staff.username, employeeNo: staff.employeeNo }}
          onUpdated={reloadProfile}
        />
      ) : null}

      {tab === 'employment' ? (
        <div className="space-y-6">
          <HrStaffProbationPanel staff={staff} canManage={canManage} onUpdated={reloadProfile} />
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
              { label: 'Line manager', value: staff.lineManagerDisplayName || staff.lineManager?.displayName || staff.lineManagerUserId || '—' },
              { label: 'Minimum qualification', value: staff.minimumQualification },
              { label: 'Academic qualification', value: staff.academicQualification },
              { label: 'Training summary', value: staff.trainingSummary },
              { label: 'Welfare notes', value: staff.welfareNotes },
            ]}
          />
          <HrSkillsMatrixPanel userId={userId} canEdit={canManage} />
          <HrStaffAppraisalSnapshot userId={userId} />
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-sm text-slate-700">
            <p>
              Performance appraisals are managed in{' '}
              <Link to={`${HR_TALENT}?tab=develop&section=appraisals`} className="font-bold text-zarewa-teal underline">
                HR Development → Appraisals
              </Link>
              .
            </p>
          </div>
          {canManage ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-2">
              <div>
                <p className="text-ui-xs font-black uppercase tracking-widest text-slate-500">Severance Preview</p>
                <p className="text-ui-xs text-slate-400 mt-0.5">Based on handbook policy</p>
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
          <HrStaffSalaryHistoryPanel
            userId={userId}
            canViewAmounts={showSensitiveInline || sensitive.isUnlocked || !staff.compensationRedacted}
          />
        </div>
      ) : null}

      {tab === 'leave' ? (
        <div className="space-y-4">
          <HrStaffLeaveActionsPanel userId={userId} />
          {!canManageLeave ? (
            <p className="text-sm text-slate-600">Leave balances for other staff require HR leave permissions.</p>
          ) : leaveBalances == null ? (
            <InlineLoader message="Loading leave balances…" />
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
                      <AppTableTd>{formatPayrollPeriodLabel(b.periodYyyymm)}</AppTableTd>
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
          {leaveRequests?.length ? (
            <HrCard className="!p-4">
              <p className="text-ui-xs font-black uppercase tracking-widest text-slate-500">Recent leave requests</p>
              <ul className="mt-2 space-y-2">
                {leaveRequests.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs">
                    <span className="font-semibold text-slate-800">{r.title || hrRequestKindLabel(r.kind)}</span>
                    <HrStatusBadge status={r.status} variant="request" />
                    <Link
                      to={hrTabPath(HR_TIME_ABSENCE, 'approvals', { requestId: r.id })}
                      className="w-full font-bold text-zarewa-teal hover:underline sm:w-auto"
                    >
                      Open in queue →
                    </Link>
                  </li>
                ))}
              </ul>
            </HrCard>
          ) : null}
          <p className="text-xs text-slate-500">
            <Link to={hrTabPath(HR_TIME_ABSENCE, 'approvals', { kind: 'leave' })} className="font-bold text-zarewa-teal hover:underline">
              Open leave approvals →
            </Link>
            {' '}to review or action leave for this employee.
          </p>
        </div>
      ) : null}

      {tab === 'loans' ? (
        <div className="space-y-4 text-sm text-slate-700">
          {canManage ? (
            <HrStaffSalesCustomerPanel
              userId={userId}
              salesCustomerId={staff.salesCustomerId}
              displayName={staff.displayName}
            />
          ) : null}
          {loansLoading ? <p className="text-slate-500">Loading obligation balances…</p> : null}
          {moneySummary?.totalOutstandingNgn > 0 ? (
            <HrCard className="!p-4">
              <p className="text-xs font-bold uppercase text-slate-500">Total outstanding</p>
              {moneySummary.staffBranchId ? (
                <p className="text-ui-xs text-slate-500 mt-1">Home branch: {moneySummary.staffBranchId}</p>
              ) : null}
              <p className="text-2xl font-black tabular-nums text-zarewa-teal">{formatNgn(moneySummary.totalOutstandingNgn)}</p>
            </HrCard>
          ) : null}
          {loanSchedule.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {loanSchedule.map((loan) => (
                <HrCard key={loan.requestId} className="!p-4">
                  <p className="font-bold text-slate-900">{loan.title}</p>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <dt className="text-slate-500">Amount</dt><dd className="font-semibold tabular-nums">{formatNgn(loan.amountNgn)}</dd>
                    <dt className="text-slate-500">Outstanding</dt><dd className="font-semibold text-zarewa-teal">{formatNgn(loan.outstandingNgn)}</dd>
                    <dt className="text-slate-500">Monthly</dt><dd>{formatNgn(loan.monthlyDeductionNgn)}</dd>
                    <dt className="text-slate-500">Status</dt><dd className="capitalize">{loan.status?.replace(/_/g, ' ')}</dd>
                  </dl>
                  {loan.obligationAccountId ? (
                    <a
                      className="mt-2 inline-block text-ui-xs font-semibold text-zarewa-teal underline"
                      href={obligationStatementPdfUrl(loan.obligationAccountId)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Statement PDF
                    </a>
                  ) : null}
                </HrCard>
              ))}
            </div>
          ) : !loansLoading ? (
            <p>No active loan schedule. Staff loan requests appear in HR Requests once submitted.</p>
          ) : null}
          {(moneySummary?.purchases || []).length ? (
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase text-zarewa-teal">Purchase credit</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {moneySummary.purchases.map((p) => {
                  const obligation = normalizeObligationForPayback(p, 'purchase');
                  return obligation ? <StaffObligationBalanceCard key={p.id} obligation={obligation} /> : null;
                })}
              </div>
            </div>
          ) : null}
          {(moneySummary?.recoveries || []).filter((r) => r.principalOutstandingNgn > 0).length ? (
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase text-zarewa-teal">Discipline recovery</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {moneySummary.recoveries
                  .filter((r) => r.principalOutstandingNgn > 0)
                  .map((r) => (
                    <HrCard key={r.id} className="!p-4">
                      <p className="font-bold text-slate-900">{r.title || 'Recovery'}</p>
                      <p className="text-xs text-slate-600 mt-1">Outstanding {formatNgn(r.principalOutstandingNgn)}</p>
                    </HrCard>
                  ))}
              </div>
            </div>
          ) : null}
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

      {tab === 'cases' ? (
        <HrStaffDisciplinePanel userId={userId} profileEvents={disciplinary} />
      ) : null}

      {tab === 'transfers' ? (
        <div className="space-y-3">
          {canManage ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-sm text-slate-700 space-y-2">
              <p>
                Quick branch change: use <strong>Edit profile</strong> and change branch (add a reason).
              </p>
              <HrStaffTransferQuickStart
                userId={userId}
                staff={staff}
                onCreated={async () => {
                  const { ok, data } = await fetchHrTransferRequests({ userId });
                  setStaffTransfers(ok && data?.ok ? data.transfers || data.items || [] : []);
                }}
              />
            </div>
          ) : null}
          {staffTransfers == null ? (
            <InlineLoader message="Loading transfer records…" />
          ) : staffTransfers.filter((t) => !['completed', 'cancelled', 'rejected'].includes(String(t.status || '').toLowerCase())).length ? (
            <HrCard className="!p-4">
              <p className="text-ui-xs font-black uppercase tracking-widest text-slate-500">Active transfer requests</p>
              <ul className="mt-2 space-y-2">
                {staffTransfers
                  .filter((t) => !['completed', 'cancelled', 'rejected'].includes(String(t.status || '').toLowerCase()))
                  .map((t) => (
                    <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs">
                      <span className="font-semibold text-slate-800">
                        {String(t.transferType || 'transfer').replace(/_/g, ' ')}
                        {t.toBranchId ? ` → ${t.toBranchId}` : ''}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-ui-xs font-bold uppercase text-slate-700">
                        {String(t.status || '—').replace(/_/g, ' ')}
                      </span>
                      <Link
                        to={hrTabPath(HR_DISCIPLINE_EXIT, 'exit', { view: 'transfers', transferId: t.id })}
                        className="w-full font-bold text-zarewa-teal hover:underline sm:w-auto"
                      >
                        Open transfer queue →
                      </Link>
                    </li>
                  ))}
              </ul>
            </HrCard>
          ) : null}
        {branchHistory.length === 0 ? (
          <p className="text-sm text-slate-600">No branch transfer history recorded for this employee.</p>
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

      {tab === 'notes' ? <HrStaffFeedbackPanel userId={userId} /> : null}

      {tab === 'audit' ? (
        auditEvents == null ? (
          <InlineLoader message="Loading audit trail…" />
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
            <HrButton type="submit" disabled={idCardBusy} >
              {idCardBusy ? 'Submitting…' : 'Create request'}
            </HrButton>
          </div>
        </form>
      </HrFormModal>

      {Array.isArray(disciplinary) && disciplinary.length > 0 && tab === 'overview' ? (
        <section className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
          <h3 className="text-ui-xs font-black uppercase tracking-widest text-slate-500">Discipline (summary)</h3>
          <p className="mt-1 text-xs text-slate-600">
            {disciplinary.length} event(s) on file.{' '}
            <Link to="/hr/discipline" className="font-semibold text-zarewa-teal hover:underline">
              View discipline register
            </Link>
          </p>
        </section>
      ) : null}
    </div>
  );
}
