import React, { useMemo, useState } from 'react';
import { ReportsGlPilotSection } from '../reports/ReportsGlPilotSection.jsx';
import { AccountingDeskPageIntro } from './accounting/AccountingDeskUi';

function monthRangeFromKey(periodKey) {
  const m = String(periodKey || '').match(/^(\d{4})-(\d{2})$/);
  if (!m) {
    const now = new Date();
    const y = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const last = new Date(y, now.getMonth() + 1, 0).getDate();
    return { periodKey: `${y}-${mo}`, startDate: `${y}-${mo}-01`, endDate: `${y}-${mo}-${String(last).padStart(2, '0')}` };
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const last = new Date(y, mo, 0).getDate();
  return {
    periodKey: `${y}-${String(mo).padStart(2, '0')}`,
    startDate: `${y}-${String(mo).padStart(2, '0')}-01`,
    endDate: `${y}-${String(mo).padStart(2, '0')}-${String(last).padStart(2, '0')}`,
  };
}

function currentPeriodKey() {
  return new Date().toISOString().slice(0, 7);
}

/**
 * @param {{ hasFinanceView?: boolean; showToast?: (msg: string, opts?: object) => void; deskLayout?: boolean }} props
 */
export function AccountingGlPanel({ hasFinanceView = false, showToast, deskLayout = false }) {
  const [period, setPeriod] = useState(currentPeriodKey);
  const range = useMemo(() => monthRangeFromKey(period), [period]);

  return (
    <div className="space-y-5">
      {deskLayout ? (
        <label className="inline-flex items-center gap-2 text-[10px] font-bold text-slate-600">
          Period
          <input
            type="month"
            className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-800"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
        </label>
      ) : (
        <AccountingDeskPageIntro
          title="General ledger"
          description="Trial balance and journal activity for the period. Cash accounts use per-bank codes (1001, 1002, …)."
          action={
            <label className="inline-flex items-center gap-2 text-[10px] font-bold text-slate-600">
              Period
              <input
                type="month"
                className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
            </label>
          }
        />
      )}
      <ReportsGlPilotSection
        startDate={range.startDate}
        endDate={range.endDate}
        hasFinanceView={hasFinanceView}
        showToast={showToast}
      />
    </div>
  );
}
