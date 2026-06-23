import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Download, Printer } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../Data/mockData';
import { downloadFinanceCsv } from '../../lib/exportFinanceCsv';
import { printAccountingStatements } from '../../lib/printAccountingStatements';
import {
  getAccountingDeskCache,
  invalidateAccountingDeskCache,
  setAccountingDeskCache,
} from '../../lib/accountingDeskCache';
import {
  AccountingDeskKpiCard,
  AccountingDeskPageIntro,
} from './accounting/AccountingDeskUi';
import { AccountingRegisterHeader } from './accounting/AccountingRegisterLayout';
import { AccountingManagementDisclaimer } from './accounting/AccountingManagementDisclaimer';
import { AccountingDeskTableSection } from './accounting/AccountingDeskTableSection';
import { useWorkspace } from '../../context/WorkspaceContext';

function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

/**
 * @param {{
 *   branchScopeLabel?: string;
 *   showToast?: (msg: string, opts?: object) => void;
 *   deskLayout?: boolean;
 *   periodKey?: string;
 *   onPeriodKeyChange?: (v: string) => void;
 *   deskRefresh?: number;
 * }} props
 */
export function AccountingStatementsPanel({
  branchScopeLabel = '',
  showToast,
  deskLayout = false,
  periodKey: periodKeyProp,
  onPeriodKeyChange,
  deskRefresh = 0,
}) {
  const ws = useWorkspace();
  const [periodLocal, setPeriodLocal] = useState(currentPeriod);
  const period = periodKeyProp ?? periodLocal;
  const setPeriod = onPeriodKeyChange ?? setPeriodLocal;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const lastRefreshRef = useRef(-1);

  const branchQuery = useMemo(() => {
    if (ws?.viewAllBranches) return 'ALL';
    return ws?.branchScope || ws?.session?.currentBranchId || '';
  }, [ws]);

  const load = useCallback(
    async (force = false) => {
      const branchQ =
        branchQuery && branchQuery !== 'ALL' ? `&branchId=${encodeURIComponent(branchQuery)}` : '';
      const cacheKey = `statements|${period}|${branchQuery || 'ALL'}`;
      if (!force) {
        const cached = getAccountingDeskCache(cacheKey);
        if (cached) {
          setData(cached);
          setLoading(false);
          return;
        }
      } else {
        invalidateAccountingDeskCache(cacheKey);
      }
      setLoading(true);
      try {
        const res = await apiFetch(
          `/api/finance/statements-pack?period=${encodeURIComponent(period)}${branchQ}`
        );
        if (!res.ok || !res.data?.ok) {
          showToast?.(res.data?.error || 'Could not load statements.', { variant: 'error' });
          setData(null);
          return;
        }
        setAccountingDeskCache(cacheKey, res.data);
        setData(res.data);
      } finally {
        setLoading(false);
      }
    },
    [period, branchQuery, showToast]
  );

  useEffect(() => {
    const force = deskRefresh !== lastRefreshRef.current;
    lastRefreshRef.current = deskRefresh;
    void load(force);
  }, [load, deskRefresh]);

  const pl = data?.profitAndLoss;
  const bs = data?.balanceSheet;

  const exportCsv = () => {
    if (!data) return;
    const branchSlug = (branchScopeLabel || branchQuery || 'all')
      .replace(/[^\w-]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
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
    downloadFinanceCsv(`statements-${period}-${branchSlug}`, rows);
    showToast?.(`Downloaded statements for ${period}${branchScopeLabel ? ` · ${branchScopeLabel}` : ''}`, {
      variant: 'success',
    });
  };

  const printPack = () => {
    if (!data) return;
    const ok = printAccountingStatements({ data, branchScopeLabel });
    if (ok) {
      showToast?.('Print dialog opened — use Save as PDF if needed.', { variant: 'success' });
    } else {
      showToast?.('Could not open print view.', { variant: 'error' });
    }
  };

  const plRows = useMemo(() => pl?.lines || [], [pl?.lines]);
  const bsRows = useMemo(() => bs?.lines || [], [bs?.lines]);

  const headerActions = (
    <div className="flex flex-wrap gap-2">
      {!periodKeyProp ? (
        <label className="inline-flex items-center gap-2 text-[10px] font-bold text-slate-600">
          Period
          <input
            type="month"
            className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
        </label>
      ) : null}
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#134e4a]/30 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-[#134e4a] hover:bg-teal-50/80 disabled:opacity-40 min-h-11"
        onClick={printPack}
        disabled={!data}
      >
        <Printer size={14} />
        Print / PDF
      </button>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#134e4a] px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-white hover:brightness-105 disabled:opacity-40 min-h-11"
        onClick={exportCsv}
        disabled={!data}
      >
        <Download size={14} />
        Download CSV
      </button>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase text-[#134e4a] min-h-11"
        onClick={() => load(true)}
        disabled={loading}
      >
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        Refresh
      </button>
    </div>
  );

  return (
    <div className="space-y-5">
      {deskLayout ? (
        <AccountingRegisterHeader compact actions={headerActions} />
      ) : (
        <AccountingDeskPageIntro
          title="Financial statements"
          description="Profit & Loss and Statement of Financial Position from the general ledger. Management draft — review with registers before board use."
          action={headerActions}
        />
      )}

      {branchScopeLabel ? (
        <p className="text-[11px] text-slate-600">
          Scope: <span className="font-bold">{branchScopeLabel}</span>
        </p>
      ) : null}

      <AccountingManagementDisclaimer compact />

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
