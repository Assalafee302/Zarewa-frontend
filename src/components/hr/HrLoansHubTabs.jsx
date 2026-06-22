import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageTabs } from '../layout/PageTabs';

const TABS = [
  { id: 'requests', label: 'Loan applications' },
  { id: 'obligations', label: 'Balances & repayments' },
  { id: 'purchase-credit', label: 'Purchase credit' },
];

/**
 * Sub-navigation for HQ loans hub — reduces long-scroll fatigue.
 */
export function HrLoansHubTabs({ children }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get('section') || 'requests';
  const tab = TABS.some((t) => t.id === raw) ? raw : 'requests';

  return (
    <div className="space-y-6">
      <PageTabs
        tabs={TABS}
        value={tab}
        onChange={(next) => {
          setSearchParams((prev) => {
            const p = new URLSearchParams(prev);
            p.set('section', next);
            return p;
          });
        }}
      />
      {typeof children === 'function' ? children(tab) : children}
    </div>
  );
}

export function HrLoansHubIntro({ embedded }) {
  return (
    <p className="text-sm text-slate-600 max-w-2xl">
      {embedded ? (
        'Staff loans, repayments, and purchase credit — separate from monthly payroll runs.'
      ) : (
        <>
          Staff apply from{' '}
          <Link to="/my-profile/loans" className="font-semibold text-[#134e4a] hover:underline">
            My HR → Loans & credit
          </Link>
          . HR originates applications here and tracks approvals below.
        </>
      )}
    </p>
  );
}

export { TABS as HR_LOANS_HUB_TABS };
