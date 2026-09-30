import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ConversionReviewConfirmBar } from './ConversionReviewConfirmBar.jsx';
import { ConversionReviewApprovalPreview } from './ConversionReviewApprovalPreview.jsx';

describe('ConversionReviewConfirmBar', () => {
  it('does not confirm until the review box is ticked', () => {
    const onConfirm = vi.fn();
    render(
      <ConversionReviewConfirmBar
        asSticky={false}
        jobId="JOB-1"
        remark="Variance reviewed on the floor."
        onRemarkChange={() => {}}
        alertState="High"
        onConfirm={onConfirm}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /confirm production check/i }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText(/tick the review box/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /confirm production check/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('ConversionReviewApprovalPreview', () => {
  it('explains High conversion in the hero instead of a raw alert chip', () => {
    render(
      <ConversionReviewApprovalPreview
        jobId="JOB-88"
        inboxRow={{
          customer_name: 'adaeze oko',
          quotation_ref: 'QT-1',
          conversion_alert_state: 'High',
          product_name: 'Aluzinc 0.40',
        }}
        auditData={{
          ok: true,
          productionLogs: [
            {
              job_id: 'JOB-88',
              product_name: 'Aluzinc 0.40',
              conversion_alert_state: 'High',
              conversion_variance_reason_code: 'supplier_heavy',
              conversion_variance_band: 'High',
            },
          ],
          jobCoils: [
            {
              job_id: 'JOB-88',
              coil_no: 'C-1',
              opening_weight_kg: 1200,
              consumed_weight_kg: 180,
              closing_weight_kg: 1020,
              meters_produced: 38,
            },
          ],
          conversionChecks: [
            {
              job_id: 'JOB-88',
              coil_no: 'C-1',
              alert_state: 'High',
              actual_conversion_kg_per_m: 4.74,
              standard_conversion_kg_per_m: 4.2,
            },
          ],
          totals: { cuttingListMetersSum: 40, completedProductionMetersSum: 38 },
        }}
      />
    );
    expect(screen.getByText(/floor conversion check/i)).toBeTruthy();
    expect(screen.getAllByText(/high conversion/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/more kg per metre/i)).toBeTruthy();
    expect(screen.getByText(/supplier coil heavier/i)).toBeTruthy();
    expect(screen.getAllByText('Standard').length).toBeGreaterThan(0);
    expect(screen.queryByText('Act')).toBeNull();
  });
});
