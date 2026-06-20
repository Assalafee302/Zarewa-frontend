import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Plus, RefreshCw, Trash2, XCircle } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../Data/mockData';
import {
  AccountingDeskKpiCard,
  AccountingDeskPageIntro,
  AccountingDeskNotice,
  ACCOUNTING_CARD_ROW,
} from './accounting/AccountingDeskUi';
import { AccountingRegisterHeader } from './accounting/AccountingRegisterLayout';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ACCOUNTING_OPENING_DATE_ISO, ACCOUNTING_OPENING_DATE_LABEL } from '../../shared/accountingCutover';
import { glSourceMappingForCode } from '../../shared/lib/accountingSourceOfTruth';

const DEFAULT_DATE = ACCOUNTING_OPENING_DATE_ISO;

const MANUAL_QUICK_LINES = [{ accountCode: '3100', label: "Owner's capital", side: 'credit' }];

const STATUS_ICON = {
  ok: <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />,
  warn: <AlertTriangle size={14} className="text-amber-600 shrink-0" />,
  fail: <XCircle size={14} className="text-rose-600 shrink-0" />,
  empty: <span className="inline-block h-3.5 w-3.5 rounded-full bg-slate-300 shrink-0" />,
};

function emptyLine() {
  return { accountCode: '', debitNgn: '', creditNgn: '', memo: '' };
}

function packQueryString(ws, capitalRaw) {
  const params = new URLSearchParams();
  if (ws?.viewAllBranches) {
    params.set('branchId', 'ALL');
  } else {
    const bid = ws?.branchScope || ws?.session?.currentBranchId;
    if (bid) params.set('branchId', bid);
  }
  const cap = Math.round(Number(String(capitalRaw).replace(/,/g, '')) || 0);
  if (cap > 0) params.set('capitalNgn', String(cap));
  const q = params.toString();
  return q ? `?${q}` : '';
}

/**
 * @param {{
 *   showToast?: (msg: string, opts?: object) => void;
 *   deskLayout?: boolean;
 *   branchScopeLabel?: string;
 *   onFocusTab?: (tabId: string) => void;
 * }} props
 */
export function AccountingOpeningBalancePanel({
  showToast,
  deskLayout = false,
  branchScopeLabel = '',
  onFocusTab,
}) {
  const ws = useWorkspace();
  const [pack, setPack] = useState(null);
  const [status, setStatus] = useState(null);
  const [capitalNgn, setCapitalNgn] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [entryDate, setEntryDate] = useState(DEFAULT_DATE);
  const [lines, setLines] = useState([emptyLine(), emptyLine()]);

  const loadStatus = useCallback(async () => {
    const res = await apiFetch('/api/finance/opening-balance/status');
    if (res.ok && res.data?.ok) setStatus(res.data);
  }, []);

  const loadPack = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/finance/opening-pack${packQueryString(ws, capitalNgn)}`);
      if (res.ok && res.data?.ok) setPack(res.data);
      else setPack(null);
    } finally {
      setLoading(false);
    }
  }, [capitalNgn, ws]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    loadPack();
  }, [loadPack]);

  const manualTotals = lines.reduce(
    (acc, l) => {
      acc.debit += Math.round(Number(String(l.debitNgn).replace(/,/g, '')) || 0);
      acc.credit += Math.round(Number(String(l.creditNgn).replace(/,/g, '')) || 0);
      return acc;
    },
    { debit: 0, credit: 0 }
  );
  const manualBalanced = manualTotals.debit > 0 && manualTotals.debit === manualTotals.credit;

  const proposed = pack?.proposedJournal;
  const canPostPack =
    pack &&
    !pack.alreadyPosted &&
    !pack.blockers?.length &&
    proposed?.totalDebitsNgn > 0 &&
    proposed?.totalDebitsNgn === proposed?.totalCreditsNgn;

  const refreshAll = async () => {
    await Promise.all([loadStatus(), loadPack()]);
  };

  const postPack = async () => {
    if (!canPostPack) {
      showToast?.('Resolve blockers and balance the pack before posting.', { variant: 'error' });
      return;
    }
    if (!ws?.hasPermission?.('finance.post')) {
      showToast?.('finance.post permission required.', { variant: 'error' });
      return;
    }
    setBusy(true);
    try {
      const cap = Math.round(Number(String(capitalNgn).replace(/,/g, '')) || 0);
      const res = await apiFetch('/api/finance/opening-pack/post', {
        method: 'POST',
        body: JSON.stringify({
          capitalNgn: cap || undefined,
          inventoryPeriodKey: pack.inventoryPeriodKey,
          branchId: ws.viewAllBranches ? 'ALL' : ws.branchScope || ws.session?.currentBranchId || undefined,
        }),
      });
      if (!res.ok || !res.data?.ok) {
        showToast?.(res.data?.error || 'Could not post opening pack.', { variant: 'error' });
        return;
      }
      showToast?.(res.data.duplicate ? 'Opening balance already posted.' : 'Opening pack posted to GL.');
      await refreshAll();
    } finally {
      setBusy(false);
    }
  };

  const postManual = async () => {
    if (!manualBalanced) {
      showToast?.('Debits and credits must balance before posting.', { variant: 'error' });
      return;
    }
    if (!ws?.hasPermission?.('finance.post')) {
      showToast?.('finance.post permission required.', { variant: 'error' });
      return;
    }
    setBusy(true);
    try {
      const payload = {
        entryDateISO: entryDate,
        sourceId: `OPENING_BALANCE_${entryDate}`,
        memo: `Opening balance ${entryDate} (manual)`,
        branchId: ws.viewAllBranches ? null : ws.branchScope || ws.session?.currentBranchId || null,
        lines: lines
          .map((l) => ({
            accountCode: String(l.accountCode || '').trim(),
            debitNgn: Math.round(Number(String(l.debitNgn).replace(/,/g, '')) || 0) || undefined,
            creditNgn: Math.round(Number(String(l.creditNgn).replace(/,/g, '')) || 0) || undefined,
            memo: String(l.memo || '').trim() || undefined,
          }))
          .filter((l) => l.accountCode && (l.debitNgn > 0 || l.creditNgn > 0)),
      };
      const res = await apiFetch('/api/finance/opening-balance', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok || !res.data?.ok) {
        showToast?.(res.data?.error || 'Could not post opening balance.', { variant: 'error' });
        return;
      }
      showToast?.(res.data.duplicate ? 'Opening balance already posted (unchanged).' : 'Manual opening balance posted.');
      await refreshAll();
    } finally {
      setBusy(false);
    }
  };

  const addQuick = (q) => {
    setLines((prev) => [
      ...prev,
      {
        accountCode: q.accountCode,
        debitNgn: q.side === 'debit' ? '' : '',
        creditNgn: q.side === 'credit' ? '' : '',
        memo: q.label,
      },
    ]);
  };

  const allowManualCode = useCallback((code) => {
    const c = String(code || '').trim();
    if (!c) return true;
    const mapping = glSourceMappingForCode(c);
    if (mapping) return mapping.allowManualOpeningLine;
    return true;
  }, []);

  const statusAction = (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase text-[#134e4a]"
      onClick={refreshAll}
      disabled={loading}
    >
      <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
      Refresh
    </button>
  );

  const sourceRows = useMemo(() => pack?.sources || [], [pack]);

  return (
    <div className="space-y-5">
      {deskLayout ? (
        <AccountingRegisterHeader compact actions={statusAction} />
      ) : (
        <AccountingDeskPageIntro
          title={`Opening pack — ${ACCOUNTING_OPENING_DATE_LABEL} cutover`}
          description="Register-first cutover: totals roll up from Creditors, Debtors, Fixed assets, May stock register, and Treasury. Enter owner's capital only; retained earnings (3900) balances automatically."
          action={statusAction}
        />
      )}

      {branchScopeLabel ? (
        <p className="text-[11px] font-medium text-slate-600">
          Scope: <span className="font-bold text-slate-800">{branchScopeLabel}</span>
        </p>
      ) : null}

      {status?.posted || pack?.alreadyPosted ? (
        <AccountingDeskNotice tone="trial">
          Opening balance journal already posted ({status?.journals?.[0]?.entry_date_iso || pack?.entryDateISO || '—'}).
        </AccountingDeskNotice>
      ) : null}

      {!pack?.alreadyPosted && !status?.posted ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <AccountingDeskKpiCard
              label="Readiness"
              value={pack ? `${pack.readinessScore ?? 0}%` : '—'}
              hint={pack?.summary || 'Loading register rollups…'}
              tone={pack?.blockers?.length ? 'amber' : pack?.warnings?.length ? 'amber' : 'teal'}
            />
            <AccountingDeskKpiCard
              label="Inventory basis"
              value={pack?.inventoryPeriodKey || '2026-05'}
              hint="Prior month stock register after procurement costing"
            />
            <AccountingDeskKpiCard
              label="Proposed journal"
              value={
                proposed?.totalDebitsNgn
                  ? formatNgn(proposed.totalDebitsNgn)
                  : loading
                    ? '…'
                    : '—'
              }
              hint={
                proposed?.totalDebitsNgn === proposed?.totalCreditsNgn
                  ? 'Balanced — includes 3900 plug if needed'
                  : 'Not balanced'
              }
              tone={proposed?.totalDebitsNgn === proposed?.totalCreditsNgn ? 'teal' : 'amber'}
            />
          </div>

          {pack?.blockers?.length ? (
            <AccountingDeskNotice tone="warn">{pack.blockers.join(' ')}</AccountingDeskNotice>
          ) : null}
          {pack?.warnings?.length ? (
            <AccountingDeskNotice tone="amber">{pack.warnings.join(' ')}</AccountingDeskNotice>
          ) : null}

          <div className="flex flex-wrap items-end gap-3">
            <label className="text-[10px] font-bold uppercase text-slate-500">
              Owner&apos;s capital (3100)
              <input
                type="text"
                inputMode="numeric"
                className="mt-1 block w-40 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold"
                placeholder="From audited accounts"
                value={capitalNgn}
                onChange={(e) => setCapitalNgn(e.target.value)}
                onBlur={loadPack}
              />
            </label>
            <button
              type="button"
              className="rounded-lg bg-[#134e4a] px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-white disabled:opacity-50"
              onClick={postPack}
              disabled={busy || !canPostPack}
            >
              {busy ? 'Posting…' : 'Post opening pack'}
            </button>
          </div>

          <section className="rounded-xl border border-slate-200/90 overflow-hidden">
            <h3 className="border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-slate-700">
              Register sources
            </h3>
            <ul className="divide-y divide-slate-100">
              {sourceRows.map((s) => (
                <li key={s.id} className={ACCOUNTING_CARD_ROW}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      {STATUS_ICON[s.status] || STATUS_ICON.empty}
                      <div>
                        <p className="text-[11px] font-semibold text-slate-800">{s.label}</p>
                        <p className="text-[10px] text-slate-500">
                          GL {s.glAccountCode} · {s.side} · {s.rowCount} row{s.rowCount === 1 ? '' : 's'}
                          {s.detail ? ` — ${s.detail}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black tabular-nums text-slate-900">{formatNgn(s.amountNgn)}</p>
                      {s.drillDownTab && onFocusTab ? (
                        <button
                          type="button"
                          className="mt-0.5 text-[10px] font-bold text-teal-800 hover:underline"
                          onClick={() => onFocusTab(s.drillDownTab)}
                        >
                          Open tab →
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
              {!sourceRows.length && !loading ? (
                <li className="px-4 py-6 text-center text-[11px] text-slate-500">No sources loaded.</li>
              ) : null}
            </ul>
          </section>

          {proposed?.lines?.length ? (
            <section className="rounded-xl border border-slate-200/90 overflow-hidden">
              <h3 className="border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-slate-700">
                Proposed journal preview
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-[9px] font-bold uppercase text-slate-500">
                      <th className="px-4 py-2">Code</th>
                      <th className="px-4 py-2">Memo</th>
                      <th className="px-4 py-2 text-right">Debit</th>
                      <th className="px-4 py-2 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposed.lines.map((l, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td className="px-4 py-2 font-mono font-semibold">{l.accountCode}</td>
                        <td className="px-4 py-2 text-slate-600">{l.memo}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{l.debitNgn ? formatNgn(l.debitNgn) : '—'}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{l.creditNgn ? formatNgn(l.creditNgn) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50/80 font-bold">
                      <td className="px-4 py-2" colSpan={2}>
                        Totals
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatNgn(proposed.totalDebitsNgn)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatNgn(proposed.totalCreditsNgn)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      <section className="rounded-xl border border-dashed border-slate-200">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          Advanced — manual journal (legacy / exceptions only)
          {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showAdvanced ? (
          <div className="space-y-4 border-t border-slate-100 p-4">
            <p className="text-[10px] text-slate-500">
              Do not use for register accounts (1200, 2000, 2500, 1300, 1500+, per-bank cash). Use Opening Pack above.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Entry date
                <input
                  type="date"
                  className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                />
              </label>
              <div className="text-[11px] font-semibold text-slate-700">
                Debits {formatNgn(manualTotals.debit)} · Credits {formatNgn(manualTotals.credit)}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {MANUAL_QUICK_LINES.map((q) => (
                <button
                  key={q.accountCode}
                  type="button"
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-bold uppercase text-slate-600 hover:bg-white"
                  onClick={() => addQuick(q)}
                >
                  + {q.label}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-12">
                  <input
                    className="sm:col-span-2 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-mono"
                    placeholder="Code"
                    value={line.accountCode}
                    onChange={(e) =>
                      setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, accountCode: e.target.value } : l)))
                    }
                  />
                  <input
                    className="sm:col-span-2 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px]"
                    placeholder="Debit ₦"
                    value={line.debitNgn}
                    onChange={(e) =>
                      setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, debitNgn: e.target.value } : l)))
                    }
                  />
                  <input
                    className="sm:col-span-2 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px]"
                    placeholder="Credit ₦"
                    value={line.creditNgn}
                    onChange={(e) =>
                      setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, creditNgn: e.target.value } : l)))
                    }
                  />
                  <input
                    className="sm:col-span-4 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px]"
                    placeholder="Memo"
                    value={line.memo}
                    onChange={(e) =>
                      setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, memo: e.target.value } : l)))
                    }
                  />
                  <button
                    type="button"
                    className="sm:col-span-2 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500"
                    onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                    disabled={lines.length <= 2}
                  >
                    <Trash2 size={12} />
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold uppercase text-[#134e4a]"
                onClick={() => setLines((prev) => [...prev, emptyLine()])}
              >
                <Plus size={14} />
                Add line
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-700 disabled:opacity-50"
                onClick={postManual}
                disabled={busy || !manualBalanced || lines.some((l) => l.accountCode && !allowManualCode(l.accountCode))}
              >
                Post manual journal
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
