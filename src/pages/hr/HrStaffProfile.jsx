import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrDetailGrid } from '../../components/hr/HrDetailGrid';
import { HrSensitiveGate } from '../../components/hr/HrSensitiveGate';
import { useHrSensitiveAccess } from '../../hooks/useHrSensitiveAccess';
import { canViewOrgSensitiveHr, hrHasPermission } from '../../lib/hrAccess';
import { formatNgn, payrollGroupLabel, yearsOfServiceFromIso } from '../../lib/hrFormat';
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
        <p className="mt-0.5 text-xs text-amber-900/90">Missing: {items.join(', ')}</p>
      </div>
    </div>
  );
}

function CompensationTab({ staff, showSensitiveInline }) {
  const body = (
    <HrDetailGrid
      rows={[
        { label: 'Payroll group', value: payrollGroupLabel(staff) },
        {
          label: 'Salary level / step',
          value:
            staff?.profileExtra?.salaryLevel != null
              ? `Level ${staff.profileExtra.salaryLevel}${staff.profileExtra.salaryStep != null ? ` · Step ${staff.profileExtra.salaryStep}` : ''}`
              : staff?.promotionGrade || staff?.normalized?.taxonomy?.gradeBand || '— (matrix in Phase 5)',
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
        { label: 'PAYE %', value: staff?.compensationRedacted ? 'Hidden' : staff?.payeTaxPercent ?? '—' },
        { label: 'Pension override %', value: staff?.compensationRedacted ? 'Hidden' : staff?.pensionPercentOverride ?? '—' },
        { label: 'Tax ID', value: staff?.compensationRedacted ? 'Hidden' : staff?.taxId || '—' },
        { label: 'RSA PIN', value: staff?.compensationRedacted ? 'Hidden' : staff?.pensionRsaPin || '—' },
        {
          label: 'Bank',
          value: staff?.compensationRedacted
            ? 'Hidden'
            : [staff?.bankName, staff?.bankAccountName, staff?.bankAccountNoMasked].filter(Boolean).join(' · ') || '—',
        },
        { label: 'Bonus accrual note', value: staff?.compensationRedacted ? 'Hidden' : staff?.bonusAccrualNote || '—' },
      ]}
    />
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
  const canManageLeave = hrHasPermission(perms, 'hr.leave.manage') || hrHasPermission(perms, 'hr.staff.manage');

  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [staff, setStaff] = useState(null);
  const [branchHistory, setBranchHistory] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState(null);
  const [auditEvents, setAuditEvents] = useState(null);

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
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, sensitive.isUnlocked, showSensitiveInline, sensitive.fetchWithSensitive]);

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
  const docs = staff?.profileExtra?.documents;
  const loanNotes = staff?.profileExtra?.activeLoansSummary;
  const disciplinary = staff?.profileExtra?.disciplinaryEvents;

  if (loading && !staff) return <p className="text-sm text-slate-600">Loading employee profile…</p>;
  if (error) {
    return (
      <div className="space-y-4">
        <Link to="/hr/staff" className="inline-flex items-center gap-1 text-sm font-semibold text-[#134e4a] hover:underline">
          <ArrowLeft size={16} aria-hidden /> Back to staff directory
        </Link>
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      </div>
    );
  }
  if (!staff) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to="/hr/staff" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-[#134e4a] hover:underline">
            <ArrowLeft size={14} aria-hidden /> Staff directory
          </Link>
          <h2 className="mt-2 text-xl font-black text-slate-900">{staff.displayName || staff.username}</h2>
          <p className="text-sm text-slate-600">
            {staff.employeeNo ? `${staff.employeeNo} · ` : ''}
            {staff.jobTitle || 'No job title'} · {staff.branchId || staff.normalized?.branchId || '—'}
          </p>
        </div>
        <span
          className={`self-start inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase ${
            staff.status === 'active'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-slate-200 bg-slate-100 text-slate-600'
          }`}
        >
          {staff.status || 'unknown'}
        </span>
      </div>

      <MissingBanner items={staff.criticalMissing} />
      <TabBar active={tab} onChange={setTab} />

      {tab === 'overview' ? (
        <HrDetailGrid
          rows={[
            { label: 'Username', value: staff.username },
            { label: 'Email', value: staff.email },
            { label: 'System role', value: staff.roleKey },
            { label: 'Payroll group', value: payrollGroupLabel(staff) },
            { label: 'Data quality score', value: staff.dataQualityScore != null ? `${staff.dataQualityScore}%` : '—' },
            { label: 'Years of service', value: yrs != null ? `${yrs} years` : '—' },
            { label: 'Self-service eligible', value: staff.selfServiceEligible ? 'Yes' : 'No' },
            {
              label: 'Handbook acknowledged',
              value: staff.complianceBadges?.handbookAcknowledged ? 'Yes' : 'Pending',
            },
          ]}
        />
      ) : null}

      {tab === 'employment' ? (
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
      ) : null}

      {tab === 'compensation' ? (
        <CompensationTab staff={staff} showSensitiveInline={showSensitiveInline} />
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
        <div className="text-sm text-slate-700">
          {loanNotes ? (
            <pre className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs overflow-auto">{JSON.stringify(loanNotes, null, 2)}</pre>
          ) : (
            <p>No loan summary on file. Staff loan requests appear in HR Requests once submitted.</p>
          )}
        </div>
      ) : null}

      {tab === 'documents' ? (
        <div className="text-sm text-slate-700">
          {Array.isArray(docs) && docs.length > 0 ? (
            <ul className="space-y-2">
              {docs.map((d, i) => (
                <li key={d.id || i} className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                  <span className="font-semibold">{d.label || d.kind || 'Document'}</span>
                  {d.uploadedAtIso ? <span className="ml-2 text-xs text-slate-500">{d.uploadedAtIso}</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p>No documents uploaded on this profile yet.</p>
          )}
        </div>
      ) : null}

      {tab === 'transfers' ? (
        branchHistory.length === 0 ? (
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
        )
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

      {Array.isArray(disciplinary) && disciplinary.length > 0 && tab === 'overview' ? (
        <section className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Discipline (summary)</h3>
          <p className="mt-1 text-xs text-slate-600">{disciplinary.length} event(s) on file. Full discipline module in Phase 7.</p>
        </section>
      ) : null}
    </div>
  );
}
