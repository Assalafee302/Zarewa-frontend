import React from 'react';
import { HrRequestsPanel } from '../../components/hr/HrRequestsPanel';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { fetchExceptionalLoanQueue } from '../../lib/hrExtended';
import { formatNgn } from '../../lib/hrFormat';
import { HrStatusBadge } from '../../components/hr/HrStatusBadge';
import { HrTableEmptyRow, HrTableLoadingRow } from '../../components/hr/HrTableBodyState';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

export default function ExecutiveHrExceptionalLoans() {
  const [loans, setLoans] = React.useState([]);

  const { loading, error } = useHrListLoad(async () => {
    const { ok, data } = await fetchExceptionalLoanQueue();
    if (!ok || !data?.ok) {
      setLoans([]);
      return { error: data?.error || 'Could not load queue.', hasData: false };
    }
    setLoans(data.loans || []);
    return { hasData: true };
  }, []);

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Staff loans awaiting GM HR final approval or flagged as exceptional (above standard policy limits).
      </p>
      {error ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      <AppTableWrap>
        <AppTable role="numeric">
          <AppTableThead>
            <AppTableTh>Staff</AppTableTh>
            <AppTableTh>Title</AppTableTh>
            <AppTableTh>Status</AppTableTh>
            <AppTableTh>Flags</AppTableTh>
            <AppTableTh align="right">Amount</AppTableTh>
          </AppTableThead>
          <AppTableBody>
            {loading && !loans.length ? (
              <HrTableLoadingRow colSpan={5} message="Loading exceptional loan queue…" />
            ) : null}
            {!loading && !loans.length ? (
              <HrTableEmptyRow colSpan={5} message="No exceptional loans in queue." />
            ) : null}
            {loans.map((l) => (
              <AppTableTr key={l.id}>
                <AppTableTd className="font-semibold">{l.staffDisplayName}</AppTableTd>
                <AppTableTd>{l.title}</AppTableTd>
                <AppTableTd>
                  <HrStatusBadge status={l.status} variant="request" />
                </AppTableTd>
                <AppTableTd className="text-xs text-slate-600">
                  {l.payload?.needsChairmanWaiver ? (
                    <span className="font-semibold text-violet-800">Chairman waiver</span>
                  ) : l.payload?.exceptionalLoan ? (
                    <span className="text-amber-800">Exceptional</span>
                  ) : (
                    '—'
                  )}
                </AppTableTd>
                <AppTableTd align="right">
                  {l.payload?.amountNgn != null ? formatNgn(l.payload.amountNgn) : '—'}
                </AppTableTd>
              </AppTableTr>
            ))}
          </AppTableBody>
        </AppTable>
      </AppTableWrap>
      <HrRequestsPanel allowedScopes={['gm_queue']} defaultScope="gm_queue" kindFilter="loan" />
    </div>
  );
}
