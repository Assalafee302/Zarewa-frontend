import React from 'react';
import { BarChart3, RefreshCw, Settings2, Shield, TrendingDown, Wallet } from 'lucide-react';
import { AccountingExecutiveBrief } from '../finance/accounting/AccountingExecutiveBrief';
import { FinanceTrialExceptionPanel } from '../finance/FinanceTrialExceptionPanel';
import { ExpenseCategoryOthersTrendTable } from '../office/ExpenseCategoryOthersTrendTable.jsx';
import { EXEC_SECONDARY_BTN } from '../../lib/execPageUi';

function EstChip() {
  return (
    <span className="inline-flex rounded px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-900 ring-1 ring-amber-200/80">
      Est.
    </span>
  );
}

function InfoChip({ children }) {
  return (
    <span className="inline-flex rounded px-1.5 py-0.5 text-[8px] font-semibold uppercase bg-slate-100 text-slate-700 ring-1 ring-slate-200">
      {children}
    </span>
  );
}

function Section({ title, subtitle, children, icon }) {
  return (
    <section className="rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 bg-slate-50/90 px-4 py-3 sm:px-5">
        <h2 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-[#134e4a]">
          {icon}
          {title}
        </h2>
        {subtitle ? <p className="mt-1 text-[11px] text-slate-500 max-w-3xl">{subtitle}</p> : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function formatWcAmount(line, formatNgn) {
  if (line.available === false) return '—';
  if (line.isCountOnly) return String(line.amountNgn ?? 0);
  if (line.amountNgn == null) return '—';
  return formatNgn(line.amountNgn);
}

function WcLinesTable({ title, lines, formatNgn }) {
  if (!lines?.length) return null;
  return (
    <div className="mb-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">{title}</p>
      <table className="w-full text-xs">
        <tbody>
          {lines.map((line) => (
            <tr key={line.id} className="border-b border-slate-50">
              <td className="py-2 pr-2 font-medium text-slate-800">
                {line.label}
                {line.estimated ? (
                  <span className="ml-1">
                    <EstChip />
                  </span>
                ) : null}
              </td>
              <td className="py-2 text-right tabular-nums font-bold text-[#134e4a]">
                {formatWcAmount(line, formatNgn)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ExecFinanceTab({
  data,
  formatNgn,
  branchId,
  branchScopeLabel,
  ws,
  canPickBranch,
  mayFinanceOversight,
  trialData,
  trialLoading,
  trialError,
  reloadTrial,
  othersTrend,
  othersTrendBusy,
  othersTrendErr,
  onReloadOthersTrend,
  canManageReservePolicy,
  onConfigureReserve,
  branchTrendLabel,
}) {
  const renderOthersTrendBody = () => {
    if (othersTrendErr) {
      return (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {othersTrendErr}
        </p>
      );
    }
    if (othersTrendBusy && !othersTrend) {
      return <p className="text-sm text-slate-500">Loading trend…</p>;
    }
    if ((othersTrend?.branches || []).length === 0) {
      return (
        <p className="text-sm text-slate-500">No approved payment requests in the selected window.</p>
      );
    }
    return (
      <ExpenseCategoryOthersTrendTable
        trend={othersTrend}
        branchLabel={branchTrendLabel || ((id) => id)}
        compact={false}
      />
    );
  };

  return (
    <div className="space-y-6 pb-10">
      <AccountingExecutiveBrief
        branchId={canPickBranch ? branchId : ws?.branchScope || ws?.session?.currentBranchId}
        branchScopeLabel={branchScopeLabel}
      />
      {!mayFinanceOversight ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Accounting trial oversight panel is limited to finance oversight roles. Cash, working capital, and
          payables below use executive dashboard data for the selected period and branch.
        </p>
      ) : null}
      {mayFinanceOversight ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <FinanceTrialExceptionPanel
            variant="oversight"
            data={trialData}
            loading={trialLoading}
            error={trialError}
            onReload={reloadTrial}
          />
        </div>
      ) : null}

      <Section
        title="Others category trend"
        subtitle="Share of approved payment requests coded Others — last 6 months by branch"
        icon={<BarChart3 size={16} className="text-amber-700" strokeWidth={2} />}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-xs text-slate-600">
            Company Others share:{' '}
            <span className="font-bold tabular-nums text-[#134e4a]">
              {othersTrend?.summary?.othersPct != null ? `${othersTrend.summary.othersPct}%` : '—'}
            </span>
            {othersTrend?.summary?.othersNgn != null ? (
              <span className="text-slate-500"> ({formatNgn(othersTrend.summary.othersNgn)})</span>
            ) : null}
          </p>
          <button
            type="button"
            onClick={() => void onReloadOthersTrend?.()}
            disabled={othersTrendBusy}
            className={`${EXEC_SECONDARY_BTN} disabled:opacity-60 py-2 min-h-0`}
          >
            <RefreshCw size={12} strokeWidth={2} className={othersTrendBusy ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
        {renderOthersTrendBody()}
      </Section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Section
          title="Cash & Treasury"
          subtitle="Estimated cash pressure — not a safe-withdrawal calculation."
          icon={<Wallet size={16} className="text-teal-600" strokeWidth={2} />}
        >
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {[
              { label: 'Cash / bank', val: data?.cash?.cashNgn },
              { label: 'Receivables', val: data?.cash?.receivablesNgn },
              { label: 'Inventory', val: data?.cash?.inventoryValueNgn, estimated: true },
              { label: 'Pending outflows', val: data?.cash?.pendingOutflowsNgn },
            ].map(({ label, val, estimated }) => (
              <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3">
                <dt className="text-[10px] font-semibold uppercase text-slate-500 flex items-center gap-1.5">
                  {label}
                  {estimated ? <EstChip /> : null}
                </dt>
                <dd className="mt-1 font-black tabular-nums text-[#134e4a]">{formatNgn(val ?? 0)}</dd>
              </div>
            ))}
          </dl>
          {(data?.cash?.horizons || []).length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {data.cash.horizons.map((h) => (
                <span
                  key={h.days}
                  className={`rounded-lg px-3 py-2 text-[10px] font-bold ring-1 ${
                    h.stress === 'deficit'
                      ? 'bg-rose-50 text-rose-800 ring-rose-200'
                      : h.stress === 'tight'
                        ? 'bg-amber-50 text-amber-900 ring-amber-200'
                        : 'bg-emerald-50 text-emerald-900 ring-emerald-100'
                  }`}
                >
                  {h.days}d: {formatNgn(h.projectedBalanceNgn)} ({h.stress})
                </span>
              ))}
            </div>
          ) : null}
        </Section>

        <Section
          title="Payables & Outflows"
          subtitle={data?.payables?.label || 'Supplier and treasury pressure'}
          icon={<TrendingDown size={16} className="text-rose-700" strokeWidth={2} />}
        >
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {[
              { label: 'AP outstanding', val: data?.payables?.apOutstandingNgn },
              { label: 'Approved unpaid PR', val: data?.payables?.approvedUnpaidPaymentRequestsNgn },
              {
                label: data?.payables?.poCommitmentLabel || 'PO commitment proxy',
                val: data?.payables?.poCommitmentGapNgn,
                est: true,
              },
            ].map(({ label, val, est }) => (
              <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3">
                <dt className="text-[10px] font-semibold uppercase text-slate-500 flex items-center gap-1.5">
                  {label}
                  {est ? <EstChip /> : null}
                </dt>
                <dd className="mt-1 font-black tabular-nums text-[#134e4a]">{formatNgn(val ?? 0)}</dd>
              </div>
            ))}
          </dl>
        </Section>
      </div>

      <Section
        title="Working Capital Snapshot"
        subtitle={data?.workingCapital?.label || 'Estimated — not statutory accounts'}
        icon={<Wallet size={16} className="text-teal-600" strokeWidth={2} />}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WcLinesTable title="Current assets" lines={data?.workingCapital?.currentAssets} formatNgn={formatNgn} />
          <WcLinesTable
            title="Current liabilities"
            lines={data?.workingCapital?.currentLiabilities}
            formatNgn={formatNgn}
          />
        </div>
        <p className="mt-4 text-sm font-black tabular-nums text-[#134e4a]">
          Est. working capital:{' '}
          {data?.workingCapital?.estimatedWorkingCapitalNgn != null
            ? formatNgn(data.workingCapital.estimatedWorkingCapitalNgn)
            : '—'}
        </p>
      </Section>

      <Section
        title="Reserve Policy"
        subtitle={data?.reservePolicy?.note || 'Management decision support only.'}
        icon={<Shield size={16} className="text-amber-700" strokeWidth={2} />}
      >
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <InfoChip>{data?.reservePolicy?.configured ? 'Configured' : 'Not configured'}</InfoChip>
          <span className="text-sm tabular-nums font-bold text-[#134e4a]">
            {data?.reservePolicy?.completionPct ?? 0}% complete
          </span>
          {canManageReservePolicy ? (
            <button type="button" onClick={() => void onConfigureReserve?.()} className={EXEC_SECONDARY_BTN}>
              <Settings2 size={14} strokeWidth={2} />
              Configure
            </button>
          ) : null}
        </div>
        {(data?.reservePolicy?.warnings || []).map((w, i) => (
          <p
            key={i}
            className="mb-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
          >
            {w}
          </p>
        ))}
      </Section>
    </div>
  );
}
