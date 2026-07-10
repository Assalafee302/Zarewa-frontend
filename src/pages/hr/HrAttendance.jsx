import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { canManageHrDeductions } from '../../lib/hrAccess';
import { HrPayrollPeriodFields } from '../../components/hr/HrPayrollPeriodFields';
import { currentPeriodYyyymm } from '../../lib/hrRequests';
import { formatNgn } from '../../lib/hrFormat';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';
import { HrDualView } from '../../components/hr/HrDualView';
import { HrMobileCard, HrMobileCardList } from '../../components/hr/HrMobileCard';
import { HrTableEmptyRow, HrTableLoadingRow } from '../../components/hr/HrTableBodyState';

/**
 * @param {{ embedded?: boolean; activeTab?: 'deductions'; hideInternalTabs?: boolean; showExceptionsOnly?: boolean }} [props]
 */
export default function HrAttendance({
  embedded = false,
  activeTab: activeTabProp,
  hideInternalTabs = false,
  showExceptionsOnly = false,
} = {}) {
  const ws = useWorkspace();
  const showDeductions = canManageHrDeductions(ws?.permissions);
  const [tab, setTab] = useState(activeTabProp || 'deductions');
  const effectiveTab = activeTabProp || tab;
  const [periodYyyymm, setPeriodYyyymm] = useState(currentPeriodYyyymm());
  const [preview, setPreview] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [noShowAlerts, setNoShowAlerts] = useState([]);
  const [noShowExpanded, setNoShowExpanded] = useState(false);

  useEffect(() => {
    if (!showDeductions) return;
    let cancelled = false;
    (async () => {
      try {
        const branchId = ws?.session?.branchId || '';
        const { ok, data } = await apiFetch(
          `/api/hr/attendance/no-show-alerts${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''}`
        );
        if (!cancelled && ok && data?.ok) setNoShowAlerts(data.alerts || []);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showDeductions, ws?.session?.branchId]);

  useEffect(() => {
    if (activeTabProp) setTab(activeTabProp);
  }, [activeTabProp]);

  useEffect(() => {
    if (effectiveTab !== 'deductions' || !showDeductions) return;
    let cancelled = false;
    (async () => {
      setLoadingPreview(true);
      const { ok, data } = await apiFetch(
        `/api/hr/attendance/deduction-preview?periodYyyymm=${encodeURIComponent(periodYyyymm)}`
      );
      if (cancelled) return;
      setPreview(ok && data?.ok ? data.items || [] : []);
      setLoadingPreview(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveTab, periodYyyymm, showDeductions]);

  if (showExceptionsOnly) {
    return (
      <div className="space-y-4">
        {noShowAlerts.length > 0 ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <p>
              <strong>{noShowAlerts.length}</strong> staff with 3+ consecutive absent days (voluntary termination policy).
            </p>
            <ul className="mt-2 space-y-1 text-xs">
              {noShowAlerts.map((a) => (
                <li key={a.userId}>
                  {a.displayName || a.userId} — {a.consecutiveAbsentDays} day{a.consecutiveAbsentDays === 1 ? '' : 's'}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-slate-600">No consecutive no-show alerts in scope.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {noShowAlerts.length > 0 && !embedded ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <div className="flex items-start justify-between gap-2">
            <span>
              🚨 <strong>{noShowAlerts.length}</strong> staff member{noShowAlerts.length === 1 ? '' : 's'} ha{noShowAlerts.length === 1 ? 's' : 've'} been absent for 3+ consecutive days. Per company policy this may constitute voluntary termination.
            </span>
            <button
              type="button"
              onClick={() => setNoShowExpanded((v) => !v)}
              className="shrink-0 rounded-lg border border-red-300 px-2 py-1 text-xs font-bold uppercase text-red-800 hover:bg-red-100"
            >
              {noShowExpanded ? 'Hide' : 'View Details'}
            </button>
          </div>
          {noShowExpanded ? (
            <ul className="mt-3 space-y-1">
              {noShowAlerts.map((a) => (
                <li key={a.userId} className="flex items-center gap-2 text-xs">
                  <span className="font-semibold">{a.displayName || a.userId}</span>
                  <span className="text-red-700">— {a.consecutiveAbsentDays} consecutive absent day{a.consecutiveAbsentDays === 1 ? '' : 's'}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {!hideInternalTabs && showDeductions ? (
        <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-px">
          <button
            type="button"
            className="rounded-t-lg px-3 py-2 text-xs font-bold uppercase border border-b-white bg-white text-zarewa-teal"
          >
            Deduction review
          </button>
        </div>
      ) : null}

      {effectiveTab === 'deductions' ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Preview projected attendance deductions for the payroll month. HR reviews before lock; staff may raise
            attendance exception requests.
          </p>
          <HrPayrollPeriodFields value={periodYyyymm} onChange={setPeriodYyyymm} labelMonth="Payroll month" />
          <HrDualView
            mobile={
              <HrMobileCardList
                loading={loadingPreview}
                loadingMessage="Loading preview…"
                emptyMessage="No deduction flags for this period."
              >
                {preview.map((row) => (
                  <HrMobileCard
                    key={row.userId}
                    title={row.displayName || row.userId}
                    fields={[
                      { label: 'Absent days', value: row.absentDays },
                      { label: 'Late days', value: row.lateDays },
                      { label: 'Deduction', value: formatNgn(row.deductionNgn) },
                      { label: 'Exceptions', value: row.pendingExceptionRequests || 0 },
                    ]}
                  />
                ))}
              </HrMobileCardList>
            }
            desktop={
              <AppTableWrap>
                <AppTable role="numeric">
                  <AppTableThead>
                    <AppTableTh>Staff</AppTableTh>
                    <AppTableTh align="right">Absent days</AppTableTh>
                    <AppTableTh align="right">Late days</AppTableTh>
                    <AppTableTh align="right">Projected deduction</AppTableTh>
                    <AppTableTh>Pending exceptions</AppTableTh>
                  </AppTableThead>
                  <AppTableBody>
                    {loadingPreview ? (
                      <HrTableLoadingRow colSpan={5} message="Loading preview…" />
                    ) : null}
                    {!loadingPreview && preview.length === 0 ? (
                      <HrTableEmptyRow colSpan={5} message="No deduction flags for this period." />
                    ) : null}
                    {!loadingPreview
                      ? preview.map((row) => (
                          <AppTableTr key={row.userId}>
                            <AppTableTd>{row.displayName || row.userId}</AppTableTd>
                            <AppTableTd align="right">{row.absentDays}</AppTableTd>
                            <AppTableTd align="right">{row.lateDays}</AppTableTd>
                            <AppTableTd align="right">{formatNgn(row.deductionNgn)}</AppTableTd>
                            <AppTableTd>{row.pendingExceptionRequests || 0}</AppTableTd>
                          </AppTableTr>
                        ))
                      : null}
                  </AppTableBody>
                </AppTable>
              </AppTableWrap>
            }
          />
        </div>
      ) : null}
    </div>
  );
}
