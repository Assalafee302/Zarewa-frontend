import React from 'react';
import { useAccountingDebtors } from '../../hooks/useAccountingSubledger';
import { registerConfigFor } from '../../lib/accountingRegisterConfig';
import { AccountingRegisterPanel } from './AccountingRegisterPanel';

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
  );
}
