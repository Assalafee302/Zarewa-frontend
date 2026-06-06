import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';
import { fetchHrPromotionDue } from '../../lib/hrPhase2';
import { HrCard, HrEmptyState, HrStatusPill } from './hrPageUi';
import { HR_BTN_SECONDARY } from './hrFormStyles';
import {
  AppTable, AppTableBody, AppTableTd, AppTableTh, AppTableThead, AppTableTr, AppTableWrap,
} from '../ui/AppDataTable';

const ELIGIBILITY_LABELS = {
  due: 'Due',
  approaching: 'Approaching',
  not_due: 'Not due',
  blocked_by_discipline: 'Blocked (2nd query)',
  termination_review: 'Termination review',
};

export function HrPromotionDuePanel() {
  const [rows, setRows] = useState([]);
  const [dueOnly, setDueOnly] = useState(false);

  const { loading, error } = useHrListLoad(async () => {
    const { ok, data } = await fetchHrPromotionDue(dueOnly);
    if (!ok || !data?.ok) {
      setRows([]);
      return { error: data?.error || 'Could not load promotion due report.', hasData: false };
    }
    setRows(data.rows || []);
    return { hasData: true };
  }, [dueOnly]);

  return (
    <HrCard
      title="Promotion due report"
      subtitle="Regular promotion eligibility — 3 years since join or last increment"
      actions={
        <div className="flex gap-2">
          <label className="flex items-center gap-1 text-xs text-slate-600">
            <input type="checkbox" checked={dueOnly} onChange={(e) => setDueOnly(e.target.checked)} />
            Due only
          </label>
          <a href="/api/hr/reports/export/promotion-due" className={HR_BTN_SECONDARY}>Export CSV</a>
        </div>
      }
    >
      {error ? <div className="mb-3 text-sm text-red-800">{error}</div> : null}
      {loading && !rows.length ? <p className="text-sm text-slate-600">Loading…</p> : rows.length === 0 ? (
        <HrEmptyState title="No staff match this filter." />
      ) : (
        <AppTableWrap>
          <AppTable>
            <AppTableThead>
              <AppTableTr>
                <AppTableTh>Staff</AppTableTh>
                <AppTableTh>Branch</AppTableTh>
                <AppTableTh>Role</AppTableTh>
                <AppTableTh>Last promotion</AppTableTh>
                <AppTableTh>Years</AppTableTh>
                <AppTableTh>Queries</AppTableTh>
                <AppTableTh>Eligibility</AppTableTh>
                <AppTableTh>Action</AppTableTh>
              </AppTableTr>
            </AppTableThead>
            <AppTableBody>
              {rows.map((r) => (
                <AppTableTr key={r.userId}>
                  <AppTableTd>
                    <Link to={`${HR_EMPLOYEES}/${encodeURIComponent(r.userId)}`} className="font-semibold text-[#134e4a] hover:underline">
                      {r.displayName}
                    </Link>
                  </AppTableTd>
                  <AppTableTd>{r.branchId || '—'}</AppTableTd>
                  <AppTableTd>{r.jobTitle || '—'}</AppTableTd>
                  <AppTableTd>{r.lastPromotionIso || '—'}</AppTableTd>
                  <AppTableTd>{r.yearsSince}</AppTableTd>
                  <AppTableTd>{r.queryCount}</AppTableTd>
                  <AppTableTd>
                    <HrStatusPill status={r.eligibility} label={ELIGIBILITY_LABELS[r.eligibility] || r.eligibility} />
                  </AppTableTd>
                  <AppTableTd>
                    {r.eligibility === 'due' && !r.promotionBlocked ? (
                      <Link to={`${HR_EMPLOYEES}/${encodeURIComponent(r.userId)}?increment=1`} className="text-[10px] font-bold uppercase text-[#134e4a] hover:underline">
                        Apply increment
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-500">{r.suggestedAction}</span>
                    )}
                  </AppTableTd>
                </AppTableTr>
              ))}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      )}
    </HrCard>
  );
}
