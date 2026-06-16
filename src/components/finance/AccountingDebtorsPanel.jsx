import React from 'react';
import { useAccountingDebtors } from '../../hooks/useAccountingSubledger';
import { registerConfigFor } from '../../lib/accountingRegisterConfig';
import { AccountingRegisterPanel } from './AccountingRegisterPanel';
import { AccountingRegisterSettlementsPanel } from './AccountingRegisterSettlementsPanel';

/**
 * @param {{ branchId?: string | null; enabled?: boolean; canManage?: boolean; branchScopeLabel?: string }} props
 */
export function AccountingDebtorsPanel({
  branchId,
  enabled = true,
  canManage = false,
  branchScopeLabel = '',
}) {
  const { data, loading, error, reload } = useAccountingDebtors({ branchId, enabled });
  const legacyQuickAdd = registerConfigFor('debtor').legacyQuickAdd;

  return (
    <div className="space-y-4 min-w-0">
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
      />
    </div>
  );
}
