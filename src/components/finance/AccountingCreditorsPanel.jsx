import React from 'react';
import { useAccountingCreditors } from '../../hooks/useAccountingSubledger';
import { AccountingRegisterPanel } from './AccountingRegisterPanel';

/**
 * @param {{ branchId?: string | null; enabled?: boolean; canManage?: boolean }} props
 */
export function AccountingCreditorsPanel({ branchId, enabled = true, canManage = false }) {
  const { data, loading, error, reload } = useAccountingCreditors({ branchId, enabled });

  return (
    <AccountingRegisterPanel
      registerSide="creditor"
      title="Creditors register"
      data={data}
      loading={loading}
      error={error}
      onReload={reload}
      branchId={branchId}
      canManage={canManage}
    />
  );
}
