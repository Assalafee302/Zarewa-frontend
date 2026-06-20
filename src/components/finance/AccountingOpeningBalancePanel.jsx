import React, { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../Data/mockData';
import { AccountingDeskPageIntro } from './accounting/AccountingDeskUi';
import { AccountingRegisterHeader } from './accounting/AccountingRegisterLayout';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ACCOUNTING_OPENING_DATE_ISO, ACCOUNTING_OPENING_DATE_LABEL } from '../../shared/accountingCutover';

const DEFAULT_DATE = ACCOUNTING_OPENING_DATE_ISO;

const QUICK_LINES = [
  { accountCode: '1001', label: 'Cash — bank 1', side: 'debit' },
  { accountCode: '1200', label: 'Trade receivable', side: 'debit' },
  { accountCode: '1300', label: 'Inventory', side: 'debit' },
  { accountCode: '1400', label: 'Supplier prepayment', side: 'debit' },
  { accountCode: '1500', label: 'Plant & machinery', side: 'debit' },
  { accountCode: '2000', label: 'Trade payables', side: 'credit' },
  { accountCode: '2500', label: 'Customer deposits', side: 'credit' },
  { accountCode: '3100', label: "Owner's capital", side: 'credit' },
  { accountCode: '3900', label: 'Retained earnings', side: 'credit' },
];

function emptyLine() {
  return { accountCode: '', debitNgn: '', creditNgn: '', memo: '' };
}

/**
 * @param {{ showToast?: (msg: string, opts?: object) => void; deskLayout?: boolean }} props
 */
export function AccountingOpeningBalancePanel({ showToast, deskLayout = false }) {
  const ws = useWorkspace();
  const [entryDate, setEntryDate] = useState(DEFAULT_DATE);
  const [lines, setLines] = useState([emptyLine(), emptyLine()]);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadStatus = useCallback(async () => {
    const res = await apiFetch('/api/finance/opening-balance/status');
    if (res.ok && res.data?.ok) setStatus(res.data);
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const totals = lines.reduce(
    (acc, l) => {
      acc.debit += Math.round(Number(String(l.debitNgn).replace(/,/g, '')) || 0);
      acc.credit += Math.round(Number(String(l.creditNgn).replace(/,/g, '')) || 0);
      return acc;
    },
    { debit: 0, credit: 0 }
  );
  const balanced = totals.debit > 0 && totals.debit === totals.credit;

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

  const post = async () => {
    if (!balanced) {
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
        memo: `Opening balance ${entryDate}`,
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
      showToast?.(res.data.duplicate ? 'Opening balance already posted (unchanged).' : 'Opening balance posted to GL.');
      await loadStatus();
    } finally {
      setBusy(false);
    }
  };

  const statusAction = (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase text-[#134e4a]"
      onClick={loadStatus}
    >
      <RefreshCw size={14} />
      Status
    </button>
  );

  return (
    <div className="space-y-5">
      {deskLayout ? (
        <AccountingRegisterHeader compact actions={statusAction} />
      ) : (
        <AccountingDeskPageIntro
          title={`Opening balance — ${ACCOUNTING_OPENING_DATE_LABEL} cutover`}
          description="Enter last closing balances once. Posts a single balanced journal to the general ledger. Use average stock cost and confirmed bank cash per account."
          action={statusAction}
        />
      )}

      {status?.posted ? (
        <p className="rounded-lg border border-teal-200 bg-teal-50/50 px-3 py-2 text-[11px] font-semibold text-teal-900">
          Opening balance journal already posted ({status.journals?.[0]?.entry_date_iso || '—'}).
        </p>
      ) : null}

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
          Debits {formatNgn(totals.debit)} · Credits {formatNgn(totals.credit)}
          {balanced ? (
            <span className="ml-2 text-teal-700">Balanced</span>
          ) : (
            <span className="ml-2 text-amber-700">Not balanced</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_LINES.map((q) => (
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
          className="rounded-lg bg-[#134e4a] px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-white disabled:opacity-50"
          onClick={post}
          disabled={busy || !balanced}
        >
          {busy ? 'Posting…' : 'Post opening balance'}
        </button>
      </div>
    </div>
  );
}
