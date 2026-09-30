import React from 'react';
import { formatPayrollPeriodLabel } from '../../lib/hrPayroll';
import { DecisionBand, DecisionFact, DecisionWhatNext } from '../management/DecisionSurface';

/**
 * Command Centre payroll MD sign-off body — headcount, net, and what sign-off does.
 */
export function PayrollMdApprovalPreview({
  payrollRunId,
  row = null,
  totals = null,
  loading = false,
  formatNgn,
}) {
  const r = row && typeof row === 'object' ? row : {};
  const t = totals && typeof totals === 'object' ? totals : {};
  const period = formatPayrollPeriodLabel(r.period_yyyymm || r.periodYyyymm || payrollRunId);
  const net = t.netPayNgn ?? t.totalNetNgn ?? t.grandTotalNgn ?? t.netTotalNgn ?? t.netNgn;
  const gross = t.grossTotalNgn ?? t.grossPayNgn ?? t.grossNgn;
  const headcount = t.headcount ?? t.staffCount;
  const tax = t.taxTotalNgn ?? t.payeNgn;
  const pension = t.pensionTotalNgn;

  return (
    <div className="animate-in fade-in space-y-3 duration-200 text-slate-700">
      <DecisionBand
        tone="production"
        eyebrow="Payroll MD sign-off"
        title={payrollRunId || '—'}
        subtitle={period && period !== '—' ? period : null}
        aside={
          !loading && net != null ? (
            <>
              <p className="text-ui-xs font-bold uppercase text-slate-400">Net payable</p>
              <p className="text-xl font-black tabular-nums text-slate-900">{formatNgn(net)}</p>
            </>
          ) : null
        }
      >
        {loading ? <p className="mt-2 text-xs text-slate-500">Loading payroll totals…</p> : null}
        {!loading ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <DecisionFact label="Staff on this run" value={headcount != null ? String(headcount) : null} />
            <DecisionFact label="Gross" value={gross != null ? formatNgn(gross) : null} />
            <DecisionFact label="PAYE" value={tax != null ? formatNgn(tax) : null} />
            <DecisionFact label="Pension" value={pension != null ? formatNgn(pension) : null} />
          </div>
        ) : null}
      </DecisionBand>

      <DecisionWhatNext title="If you sign off">
        Finance can pay the net for this run. Signing off does not itself send money to staff bank accounts.
      </DecisionWhatNext>
    </div>
  );
}
