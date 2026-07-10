import { createContext, useContext } from 'react';

export const AccountPageContext = createContext(null);

export function useAccountPage() {
  const ctx = useContext(AccountPageContext);
  if (!ctx) {
    throw new Error('useAccountPage must be used within AccountPageContext.Provider');
  }
  return ctx;
}
