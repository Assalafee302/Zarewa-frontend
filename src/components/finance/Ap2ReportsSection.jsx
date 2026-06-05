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
    {
      id: 'ap2b-preview',
      title: 'AP rebuild preview report',
      desc: 'Received-basis AP correction preview — Head of Accounts approval required before apply.',
    },
    {
      id: 'ap2b-audit',
      title: 'AP basis change audit',
      desc: 'Rebuild actions logged in Finance → Audit (ap.received_basis.*).',
      link: '/accounts?tab=audit',
    },
    {
      id: 'ap2b-advance',
      title: 'Supplier advance risk report',
      desc: 'Paid before goods received — prepayment risk (no advance journal in AP2b).',
    },
    {
      id: 'ap2c-advance',
      title: 'Supplier advance report (AP2c)',
      desc: 'Advance summary, paid not received, and supplier exposure.',
    },
    {
      id: 'ap2c-inventory',
      title: 'Inventory valuation report',
      desc: 'Accounting value, monthly average price, highest month price, missing cost.',
    },
    {
      id: 'ap2c-align',
      title: 'AP / inventory GL alignment',
      desc: 'Management tie-out warnings — not statutory.',
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
            <p className="text-xs font-bold uppercase text-amber-800 mb-3">
              {c.id.startsWith('ap2c')
                ? 'AP2c — management diagnostic · accounting value'
                : c.id.startsWith('ap2b')
                  ? 'AP2b — preview before rebuild'
                  : 'Management diagnostic — not AP rebuild'}
            </p>
            {c.link ? (
              <FinanceActionButton variant="link" to={c.link}>
                Open audit trail →
              </FinanceActionButton>
            ) : (
              <FinanceActionButton variant="link" to="/accounting">
                Load on Accounting Desk →
              </FinanceActionButton>
            )}
          </FinanceReportPanel>
        ))}
      </div>
    </div>
  );
}
