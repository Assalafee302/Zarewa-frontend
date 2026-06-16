import React from 'react';
import { useAccountingCreditors } from '../../hooks/useAccountingSubledger';
import { AccountingRegisterPanel } from './AccountingRegisterPanel';

/**
 * @param {{ branchId?: string | null; enabled?: boolean; canManage?: boolean; branchScopeLabel?: string }} props
 */
export function AccountingCreditorsPanel({
  branchId,
  enabled = true,
  canManage = false,
  branchScopeLabel = '',
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
    />
  );
}
