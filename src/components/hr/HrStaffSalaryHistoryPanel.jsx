import { InlineLoader } from '../../components/ui/PageLoader';
import React, { useEffect, useState } from 'react';
import { formatNgn } from '../../lib/hrFormat';
import { fetchStaffSalaryHistory } from '../../lib/hrStaffExtras';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../ui/AppDataTable';
import { HrCard } from './hrPageUi';

export function HrStaffSalaryHistoryPanel({ userId, canViewAmounts = false }) {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      const { ok, data } = await fetchStaffSalaryHistory(userId);
      if (cancelled) return;
      setLoading(false);
      if (!ok || !data?.ok) {
        setHistory([]);
        setError(data?.error || 'Could not load salary history.');
        return;
      }
      setHistory(data.history || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) return <InlineLoader message="Loading salary history…" />;
  if (error) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
    );
  }
  if (!history?.length) {
    return (
      <HrCard title="Salary history" subtitle="Recorded increments and compensation changes">
        <p className="text-sm text-slate-600">No salary changes recorded yet.</p>
      </HrCard>
    );
  }

  return (
    <HrCard title="Salary history" subtitle="Recorded increments and compensation changes">
      <AppTableWrap>
        <AppTable role="numeric">
          <AppTableThead>
            <AppTableTh>Effective</AppTableTh>
            <AppTableTh>Level / step</AppTableTh>
            <AppTableTh align="right">Base salary</AppTableTh>
            <AppTableTh align="right">Housing</AppTableTh>
            <AppTableTh align="right">Transport</AppTableTh>
            <AppTableTh>Reason</AppTableTh>
          </AppTableThead>
          <AppTableBody>
            {history.map((h) => (
              <AppTableTr key={h.id}>
                <AppTableTd>{h.effectiveFromIso?.slice(0, 10) || h.createdAtIso?.slice(0, 10) || '—'}</AppTableTd>
                <AppTableTd>
                  {h.salaryLevel != null ? `L${h.salaryLevel}${h.salaryStep != null ? ` · S${h.salaryStep}` : ''}` : '—'}
                </AppTableTd>
                <AppTableTd align="right">
                  {canViewAmounts && !h.amountsRedacted ? formatNgn(h.baseSalaryNgn) : '—'}
                </AppTableTd>
                <AppTableTd align="right">
                  {canViewAmounts && !h.amountsRedacted ? formatNgn(h.housingAllowanceNgn) : '—'}
                </AppTableTd>
                <AppTableTd align="right">
                  {canViewAmounts && !h.amountsRedacted ? formatNgn(h.transportAllowanceNgn) : '—'}
                </AppTableTd>
                <AppTableTd title={h.reason}>{h.reason || '—'}</AppTableTd>
              </AppTableTr>
            ))}
          </AppTableBody>
        </AppTable>
      </AppTableWrap>
    </HrCard>
  );
}
