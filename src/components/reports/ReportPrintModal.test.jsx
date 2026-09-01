import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ManagementReportSheet } from './ReportPrintModal.jsx';

describe('ManagementReportSheet totals', () => {
  it('puts subtotal and total amounts in their own cells so NGN figures are not clipped into the label', () => {
    render(
      <ManagementReportSheet
        title="Sales report"
        periodLabel="Mar 2026"
        columns={[
          { key: 'customerName', label: 'Customer' },
          { key: 'quotationRef', label: 'Quote' },
          { key: 'amountPaidNgn', label: 'Paid', align: 'right' },
          { key: 'outstandingBalanceNgn', label: 'Balance', align: 'right' },
        ]}
        rows={[
          {
            group: 'Materials produced in period',
            customerName: 'Acme',
            quotationRef: '1001',
            amountPaidNgn: '₦1,250,000',
            outstandingBalanceNgn: '₦0',
            _amountPaidNgn: 1_250_000,
            _outstandingBalanceNgn: 0,
          },
          {
            group: 'Outstanding balance (debtors)',
            customerName: 'Beta',
            quotationRef: '1002',
            amountPaidNgn: '—',
            outstandingBalanceNgn: '₦890,000',
            _amountPaidNgn: 0,
            _outstandingBalanceNgn: 890_000,
          },
        ]}
        grouping={{
          groupBy: 'group',
          subtotalKey: '_amountPaidNgn',
          subtotalColumnKey: 'amountPaidNgn',
          sumColumns: [
            { key: '_amountPaidNgn', columnKey: 'amountPaidNgn' },
            { key: '_outstandingBalanceNgn', columnKey: 'outstandingBalanceNgn' },
          ],
          subtotalLabel: 'Subtotal',
          totalLabel: 'Total',
        }}
      />
    );

    expect(screen.getAllByText('Subtotal')).toHaveLength(2);
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getAllByText('₦1,250,000').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('₦890,000').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/Subtotal: /)).toBeNull();
    expect(screen.queryByText(/Total: /)).toBeNull();
  });
});
