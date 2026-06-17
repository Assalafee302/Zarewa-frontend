import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrSensitiveAccess } from '../../hooks/useHrSensitiveAccess';
import { canViewOrgSensitiveHr } from '../../lib/hrAccess';
import { formatNgn } from '../../lib/hrFormat';
import { formatPeriodYyyymm } from '../../lib/hrPayroll';
import { HR_SELF_SERVICE_PATH } from '../../lib/hrSelfServiceRoutes';
import { HrPayslipPrintModal } from '../../components/hr/HrPayslipPrintModal';
import { HrSensitiveUnlockBanner } from '../../components/hr/HrSensitiveUnlockBanner';
import { WorkPayFilterBar } from '../../components/profile/workPayFormUi';
import { ProfileFormField } from '../../components/profile/profileFormUi';
import { WorkPayHero } from '../../components/profile/WorkPayHero';
import { ProfilePageBody } from '../../components/profile/profilePageUi';
import {
  ProfileEmptyState,
  ProfileInlineAlert,
  ProfileMetricSkeleton,
  ProfileOverviewSection,
} from '../../components/profile/profileOverviewUi';
import { ProfileKpiCard, ProfileListRow, ProfileStatusChip } from '../../components/profile/profileDesign';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

function maskAmount(unlocked, value, redacted) {
  if (!unlocked || redacted) return '••••••';
  return formatNgn(value);
}

function PayslipRowActions({ payslip, onView }) {
  return (
    <button
      type="button"
      onClick={() => onView(payslip)}
      className="z-btn-secondary min-h-10 w-full !px-3 !py-2 !text-[10px] uppercase tracking-wide sm:w-auto"
    >
      View / PDF
    </button>
  );
}

export default function MyPayslips() {
  const ws = useWorkspace();
  const sensitive = useHrSensitiveAccess();
  const showSensitiveInline = canViewOrgSensitiveHr(ws?.permissions);
  const unlocked = showSensitiveInline || sensitive.isUnlocked;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payslips, setPayslips] = useState([]);
  const [printPayslip, setPrintPayslip] = useState(null);
  const [yearFilter, setYearFilter] = useState('');
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!hasLoadedRef.current) setLoading(true);
      const fetcher = unlocked ? sensitive.fetchWithSensitive : apiFetch;
      const { ok, data } = await fetcher('/api/hr/payslips');
      if (cancelled) return;
      if (!ok || !data?.ok) {
        setError(data?.error || 'Could not load payslips.');
        setPayslips([]);
      } else {
        setPayslips(data.payslips || []);
        setError('');
        hasLoadedRef.current = true;
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [unlocked, sensitive.fetchWithSensitive]);

  const openPayslip = (p) => setPrintPayslip(p);
  const lastPayslip = payslips[0];
  const years = [...new Set(payslips.map((p) => String(p.periodYyyymm || '').slice(0, 4)).filter(Boolean))].sort(
    (a, b) => b.localeCompare(a)
  );
  const filtered = yearFilter
    ? payslips.filter((p) => String(p.periodYyyymm || '').startsWith(yearFilter))
    : payslips;

  return (
    <ProfilePageBody>
      <WorkPayHero
        eyebrow="Work & pay"
        title="Payslips"
        description="View and download payslips after payroll is locked and paid. Unlock with your password to see amounts."
      />

      <ProfileInlineAlert variant="info">
        Your employer also contributes <strong>ITF (1%)</strong> and <strong>NSITF (1%)</strong> on your behalf.
        These are employer costs and do not reduce your take-home pay.
      </ProfileInlineAlert>

      {error ? <ProfileInlineAlert variant="error">{error}</ProfileInlineAlert> : null}

      {!showSensitiveInline ? <HrSensitiveUnlockBanner scope="payslip" /> : null}

      <ProfileOverviewSection title="Payslip history" subtitle="Locked and paid payroll runs">
        {loading && payslips.length === 0 ? <ProfileMetricSkeleton count={2} /> : null}

        {!loading && payslips.length === 0 ? (
          <ProfileEmptyState
            title="No payslips yet"
            description="Payslips appear after HQ locks payroll and finance marks the run paid."
          />
        ) : null}

        {lastPayslip && !loading ? (
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ProfileKpiCard label="Last net pay">
              <p className="text-2xl font-black tabular-nums tracking-tight text-[#134e4a]">
                {maskAmount(unlocked, lastPayslip.netNgn, lastPayslip.amountsRedacted)}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {formatPeriodYyyymm(lastPayslip.periodYyyymm)}
              </p>
            </ProfileKpiCard>
            <ProfileKpiCard label="Periods on file">
              <p className="text-2xl font-black tabular-nums text-slate-900">{payslips.length}</p>
            </ProfileKpiCard>
            {lastPayslip.attendanceDeductionNgn > 0 ? (
              <ProfileKpiCard label="Last attendance deduction">
                <p className="text-lg font-black tabular-nums text-amber-900">
                  {maskAmount(unlocked, lastPayslip.attendanceDeductionNgn, lastPayslip.amountsRedacted)}
                </p>
                {!unlocked || lastPayslip.amountsRedacted ? (
                  <p className="mt-1 text-xs italic text-slate-500">Unlock to view amount</p>
                ) : null}
                <Link to={HR_SELF_SERVICE_PATH.attendance} className="mt-2 text-xs font-semibold text-[#134e4a] hover:underline">
                  View attendance →
                </Link>
              </ProfileKpiCard>
            ) : null}
          </div>
        ) : null}

        {payslips.length > 0 ? (
          <>
            {years.length > 1 ? (
              <WorkPayFilterBar className="mb-4">
                <ProfileFormField label="Filter by year" className="mb-0">
                  <select className="z-input max-w-[10rem]" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
                    <option value="">All years</option>
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </ProfileFormField>
              </WorkPayFilterBar>
            ) : null}

            <div className="space-y-2 md:hidden">
              {filtered.map((p) => (
                <ProfileListRow key={`${p.runId}-${p.periodYyyymm}-m`}>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">{formatPeriodYyyymm(p.periodYyyymm)}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{p.runStatus}</span>
                    {p.attendanceDeductionNgn > 0 ? (
                      <span className="mt-0.5 block text-[10px] text-amber-800">
                        Attendance deduction: {maskAmount(unlocked, p.attendanceDeductionNgn, p.amountsRedacted)}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-2">
                    <span className="text-sm font-black tabular-nums text-[#134e4a]">
                      {maskAmount(unlocked, p.netNgn, p.amountsRedacted)}
                    </span>
                    <PayslipRowActions payslip={p} onView={openPayslip} />
                  </span>
                </ProfileListRow>
              ))}
            </div>

            <div className="hidden md:block">
              <AppTableWrap>
                <AppTable role="numeric">
                  <AppTableThead>
                    <AppTableTh>Period</AppTableTh>
                    <AppTableTh>Status</AppTableTh>
                    <AppTableTh align="right">Gross</AppTableTh>
                    <AppTableTh align="right">Net pay</AppTableTh>
                    <AppTableTh />
                  </AppTableThead>
                  <AppTableBody>
                    {filtered.map((p) => (
                      <AppTableTr key={`${p.runId}-${p.periodYyyymm}`}>
                        <AppTableTd>{formatPeriodYyyymm(p.periodYyyymm)}</AppTableTd>
                        <AppTableTd>
                          <ProfileStatusChip variant={p.runStatus === 'paid' ? 'approved' : 'pending'}>
                            {p.runStatus}
                          </ProfileStatusChip>
                        </AppTableTd>
                        <AppTableTd align="right">{maskAmount(unlocked, p.grossNgn, p.amountsRedacted)}</AppTableTd>
                        <AppTableTd align="right">{maskAmount(unlocked, p.netNgn, p.amountsRedacted)}</AppTableTd>
                        <AppTableTd align="right">
                          <PayslipRowActions payslip={p} onView={openPayslip} />
                        </AppTableTd>
                      </AppTableTr>
                    ))}
                  </AppTableBody>
                </AppTable>
              </AppTableWrap>
            </div>
          </>
        ) : null}

        <HrPayslipPrintModal isOpen={Boolean(printPayslip)} onClose={() => setPrintPayslip(null)} payslip={printPayslip} />
      </ProfileOverviewSection>
    </ProfilePageBody>
  );
}
