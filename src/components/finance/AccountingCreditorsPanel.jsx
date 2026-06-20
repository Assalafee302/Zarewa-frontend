import React from 'react';
import { useAccountingCreditors } from '../../hooks/useAccountingSubledger';
import { AccountingRegisterPanel } from './AccountingRegisterPanel';

/**
 * @param {{ branchId?: string | null; enabled?: boolean; canManage?: boolean; branchScopeLabel?: string; deskRefresh?: number }} props
 */
export function AccountingCreditorsPanel({
  branchId,
  enabled = true,
  canManage = false,
  branchScopeLabel = '',
  deskRefresh = 0,
  onFocusTab,
}) {
  const { data, loading, error, reload } = useAccountingCreditors({ branchId, enabled });

  return (
    <AccountingRegisterPanel
      registerSide="creditor"
      data={data}
      loading={loading}
      error={error}
      onReload={reload}
      branchId={branchId}
      canManage={canManage}
      branchScopeLabel={branchScopeLabel}
      deskRefresh={deskRefresh}
      onFocusTab={onFocusTab}
    />
  );
}
