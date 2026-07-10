import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { useAp1cDryRun } from '../../hooks/useAp1cDryRun';
import { Ap1cDryRunPanel } from './Ap1cDryRunPanel';
import { useAp1cReclass } from '../../hooks/useAp1cReclass';
import { formatNgn } from '../../Data/mockData';
import {
  AccountingDeskKpiCard,
  AccountingDeskNotice,
  AccountingDeskPageIntro,
  ACCOUNTING_CARD_ROW,
} from './accounting/AccountingDeskUi';
import { AccountingRegisterHeader } from './accounting/AccountingRegisterLayout';
import { ProcurementFormSection } from '../procurement/ProcurementFormSection';

const FLAG_STEPS = [
  {
    id: 'diagnostics',
    env: 'ACCOUNTING_POLICY_V1_DIAGNOSTICS',
    label: 'Enable diagnostics',
    detail: 'Turn on trial-exception AP1c counts and this dry-run report (no GL change).',
  },
  {
    id: 'receipt_gl',
    env: 'ACCOUNTING_POLICY_V1_RECEIPT_GL',
    label: 'Receipt GL by production status',
    detail: 'Pre-production receipts credit 2500 (deposits); post-production credit 1200.',
    requires: ['diagnostics'],
  },
  {
    id: 'production_release',
    env: 'ACCOUNTING_POLICY_V1_PRODUCTION_RELEASE',
    label: 'Full deposit release at production',
    detail: 'Release customer deposits when job completes (Cr 2500 / Dr 1200).',
    requires: ['receipt_gl'],
  },
  {
    id: 'legacy_bridge',
    env: 'ACCOUNTING_POLICY_V1_LEGACY_BRIDGE',
    label: 'Legacy pre-prod 1200 bridge',
    detail: 'Reduce AR overstatement for receipts posted to 1200 before production under old rules.',
    requires: ['production_release'],
  },
  {
    id: 'reclass',
    env: 'RECLASS_PRE_PRODUCTION_RECEIPTS',
    label: 'One-off reclass (AP1c-5)',
    detail: 'Optional Dr 1200 / Cr 2500 journals for legacy pre-production receipts — post from preview below.',
    requires: ['legacy_bridge'],
  },
];

function flagOn(flags, key) {
  return Boolean(flags?.[key]);
}

/**
 * @param {{ branchId?: string | null; enabled?: boolean; deskLayout?: boolean; showToast?: (msg: string, opts?: object) => void }} props
 */
export function AccountingPolicyPanel({ branchId = null, enabled = true, deskLayout = false, showToast }) {
  const { data, loading, error, reload } = useAp1cDryRun({ branchId, enabled });
  const reclass = useAp1cReclass({ enabled });
  const [opening, setOpening] = useState(null);
  const [postingReclass, setPostingReclass] = useState(false);

  const loadOpening = useCallback(async () => {
    const res = await apiFetch('/api/finance/opening-balance/status');
    if (res.ok && res.data?.ok) setOpening(res.data);
  }, []);

  useEffect(() => {
    if (enabled) loadOpening();
  }, [enabled, loadOpening]);

  useEffect(() => {
    if (enabled) void reclass.load(branchId);
  }, [enabled, branchId, reclass.load]);

  const flags = data?.flags || {};
  const s = data?.summary || {};
  const dryRunReady =
    (s.receiptsBeforeProductionCredited1200Count ?? 0) === 0 &&
    (s.receiptReversalsMissingResolvableMetaCount ?? 0) === 0 &&
    (s.refundPayoutsRevenueReviewCount ?? 0) === 0;

  const cutoverSteps = useMemo(() => {
    return FLAG_STEPS.map((step) => {
      const keyMap = {
        diagnostics: 'accountingPolicyV1Diagnostics',
        receipt_gl: 'accountingPolicyV1ReceiptGl',
        production_release: 'accountingPolicyV1ProductionRelease',
        legacy_bridge: 'accountingPolicyV1LegacyBridge',
        reclass: 'reclassPreProductionReceipts',
      };
      const flagKey = keyMap[step.id];
      const on = flagOn(flags, flagKey);
      let status = on ? 'ok' : 'pending';
      if (!on && step.id !== 'diagnostics' && !dryRunReady) status = 'warn';
      if (!on && step.id !== 'diagnostics' && !opening?.posted) status = 'warn';
      return { ...step, status, on };
    });
  }, [flags, dryRunReady, opening?.posted]);

  const anyPostingOn =
    flagOn(flags, 'accountingPolicyV1ReceiptGl') ||
    flagOn(flags, 'accountingPolicyV1ProductionRelease') ||
    flagOn(flags, 'accountingPolicyV1LegacyBridge');

  const refreshAction = (
    <button
      type="button"
      onClick={() => {
        reload();
        loadOpening();
        reclass.load(branchId);
      }}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-ui-xs font-bold uppercase tracking-wide text-zarewa-teal hover:bg-slate-50"
    >
      <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
      Refresh
    </button>
  );

  return (
    <div className="space-y-5 min-w-0">
      {deskLayout ? (
        <AccountingRegisterHeader compact actions={refreshAction} />
      ) : (
        <AccountingDeskPageIntro
          title="Receipt & deposit policy (AP1c)"
          description="Align customer receipts with your signed rule: deposits until production, revenue when produced. Review dry-run, then enable posting flags at cutover."
          action={refreshAction}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <AccountingDeskKpiCard
          icon={<ShieldCheck size={12} />}
          label="Posting flags"
          value={anyPostingOn ? 'Live' : 'Off'}
          hint="Set via server environment — restart required"
          tone={anyPostingOn ? 'teal' : 'amber'}
        />
        <AccountingDeskKpiCard
          label="Opening balance"
          value={opening?.posted ? 'Posted' : 'Pending'}
          hint="Post before enabling receipt GL flags"
          tone={opening?.posted ? 'teal' : 'amber'}
        />
        <AccountingDeskKpiCard
          label="Dry-run blockers"
          value={dryRunReady ? 'Clear' : 'Review'}
          hint="Pre-prod 1200, reversals, refund review"
          tone={dryRunReady ? 'teal' : 'amber'}
        />
      </div>

      {!anyPostingOn ? (
        <AccountingDeskNotice tone="warn">
          Policy v1 GL posting is <strong>off</strong>. New receipts still use legacy Dr cash / Cr 1200 until flags are enabled on the server after HoA sign-off.
        </AccountingDeskNotice>
      ) : (
        <AccountingDeskNotice tone="ok">
          One or more AP1c posting flags are <strong>on</strong>. Monitor trial exceptions after each change.
        </AccountingDeskNotice>
      )}

      <ProcurementFormSection letter="1" title="Cutover sequence (server env)" compact>
        <p className="text-ui-xs text-slate-600 mb-3">
          Flags are configured in the deployment environment (not in-app). Set to <code className="text-[10px">1</code>, restart the API, then verify on this page.
        </p>
        <ul className="space-y-2">
          {cutoverSteps.map((step) => (
            <li key={step.id} className={ACCOUNTING_CARD_ROW}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {step.on ? '✓' : '○'} {step.label}
                  </p>
                  <p className="mt-0.5 text-ui-xs font-medium text-slate-600">{step.detail}</p>
                  <p className="mt-1 text-ui-xs font-mono text-slate-500">{step.env}=1</p>
                </div>
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-ui-xs font-bold uppercase ${
                    step.on
                      ? 'bg-emerald-50 text-emerald-800'
                      : step.status === 'warn'
                        ? 'bg-amber-50 text-amber-900'
                        : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {step.on ? 'On' : step.status === 'warn' ? 'Hold' : 'Pending'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </ProcurementFormSection>

      {reclass.data ? (
        <ProcurementFormSection letter="2" title="AP1c-5 reclass preview" compact>
          <p className="text-ui-xs text-slate-600 mb-2">{reclass.data.disclaimer}</p>
          <p className="text-xs font-semibold text-slate-800 mb-2">
            Pending: {reclass.data.summary?.pendingCount ?? 0} receipt(s) ·{' '}
            {formatNgn(reclass.data.summary?.totalPendingNgn ?? 0)}
          </p>
          {reclass.data.canPost ? (
            <button
              type="button"
              disabled={postingReclass || !(reclass.data.summary?.pendingCount > 0)}
              className="rounded-lg bg-zarewa-teal px-4 py-2 text-ui-xs font-bold uppercase text-white disabled:opacity-50"
              onClick={async () => {
                setPostingReclass(true);
                try {
                  const res = await reclass.post(branchId);
                  if (!res.ok || !res.data?.ok) {
                    showToast?.(res.data?.error || 'Reclass failed.', { variant: 'error' });
                    return;
                  }
                  showToast?.(res.data.message || 'Reclass posted.');
                  reclass.load(branchId);
                  reload();
                } finally {
                  setPostingReclass(false);
                }
              }}
            >
              {postingReclass ? 'Posting…' : 'Post all pending reclass'}
            </button>
          ) : (
            <p className="text-ui-xs text-amber-800">
              Set <code className="font-mono">RECLASS_PRE_PRODUCTION_RECEIPTS=1</code> on server to enable posting.
            </p>
          )}
        </ProcurementFormSection>
      ) : null}

      <Ap1cDryRunPanel data={data} loading={loading} error={error} onReload={reload} embedded />
    </div>
  );
}
