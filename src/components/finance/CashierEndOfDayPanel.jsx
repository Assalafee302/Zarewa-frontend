import React, { useMemo, useState } from 'react';
import {
  Coins,
  CheckCircle2,
  AlertTriangle,
  Printer,
  RotateCcw,
  Sparkles,
  ClipboardCheck,
  ShieldAlert,
} from 'lucide-react';
import { formatNgn } from '../../Data/mockData.js';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { printCashierEodReport } from '../../lib/cashierEodReportPrint.js';
import { isReceiptCleared, isReceiptPendingClearance } from '../../lib/receiptClearance.js';
import { treasuryBookBalanceByAccountId } from '../../lib/financeDeskTreasury.js';

export function CashierEndOfDayPanel({ onGoToTab }) {
  const ws = useWorkspace();
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [denominations, setDenominations] = useState({
    '1000': '',
    '500': '',
    '200': '',
    '100': '',
    '50': '',
  });
  const [eodNotes, setEodNotes] = useState('');

  const receipts = useMemo(
    () => (Array.isArray(ws?.snapshot?.receipts) ? ws.snapshot.receipts : []),
    [ws?.snapshot?.receipts]
  );
  const movements = useMemo(
    () => (Array.isArray(ws?.snapshot?.treasuryMovements) ? ws.snapshot.treasuryMovements : []),
    [ws?.snapshot?.treasuryMovements]
  );
  const treasuryAccounts = useMemo(
    () => (Array.isArray(ws?.snapshot?.treasuryAccounts) ? ws.snapshot.treasuryAccounts : []),
    [ws?.snapshot?.treasuryAccounts]
  );

  const bookById = useMemo(
    () => treasuryBookBalanceByAccountId(treasuryAccounts, movements),
    [treasuryAccounts, movements]
  );

  // Cash safe account:
  const cashAccount = useMemo(() => {
    return (
      treasuryAccounts.find((a) => {
        const name = String(a.name || '').toLowerCase();
        const type = String(a.type || '').toLowerCase();
        return type === 'cash' || name.includes('cash') || name.includes('safe') || name.includes('till');
      }) || treasuryAccounts[0]
    );
  }, [treasuryAccounts]);

  const posAccount = useMemo(() => {
    return treasuryAccounts.find((a) => {
      const name = String(a.name || '').toLowerCase();
      const type = String(a.type || '').toLowerCase();
      return type === 'pos' || name.includes('pos');
    });
  }, [treasuryAccounts]);

  const bookCashBalance = useMemo(() => {
    if (!cashAccount) return 0;
    return bookById.get(cashAccount.id) ?? cashAccount.balance ?? 0;
  }, [cashAccount, bookById]);

  const posBalance = useMemo(() => {
    if (!posAccount) return 0;
    return bookById.get(posAccount.id) ?? posAccount.balance ?? 0;
  }, [posAccount, bookById]);

  // Receipts stats for today:
  const confirmedTodayReceipts = useMemo(
    () =>
      receipts.filter(
        (r) => isReceiptCleared(r) && String(r.dateISO || r.created_at || '').slice(0, 10) === todayIso
      ),
    [receipts, todayIso]
  );
  const confirmedTodayNgn = useMemo(
    () => confirmedTodayReceipts.reduce((sum, r) => sum + (Number(r.amountNgn) || 0), 0),
    [confirmedTodayReceipts]
  );

  const pendingReceipts = useMemo(
    () => receipts.filter((r) => isReceiptPendingClearance(r)),
    [receipts]
  );
  const pendingReceiptsNgn = useMemo(
    () => pendingReceipts.reduce((sum, r) => sum + (Number(r.amountNgn) || 0), 0),
    [pendingReceipts]
  );

  // Payouts executed today:
  const payoutsToday = useMemo(
    () =>
      movements.filter((m) => {
        const iso = String(m.postedAtISO || m.created_at || '').slice(0, 10);
        return iso === todayIso && (m.sourceType === 'PAYOUT' || m.movementType === 'PAYOUT' || m.amountNgn < 0);
      }),
    [movements, todayIso]
  );
  const payoutsTodayNgn = useMemo(
    () => payoutsToday.reduce((sum, m) => sum + Math.abs(Number(m.amountNgn) || 0), 0),
    [payoutsToday]
  );

  // Denominations calculation:
  const physicalCashTotal = useMemo(() => {
    return (
      (Number(denominations['1000']) || 0) * 1000 +
      (Number(denominations['500']) || 0) * 500 +
      (Number(denominations['200']) || 0) * 200 +
      (Number(denominations['100']) || 0) * 100 +
      (Number(denominations['50']) || 0) * 50
    );
  }, [denominations]);

  const variance = physicalCashTotal - bookCashBalance;
  const isBalanced = physicalCashTotal > 0 && variance === 0;
  const hasCount = physicalCashTotal > 0;

  function updateDenom(key, val) {
    const num = val.replace(/[^0-9]/g, '');
    setDenominations((prev) => ({ ...prev, [key]: num }));
  }

  function handleAutoFillBalance() {
    // Splits book balance into standard 1000 and 500 notes for quick reconciliation
    let rem = Math.max(0, bookCashBalance);
    const k1000 = Math.floor(rem / 1000);
    rem %= 1000;
    const k500 = Math.floor(rem / 500);
    rem %= 500;
    const k200 = Math.floor(rem / 200);
    rem %= 200;
    const k100 = Math.floor(rem / 100);
    rem %= 100;
    const k50 = Math.floor(rem / 50);

    setDenominations({
      '1000': String(k1000),
      '500': String(k500),
      '200': String(k200),
      '100': String(k100),
      '50': String(k50),
    });
  }

  function handleResetCount() {
    setDenominations({
      '1000': '',
      '500': '',
      '200': '',
      '100': '',
      '50': '',
    });
  }

  function handlePrintReport() {
    printCashierEodReport({
      dateISO: todayIso,
      cashierName: ws?.session?.user?.name || ws?.session?.user?.email || 'Cashier',
      branchLabel: ws?.snapshot?.branch?.name || ws?.workspaceBranchId || 'Zarewa Branch',
      denominations,
      physicalCashNgn: physicalCashTotal,
      bookCashNgn: bookCashBalance,
      varianceNgn: variance,
      posBalanceNgn: posBalance,
      confirmedReceiptsCount: confirmedTodayReceipts.length,
      confirmedReceiptsNgn: confirmedTodayNgn,
      pendingReceiptsCount: pendingReceipts.length,
      pendingReceiptsNgn: pendingReceiptsNgn,
      payoutsCount: payoutsToday.length,
      payoutsNgn: payoutsTodayNgn,
      notes: eodNotes,
    });
  }

  return (
    <div id="desk-eod" className="space-y-6 animate-in fade-in duration-300 scroll-mt-20">
      {/* Intro Header */}
      <div className="rounded-2xl border border-teal-200/90 bg-gradient-to-r from-teal-50/90 via-emerald-50/50 to-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-100/70 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-zarewa-teal">
              <ClipboardCheck size={13} />
              SOP-02 §3.3 &amp; §12 Compliance
            </div>
            <h2 className="text-lg font-black text-slate-900">
              Cashier Daily Safe Balancing &amp; End-of-Day Close
            </h2>
            <p className="text-ui-xs text-slate-600 max-w-2xl leading-relaxed">
              Verify your physical cash count against the system till balance, confirm all daily receipts are cleared, and print your signed EOD sign-off report for the Branch Manager.
            </p>
          </div>

          <button
            type="button"
            onClick={handlePrintReport}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-zarewa-teal px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:brightness-110 active:scale-[0.98] transition shrink-0"
          >
            <Printer size={15} />
            Print Closing Report
          </button>
        </div>
      </div>

      {/* Stage 1: Daily Queue Health */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
          Step 1 · Daily Queue Health Checklist
        </h3>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Confirmed Receipts */}
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-ui-xs font-bold uppercase text-emerald-950/80">Cleared Today</span>
              <CheckCircle2 size={16} className="text-emerald-600" />
            </div>
            <p className="mt-1 text-xl font-black tabular-nums text-emerald-900">
              {formatNgn(confirmedTodayNgn)}
            </p>
            <p className="text-ui-xs text-emerald-800/80 mt-0.5">
              {confirmedTodayReceipts.length} receipt{confirmedTodayReceipts.length !== 1 ? 's' : ''} recognized in books
            </p>
          </div>

          {/* Pending Receipts Alert */}
          <div
            className={`rounded-xl border p-3.5 ${
              pendingReceipts.length > 0
                ? 'border-amber-300 bg-amber-50/70 text-amber-950'
                : 'border-slate-200 bg-white text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-ui-xs font-bold uppercase opacity-80">Pending Clearance</span>
              {pendingReceipts.length > 0 ? (
                <AlertTriangle size={16} className="text-amber-600" />
              ) : (
                <CheckCircle2 size={16} className="text-emerald-500" />
              )}
            </div>
            <p className="mt-1 text-xl font-black tabular-nums">
              {formatNgn(pendingReceiptsNgn)}
            </p>
            <div className="flex items-center justify-between mt-0.5 text-ui-xs">
              <span className="opacity-80">
                {pendingReceipts.length ? `${pendingReceipts.length} waiting confirmation` : 'All cleared ✓'}
              </span>
              {pendingReceipts.length > 0 && onGoToTab ? (
                <button
                  type="button"
                  onClick={() => onGoToTab('receipts')}
                  className="font-bold underline text-amber-900 hover:text-amber-950"
                >
                  Clear now
                </button>
              ) : null}
            </div>
          </div>

          {/* Till Safe Book Balance */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-ui-xs font-bold uppercase text-slate-500">System Till Book</span>
              <Coins size={16} className="text-zarewa-teal" />
            </div>
            <p className="mt-1 text-xl font-black tabular-nums text-zarewa-teal">
              {formatNgn(bookCashBalance)}
            </p>
            <p className="text-ui-xs text-slate-500 mt-0.5 truncate">
              {cashAccount?.name || 'Primary Cash Safe'}
            </p>
          </div>
        </div>
      </section>

      {/* Stage 2: Physical Cash Denomination Calculator */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Coins size={18} className="text-teal-700" />
              Step 2 · Physical Cash Safe Count (Denomination Counter)
            </h3>
            <p className="text-ui-xs text-slate-500 mt-0.5">
              Count each note bundle in your physical safe and enter the count below.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoFillBalance}
              className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-ui-xs font-bold text-zarewa-teal hover:bg-teal-100 transition"
              title="Populate note count to match book balance exactly"
            >
              <Sparkles size={13} />
              Quick-Fill from Book
            </button>
            <button
              type="button"
              onClick={handleResetCount}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-ui-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          </div>
        </div>

        {/* Denomination Rows */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { key: '1000', label: '₦1,000 Notes', multiplier: 1000 },
            { key: '500', label: '₦500 Notes', multiplier: 500 },
            { key: '200', label: '₦200 Notes', multiplier: 200 },
            { key: '100', label: '₦100 Notes', multiplier: 100 },
            { key: '50', label: '₦50 & Others', multiplier: 50 },
          ].map(({ key, label, multiplier }) => {
            const count = Number(denominations[key]) || 0;
            const subtotal = count * multiplier;
            return (
              <div
                key={key}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 hover:bg-slate-50 transition"
              >
                <div className="w-28 sm:w-32">
                  <span className="text-xs font-bold text-slate-800">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-ui-xs text-slate-400 font-mono">×</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={denominations[key]}
                    onChange={(e) => updateDenom(key, e.target.value)}
                    className="w-20 sm:w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-sm font-black tabular-nums text-slate-800 outline-none focus:ring-2 focus:ring-zarewa-teal/20"
                  />
                  <span className="text-ui-xs text-slate-400 font-mono">=</span>
                </div>
                <div className="w-28 text-right font-mono text-sm font-bold tabular-nums text-zarewa-teal">
                  {formatNgn(subtotal)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Variance Comparison Card */}
        <div
          className={`rounded-2xl border p-4.5 transition-colors ${
            !hasCount
              ? 'border-slate-200 bg-slate-50/80 text-slate-700'
              : isBalanced
                ? 'border-emerald-300 bg-emerald-50/80 text-emerald-950'
                : variance > 0
                  ? 'border-amber-300 bg-amber-50/80 text-amber-950'
                  : 'border-rose-300 bg-rose-50/80 text-rose-950'
          }`}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-center sm:text-left sm:divide-x sm:divide-slate-200/80">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider opacity-75">
                A. Physical Cash Counted
              </p>
              <p className="mt-1 text-2xl font-black tabular-nums">
                {formatNgn(physicalCashTotal)}
              </p>
            </div>

            <div className="sm:pl-5">
              <p className="text-[11px] font-bold uppercase tracking-wider opacity-75">
                B. System Till Balance
              </p>
              <p className="mt-1 text-2xl font-black tabular-nums">
                {formatNgn(bookCashBalance)}
              </p>
            </div>

            <div className="sm:pl-5">
              <p className="text-[11px] font-bold uppercase tracking-wider opacity-75">
                Variance (A - B)
              </p>
              <div className="mt-1 flex items-center justify-center sm:justify-start gap-2">
                <span className="text-2xl font-black tabular-nums">
                  {hasCount ? formatNgn(Math.abs(variance)) : '₦0'}
                </span>
                {hasCount && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      isBalanced
                        ? 'bg-emerald-200 text-emerald-900'
                        : variance > 0
                          ? 'bg-amber-200 text-amber-900'
                          : 'bg-rose-200 text-rose-900'
                    }`}
                  >
                    {isBalanced ? 'Balanced ✓' : variance > 0 ? 'Overage' : 'Shortage'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {hasCount && !isBalanced ? (
            <div className="mt-3 rounded-lg border border-amber-200/90 bg-white/70 p-2.5 text-xs flex items-start gap-2">
              <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-snug">
                <strong>Discrepancy Detected:</strong> Physical safe count differs from system balance by{' '}
                <span className="font-mono font-bold">{formatNgn(variance)}</span>. Recount physical bundles, verify
                all pending receipts/payouts for today, and record an explanation in the notes below before escalation.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {/* Stage 3: Remarks and Sign-off */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
          Step 3 · Closing Remarks &amp; Escalation Notes
        </h3>
        <textarea
          rows={3}
          value={eodNotes}
          onChange={(e) => setEodNotes(e.target.value)}
          placeholder="e.g. All physical cash counts verified with Branch Manager. One unconfirmed POS payment escalated to sales for customer slip confirmation."
          className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-zarewa-teal/15 focus:border-teal-400"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-ui-xs text-slate-500">
            Per SOP-02 §12, print and attach physical denomination sheet to branch daily cashier envelope.
          </p>
          <button
            type="button"
            onClick={handlePrintReport}
            className="inline-flex items-center gap-2 rounded-xl bg-zarewa-teal px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:brightness-110 active:scale-[0.98] transition"
          >
            <Printer size={15} />
            Generate &amp; Print EOD Sign-off Pack
          </button>
        </div>
      </section>
    </div>
  );
}
