import { describe, expect, it } from 'vitest';
import {
  normalizeMaintenanceSpecialty,
  userMayEditMaintenanceVendors,
  userMayViewMaintenanceVendors,
} from './maintenanceRegistry.js';

describe('maintenanceRegistry (frontend)', () => {
  it('normalizes specialty', () => {
    expect(normalizeMaintenanceSpecialty('Hydraulics')).toBe('hydraulics');
    expect(normalizeMaintenanceSpecialty('')).toBe('general');
  });

  it('gates vendor edit to BM / MD / admin', () => {
    expect(userMayEditMaintenanceVendors('sales_manager')).toBe(true);
    expect(userMayEditMaintenanceVendors('branch_manager')).toBe(true);
    expect(userMayEditMaintenanceVendors('md')).toBe(true);
    expect(userMayEditMaintenanceVendors('admin')).toBe(true);
    expect(userMayEditMaintenanceVendors('operations_officer')).toBe(false);
    expect(userMayEditMaintenanceVendors('chairman')).toBe(false);
  });

  it('allows ops to view vendors', () => {
    expect(userMayViewMaintenanceVendors('operations_officer')).toBe(true);
    expect(userMayViewMaintenanceVendors('viewer', [])).toBe(false);
    expect(userMayViewMaintenanceVendors('viewer', ['operations.view'])).toBe(true);
  });
});
