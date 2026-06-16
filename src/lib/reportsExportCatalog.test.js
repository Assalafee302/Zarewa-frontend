import { describe, expect, it } from 'vitest';
import {
  EXPORT_SECTIONS,
  PACK_GL_AUDIT,
  PACK_MATERIAL_TRANSACTION,
  startOfMonthYmd,
  ymdLocal,
} from './reportsExportCatalog';

describe('reportsExportCatalog', () => {
  it('startOfMonthYmd returns first day of month', () => {
    expect(startOfMonthYmd(new Date('2026-03-15T12:00:00'))).toBe('2026-03-01');
    expect(startOfMonthYmd(new Date('2026-12-31T12:00:00'))).toBe('2026-12-01');
  });

  it('ymdLocal formats local calendar date', () => {
    expect(ymdLocal(new Date('2026-06-15T12:00:00'))).toBe('2026-06-15');
  });

  it('defines four export sections with unique item ids', () => {
    expect(EXPORT_SECTIONS.map((s) => s.id)).toEqual(['audit', 'finance', 'sales', 'operations']);
    const ids = EXPORT_SECTIONS.flatMap((s) => s.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(13);
  });

  it('marks coil stock audit workbook as excel-only', () => {
    const stock = EXPORT_SECTIONS.find((s) => s.id === 'audit')?.items.find((i) => i.id === 'std-stock');
    expect(stock?.excelOnly).toBe(true);
    expect(stock?.workbook).toBe('stock');
  });

  it('requires finance.view for GL audit pack', () => {
    const gl = EXPORT_SECTIONS.find((s) => s.id === 'finance')?.items.find((i) => i.pack === PACK_GL_AUDIT);
    expect(gl?.requiresFinanceView).toBe(true);
  });

  it('includes material transaction register under operations', () => {
    const ops = EXPORT_SECTIONS.find((s) => s.id === 'operations');
    expect(ops?.items.some((i) => i.pack === PACK_MATERIAL_TRANSACTION)).toBe(true);
  });
});
