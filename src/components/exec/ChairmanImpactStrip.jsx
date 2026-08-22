import React from 'react';
import { Link } from 'react-router-dom';
import { Home, GraduationCap, Landmark, Wallet, Banknote } from 'lucide-react';
import { CommandMetricCard } from '../layout/CommandMetricCard';
import { COMMAND_SECTION_EYEBROW } from '../../lib/execPageUi';
import { formatNgn } from '../../shared/lib/formatNgn.js';
import { formatPayrollPeriodLabel } from '../../lib/hrPayroll';

function money(n) {
  return formatNgn(Number(n) || 0);
}

function staffLabel(n) {
  const c = Number(n) || 0;
  return `${c} staff`;
}

function childLabel(n) {
  const c = Number(n) || 0;
  return `${c} ${c === 1 ? 'child' : 'children'}`;
}

/**
 * Always-visible owner-load vs company cash for Chairman Office.
 * Headline figures are amounts actually paid this month (HR payment rows + GL 3200).
 */
export function ChairmanImpactStrip({ impact, periodKey, onSelectTab }) {
  const cashAfter = Number(impact?.cashAfterPendingNgn);
  const cashWarn = Number.isFinite(cashAfter) && cashAfter < 0;
  const pendingBenefits = Number(impact?.pendingBenefitPaymentsNgn) || 0;
  const pendingDrawings = Number(impact?.pendingWithdrawalsNgn) || 0;
  const pendingLoans = Number(impact?.pendingLoanDisbursementNgn) || 0;
  const pendingPayouts = pendingBenefits + pendingDrawings + pendingLoans;
  const pendingFeeCount = Number(impact?.pendingFeeCount) || 0;
  const pendingBenefitCount = Number(impact?.pendingBenefitPaymentCount) || 0;
  const pendingDrawingsCount = Number(impact?.pendingWithdrawalsCount) || 0;
  const pendingLoanCount = Number(impact?.pendingLoanCount) || 0;
  const pendingQueueCount = pendingBenefitCount + pendingDrawingsCount + pendingLoanCount;
  const periodLabel = formatPayrollPeriodLabel(periodKey) || 'This month';

  return (
    <section className="mb-5 space-y-3" aria-label="How this office affects the company">
      <div>
        <p className={COMMAND_SECTION_EYEBROW}>Company impact · {periodLabel}</p>
        <p className="mt-0.5 text-sm text-[var(--z-text-muted)]">
          Figures below are cash marked paid this month. Pending items are still in the queue.
          Withdrawals post to equity (GL 3200). Loans are money the company is owed (GL 1200).
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <CommandMetricCard
          label="Household paid"
          value={money(impact?.householdPaidThisMonthNgn)}
          meta={`${staffLabel(impact?.householdStaffCount)} on the books · monthly salaries ${money(impact?.householdMonthlyNgn)}`}
          icon={Home}
          iconTone="secondary"
          onClick={onSelectTab ? () => onSelectTab('household') : undefined}
        >
          <p className="mt-1 text-ui-xs text-[var(--z-text-muted)]">YTD paid {money(impact?.householdPaidYtdNgn)}</p>
        </CommandMetricCard>
        <CommandMetricCard
          label="Scholarships paid"
          value={money(impact?.scholarshipPaidThisMonthNgn)}
          meta={
            pendingFeeCount > 0
              ? `${pendingFeeCount} school fee${pendingFeeCount === 1 ? '' : 's'} still pending · ${money(impact?.pendingSchoolFeesNgn)}`
              : `${childLabel(impact?.childCount)} · monthly allowances ${money(impact?.scholarshipMonthlyNgn)}`
          }
          icon={GraduationCap}
          iconTone="secondary"
          onClick={onSelectTab ? () => onSelectTab('scholarships') : undefined}
        >
          <p className="mt-1 text-ui-xs text-[var(--z-text-muted)]">YTD paid {money(impact?.scholarshipPaidYtdNgn)}</p>
        </CommandMetricCard>
        <CommandMetricCard
          label="Withdrawals posted"
          value={money(impact?.drawingsMonthNgn)}
          meta={
            pendingDrawingsCount > 0
              ? `${pendingDrawingsCount} request${pendingDrawingsCount === 1 ? '' : 's'} awaiting payout · ${money(pendingDrawings)}`
              : `Nothing waiting in the payout queue · YTD ${money(impact?.drawingsYtdNgn)}`
          }
          icon={Landmark}
          iconTone="tertiary"
          onClick={onSelectTab ? () => onSelectTab('withdrawals') : undefined}
        >
          {pendingDrawingsCount === 0 ? null : (
            <p className="mt-1 text-ui-xs text-[var(--z-text-muted)]">Posted YTD {money(impact?.drawingsYtdNgn)}</p>
          )}
        </CommandMetricCard>
        <CommandMetricCard
          label="Loans outstanding"
          value={money(impact?.loansOutstandingNgn)}
          meta={
            pendingLoanCount > 0
              ? `${pendingLoanCount} loan${pendingLoanCount === 1 ? '' : 's'} awaiting payout · ${money(pendingLoans)}`
              : 'Company is owed this after cashier paid the loan out'
          }
          icon={Banknote}
          iconTone="secondary"
          onClick={onSelectTab ? () => onSelectTab('loans') : undefined}
        />
        <CommandMetricCard
          label="Cash after pending"
          value={money(impact?.cashAfterPendingNgn)}
          meta={`Treasury on hand ${money(impact?.treasuryCashNgn)}`}
          icon={Wallet}
          iconTone={cashWarn ? 'warn' : 'primary'}
          warn={cashWarn}
        >
          <p className="mt-1 text-ui-xs text-[var(--z-text-muted)]">
            {pendingPayouts > 0
              ? `If ${pendingQueueCount} pending payout${pendingQueueCount === 1 ? '' : 's'} clear: ${money(pendingPayouts)} leaves cash`
              : `Owner paid this month ${money(impact?.totalOwnerLoadMonthNgn)}`}
          </p>
        </CommandMetricCard>
      </div>
      <p className="text-ui-xs text-[var(--z-text-muted)]">
        Working capital lives in{' '}
        <Link to="/exec?tab=finance" className="font-semibold text-zarewa-teal no-underline hover:underline">
          Command Centre → Finance
        </Link>
        . Click a card to open that desk.
      </p>
    </section>
  );
}
