import React from 'react';
import { Link } from 'react-router-dom';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { fetchRecentSalaryChanges } from '../../lib/hrExtended';
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

export default function ExecutiveHrSpecialChanges() {
  const [changes, setChanges] = React.useState([]);

  const { loading, error } = useHrListLoad(async () => {
    const { ok, data } = await fetchRecentSalaryChanges(50);
    if (!ok || !data?.ok) {
      setChanges([]);
      return { error: data?.error || 'Could not load changes.', hasData: false };
    }
    setChanges(data.changes || []);
    return { hasData: true };
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Recent salary increments and compensation changes across the organisation.</p>
      {error ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      <AppTableWrap>
        <AppTable>
          <AppTableThead>
            <AppTableTr>
              <AppTableTh>Effective</AppTableTh>
              <AppTableTh>Staff</AppTableTh>
              <AppTableTh>Reason</AppTableTh>
              <AppTableTh align="right">Base salary</AppTableTh>
            </AppTableTr>
          </AppTableThead>
          <AppTableBody>
            {changes.map((c) => (
              <AppTableTr key={c.id}>
                <AppTableTd>{c.effectiveFromIso}</AppTableTd>
                <AppTableTd>
                  <Link to={`/hr/staff/${c.userId}`} className="font-semibold text-[#134e4a] hover:underline">
                    {c.displayName}
                  </Link>
                </AppTableTd>
                <AppTableTd>{c.reason || '—'}</AppTableTd>
                <AppTableTd align="right">{c.baseSalaryNgn != null ? formatNgn(c.baseSalaryNgn) : '—'}</AppTableTd>
              </AppTableTr>
            ))}
          </AppTableBody>
        </AppTable>
      </AppTableWrap>
      {loading ? <p className="text-sm text-slate-500">Loading…</p> : null}
    </div>
  );
}
