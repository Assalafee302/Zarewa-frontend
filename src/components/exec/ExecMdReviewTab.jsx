import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, Printer, RefreshCw, Save } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { useToast } from '../../context/ToastContext';
import { buildMdChairmanPackHtml } from '../../lib/mdChairmanPackPrint';
import { openPrintHtmlDocument } from '../../lib/officeDeskPrint';
import { ExecMdPeoplePanel } from './ExecMdPeoplePanel';
import { ExecMdSupplyPanel } from './ExecMdSupplyPanel';
import { ExecMdBranchesPanel } from './ExecMdBranchesPanel';
import { ExecBranchSlideOver } from './ExecBranchSlideOver';

const COUNT_LABELS = [
  { key: 'approvedPaymentRequestsAboveExpenseThreshold', label: 'Large approved payments' },
  { key: 'refundsPendingInMonth', label: 'Refunds pending' },
  { key: 'unfiledWorkItemsIncomplete', label: 'Unfiled work items' },
  { key: 'interBranchRequestsOpen', label: 'Inter-branch open' },
  { key: 'materialIncidentsPendingApproval', label: 'Material incidents' },
];

export function ExecMdReviewTab({
  data,
  busy,
  readOnly,
  formatNgn,
  branchScopeLabel,
  onOpenDecide,
  onOpenCustomers,
  onOpenTrace,
  onOpenIntelligence,
  payrollItems,
  onReview,
}) {
  const { show: showToast } = useToast();
  const [selectedBranch, setSelectedBranch] = useState(null);
  const monthKey = useMemo(
    () => String(data?.mdOperationsMonth?.monthKey || data?.period?.endISO || '').slice(0, 7),
    [data]
  );
  const [narrative, setNarrative] = useState('');
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteMeta, setNoteMeta] = useState(null);

  const loadNote = useCallback(async () => {
    if (!monthKey) return;
    setNoteBusy(true);
    const { ok, data: d } = await apiFetch(`/api/exec/review-note?monthKey=${encodeURIComponent(monthKey)}`);
    setNoteBusy(false);
    if (!ok || !d?.ok) {
      setNarrative('');
      setNoteMeta(null);
      return;
    }
    setNarrative(String(d.narrative || ''));
    setNoteMeta({ updatedAtIso: d.updatedAtIso, updatedByDisplay: d.updatedByDisplay });
  }, [monthKey]);

  useEffect(() => {
    void loadNote();
  }, [loadNote]);

  const saveNote = async () => {
    if (readOnly) return;
    setNoteSaving(true);
    const { ok, data: d } = await apiFetch('/api/exec/review-note', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthKey, narrative }),
    });
    setNoteSaving(false);
    if (!ok || !d?.ok) {
      showToast(d?.error || 'Could not save review note.', { variant: 'error' });
      return;
    }
    setNoteMeta({ updatedAtIso: d.updatedAtIso, updatedByDisplay: d.updatedByDisplay });
    showToast('Chairman narrative saved.', { variant: 'success' });
  };

  const printPack = () => {
    const html = buildMdChairmanPackHtml({
      monthKey,
      branchScopeLabel,
      period: data?.period,
      kpis: data?.kpis,
      mdOperationsMonth: data?.mdOperationsMonth,
      branches: data?.branches,
      champion: data?.cockpit?.championCustomer,
      narrative,
      generatedAtISO: data?.generatedAtISO,
      formatNgn,
    });
    openPrintHtmlDocument(html, `Chairman summary ${monthKey}`);
  };

  const mdPack = data?.mdOperationsMonth;
  const counts = mdPack?.counts || {};

  return (
    <div className="space-y-6 mb-8">
      <div className="rounded-xl border border-teal-200/80 bg-teal-50/30 px-4 py-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-teal-800 flex items-center gap-1">
            <FileText size={12} /> Monthly review
          </p>
          <h2 className="text-lg font-bold text-[#134e4a] mt-1">Chairman pack · {monthKey || '—'}</h2>
          <p className="text-[11px] text-slate-600 mt-1 max-w-xl">
            Exception-oriented monthly snapshot for board / chairman briefing. Save your narrative, then print or
            export as PDF from the browser.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={printPack}
            disabled={busy && !data}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#134e4a] px-3 py-2 text-[10px] font-black uppercase text-white hover:brightness-105 disabled:opacity-50"
          >
            <Printer size={14} />
            Print chairman pack
          </button>
          {!readOnly ? (
            <button
              type="button"
              onClick={() => void saveNote()}
              disabled={noteSaving || noteBusy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Save size={14} />
              {noteSaving ? 'Saving…' : 'Save narrative'}
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        {COUNT_LABELS.map(({ key, label }) => (
          <div key={key} className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-black text-[#134e4a] tabular-nums">
              {busy && !mdPack ? '…' : String(counts[key] ?? 0)}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-[#134e4a]">MD narrative for chairman</p>
          <button
            type="button"
            onClick={() => void loadNote()}
            disabled={noteBusy}
            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-slate-500 hover:text-[#134e4a]"
          >
            <RefreshCw size={12} className={noteBusy ? 'animate-spin' : ''} />
            Reload
          </button>
        </div>
        <textarea
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          readOnly={readOnly}
          rows={6}
          placeholder="What happened this month? Cash, production, people, risks, and asks for the chairman…"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#134e4a]/15 disabled:bg-slate-50"
        />
        {noteMeta?.updatedAtIso ? (
          <p className="text-[10px] text-slate-500">
            Last saved {new Date(noteMeta.updatedAtIso).toLocaleString()}
            {noteMeta.updatedByDisplay ? ` · ${noteMeta.updatedByDisplay}` : ''}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ExecMdPeoplePanel
          payrollItems={payrollItems}
          payrollCount={data?.cash?.payrollDraftsAwaitingMd}
          readOnly={readOnly}
          onReview={onReview}
          busy={busy}
        />
        <ExecMdSupplyPanel
          inventory={data?.inventory}
          coilPulse={data?.cockpit?.pulses?.coil}
          onOpenIntelligence={onOpenIntelligence}
          busy={busy}
        />
        <ExecMdBranchesPanel
          branches={data?.branches}
          formatNgn={formatNgn}
          busy={busy}
          onSelectBranch={setSelectedBranch}
        />
      </div>

      <ExecBranchSlideOver
        branch={selectedBranch}
        isOpen={Boolean(selectedBranch)}
        onClose={() => setSelectedBranch(null)}
        formatNgn={formatNgn}
      />

      <div className="flex flex-wrap gap-2">
        {onOpenDecide ? (
          <button
            type="button"
            onClick={onOpenDecide}
            className="rounded-lg border border-[#134e4a]/20 bg-[#134e4a]/5 px-3 py-1.5 text-[10px] font-bold uppercase text-[#134e4a] hover:bg-[#134e4a]/10"
          >
            Open Decide queue
          </button>
        ) : null}
        {onOpenCustomers ? (
          <button
            type="button"
            onClick={onOpenCustomers}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase text-slate-700 hover:bg-slate-50"
          >
            Customers
          </button>
        ) : null}
        {onOpenTrace ? (
          <button
            type="button"
            onClick={onOpenTrace}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase text-slate-700 hover:bg-slate-50"
          >
            MD Trace
          </button>
        ) : null}
      </div>
    </div>
  );
}
