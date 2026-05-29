import React from 'react';
import { HrRequestsPanel } from '../../components/hr/HrRequestsPanel';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { fetchExceptionalLoanQueue } from '../../lib/hrExtended';
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
        <AppTable>
          <AppTableThead>
            <AppTableTr>
              <AppTableTh>Staff</AppTableTh>
              <AppTableTh>Title</AppTableTh>
              <AppTableTh>Status</AppTableTh>
              <AppTableTh align="right">Amount</AppTableTh>
            </AppTableTr>
          </AppTableThead>
          <AppTableBody>
            {loans.map((l) => (
              <AppTableTr key={l.id}>
                <AppTableTd>{l.staffDisplayName}</AppTableTd>
                <AppTableTd>{l.title}</AppTableTd>
                <AppTableTd>{l.status}</AppTableTd>
                <AppTableTd align="right">
                  {l.payload?.amountNgn != null ? formatNgn(l.payload.amountNgn) : '—'}
                </AppTableTd>
              </AppTableTr>
            ))}
          </AppTableBody>
        </AppTable>
      </AppTableWrap>
      <HrRequestsPanel allowedScopes={['gm_queue']} defaultScope="gm_queue" kindFilter="loan" />
      {loading ? <p className="text-sm text-slate-500">Loading queue…</p> : null}
    </div>
  );
}
