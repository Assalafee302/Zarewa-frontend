import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Download } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../Data/mockData';
import { downloadFinanceCsv } from '../../lib/exportFinanceCsv';
import {
  AccountingDeskKpiCard,
  AccountingDeskPageIntro,
} from './accounting/AccountingDeskUi';
import { AccountingDeskTableSection } from './accounting/AccountingDeskTableSection';

function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

/**
 * @param {{ branchScopeLabel?: string; showToast?: (msg: string, opts?: object) => void }} props
 */
export function AccountingStatementsPanel({ branchScopeLabel = '', showToast }) {
  const [period, setPeriod] = useState(currentPeriod);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/finance/statements-pack?period=${encodeURIComponent(period)}`);
      if (!res.ok || !res.data?.ok) {
        showToast?.(res.data?.error || 'Could not load statements.', { variant: 'error' });
        setData(null);
        return;
      }
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, [period, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const pl = data?.profitAndLoss;
  const bs = data?.balanceSheet;

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ['Period', data.periodKey],
      ['Label', data.label || 'Management draft'],
      [],
      ['Profit & Loss'],
      ['Revenue total', pl?.revenueTotalNgn],
      ['Expense total', pl?.expenseTotalNgn],
      ['Net income', pl?.netIncomeNgn],
      [],
      ...(pl?.lines || []).map((l) => [`PL ${l.accountCode}`, l.accountName, l.amountNgn]),
      [],
      ['Balance sheet'],
      ['Assets', bs?.assetsNgn],
      ['Liabilities', bs?.liabilitiesNgn],
      ['Equity', bs?.equityNgn],
      ['Balanced', bs?.balanced ? 'Yes' : 'No'],
      [],
      ...(bs?.lines || []).map((l) => [`BS ${l.accountCode}`, l.accountName, l.balanceNgn]),
    ];
    downloadFinanceCsv(`statements-${period}`, rows);
  };

  const plRows = useMemo(() => pl?.lines || [], [pl?.lines]);
  const bsRows = useMemo(() => bs?.lines || [], [bs?.lines]);

  return (
    <div className="space-y-5">
      <AccountingDeskPageIntro
        title="Financial statements"
        description="Profit & Loss and Statement of Financial Position from the general ledger. Management draft — review with registers before board use."
        action={
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-2 text-[10px] font-bold text-slate-600">
              Period
              <input
                type="month"
                className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase text-[#134e4a]"
              onClick={load}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Load
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase text-[#134e4a]"
              onClick={exportCsv}
              disabled={!data}
            >
              <Download size={14} />
              CSV
            </button>
          </div>
        }
      />

      {branchScopeLabel ? (
        <p className="text-[11px] text-slate-600">
          Scope: <span className="font-bold">{branchScopeLabel}</span>
        </p>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AccountingDeskKpiCard label="Revenue" value={formatNgn(pl?.revenueTotalNgn)} tone="teal" />
            <AccountingDeskKpiCard label="Expenses" value={formatNgn(pl?.expenseTotalNgn)} />
            <AccountingDeskKpiCard label="Net income" value={formatNgn(pl?.netIncomeNgn)} tone="teal" />
            <AccountingDeskKpiCard
              label="Balance sheet"
              value={bs?.balanced ? 'Balanced' : 'Review'}
              hint={`Assets ${formatNgn(bs?.assetsNgn)} vs L+E ${formatNgn(bs?.totalLiabilitiesAndEquityNgn)}`}
              tone={bs?.balanced ? 'teal' : 'amber'}
            />
          </div>

          <AccountingDeskTableSection title="Profit & Loss" description={`${data.range?.start} → ${data.range?.end}`}>
            {plRows.length === 0 ? (
              <p className="text-[11px] text-slate-500 py-4">No revenue or expense GL activity in this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-[9px] font-bold uppercase text-slate-500">
                      <th className="py-2 pr-3">Code</th>
                      <th className="py-2 pr-3">Account</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plRows.map((r) => (
                      <tr key={`${r.accountCode}-${r.accountType}`} className="border-b border-slate-50">
                        <td className="py-2 pr-3 font-mono text-slate-600">{r.accountCode}</td>
                        <td className="py-2 pr-3 font-semibold text-slate-800">{r.accountName}</td>
                        <td className="py-2 text-right font-bold tabular-nums text-[#134e4a]">{formatNgn(r.amountNgn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AccountingDeskTableSection>

          <AccountingDeskTableSection title="Statement of financial position" description={`As at ${data.range?.end}`}>
            {bsRows.length === 0 ? (
              <p className="text-[11px] text-slate-500 py-4">No asset, liability, or equity balances in GL yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-[9px] font-bold uppercase text-slate-500">
                      <th className="py-2 pr-3">Code</th>
                      <th className="py-2 pr-3">Account</th>
                      <th className="py-2 pr-3">Type</th>
                      <th className="py-2 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bsRows.map((r) => (
                      <tr key={`${r.accountCode}-${r.accountType}`} className="border-b border-slate-50">
                        <td className="py-2 pr-3 font-mono text-slate-600">{r.accountCode}</td>
                        <td className="py-2 pr-3 font-semibold text-slate-800">{r.accountName}</td>
                        <td className="py-2 pr-3 capitalize text-slate-500">{r.accountType}</td>
                        <td className="py-2 text-right font-bold tabular-nums text-[#134e4a]">{formatNgn(r.balanceNgn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AccountingDeskTableSection>
        </>
      ) : (
        <p className="text-[11px] text-slate-500">Select a period and load statements.</p>
      )}
    </div>
  );
}
