import { describe, it, expect } from 'vitest';
import { rankRefundPayoutOptions } from './RefundPayoutRecipientPicker.jsx';

describe('rankRefundPayoutOptions', () => {
  const options = [
    { key: 'customer:A', label: 'Engr zubairu · OPAY', group: 'Quote customer', searchText: 'engr zubairu opay' },
    { key: 'customer:B', label: 'Abdulrahman Uthman Sali', group: 'Default', searchText: 'abdulrahman zapkd005' },
    { key: 'staff:1', label: 'Driver Musa', group: 'Associated staff', searchText: 'musa driver' },
  ];

  it('ranks starts-with matches ahead of includes', () => {
    const ranked = rankRefundPayoutOptions(options, 'abd');
    expect(ranked[0].key).toBe('customer:B');
  });

  it('lifts recent keys when the list is unfiltered', () => {
    const ranked = rankRefundPayoutOptions(options, '', ['staff:1']);
    expect(ranked[0].key).toBe('staff:1');
    expect(ranked[0].group).toBe('Recent on this desk');
  });
});
