import { createContext, useContext } from 'react';

export const ProcurementPageContext = createContext(null);

export function useProcurementPage() {
  const ctx = useContext(ProcurementPageContext);
  if (!ctx) {
    throw new Error('useProcurementPage must be used within ProcurementPageContext.Provider');
  }
  return ctx;
}
