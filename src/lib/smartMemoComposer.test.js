import { describe, it, expect } from 'vitest';
import {
  buildSmartMemoChecklist,
  buildSmartMemoPayload,
  buildSmartMemoSuggestions,
  canConvertMemoToExpense,
  canConvertMemoToProcurement,
  detectSmartMemoType,
  improveMemoRuleBased,
  parseItemListToMaterialLines,
} from './smartMemoComposer.js';

describe('smartMemoComposer', () => {
  it('detects fuel/diesel memos from keywords', () => {
    expect(detectSmartMemoType('Diesel refill', 'We are out of diesel for the vehicle fleet.')).toBe('fuel_diesel');
  });

  it('detects procurement from item list language', () => {
    expect(detectSmartMemoType('Spare parts needed', 'Please procure bolts and bearings for line 2.')).toBe(
      'procurement_request'
    );
  });

  it('builds suggestions with office and priority', () => {
    const s = buildSmartMemoSuggestions({
      subject: 'Generator repair',
      body: 'Fault on main generator — mechanic required',
      memoType: 'maintenance_repairs',
    });
    expect(s.responsibleOfficeKey).toBeTruthy();
    expect(s.priority).toBeTruthy();
    expect(s.guidedFieldDefs.length).toBeGreaterThan(0);
  });

  it('flags missing required checklist items', () => {
    const checklist = buildSmartMemoChecklist('procurement_request', {}, 0);
    expect(checklist.complete).toBe(false);
    expect(checklist.warning).toMatch(/missing/i);
  });

  it('allows expense conversion for fuel memos with office.use', () => {
    expect(canConvertMemoToExpense('fuel_diesel', ['office.use'])).toBe(true);
    expect(canConvertMemoToExpense('hr_admin', ['office.use'])).toBe(false);
  });

  it('allows procurement conversion for procurement memos', () => {
    expect(canConvertMemoToProcurement('procurement_request', ['office.use'])).toBe(true);
    expect(canConvertMemoToProcurement('fuel_diesel', ['office.use'])).toBe(false);
  });

  it('parses item list lines into material lines', () => {
    const lines = parseItemListToMaterialLines('Bolt M12 x 10 pcs\nWelding rod x 2 box');
    expect(lines).toHaveLength(2);
    expect(lines[0].itemName).toMatch(/Bolt/i);
    expect(lines[0].qtyRequested).toBe(10);
  });

  it('improves memo with rule-based template when type known', () => {
    const out = improveMemoRuleBased('', 'need diesel urgently', 'fuel_diesel');
    expect(out.subject.length).toBeGreaterThan(5);
    expect(out.body).toMatch(/Requested action/i);
  });

  it('builds smartMemo payload for thread create', () => {
    const p = buildSmartMemoPayload({
      memoType: 'fuel_diesel',
      priority: 'urgent',
      filingCategory: 'Fuel & Power',
      expenseCategory: 'Fuel & lubricant',
      guidedFields: { quantityLitres: '50' },
    });
    expect(p.smartMemo.memoType).toBe('fuel_diesel');
    expect(p.smartMemo.guidedFields.quantityLitres).toBe('50');
  });
});
