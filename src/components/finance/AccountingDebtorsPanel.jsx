import React from 'react';
import { useAccountingDebtors } from '../../hooks/useAccountingSubledger';
import { AccountingRegisterPanel } from './AccountingRegisterPanel';

/**
 * @param {{ branchId?: string | null; enabled?: boolean; canManage?: boolean }} props
 */
export function AccountingDebtorsPanel({ branchId, enabled = true, canManage = false }) {
  const { data, loading, error, reload } = useAccountingDebtors({ branchId, enabled });

  return (
    <AccountingRegisterPanel
      registerSide="debtor"
      title="Debtors register"
      data={data}
      loading={loading}
      error={error}
      onReload={reload}
      branchId={branchId}
      canManage={canManage}
    />
  );
}
