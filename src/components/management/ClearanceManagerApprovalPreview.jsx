import React from 'react';
import { RefreshCw, CheckCircle2, RotateCcw, Flag, Unlock, Zap, BadgeCheck } from 'lucide-react';
import { formatPersonName } from '../../lib/formatPersonName';
import { formatStageActor } from '../../lib/actorAttribution';
import { accountingReceivableOutstandingNgn, quotationWaivedBalanceNgn } from '../../lib/customerLedgerCore.js';
import {
  evaluateReceivableWriteOff,
  registerReceivableOutstandingNgn,
  MAX_ROUND_OFF_WAIVE_NGN,
} from '../../lib/receivableWriteOffPolicy.js';
import { IntelStat, CaseStrip } from './managementIntelUi';
import { ManagementQuotationIntelGrid } from './ManagementQuotationIntelGrid';
import {
  DecisionActionBar,
  DecisionActionTile,
  DecisionBand,
  DecisionChip,
} from './DecisionSurface';

function percentPaid(paid, total) {
  const p = Math.round(Number(paid) || 0);
  const t = Math.round(Number(total) || 0);
  if (t <= 0) return p > 0 ? 100 : 0;
  return Math.min(100, Math.round((p / t) * 100));
}

/**
 * Clearance / flagged / production-gate review — lean case strip + quote/money/ops.
 */
export function ClearanceManagerApprovalPreview({
  quoteId,
  inboxRow,
  auditData,
  paymentIntel,
  loadingAudit,
  loadingIntel,
  formatNgn,
  decisionBusy,
  reviewContext = 'clearance',
  fromProductionGate = false,
  cuttingListId = '',
  showReleasePayments = false,
  officialRecord = null,
  onOpenRecord,
  onApprove,
  onDisapprove,
  onFlag,
  onReleasePayments,
  onProductionOverride,
  onWaiveBalance,
  onWriteOffReceivable,
  canProductionOverride = true,
  canManagerClearance = true,
  canReleasePaymentHolds = false,
  canWriteOffBadDebt = false,
}) {
  const loading = loadingAudit || (loadingIntel && !paymentIntel);
  const paidNgn = Number(inboxRow?.paid_ngn ?? auditData?.summary?.paidNgn) || 0;
  const totalNgn = Number(inboxRow?.total_ngn ?? auditData?.summary?.orderTotalNgn) || 0;
  const waivedNgn = quotationWaivedBalanceNgn(inboxRow || auditData?.quotation || {});
  const strictReceivableNgn = accountingReceivableOutstandingNgn(totalNgn, paidNgn, waivedNgn);
  const receivableNgn = registerReceivableOutstandingNgn(totalNgn, paidNgn, waivedNgn);
  const writeOffEval = evaluateReceivableWriteOff(totalNgn, paidNgn, waivedNgn);
  const pct = percentPaid(paidNgn, totalNgn);
  const stageActors = auditData?.stageActors || {};

  const titleByContext = {
    clearance: 'Manager clearance',
    flagged: 'Flagged quotation',
    production: 'Production gate',
  };
  const toneByContext = {
    clearance: 'clearance',
    flagged: 'flagged',
    production: 'production',
  };

  const recordRef = officialRecord?.referenceNo || officialRecord?.id || quoteId;
  const recordMeta = officialRecord
    ? [officialRecord.documentClass, String(officialRecord.documentType || '').replace(/_/g, ' ')]
        .filter(Boolean)
        .join(' · ')
    : null;

  const caseActors = [
    formatStageActor(stageActors.managerClear),
    formatStageActor(stageActors.managerFlag),
    formatStageActor(stageActors.managerProduction),
    formatStageActor(stageActors.bmPriceException),
    formatStageActor(stageActors.mdPriceException),
  ].filter(Boolean);

  return (
    <div className="animate-in fade-in space-y-3 duration-200">
      <DecisionBand
        tone={toneByContext[reviewContext] || 'clearance'}
        eyebrow={titleByContext[reviewContext] || titleByContext.clearance}
        title={quoteId}
        subtitle={formatPersonName(inboxRow?.customer_name || '—')}
        aside={
          <>
            <p className="text-ui-xs font-bold uppercase text-slate-400">Paid</p>
            <p className="text-xl font-black tabular-nums text-emerald-800">{formatNgn(paidNgn)}</p>
            <p className="text-ui-xs text-slate-500">
              of {formatNgn(totalNgn)} · <strong>{pct}%</strong>
            </p>
          </>
        }
        meta={
          fromProductionGate ? <DecisionChip tone="amber">Production gate</DecisionChip> : null
        }
      >
        {fromProductionGate ? (
          <p className="mt-2 text-ui-xs leading-snug text-amber-800">
            Low payment{cuttingListId ? ` · cutting list ${cuttingListId}` : ''}.{' '}
            {Math.round(Number(inboxRow?.paid_ngn) || 0) <= 0
              ? 'Zero payment — MD approval required before cutting list / production.'
              : 'Branch Manager may approve when some payment is on file but below threshold.'}
          </p>
        ) : null}
        {reviewContext === 'flagged' && inboxRow?.manager_flag_reason ? (
          <p className="mt-2 line-clamp-3 text-ui-xs leading-snug text-rose-800">{inboxRow.manager_flag_reason}</p>
        ) : null}
      </DecisionBand>

      <CaseStrip
        recordRef={recordRef}
        recordMeta={recordMeta}
        summary={officialRecord?.keyDecisionSummary || null}
        status={inboxRow?.status || auditData?.quotation?.status}
        chips={
          <>
            {waivedNgn > 0 ? <DecisionChip tone="emerald">Waived {formatNgn(waivedNgn)}</DecisionChip> : null}
            {auditData?.summary?.managerClearedAtIso ? (
              <DecisionChip tone="teal">Cleared</DecisionChip>
            ) : null}
            {auditData?.summary?.managerFlaggedAtIso || inboxRow?.manager_flagged_at_iso ? (
              <DecisionChip tone="rose">Flagged</DecisionChip>
            ) : null}
          </>
        }
        stats={
          <div className="flex gap-1.5">
            <IntelStat label="% paid" value={`${pct}%`} accent />
            <IntelStat label="Receivable" value={formatNgn(receivableNgn)} />
          </div>
        }
        actors={caseActors}
        onOpenRecord={onOpenRecord || undefined}
        openRecordLabel="Open record"
      >
        {waivedNgn > 0 ? (
          <p className="mt-1 text-ui-xs text-emerald-900">
            Manager waived {formatNgn(waivedNgn)} — removed from AR register.
          </p>
        ) : null}
        {strictReceivableNgn > 0 && receivableNgn === 0 ? (
          <p className="mt-1 text-ui-xs text-teal-900">
            Remaining {formatNgn(strictReceivableNgn)} is within the{' '}
            {MAX_ROUND_OFF_WAIVE_NGN.toLocaleString('en-NG')} round-off band.
          </p>
        ) : null}
        {strictReceivableNgn > 0 && receivableNgn > 0 ? (
          <p className="mt-1 text-ui-xs leading-snug text-slate-600">
            {writeOffEval.kind === 'round_off'
              ? writeOffEval.message
              : writeOffEval.blockReason ||
                writeOffEval.message ||
                'Material balance — collect payment or MD write-off required.'}
          </p>
        ) : null}
      </CaseStrip>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-16">
          <RefreshCw className="animate-spin text-zarewa-teal" size={28} />
          <span className="text-xs font-semibold text-slate-500">Loading quotation context…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <ManagementQuotationIntelGrid
            auditData={auditData}
            paymentIntel={paymentIntel}
            formatNgn={formatNgn}
          />
        </div>
      )}

      {!loading ? (
        <DecisionActionBar hint="Approve records clearance. Disapprove blocks with a reason; Flag keeps it in the audit queue.">
          {showReleasePayments && canReleasePaymentHolds ? (
            <button
              type="button"
              disabled={decisionBusy}
              onClick={onReleasePayments}
              className="mb-1 flex w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-600 p-3 text-white transition-colors hover:bg-sky-500 disabled:opacity-50"
            >
              <Unlock size={16} />
              <span className="text-ui-xs font-black uppercase tracking-widest">Release for payments</span>
            </button>
          ) : null}

          {canManagerClearance && writeOffEval.kind === 'round_off' && strictReceivableNgn > 0 && paidNgn > 0 ? (
            <button
              type="button"
              disabled={decisionBusy}
              onClick={onWaiveBalance}
              className="mb-1 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-700 p-3 text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
            >
              <BadgeCheck size={16} />
              <span className="text-ui-xs font-black uppercase tracking-widest">
                Waive round-off ({formatNgn(strictReceivableNgn)})
              </span>
            </button>
          ) : null}

          {canWriteOffBadDebt && writeOffEval.requiresMd && strictReceivableNgn > 0 ? (
            <button
              type="button"
              disabled={decisionBusy}
              onClick={onWriteOffReceivable}
              className="mb-1 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-700 p-3 text-white transition-colors hover:bg-rose-600 disabled:opacity-50"
            >
              <BadgeCheck size={16} />
              <span className="text-ui-xs font-black uppercase tracking-widest">
                Write off receivable ({formatNgn(strictReceivableNgn)})
              </span>
            </button>
          ) : null}

          {canManagerClearance ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <DecisionActionTile
                variant="approve"
                icon={CheckCircle2}
                label="Approve"
                disabled={decisionBusy}
                onClick={onApprove}
              />
              <DecisionActionTile
                variant="neutral"
                icon={RotateCcw}
                label="Disapprove"
                disabled={decisionBusy}
                onClick={onDisapprove}
              />
              <DecisionActionTile
                variant="reject"
                icon={Flag}
                label="Flag"
                disabled={decisionBusy}
                onClick={onFlag}
              />
            </div>
          ) : (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-ui-xs text-amber-950">
              Quotation clearance requires Branch Manager, MD, or Administrator login.
            </p>
          )}

          {fromProductionGate && canProductionOverride ? (
            <DecisionActionTile
              variant="brand"
              icon={Zap}
              label="Production override (low payment)"
              disabled={decisionBusy}
              onClick={onProductionOverride}
              className="mt-1"
            />
          ) : null}
          {fromProductionGate && !canProductionOverride ? (
            <p className="mt-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-ui-xs text-amber-950">
              {Math.round(Number(inboxRow?.paid_ngn) || 0) <= 0
                ? 'Zero payment on this quote — only the Managing Director can record production approval.'
                : 'Production gate override requires Branch Manager or MD login.'}
            </p>
          ) : null}
        </DecisionActionBar>
      ) : null}
    </div>
  );
}
