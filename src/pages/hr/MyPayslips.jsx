import React, { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrSensitiveGate } from '../../components/hr/HrSensitiveGate';
import { useHrSensitiveAccess } from '../../hooks/useHrSensitiveAccess';
import { canViewOrgSensitiveHr } from '../../lib/hrAccess';
import { formatNgn } from '../../lib/hrFormat';
import { formatPeriodYyyymm } from '../../lib/hrPayroll';
import { HrPayslipPrintModal } from '../../components/hr/HrPayslipPrintModal';
import { ProfilePageBody, ProfilePageIntro } from '../../components/profile/profilePageUi';
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

function PayslipRowActions({ payslip, onView }) {
  return (
    <button
      type="button"
      onClick={() => onView(payslip)}
      className="z-btn-secondary !px-3 !py-1.5 !text-[10px] uppercase tracking-wide"
    >
      View / PDF
    </button>
  );
}

export default function MyPayslips() {
  const ws = useWorkspace();
  const sensitive = useHrSensitiveAccess();
  const showSensitiveInline = canViewOrgSensitiveHr(ws?.permissions);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payslips, setPayslips] = useState([]);
  const [printPayslip, setPrintPayslip] = useState(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!hasLoadedRef.current) setLoading(true);
      const fetcher = showSensitiveInline || sensitive.isUnlocked ? sensitive.fetchWithSensitive : apiFetch;
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
  }, [sensitive.isUnlocked, showSensitiveInline, sensitive.fetchWithSensitive]);

  const openPayslip = (p) => setPrintPayslip(p);
  const lastPayslip = payslips[0];

  const payslipList = (
    <>
      {loading && payslips.length === 0 ? <ProfileMetricSkeleton count={2} /> : null}
      {!loading && payslips.length === 0 ? (
        <ProfileEmptyState
          title="No payslips yet"
          description="Payslips appear after HQ locks payroll and finance marks the run paid. Check back after the next payroll cycle."
        />
      ) : null}
      {lastPayslip && !loading ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ProfileKpiCard label="Last net pay">
            <p className="text-2xl font-black tabular-nums tracking-tight text-[#134e4a]">
              {lastPayslip.amountsRedacted ? 'Unlock to view' : formatNgn(lastPayslip.netNgn)}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
              {formatPeriodYyyymm(lastPayslip.periodYyyymm)}
            </p>
          </ProfileKpiCard>
          <ProfileKpiCard label="Periods on file">
            <p className="text-2xl font-black tabular-nums text-slate-900">{payslips.length}</p>
          </ProfileKpiCard>
        </div>
      ) : null}
      {payslips.length > 0 ? (
        <>
          <div className="space-y-2 md:hidden">
            {payslips.map((p) => (
              <ProfileListRow key={`${p.runId}-${p.periodYyyymm}-m`}>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">{formatPeriodYyyymm(p.periodYyyymm)}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{p.runStatus}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-2">
                  <span className="text-sm font-black tabular-nums text-[#134e4a]">
                    {p.amountsRedacted ? '—' : formatNgn(p.netNgn)}
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
                  {payslips.map((p) => (
                    <AppTableTr key={`${p.runId}-${p.periodYyyymm}`}>
                      <AppTableTd>{formatPeriodYyyymm(p.periodYyyymm)}</AppTableTd>
                      <AppTableTd>
                        <ProfileStatusChip variant={p.runStatus === 'paid' ? 'approved' : 'pending'}>
                          {p.runStatus}
                        </ProfileStatusChip>
                      </AppTableTd>
                      <AppTableTd align="right">
                        {p.amountsRedacted ? '—' : formatNgn(p.grossNgn)}
                      </AppTableTd>
                      <AppTableTd align="right">{p.amountsRedacted ? '—' : formatNgn(p.netNgn)}</AppTableTd>
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
      <HrPayslipPrintModal
        isOpen={Boolean(printPayslip)}
        onClose={() => setPrintPayslip(null)}
        payslip={printPayslip}
      />
    </>
  );

  return (
    <ProfilePageBody>
      <ProfilePageIntro
        title="Payslips"
        description="View and download payslips after payroll is locked and paid. Tap a row to open the PDF view."
      />

      <ProfileInlineAlert variant="info">
        Your employer also contributes <strong>ITF (1%)</strong> and <strong>NSITF (1%)</strong> on your behalf.
        These are employer costs and do not reduce your take-home pay.
      </ProfileInlineAlert>

      {error ? <ProfileInlineAlert variant="error">{error}</ProfileInlineAlert> : null}

      <ProfileOverviewSection title="Payslip history" subtitle="Locked and paid payroll runs">
        {showSensitiveInline ? (
          payslipList
        ) : (
          <HrSensitiveGate scope="payslip" label="View your payslip amounts">
            {payslipList}
          </HrSensitiveGate>
        )}
      </ProfileOverviewSection>
    </ProfilePageBody>
  );
}
