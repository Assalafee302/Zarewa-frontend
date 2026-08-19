import { InlineLoader } from '../../components/ui/PageLoader';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { formatNgn } from '../../lib/hrFormat';
import { hrTabPath, HR_PAYROLL, HR_PAYROLL_TAB_STRUCTURE } from '../../lib/hrRoutes';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../ui/AppDataTable';

export function HrSalaryMatrixRetiredBanner() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-semibold">This salary matrix no longer feeds payroll.</p>
      <p className="mt-1 text-amber-900">
        Payslips use the approved salary on Pay → Salary structure. This table is a historical reference and cannot be
        edited.{' '}
        <Link to={hrTabPath(HR_PAYROLL, HR_PAYROLL_TAB_STRUCTURE)} className="font-bold underline">
          Open salary structure
        </Link>
      </p>
    </div>
  );
}

export function HrSalaryMatrixPanel() {
  const [rows, setRows] = useState([]);

  const { loading, error } = useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/salary-matrix');
    if (!ok || !data?.ok) {
      setRows([]);
      return { error: data?.error || 'Could not load salary matrix.', hasData: false };
    }
    setRows(data.matrix || []);
    return { hasData: true };
  }, []);

  return (
    <div className="space-y-4">
      <HrSalaryMatrixRetiredBanner />
      <p className="text-sm text-slate-600 max-w-2xl">
        Historical HQ level × step amounts by payroll group. Read-only — payroll no longer uses these cells.
      </p>

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      {loading ? <InlineLoader message="Loading matrix…" /> : null}
      {!loading ? (
        <AppTableWrap>
          <AppTable role="numeric">
            <AppTableThead>
              <AppTableTh>Group</AppTableTh>
              <AppTableTh>Level</AppTableTh>
              <AppTableTh>Step</AppTableTh>
              <AppTableTh align="right">Base</AppTableTh>
              <AppTableTh align="right">Housing</AppTableTh>
              <AppTableTh align="right">Transport</AppTableTh>
            </AppTableThead>
            <AppTableBody>
              {rows.length === 0 ? (
                <AppTableTr>
                  <AppTableTd colSpan={6} align="center">
                    <span className="text-slate-500 py-4 block">No matrix rows on file.</span>
                  </AppTableTd>
                </AppTableTr>
              ) : (
                rows.map((r) => (
                  <AppTableTr key={r.id}>
                    <AppTableTd>{r.payrollGroup}</AppTableTd>
                    <AppTableTd>{r.salaryLevel}</AppTableTd>
                    <AppTableTd>{r.salaryStep}</AppTableTd>
                    <AppTableTd align="right">{formatNgn(r.baseSalaryNgn)}</AppTableTd>
                    <AppTableTd align="right">{formatNgn(r.housingAllowanceNgn)}</AppTableTd>
                    <AppTableTd align="right">{formatNgn(r.transportAllowanceNgn)}</AppTableTd>
                  </AppTableTr>
                ))
              )}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      ) : null}
    </div>
  );
}
