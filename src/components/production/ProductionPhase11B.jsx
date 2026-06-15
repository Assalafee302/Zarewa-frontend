import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { formatPersonName } from '../../lib/formatPersonName';
import { canApproveProductionGate, PRODUCTION_GATE_OVERRIDE_NOTE_MIN_LEN } from '../../lib/productionGateAccess';

function toneClass(tone) {
  if (tone === 'rose') return 'border-rose-300 bg-rose-50 text-rose-950';
  if (tone === 'violet') return 'border-violet-300 bg-violet-50 text-violet-950';
  return 'border-amber-300 bg-amber-50 text-amber-950';
}

/**
 * Quote → production → refund → payout timeline (Phase 11B).
 */
export function QuotationLifecycleTimeline({ quotationId, className = '' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = String(quotationId || '').trim();
    if (!id) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiFetch(`/api/quotations/${encodeURIComponent(id)}/lifecycle-timeline`)
      .then(({ ok, data: body }) => {
        if (cancelled) return;
        setData(ok && body?.ok !== false ? body : null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [quotationId]);

  if (!quotationId) return null;

  if (loading) {
    return (
      <div className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-4 text-[11px] text-slate-500 ${className}`}>
        <RefreshCw className="animate-spin" size={16} />
        Loading lifecycle timeline…
      </div>
    );
  }

  if (!data?.events?.length) {
    return (
      <div className={`rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[11px] text-slate-500 ${className}`}>
        No lifecycle events recorded for this quotation yet.
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm ${className}`}>
      <p className="text-[10px] font-black uppercase tracking-widest text-[#134e4a]">Lifecycle timeline</p>
      <p className="mt-0.5 text-[10px] text-slate-500">
        {formatPersonName(data.customerName || '—')} · {data.quotationId}
      </p>
      <ol className="mt-3 space-y-2 border-l-2 border-teal-200/80 pl-3">
        {data.events.map((ev, idx) => (
          <li key={`${ev.kind}-${ev.atISO}-${idx}`} className="relative text-[11px]">
            <span className="absolute -left-[1.15rem] top-1.5 h-2 w-2 rounded-full bg-teal-500 ring-2 ring-white" />
            <p className="font-semibold text-slate-900">{ev.label}</p>
            <p className="text-[10px] text-slate-600">
              {(ev.atISO || '').slice(0, 16).replace('T', ' ') || '—'}
              {ev.actor ? ` · ${formatPersonName(ev.actor)}` : ''}
            </p>
            {ev.detail ? <p className="mt-0.5 font-mono text-[10px] text-slate-700">{ev.detail}</p> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ProductionJobIntelBanner({ intel, formatMeters }) {
  if (!intel) return null;
  const alerts = [];
  if (['High', 'Low'].includes(String(intel.conversionAlertState || ''))) {
    alerts.push({
      tone: 'violet',
      title: `${intel.conversionAlertState} conversion`,
      body: intel.managerReviewRequired
        ? 'Manager review required before sign-off.'
        : 'Review conversion check before completing.',
    });
  }
  if (intel.metreVarianceFlag) {
    alerts.push({
      tone: 'amber',
      title: `Metre variance ${intel.metreVariancePct}%`,
      body: `Planned ${formatMeters(intel.plannedMeters)} vs actual ${formatMeters(intel.actualMeters)} (threshold ${intel.metreVarianceThresholdPct}%).`,
    });
  }
  if (intel.paymentGateRequired && !intel.managerProductionApprovedAtISO) {
    alerts.push({
      tone: 'rose',
      title: `Payment gate — ${intel.quotePaidPct ?? '—'}% paid`,
      body: `Quote paid below ${Math.round((intel.paymentGateMinFraction || 0.7) * 100)}% — BM production override required before cutting list / production.`,
    });
  } else if (intel.managerProductionApprovedAtISO) {
    alerts.push({
      tone: 'amber',
      title: 'BM production gate override',
      body: `${formatPersonName(intel.managerProductionApprovedByName || 'Manager')} · ${(intel.managerProductionApprovedAtISO || '').slice(0, 10)}${
        intel.managerProductionPaidFractionAtApproval != null
          ? ` · ${Math.round(Number(intel.managerProductionPaidFractionAtApproval) * 1000) / 10}% paid at approval`
          : ''
      }`,
    });
  }
  const acc = intel.accessorySummary;
  const stone = intel.stoneFlatsheetSummary;
  const supplyBits = [];
  if (acc?.lineCount) supplyBits.push(`${acc.lineCount} accessory line(s) · ${acc.totalSuppliedQty} supplied`);
  if (stone?.lineCount) supplyBits.push(`${stone.lineCount} stone line(s) · ${stone.totalSuppliedM2?.toFixed?.(1) ?? stone.totalSuppliedM2} m²`);

  return (
    <div className="space-y-2">
      {alerts.map((a) => (
        <div key={a.title} className={`rounded-lg border px-2.5 py-2 text-[10px] leading-snug ${toneClass(a.tone)}`}>
          <p className="font-black uppercase tracking-wide">{a.title}</p>
          <p className="mt-0.5">{a.body}</p>
        </div>
      ))}
      {supplyBits.length ? (
        <p className="rounded-md border border-slate-200 bg-slate-50/90 px-2 py-1.5 text-[10px] text-slate-700">
          <span className="font-bold text-slate-800">Supply posted: </span>
          {supplyBits.join(' · ')}
        </p>
      ) : null}
      {intel.needsBmAttention || intel.needsMdAttention ? (
        <p className="text-[9px] font-bold uppercase tracking-wide text-rose-700">
          {intel.needsBmAttention ? 'Needs BM attention' : ''}
          {intel.needsBmAttention && intel.needsMdAttention ? ' · ' : ''}
          {intel.needsMdAttention ? 'Needs MD / spec review' : ''}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Phase 12C — BM production gate override from live production monitor.
 */
export function ProductionPaymentGateOverridePanel({
  quotationId,
  intel,
  canMutate = true,
  roleKey = '',
  onSuccess,
}) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const qid = String(quotationId || '').trim();
  const showPanel = intel?.paymentGateRequired && !intel?.managerProductionApprovedAtISO;
  const mayOverride = canApproveProductionGate(roleKey);

  if (!qid || !showPanel) return null;
  if (!canMutate || !mayOverride) {
    return (
      <p className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[9px] text-slate-600">
        Payment gate override requires <span className="font-bold">Branch Manager or MD</span> approval.
      </p>
    );
  }

  const submit = async () => {
    const reason = note.trim();
    if (reason.length < PRODUCTION_GATE_OVERRIDE_NOTE_MIN_LEN) {
      setError(`Enter an override reason (at least ${PRODUCTION_GATE_OVERRIDE_NOTE_MIN_LEN} characters).`);
      return;
    }
    setError('');
    setSaving(true);
    const { ok, data } = await apiFetch('/api/management/review', {
      method: 'POST',
      body: JSON.stringify({ quotationId: qid, decision: 'approve_production', reason }),
    });
    setSaving(false);
    if (!ok || data?.ok === false) {
      setError(data?.error || 'Could not save production gate override.');
      return;
    }
    setNote('');
    onSuccess?.();
  };

  return (
    <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50/70 p-2.5 space-y-2">
      <p className="text-[9px] font-black uppercase tracking-wide text-rose-900">BM production gate override</p>
      <p className="text-[10px] text-rose-950 leading-snug">
        Quote paid {intel.quotePaidPct ?? '—'}% — record branch manager approval to document why production proceeded below
        the {Math.round((intel.paymentGateMinFraction || 0.7) * 100)}% threshold.
      </p>
      <textarea
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Why production / cutting list may proceed…"
        className="w-full rounded-md border border-rose-200 bg-white px-2 py-1.5 text-[10px] text-slate-800 resize-none"
      />
      {error ? <p className="text-[9px] font-semibold text-rose-800">{error}</p> : null}
      <button
        type="button"
        disabled={saving}
        onClick={() => void submit()}
        className="w-full rounded-md bg-[#134e4a] px-2 py-1.5 text-[9px] font-black uppercase tracking-wide text-white disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Record BM override'}
      </button>
    </div>
  );
}
