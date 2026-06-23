import React, { useState } from 'react';
import { useAccountingDebtors } from '../../hooks/useAccountingSubledger';
import { registerConfigFor } from '../../lib/accountingRegisterConfig';
import { AccountingRegisterPanel } from './AccountingRegisterPanel';
import { AccountingRegisterSettlementsPanel } from './AccountingRegisterSettlementsPanel';
import { Ap2SupplierDiagnosticsPanel } from './Ap2SupplierDiagnosticsPanel';

/**
 * @param {{ branchId?: string | null; enabled?: boolean; canManage?: boolean; branchScopeLabel?: string }} props
 */
export function AccountingDebtorsPanel({
  branchId,
  enabled = true,
  canManage = false,
  branchScopeLabel = '',
  deskRefresh = 0,
  onFocusTab,
}) {
  const [subTab, setSubTab] = useState('register');
  const { data, loading, error, reload } = useAccountingDebtors({ branchId, enabled, deskRefresh });
  const legacyQuickAdd = registerConfigFor('debtor').legacyQuickAdd;

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'register', label: 'Payables register' },
          { id: 'supplierAp', label: 'Supplier AP (AP2)' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-wide ${
              subTab === t.id ? 'bg-[#134e4a] text-white' : 'border border-slate-200 bg-white text-slate-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'supplierAp' ? (
        <Ap2SupplierDiagnosticsPanel
          initialBranchId={branchId || 'ALL'}
          autoLoad
          enabled={enabled}
          showAp2c
          compact
        />
      ) : (
        <>
          <AccountingRegisterSettlementsPanel branchId={branchId} onChanged={reload} />
          <AccountingRegisterPanel
            registerSide="debtor"
            data={data}
            loading={loading}
            error={error}
            onReload={reload}
            branchId={branchId}
            canManage={canManage}
            legacyQuickAdd={legacyQuickAdd}
            branchScopeLabel={branchScopeLabel}
            deskRefresh={deskRefresh}
            onFocusTab={onFocusTab}
          />
        </>
      )}
    </div>
  );
}
