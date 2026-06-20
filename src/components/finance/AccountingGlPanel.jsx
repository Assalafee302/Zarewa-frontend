import React, { useMemo, useState } from 'react';
import { ReportsGlPilotSection } from '../reports/ReportsGlPilotSection.jsx';
import { AccountingDeskPageIntro } from './accounting/AccountingDeskUi';

function monthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const last = new Date(y, now.getMonth() + 1, 0).getDate();
  return {
    startDate: `${y}-${m}-01`,
    endDate: `${y}-${m}-${String(last).padStart(2, '0')}`,
  };
}

/**
 * @param {{ hasFinanceView?: boolean; showToast?: (msg: string, opts?: object) => void }} props
 */
export function AccountingGlPanel({ hasFinanceView = false, showToast }) {
  const [{ startDate, endDate }] = useState(monthRange);
  const range = useMemo(() => ({ startDate, endDate }), [startDate, endDate]);

  return (
    <div className="space-y-5">
      <AccountingDeskPageIntro
        title="General ledger"
        description="Trial balance and journal activity for the period. Cash accounts use per-bank codes (1001, 1002, …)."
      />
      <ReportsGlPilotSection
        startDate={range.startDate}
        endDate={range.endDate}
        hasFinanceView={hasFinanceView}
        showToast={showToast}
      />
    </div>
  );
}
