import { describe, expect, it } from 'vitest';
import {
  customerPickerPrimaryLabel,
  customerPickerSearchBlob,
  customerPickerSubline,
  filterCustomersForPicker,
  staffEmployeeNoFromCustomer,
} from './customerPickerSearch.js';

describe('customerPickerSearch', () => {
  const staffCustomer = {
    customerID: 'CUS-KD-001',
    name: 'Legacy Name (Staff)',
    phoneNumber: '',
    tier: 'Staff',
    paymentTerms: 'Staff credit',
    staffDisplayName: 'Ahmed Musa',
    staffEmployeeNo: 'ZAPKD004',
    crmProfileNotes: 'Linked staff user usr-1 · ZAPKD004',
    crmTags: ['staff-purchase'],
  };

  const regularCustomer = {
    customerID: 'CUS-KD-002',
    name: 'Ahmed Musa',
    phoneNumber: '08012345678',
    tier: 'Regular',
  };

  it('matches staff employee number from HR-linked fields', () => {
    const hits = filterCustomersForPicker([staffCustomer, regularCustomer], 'ZAPKD004');
    expect(hits).toHaveLength(1);
    expect(hits[0].customerID).toBe('CUS-KD-001');
  });

  it('matches staff display name from HR link', () => {
    const hits = filterCustomersForPicker([staffCustomer, regularCustomer], 'ahmed musa');
    expect(hits).toHaveLength(2);
  });

  it('shows staff name and employee no in primary label', () => {
    expect(customerPickerPrimaryLabel(staffCustomer)).toBe('Ahmed Musa · ZAPKD004 (Staff)');
    expect(staffEmployeeNoFromCustomer(staffCustomer)).toBe('ZAPKD004');
  });

  it('builds staff subline without duplicating employee no', () => {
    expect(customerPickerSubline(staffCustomer)).toContain('Staff purchase credit');
    expect(customerPickerSubline(staffCustomer)).toContain('CUS-KD-001');
  });

  it('search blob includes HR staff fields', () => {
    const blob = customerPickerSearchBlob(staffCustomer);
    expect(blob).toContain('zapkd004');
    expect(blob).toContain('ahmed musa');
  });
});
