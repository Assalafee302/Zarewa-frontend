import React from 'react';
import { Link } from 'react-router-dom';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { fetchSalaryVarianceReport } from '../../lib/hrCompensation';
import { formatNgn } from '../../lib/hrFormat';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';
import { HrCard } from './hrPageUi';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../ui/AppDataTable';

function exportVarianceCsv(rows) {
  const header = [
    'Staff',
    'Job title',
    'Level',
    'Matrix base',
    'Matrix housing',
    'Matrix transport',
    'Matrix total',
    'Addition',
    'Actual',
    'Variance',
    'Documented',
  ];
  const lines = rows.map((r) =>
    [
      r.displayName,
      r.jobTitle,
      `L${r.salaryLevel}/S${r.salaryStep}`,
      r.matrixBaseNgn,
      r.matrixHousingNgn,
      r.matrixTransportNgn,
      r.matrixTotalNgn,
      r.payAdditionNgn || 0,
      r.actualTotalNgn,
      r.varianceNgn,
      r.varianceType || 'undocumented',
    ]
      .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
      .join(',')
  );
  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `salary-variance-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Staff paid above salary matrix — HR Settings / payroll review. */
export function HrSalaryVarianceReportSection({ embedded = false }) {
  const { loading, data } = useHrListLoad(async () => {
    const { ok, data: payload } = await fetchSalaryVarianceReport();
    if (!ok || !payload?.ok) return { error: payload?.error || 'Could not load report.', hasData: false };
    return { hasData: true, rows: payload.rows || [] };
  }, []);

  const rows = data?.rows || [];

  return (
    <HrCard>
      {!embedded ? (
        <h2 className="text-sm font-black text-slate-800 mb-1">Salary matrix variance</h2>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-xs text-slate-500">
          Staff whose total pay exceeds the standard matrix. Documented exceptions show variance type and pay addition.
        </p>
        {rows.length > 0 ? (
          <button
            type="button"
            className="text-xs font-bold text-zarewa-teal hover:underline"
            onClick={() => exportVarianceCsv(rows)}
          >
            Export CSV
          </button>
        ) : null}
      </div>
      {loading ? <p className="text-sm text-slate-500">Loading…</p> : null}
      {!loading && rows.length === 0 ? (
        <p className="text-sm text-slate-500">No above-matrix staff in scope.</p>
      ) : null}
      {!loading && rows.length > 0 ? (
        <AppTableWrap>
          <AppTable>
            <AppTableThead>
              <AppTableTh>Staff</AppTableTh>
              <AppTableTh>Level</AppTableTh>
              <AppTableTh align="right">Matrix (B/H/T)</AppTableTh>
              <AppTableTh align="right">Matrix total</AppTableTh>
              <AppTableTh align="right">Addition</AppTableTh>
              <AppTableTh align="right">Actual</AppTableTh>
              <AppTableTh align="right">Variance</AppTableTh>
              <AppTableTh>Documented</AppTableTh>
            </AppTableThead>
            <AppTableBody>
              {rows.map((r) => (
                <AppTableTr key={r.userId}>
                  <AppTableTd>
                    <div className="font-semibold text-slate-800">{r.displayName}</div>
                    <div className="text-ui-xs text-slate-500">{r.jobTitle}</div>
                    {r.userId ? (
                      <Link
                        to={`${HR_EMPLOYEES}/${encodeURIComponent(r.userId)}?tab=compensation`}
                        className="text-ui-xs font-bold text-zarewa-teal hover:underline"
                      >
                        Open profile →
                      </Link>
                    ) : null}
                  </AppTableTd>
                  <AppTableTd>
                    L{r.salaryLevel}/S{r.salaryStep}
                  </AppTableTd>
                  <AppTableTd align="right" className="text-ui-xs text-slate-600">
                    {formatNgn(r.matrixBaseNgn)} / {formatNgn(r.matrixHousingNgn)} / {formatNgn(r.matrixTransportNgn)}
                  </AppTableTd>
                  <AppTableTd align="right">{formatNgn(r.matrixTotalNgn)}</AppTableTd>
                  <AppTableTd align="right">{formatNgn(r.payAdditionNgn || 0)}</AppTableTd>
                  <AppTableTd align="right">{formatNgn(r.actualTotalNgn)}</AppTableTd>
                  <AppTableTd align="right" className="font-semibold text-amber-900">
                    +{formatNgn(r.varianceNgn)}
                  </AppTableTd>
                  <AppTableTd>
                    {r.varianceType ? (
                      <span className="text-xs font-semibold text-emerald-800">{r.varianceType}</span>
                    ) : (
                      <span className="text-xs font-semibold text-rose-700">Undocumented</span>
                    )}
                  </AppTableTd>
                </AppTableTr>
              ))}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      ) : null}
    </HrCard>
  );
}
