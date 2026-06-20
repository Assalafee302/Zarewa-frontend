import React, { createContext, useContext, useMemo } from 'react';
import { currentAccountingPeriodKey } from '../../../lib/accountingDeskNav';

/** @typedef {{
 *   periodKey: string;
 *   setPeriodKey: (v: string) => void;
 *   deskRefresh: number;
 *   requestDeskRefresh: () => void;
 *   openingPosted: boolean;
 *   setOpeningPosted: (v: boolean) => void;
 *   branchScopeLabel: string;
 *   cutoverMode: 'pre' | 'live';
 *   readOnlyExecutive: boolean;
 *   overview: object | null;
 *   overviewLoading: boolean;
 *   overviewError: string;
 *   reloadOverview: () => void;
 * }} AccountingDeskContextValue */

const AccountingDeskContext = createContext(
  /** @type {AccountingDeskContextValue | null} */ (null)
);

/**
 * @param {{ children: React.ReactNode; value: AccountingDeskContextValue }} props
 */
export function AccountingDeskProvider({ children, value }) {
  const memo = useMemo(() => value, [value]);
  return <AccountingDeskContext.Provider value={memo}>{children}</AccountingDeskContext.Provider>;
}

export function useAccountingDesk() {
  const ctx = useContext(AccountingDeskContext);
  return (
    ctx || {
      periodKey: currentAccountingPeriodKey(),
      setPeriodKey: () => {},
      deskRefresh: 0,
      requestDeskRefresh: () => {},
      openingPosted: false,
      setOpeningPosted: () => {},
      branchScopeLabel: '',
      cutoverMode: 'pre',
      readOnlyExecutive: false,
      overview: null,
      overviewLoading: false,
      overviewError: '',
      reloadOverview: () => {},
    }
  );
}
