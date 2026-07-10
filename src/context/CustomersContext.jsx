/* eslint-disable react-refresh/only-export-components -- context + hook pair */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/apiBase';
import { branchScopedCreateBlockedMessage, isBranchScopedCreateBlocked } from '../lib/workspaceBranchCreate';
import { useToast } from './ToastContext';
import { useWorkspace } from './WorkspaceContext';

const CustomersContext = createContext(null);

export function CustomersProvider({ children }) {
  const ws = useWorkspace();
  const wsHasWorkspaceData = ws?.hasWorkspaceData;
  const wsSnapshot = ws?.snapshot;
  const wsCanMutate = ws?.canMutate;
  const wsRefresh = ws?.refresh;
  const { show: showToast } = useToast();
  const [customers, setCustomers] = useState([]);

   
  useEffect(() => {
    if (!wsHasWorkspaceData || !wsSnapshot) {
      setCustomers((prev) => (prev.length ? [] : prev));
      return;
    }
    const list = wsSnapshot.customers;
    if (!Array.isArray(list)) {
      setCustomers((prev) => (prev.length ? [] : prev));
      return;
    }
    setCustomers(list.map((c) => ({ ...c })));
  }, [wsHasWorkspaceData, wsSnapshot]);
   

  const addCustomer = useCallback(
    async (record) => {
      if (isBranchScopedCreateBlocked(ws)) {
        throw new Error(branchScopedCreateBlockedMessage(ws));
      }
      if (!wsCanMutate) {
        showToast('Reconnect to save customers — read-only workspace.', { variant: 'info' });
        throw new Error('Read-only workspace.');
      }
      const { ok, data } = await apiFetch('/api/customers', {
        method: 'POST',
        body: JSON.stringify(record),
      });
      if (!ok || !data?.ok) throw new Error(data?.error || 'Create customer API failed');
      await wsRefresh?.();
      return data?.customerID || record.customerID;
    },
    [showToast, ws, wsCanMutate, wsRefresh]
  );

  const deleteCustomer = useCallback(
    async (customerID) => {
      const id = String(customerID ?? '').trim();
      if (!id) throw new Error('Customer id required.');
      if (!wsCanMutate) {
        showToast('Reconnect to delete customers — read-only workspace.', { variant: 'info' });
        throw new Error('Read-only workspace.');
      }
      const { ok, data } = await apiFetch(`/api/customers/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!ok || !data?.ok) {
        const err = new Error(data?.error || 'Delete customer failed');
        err.blockers = data?.blockers;
        throw err;
      }
      await wsRefresh?.();
    },
    [showToast, wsCanMutate, wsRefresh]
  );

  const value = useMemo(
    () => ({
      customers,
      setCustomers,
      addCustomer,
      deleteCustomer,
    }),
    [customers, addCustomer, deleteCustomer]
  );

  return <CustomersContext.Provider value={value}>{children}</CustomersContext.Provider>;
}

export function useCustomers() {
  const ctx = useContext(CustomersContext);
  if (!ctx) {
    throw new Error('useCustomers must be used within CustomersProvider');
  }
  return ctx;
}
