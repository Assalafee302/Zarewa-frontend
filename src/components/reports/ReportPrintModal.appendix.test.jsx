import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ManagementReportSheet } from './ReportPrintModal';

describe('ManagementReportSheet appendix sections', () => {
  it('renders extra tables after the main table', () => {
    render(
      <ManagementReportSheet
        title="Sales"
        columns={[{ key: 'a', label: 'A' }]}
        rows={[{ a: 'row' }]}
        appendixSections={[
          {
            title: 'Reconciliation: recognised sales → cash received',
            columns: [
              { key: 'item', label: 'Item' },
              { key: 'amountNgn', label: '₦', align: 'right' },
            ],
            rows: [{ item: 'Unexplained difference', amountNgn: '₦0' }],
          },
          { title: 'Exceptions: receipts vs treasury', columns: [{ key: 'kind', label: 'Exception' }], rows: [] },
        ]}
      />
    );
    expect(screen.getByText('Reconciliation: recognised sales → cash received')).toBeTruthy();
    expect(screen.getByText('Unexplained difference')).toBeTruthy();
    expect(screen.getByText('None.')).toBeTruthy();
    expect(document.querySelectorAll('table')).toHaveLength(3);
  });
});
