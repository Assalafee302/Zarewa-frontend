import React, { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrPayslipPrintModal } from '../../components/hr/HrPayslipPrintModal';
import { HrSensitiveGate } from '../../components/hr/HrSensitiveGate';
import { useHrSensitiveAccess } from '../../hooks/useHrSensitiveAccess';
import { canViewOrgSensitiveHr } from '../../lib/hrAccess';
import { formatNgn } from '../../lib/hrFormat';
import { formatPeriodYyyymm } from '../../lib/hrPayroll';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

export default function MyPayslips() {
  const ws = useWorkspace();
  const sensitive = useHrSensitiveAccess();
  const showSensitiveInline = canViewOrgSensitiveHr(ws?.permissions);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payslips, setPayslips] = useState([]);
  const [previewSlip, setPreviewSlip] = useState(null);
  const hasLoadedRef = useRef(false);
  const myUserId = ws?.session?.userId || ws?.user?.id || '';

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

  const body = (
    <>
      {loading && payslips.length === 0 ? <p className="text-sm text-slate-600">Loading payslips…</p> : null}
      {!loading && payslips.length === 0 ? (
        <p className="text-sm text-slate-600">No locked or paid payslips on file yet.</p>
      ) : null}
      {payslips.length > 0 ? (
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
                  <AppTableTd>
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewSlip({
                          ...p,
                          userId: p.userId || myUserId,
                          displayName: p.displayName || ws?.session?.displayName,
                        })
                      }
                      className="text-[10px] font-bold uppercase text-[#134e4a]"
                    >
                      Preview
                    </button>
                  </AppTableTd>
                </AppTableTr>
              ))}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      ) : null}
    </>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Payslips appear after HQ locks payroll and finance marks the run paid. Unlock to view amounts.
      </p>
      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
      {showSensitiveInline ? body : <HrSensitiveGate label="View your payslip amounts">{body}</HrSensitiveGate>}
      <HrPayslipPrintModal
        isOpen={!!previewSlip}
        onClose={() => setPreviewSlip(null)}
        payslip={previewSlip}
      />
    </div>
  );
}
