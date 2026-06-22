import { describe, it, expect } from 'vitest';
import {
  purchaseOrderCanAssignTransport,
  purchaseOrderTransportActionLabel,
  purchaseOrderTransportGapLabel,
  purchaseOrderHasTransportLink,
  purchaseOrderInTransitTransportWarning,
} from './purchaseOrderWorkflow';

describe('purchaseOrderWorkflow', () => {
  it('allows transport on approved and on loading', () => {
    expect(purchaseOrderCanAssignTransport({ status: 'Approved' })).toBe(true);
    expect(purchaseOrderCanAssignTransport({ status: 'On loading' })).toBe(true);
  });

  it('allows late transport on in transit when haulier or fee missing', () => {
    expect(purchaseOrderCanAssignTransport({ status: 'In Transit' })).toBe(true);
    expect(
      purchaseOrderCanAssignTransport({
        status: 'In Transit',
        transportAgentId: 'TA-1',
        transportAgentName: 'Haul Co',
      })
    ).toBe(true);
    expect(
      purchaseOrderCanAssignTransport({
        status: 'In Transit',
        transportAgentId: 'TA-1',
        transportAmountNgn: 50_000,
      })
    ).toBe(false);
  });

  it('labels transport action', () => {
    expect(purchaseOrderTransportActionLabel({ status: 'Approved' })).toBe('Assign transport');
    expect(
      purchaseOrderTransportActionLabel({ status: 'In Transit', transportAmountNgn: 1000 })
    ).toBe('Edit transport');
  });

  it('describes transport gap labels', () => {
    expect(purchaseOrderTransportGapLabel({ status: 'Approved' })).toBe('No haulier or fee');
    expect(
      purchaseOrderTransportGapLabel({
        status: 'In Transit',
        transportAgentId: 'TA-1',
      })
    ).toBe('Transport fee missing');
  });

  it('warns before in transit without transport link', () => {
    expect(purchaseOrderHasTransportLink({ status: 'Approved', transportAgentId: 'TA-1', transportAmountNgn: 5000 })).toBe(
      true
    );
    expect(
      purchaseOrderInTransitTransportWarning({ status: 'Approved', transportAgentId: 'TA-1', transportAmountNgn: 5000 })
    ).toBeNull();
    expect(purchaseOrderInTransitTransportWarning({ status: 'Approved' })).toContain('No haulier or fee');
    expect(purchaseOrderInTransitTransportWarning({ status: 'Approved' })).toContain('Mark in transit anyway?');
  });
});
