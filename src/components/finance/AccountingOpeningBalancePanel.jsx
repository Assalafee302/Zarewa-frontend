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
import { AccountingDeskWizardSteps } from './accounting/AccountingDeskWizardSteps';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ACCOUNTING_OPENING_DATE_ISO, ACCOUNTING_OPENING_DATE_LABEL } from '../../shared/accountingCutover';
import { glSourceMappingForCode } from '../../shared/lib/accountingSourceOfTruth';
import {
  branchScopedCreateBlockedMessage,
  isBranchScopedCreateBlocked,
} from '../../lib/workspaceBranchCreate';

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

const WIZARD_STEPS = [
  { id: 1, label: 'Registers ready' },
  { id: 2, label: "Owner's capital" },
  { id: 3, label: 'Review & post' },
];

/**
 * @param {{
 *   showToast?: (msg: string, opts?: object) => void;
 *   deskLayout?: boolean;
 *   branchScopeLabel?: string;
 *   onFocusTab?: (tabId: string) => void;
 *   deskRefresh?: number;
 *   onOpeningPosted?: (posted: boolean) => void;
 * }} props
 */
export function AccountingOpeningBalancePanel({
  showToast,
  deskLayout = false,
  branchScopeLabel = '',
  onFocusTab,
  deskRefresh = 0,
  onOpeningPosted,
}) {
  const ws = useWorkspace();
  const [pack, setPack] = useState(null);
  const [status, setStatus] = useState(null);
  const [capitalNgn, setCapitalNgn] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [confirmPost, setConfirmPost] = useState(false);
  const [entryDate, setEntryDate] = useState(DEFAULT_DATE);
  const [lines, setLines] = useState([emptyLine(), emptyLine()]);

  const loadStatus = useCallback(async () => {
    const params = packQueryString(ws, capitalNgn);
    const res = await apiFetch(`/api/finance/opening-balance/status${params}`);
    if (res.ok && res.data?.ok) setStatus(res.data);
  }, [capitalNgn, ws]);

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

  useEffect(() => {
    if (deskRefresh > 0) void refreshAll();
  }, [deskRefresh]);

  useEffect(() => {
    if (status?.posted || pack?.alreadyPosted) onOpeningPosted?.(true);
  }, [status?.posted, pack?.alreadyPosted, onOpeningPosted]);

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
    !isBranchScopedCreateBlocked(ws) &&
    proposed?.totalDebitsNgn > 0 &&
    proposed?.totalDebitsNgn === proposed?.totalCreditsNgn;

  const refreshAll = async () => {
    await Promise.all([loadStatus(), loadPack()]);
  };

  const postPack = async () => {
    if (isBranchScopedCreateBlocked(ws)) {
      showToast?.(branchScopedCreateBlockedMessage(ws), { variant: 'info' });
      return;
    }
    if (!canPostPack) {
      showToast?.('Resolve blockers and balance the pack before posting.', { variant: 'error' });
      return;
    }
    if (!ws?.hasPermission?.('finance.post')) {
      showToast?.('finance.post permission required.', { variant: 'error' });
      return;
    }
    setConfirmPost(false);
    setBusy(true);
    try {
      const cap = Math.round(Number(String(capitalNgn).replace(/,/g, '')) || 0);
      const res = await apiFetch('/api/finance/opening-pack/post', {
        method: 'POST',
        body: JSON.stringify({
          capitalNgn: cap || undefined,
          inventoryPeriodKey: pack.inventoryPeriodKey,
          branchId: ws.branchScope || ws.session?.currentBranchId || undefined,
        }),
      });
      if (!res.ok || !res.data?.ok) {
        showToast?.(res.data?.error || 'Could not post opening pack.', { variant: 'error' });
        return;
      }
      showToast?.(res.data.duplicate ? 'Opening balance already posted.' : 'Opening pack posted to GL.');
      onOpeningPosted?.(true);
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
      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-ui-xs font-bold uppercase text-zarewa-teal"
      onClick={refreshAll}
      disabled={loading}
    >
      <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
      Refresh
    </button>
  );

  const sourceRows = useMemo(() => pack?.sources || [], [pack]);
  const registersReady = !pack?.blockers?.length && sourceRows.every((s) => s.status !== 'fail');

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
        <p className="text-xs font-medium text-slate-600">
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
          <AccountingDeskWizardSteps
            steps={WIZARD_STEPS}
            currentStep={wizardStep}
            onStepChange={(id) => setWizardStep(Number(id))}
          />

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
            <AccountingDeskNotice tone="warn">{pack.warnings.join(' ')}</AccountingDeskNotice>
          ) : null}

          {wizardStep === 1 ? (
            <>
              <section className="rounded-xl border border-slate-200/90 overflow-hidden">
                <h3 className="border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 text-ui-xs font-black uppercase tracking-wide text-slate-700">
                  Step 1 — Register sources
                </h3>
                <ul className="divide-y divide-slate-100">
                  {sourceRows.map((s) => (
                    <li key={s.id} className={ACCOUNTING_CARD_ROW}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          {STATUS_ICON[s.status] || STATUS_ICON.empty}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800">{s.label}</p>
                            <p className="text-ui-xs text-slate-500 mt-0.5">
                              GL {s.glAccountCode} · {s.detail || 'Rollup from register'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-black tabular-nums text-slate-900">{formatNgn(s.amountNgn)}</span>
                          {s.drillDownTab && onFocusTab ? (
                            <button
                              type="button"
                              className="text-ui-xs font-bold text-teal-800 hover:underline"
                              onClick={() => onFocusTab(s.drillDownTab)}
                            >
                              Fix →
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))}
                  {!sourceRows.length && !loading ? (
                    <li className="px-4 py-6 text-center text-xs text-slate-500">No sources loaded.</li>
                  ) : null}
                </ul>
              </section>
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!registersReady}
                  onClick={() => setWizardStep(2)}
                  className="rounded-lg bg-zarewa-teal px-4 py-2 text-ui-xs font-bold uppercase tracking-wide text-white disabled:opacity-50"
                >
                  Continue to capital →
                </button>
              </div>
            </>
          ) : null}

          {wizardStep === 2 ? (
            <>
              <section className="rounded-xl border border-slate-200/90 p-4 space-y-3">
                <h3 className="text-ui-xs font-black uppercase tracking-wide text-slate-700">
                  Step 2 — Owner&apos;s capital only
                </h3>
                <p className="text-xs text-slate-600">
                  Register totals roll up automatically. Enter audited owner&apos;s capital (3100). Account 3900 balances any
                  difference.
                </p>
                <label className="text-ui-xs font-bold uppercase text-slate-500">
                  Owner&apos;s capital (3100)
                  <input
                    type="text"
                    inputMode="numeric"
                    className="mt-1 block w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold"
                    placeholder="From audited accounts"
                    value={capitalNgn}
                    onChange={(e) => setCapitalNgn(e.target.value)}
                    onBlur={loadPack}
                  />
                </label>
              </section>
              <div className="flex flex-wrap justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-ui-xs font-bold uppercase tracking-wide text-slate-700"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    loadPack();
                    setWizardStep(3);
                  }}
                  className="rounded-lg bg-zarewa-teal px-4 py-2 text-ui-xs font-bold uppercase tracking-wide text-white"
                >
                  Preview journal →
                </button>
              </div>
            </>
          ) : null}

          {wizardStep === 3 ? (
            <>
              <section className="rounded-xl border border-slate-200/90 overflow-hidden">
                <h3 className="border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 text-ui-xs font-black uppercase tracking-wide text-slate-700">
                  Step 3 — Proposed opening journal
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-ui-xs font-bold uppercase text-slate-500">
                        <th className="px-4 py-2">Code</th>
                        <th className="px-4 py-2">Memo</th>
                        <th className="px-4 py-2 text-right">Debit</th>
                        <th className="px-4 py-2 text-right">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(proposed?.lines || []).map((l, i) => (
                        <tr key={i} className="border-b border-slate-50">
                          <td className="px-4 py-2 font-mono font-semibold">{l.accountCode}</td>
                          <td className="px-4 py-2 text-slate-600">{l.memo}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{l.debitNgn ? formatNgn(l.debitNgn) : '—'}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{l.creditNgn ? formatNgn(l.creditNgn) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    {proposed?.totalDebitsNgn ? (
                      <tfoot>
                        <tr className="bg-slate-50/80 font-bold">
                          <td className="px-4 py-2" colSpan={2}>
                            Totals
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">{formatNgn(proposed.totalDebitsNgn)}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{formatNgn(proposed.totalCreditsNgn)}</td>
                        </tr>
                      </tfoot>
                    ) : null}
                  </table>
                </div>
              </section>
              <div className="flex flex-wrap justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-ui-xs font-bold uppercase tracking-wide text-slate-700"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-zarewa-teal px-4 py-2 text-ui-xs font-bold uppercase tracking-wide text-white disabled:opacity-50"
                  onClick={() => setConfirmPost(true)}
                  disabled={busy || !canPostPack}
                >
                  Post opening journal
                </button>
              </div>
            </>
          ) : null}

          {confirmPost ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
              <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
                <h3 className="text-sm font-bold text-zarewa-teal">Post opening journal?</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  This posts one balanced journal on {ACCOUNTING_OPENING_DATE_LABEL} from register rollups plus owner&apos;s
                  capital. Register account lines should not be re-entered manually afterward.
                </p>
                <p className="mt-2 text-xs font-semibold text-slate-800 tabular-nums">
                  Total: {formatNgn(proposed?.totalDebitsNgn || 0)}
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmPost(false)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-ui-xs font-bold uppercase text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void postPack()}
                    disabled={busy}
                    className="rounded-lg bg-zarewa-teal px-3 py-1.5 text-ui-xs font-bold uppercase text-white disabled:opacity-50"
                  >
                    {busy ? 'Posting…' : 'Confirm post'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      <section className="rounded-xl border border-dashed border-slate-200">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-ui-xs font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          Advanced — manual journal (legacy / exceptions only)
          {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showAdvanced ? (
          <div className="space-y-4 border-t border-slate-100 p-4">
            <p className="text-ui-xs text-slate-500">
              Do not use for register accounts (1200, 2000, 2500, 1300, 1500+, per-bank cash). Use Opening Pack above.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-ui-xs font-bold uppercase text-slate-500">
                Entry date
                <input
                  type="date"
                  className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                />
              </label>
              <div className="text-xs font-semibold text-slate-700">
                Debits {formatNgn(manualTotals.debit)} · Credits {formatNgn(manualTotals.credit)}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {MANUAL_QUICK_LINES.map((q) => (
                <button
                  key={q.accountCode}
                  type="button"
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-ui-xs font-bold uppercase text-slate-600 hover:bg-white"
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
                    className="sm:col-span-2 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-mono"
                    placeholder="Code"
                    value={line.accountCode}
                    onChange={(e) =>
                      setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, accountCode: e.target.value } : l)))
                    }
                  />
                  <input
                    className="sm:col-span-2 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                    placeholder="Debit ₦"
                    value={line.debitNgn}
                    onChange={(e) =>
                      setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, debitNgn: e.target.value } : l)))
                    }
                  />
                  <input
                    className="sm:col-span-2 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                    placeholder="Credit ₦"
                    value={line.creditNgn}
                    onChange={(e) =>
                      setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, creditNgn: e.target.value } : l)))
                    }
                  />
                  <input
                    className="sm:col-span-4 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                    placeholder="Memo"
                    value={line.memo}
                    onChange={(e) =>
                      setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, memo: e.target.value } : l)))
                    }
                  />
                  <button
                    type="button"
                    className="sm:col-span-2 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 text-ui-xs font-bold text-slate-500"
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
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-ui-xs font-bold uppercase text-zarewa-teal"
                onClick={() => setLines((prev) => [...prev, emptyLine()])}
              >
                <Plus size={14} />
                Add line
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-ui-xs font-bold uppercase tracking-wide text-slate-700 disabled:opacity-50"
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
