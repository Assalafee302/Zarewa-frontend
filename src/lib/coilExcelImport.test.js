import { describe, it, expect } from 'vitest';
import { materialTextToProductId, normalizeGaugeLabelForMasterData } from './coilExcelImport.js';

describe('materialTextToProductId', () => {
  it('maps aluminium variants to COIL-ALU', () => {
    expect(materialTextToProductId('Aluminium')).toBe('COIL-ALU');
    expect(materialTextToProductId('alu coil')).toBe('COIL-ALU');
    expect(materialTextToProductId('COIL-ALU')).toBe('COIL-ALU');
  });
  it('maps aluzinc / PPGI to PRD-102', () => {
    expect(materialTextToProductId('Aluzinc (PPGI)')).toBe('PRD-102');
    expect(materialTextToProductId('PPGI')).toBe('PRD-102');
    expect(materialTextToProductId('PRD-102')).toBe('PRD-102');
  });
  it('returns empty for unknown text', () => {
    expect(materialTextToProductId('')).toBe('');
    expect(materialTextToProductId('Titanium')).toBe('');
  });
});

describe('normalizeGaugeLabelForMasterData', () => {
  it('appends mm for plain numeric sheet values', () => {
    expect(normalizeGaugeLabelForMasterData('0.24')).toBe('0.24mm');
    expect(normalizeGaugeLabelForMasterData('0.2')).toBe('0.20mm');
    expect(normalizeGaugeLabelForMasterData('0.6')).toBe('0.60mm');
  });
  it('normalizes spacing and casing on values that already include mm', () => {
    expect(normalizeGaugeLabelForMasterData('0.24 mm')).toBe('0.24mm');
    expect(normalizeGaugeLabelForMasterData('0.24MM')).toBe('0.24mm');
  });
  it('leaves non-numeric labels unchanged', () => {
    expect(normalizeGaugeLabelForMasterData('0.18–0.24')).toBe('0.18–0.24');
  });
});
