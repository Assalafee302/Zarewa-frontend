import React from 'react';
import { Link } from 'react-router-dom';
import { FinanceReportPanel } from './FinanceReportPanel';
import { FinanceActionButton } from './FinanceActionButton';

/**
 * AP2a report entry points on Reports page (load full diagnostic on Accounting Desk).
 */
export function Ap2ReportsSection({ mayView }) {
  if (!mayView) return null;

  const cards = [
    {
      id: 'ap2-main',
      title: 'Supplier AP diagnostics',
      desc: 'Ordered vs received vs paid vs current AP. Management diagnostic — not AP rebuild.',
    },
    {
      id: 'ap2-po',
      title: 'PO ordered vs received vs paid',
      desc: 'Line-level procurement commitment compared to GRN and supplier payments.',
    },
    {
      id: 'ap2-missing',
      title: 'Missing inventory cost',
      desc: 'Coil lots and PO lines without landed or unit cost for stock valuation.',
    },
  ];

  return (
    <div className="space-y-4 mb-8">
      <h3 className="z-section-title">Supplier &amp; payables (AP2a)</h3>
      <p className="text-sm font-medium text-slate-600 max-w-2xl leading-relaxed">
        Read-only management diagnostics. Head of Accounts should review before AP basis is changed in AP2b.{' '}
        <Link to="/accounting" className="font-bold text-teal-800 hover:underline">
          Open Accounting Desk → Supplier &amp; AP
        </Link>
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <FinanceReportPanel key={c.id} title={c.title} description={c.desc}>
            <p className="text-xs font-bold uppercase text-amber-800 mb-3">Management diagnostic — not AP rebuild</p>
            <FinanceActionButton variant="link" to="/accounting">
              Load on Accounting Desk →
            </FinanceActionButton>
          </FinanceReportPanel>
        ))}
      </div>
    </div>
  );
}
