import { describe, expect, it } from 'vitest';
import { payslipEmptyStateMessage, payslipPipelineStepIndex } from './hrPayslipUi';

describe('hrPayslipUi', () => {
  it('maps payroll statuses to pipeline steps', () => {
    expect(payslipPipelineStepIndex('draft')).toBe(0);
    expect(payslipPipelineStepIndex('locked')).toBe(1);
    expect(payslipPipelineStepIndex('paid')).toBe(2);
    expect(payslipPipelineStepIndex('not_started')).toBe(-1);
  });

  it('builds contextual empty-state copy from period hint', () => {
    expect(payslipEmptyStateMessage({ periodYyyymm: '202506', runStatus: 'locked' })).toMatch(/locked/i);
    expect(payslipEmptyStateMessage({ periodYyyymm: '202506', runStatus: 'draft' })).toMatch(/prepared/i);
    expect(payslipEmptyStateMessage(null)).toMatch(/locks payroll/i);
  });
});
