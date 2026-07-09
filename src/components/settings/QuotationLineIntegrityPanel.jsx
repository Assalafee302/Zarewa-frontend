import React, { useCallback, useState } from 'react';
import { AlertTriangle, ClipboardList, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';

function formatNgn(n) {
  const v = Math.round(Number(n) || 0);
  return `₦${v.toLocaleString('en-NG')}`;
}

export default function QuotationLineIntegrityPanel() {
  const { show: showToast } = useToast();
  const ws = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const canRun = Boolean(
    ws?.hasPermission?.('finance.approve') ||
      ws?.hasPermission?.('refunds.approve') ||
      ws?.hasPermission?.('quotations.manage') ||
      ws?.hasPermission?.('settings.view')
  );

  const runAudit = useCallback(async () => {
    if (!canRun || busy) return;
    setBusy(true);
    try {
      const { ok, data } = await apiFetch('/api/admin/quotations/line-integrity-audit?limit=500');
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Audit failed.', { variant: 'error' });
        return;
      }
      setResult(data);
      if (data.invalidCount > 0) {
        showToast(
          `Found ${data.invalidCount} quotation(s) with line integrity issues (scanned ${data.scannedCount}).`,
          { variant: 'info' }
        );
      } else {
        showToast(`No line integrity issues in ${data.scannedCount} scanned quotation(s).`, {
          variant: 'success',
        });
      }
    } finally {
      setBusy(false);
    }
  }, [canRun, busy, showToast]);

  if (!canRun) return null;

  return (
    <section className="rounded-3xl border border-amber-200/80 bg-amber-50/30 p-6 shadow-sm">
      <h3 className="z-section-title flex items-center gap-2 text-amber-950">
        <ClipboardList size={14} /> Quotation line integrity audit
      </h3>
      <p className="text-xs text-slate-600 mb-4 max-w-2xl leading-relaxed">
        Scans quotations in the current branch scope for lines with missing products, zero qty/price, or stone
        flatsheet rows without length. Fix these before refunds — they can skew economic floor and category caps.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void runAudit()}
        className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2 text-xs font-bold text-amber-950 hover:bg-amber-50 disabled:opacity-50"
      >
        <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />
        {busy ? 'Scanning…' : 'Run audit'}
      </button>

      {result ? (
        <div className="mt-5 space-y-3">
          <p className="text-xs text-slate-600">
            Scanned <span className="font-semibold">{result.scannedCount}</span> of{' '}
            <span className="font-semibold">{result.quotationCount}</span> quotations
            {result.truncated ? ' (limit reached — narrow branch scope or raise limit)' : ''}. Invalid:{' '}
            <span className="font-semibold text-amber-900">{result.invalidCount}</span>
          </p>
          {result.invalidCount > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-amber-200 bg-white">
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-amber-100 bg-amber-50/80 text-[10px] font-bold uppercase text-amber-900">
                  <tr>
                    <th className="px-3 py-2">Quotation</th>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2">Paid</th>
                    <th className="px-3 py-2">Issue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(result.rows || []).map((row) => (
                    <tr key={row.quotationId} className="text-slate-700">
                      <td className="px-3 py-2 font-mono font-semibold">{row.quotationId}</td>
                      <td className="px-3 py-2">{row.customerName || '—'}</td>
                      <td className="px-3 py-2 tabular-nums">{formatNgn(row.paidNgn)}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-start gap-1 text-amber-900">
                          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                          <span>{row.issues?.[0]?.message || row.issues?.[0]?.code || 'Invalid lines'}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs font-medium text-emerald-800">No invalid quotation lines in the scanned set.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
