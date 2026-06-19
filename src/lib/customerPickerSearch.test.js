import { describe, expect, it } from 'vitest';
import {
  customerPickerSearchBlob,
  customerPickerSubline,
  filterCustomersForPicker,
  staffEmployeeNoFromCustomer,
} from './customerPickerSearch.js';

describe('customerPickerSearch', () => {
  const staffCustomer = {
    customerID: 'CUS-KD-001',
    name: 'Ahmed Musa · ZAPKD004 (Staff)',
    phoneNumber: '',
    tier: 'Staff',
    paymentTerms: 'Staff credit',
    crmProfileNotes: 'Linked staff user usr-1 · ZAPKD004',
    crmTags: ['staff-purchase'],
  };

  const regularCustomer = {
    customerID: 'CUS-KD-002',
    name: 'Ahmed Musa',
    phoneNumber: '08012345678',
    tier: 'Regular',
  };

  it('matches staff employee number in picker search', () => {
    const hits = filterCustomersForPicker([staffCustomer, regularCustomer], 'ZAPKD004');
    expect(hits).toHaveLength(1);
    expect(hits[0].customerID).toBe('CUS-KD-001');
  });

  it('matches employee number from CRM notes when name is legacy', () => {
    const legacy = { ...staffCustomer, name: 'Ahmed Musa (Staff)' };
    expect(filterCustomersForPicker([legacy], 'zapkd004')).toHaveLength(1);
  });

  it('builds subline with tier and employee no', () => {
    expect(customerPickerSubline(staffCustomer)).toBe('Staff · ZAPKD004');
    expect(staffEmployeeNoFromCustomer(staffCustomer)).toBe('ZAPKD004');
  });

  it('search blob includes tier and notes', () => {
    const blob = customerPickerSearchBlob(staffCustomer);
    expect(blob).toContain('zapkd004');
    expect(blob).toContain('staff');
  });
});
