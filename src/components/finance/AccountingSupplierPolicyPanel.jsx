import React, { useEffect, useMemo } from 'react';
import { RefreshCw, Truck } from 'lucide-react';
import { useAp2SupplierDiagnostics } from '../../hooks/useAp2SupplierDiagnostics';
import { Ap2SupplierDiagnosticsPanel } from './Ap2SupplierDiagnosticsPanel';
import {
  AccountingDeskKpiCard,
  AccountingDeskNotice,
  AccountingDeskPageIntro,
  ACCOUNTING_CARD_ROW,
} from './accounting/AccountingDeskUi';
import { AccountingRegisterHeader } from './accounting/AccountingRegisterLayout';
import { ProcurementFormSection } from '../procurement/ProcurementFormSection';

const AP2_FLAG_STEPS = [
  {
    id: 'alignment',
    env: 'AP_GL_ALIGNMENT_DIAGNOSTICS_ENABLED',
    label: 'AP / inventory alignment diagnostics',
    detail: 'Management tie-out between GRN inventory, GRNI 2100, and supplier advances.',
  },
  {
    id: 'advance_gl',
    env: 'SUPPLIER_ADVANCE_ACCOUNTING_ENABLED',
    label: 'Supplier prepayment GL (1400)',
    detail: 'When enabled, payments before GRN post Dr 1400 / Cr cash; otherwise Dr 2000.',
  },
  {
    id: 'received_basis',
    env: 'AP_RECEIVED_BASIS_ENABLED',
    label: 'AP on received basis',
    detail: 'Recognise supplier AP when goods are received (GRN), not only on payment.',
  },
  {
    id: 'rebuild',
    env: 'AP_RECEIVED_BASIS_REBUILD_ENABLED',
    label: 'AP rebuild tool',
    detail: 'Allow controlled rebuild of supplier AP subledger after diagnostics sign-off.',
  },
];

/**
 * @param {{ branchId?: string | null; enabled?: boolean; deskLayout?: boolean; showToast?: (msg: string, opts?: object) => void }} props
 */
export function AccountingSupplierPolicyPanel({ branchId = null, enabled = true, deskLayout = false, showToast }) {
  const { data, loading, error, load } = useAp2SupplierDiagnostics({ enabled });
  const filters = useMemo(
    () => ({ branchId: branchId || 'ALL', period: undefined }),
    [branchId]
  );

  useEffect(() => {
    if (enabled) void load(filters);
  }, [enabled, filters, load]);

  const flags = data?.flags || {};
  const summary = data?.summary || {};
  const anyOn =
    flags.supplierAdvanceAccountingEnabled ||
    flags.apGlAlignmentDiagnosticsEnabled;

  const refreshAction = (
    <button
      type="button"
      onClick={() => load(filters)}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#134e4a]"
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
          title="Supplier AP policy (AP2)"
          description="Align supplier payables with GRN receipt, prepayments (1400), and GRNI diagnostics before cutover."
          action={refreshAction}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <AccountingDeskKpiCard
          icon={<Truck size={12} />}
          label="Advance GL"
          value={flags.supplierAdvanceAccountingEnabled ? 'On' : 'Off'}
          hint="SUPPLIER_ADVANCE_ACCOUNTING_ENABLED"
          tone={flags.supplierAdvanceAccountingEnabled ? 'teal' : 'amber'}
        />
        <AccountingDeskKpiCard
          label="Supplier advances"
          value={summary.totalSupplierAdvanceNgn != null ? `₦${Number(summary.totalSupplierAdvanceNgn).toLocaleString()}` : '—'}
          hint="Operational prepayments"
        />
        <AccountingDeskKpiCard
          label="Paid not received"
          value={String(summary.paidNotReceivedCount ?? '—')}
          hint="POs paid before GRN"
          tone={Number(summary.paidNotReceivedCount) > 0 ? 'amber' : 'teal'}
        />
      </div>

      {!flags.supplierAdvanceAccountingEnabled ? (
        <AccountingDeskNotice tone="warn">
          Supplier prepayment GL is <strong>off</strong> — all supplier payments post Dr 2000 until{' '}
          <code className="text-[10px]">SUPPLIER_ADVANCE_ACCOUNTING_ENABLED=1</code>.
        </AccountingDeskNotice>
      ) : (
        <AccountingDeskNotice tone="trial">
          Prepayment GL is <strong>on</strong> — payments before GRN use account 1400 automatically.
        </AccountingDeskNotice>
      )}

      <ProcurementFormSection letter="1" title="AP2 cutover sequence (server env)" compact>
        <ul className="space-y-2">
          {AP2_FLAG_STEPS.map((step) => {
            const on =
              (step.id === 'alignment' && flags.apGlAlignmentDiagnosticsEnabled) ||
              (step.id === 'advance_gl' && flags.supplierAdvanceAccountingEnabled) ||
              (step.id === 'received_basis' && flags.apReceivedBasisEnabled) ||
              (step.id === 'rebuild' && flags.apReceivedBasisRebuildEnabled);
            return (
              <li key={step.id} className={ACCOUNTING_CARD_ROW}>
                <p className="text-[11px] font-bold text-slate-900">
                  {on ? '✓' : '○'} {step.label}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-600">{step.detail}</p>
                <p className="mt-1 text-[9px] font-mono text-slate-500">{step.env}=1</p>
              </li>
            );
          })}
        </ul>
      </ProcurementFormSection>

      <Ap2SupplierDiagnosticsPanel
        initialBranchId={branchId || 'ALL'}
        autoLoad
        enabled={enabled}
        showAp2c
        compact
        onRebuildSuccess={() => {
          showToast?.('AP rebuild completed.');
          load(filters);
        }}
      />

      {error ? <p className="text-[11px] text-rose-700">{error}</p> : null}
    </div>
  );
}
