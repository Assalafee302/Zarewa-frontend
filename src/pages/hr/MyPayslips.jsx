import React, { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrSensitiveGate } from '../../components/hr/HrSensitiveGate';
import { useHrSensitiveAccess } from '../../hooks/useHrSensitiveAccess';
import { canViewOrgSensitiveHr } from '../../lib/hrAccess';
import { formatNgn } from '../../lib/hrFormat';
import { formatPeriodYyyymm } from '../../lib/hrPayroll';
import { HrPayslipPrintModal } from '../../components/hr/HrPayslipPrintModal';
import { HrPageBody, HrPageIntro } from '../../components/hr/hrPageUi';
import {
  ProfileEmptyState,
  ProfileInlineAlert,
  ProfileMetricSkeleton,
  ProfileOverviewSection,
} from '../../components/profile/profileOverviewUi';
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
      className="min-h-10 rounded-lg border border-[#134e4a]/30 px-3 py-1.5 text-[10px] font-bold uppercase text-[#134e4a] hover:bg-teal-50"
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

  const payslipList = (
    <>
      {loading && payslips.length === 0 ? <ProfileMetricSkeleton count={2} /> : null}
      {!loading && payslips.length === 0 ? (
        <ProfileEmptyState
          title="No payslips yet"
          description="Payslips appear after HQ locks payroll and finance marks the run paid. Check back after the next payroll cycle."
        />
      ) : null}
      {payslips.length > 0 ? (
        <>
          <div className="space-y-3 md:hidden">
            {payslips.map((p) => (
              <article
                key={`${p.runId}-${p.periodYyyymm}-m`}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{formatPeriodYyyymm(p.periodYyyymm)}</p>
                    <p className="text-[11px] text-slate-500">{p.runStatus}</p>
                  </div>
                  <p className="text-sm font-black tabular-nums text-[#134e4a]">
                    {p.amountsRedacted ? '—' : formatNgn(p.netNgn)}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-600">
                  <span>Gross: {p.amountsRedacted ? '—' : formatNgn(p.grossNgn)}</span>
                  <PayslipRowActions payslip={p} onView={openPayslip} />
                </div>
              </article>
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
                      <AppTableTd>{p.runStatus}</AppTableTd>
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
    <HrPageBody>
      <HrPageIntro
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
    </HrPageBody>
  );
}
