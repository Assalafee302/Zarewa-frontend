import { describe, expect, it } from 'vitest';
import { managerWorkItemPath, workItemShouldOpenManagerDesk } from './managerWorkItemRoute';

describe('managerWorkItemRoute', () => {
  it('builds quotation clearance path', () => {
    expect(
      managerWorkItemPath({
        documentType: 'quotation_clearance',
        sourceId: 'Q-100',
      })
    ).toBe('/manager?inbox=orders&quoteRef=Q-100');
  });

  it('builds material incident path with id', () => {
    expect(
      managerWorkItemPath({
        documentType: 'material_incident',
        sourceId: 'MEX-1',
      })
    ).toBe('/manager?inbox=material&materialIncidentId=MEX-1');
  });

  it('builds edit approval path', () => {
    expect(
      managerWorkItemPath({
        documentType: 'edit_approval',
        sourceId: 'EA-123456',
      })
    ).toBe('/manager?inbox=edits&editApprovalId=EA-123456');
  });

  it('detects manager desk eligibility', () => {
    expect(
      workItemShouldOpenManagerDesk(
        { documentType: 'quotation_clearance' },
        { roleKey: 'sales_manager', permissions: ['refunds.approve'] }
      )
    ).toBe(true);
    expect(
      workItemShouldOpenManagerDesk(
        { documentType: 'payment_request' },
        { roleKey: 'finance_manager', permissions: ['finance.approve'] }
      )
    ).toBe(true);
    expect(
      workItemShouldOpenManagerDesk(
        { documentType: 'payment_request' },
        { roleKey: 'sales_staff', permissions: [] }
      )
    ).toBe(false);
  });
});
