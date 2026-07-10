import { describe, expect, it } from 'vitest';
import {
  EXPORT_SECTIONS,
  MONTH_END_RECOMMENDED_IDS,
  PACK_GL_AUDIT,
  PACK_MATERIAL_TRANSACTION,
  defaultReportsJob,
  detectPeriodPreset,
  filterExportCatalog,
  flattenExportCatalog,
  formatPeriodLabel,
  periodRangeForPreset,
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

  it('flattens catalog with month-end flags', () => {
    const flat = flattenExportCatalog();
    expect(flat.length).toBe(13);
    expect(flat.filter((i) => i.monthEndRecommended).map((i) => i.id).sort()).toEqual(
      [...MONTH_END_RECOMMENDED_IDS].sort()
    );
  });

  it('filters by query and hides finance-locked when no finance view', () => {
    const flat = flattenExportCatalog();
    expect(filterExportCatalog(flat, { query: 'refund' }).some((i) => i.id === 'refund-period-report')).toBe(
      true
    );
    const noFinance = filterExportCatalog(flat, { hasFinanceView: false });
    expect(noFinance.some((i) => i.requiresFinanceView)).toBe(false);
  });

  it('period presets and labels', () => {
    const today = new Date('2026-07-10T12:00:00');
    const mtd = periodRangeForPreset('mtd', today);
    expect(mtd).toEqual({ startDate: '2026-07-01', endDate: '2026-07-10' });
    expect(detectPeriodPreset(mtd.startDate, mtd.endDate, today)).toBe('mtd');
    expect(formatPeriodLabel('2026-07-01', '2026-07-10')).toBe('1–10 Jul 2026');
  });

  it('defaultReportsJob prefers exceptions then role', () => {
    expect(defaultReportsJob('finance_manager', { openExceptionCount: 2 })).toBe('exceptions');
    expect(defaultReportsJob('finance_manager', { openExceptionCount: 0 })).toBe('close');
    expect(defaultReportsJob('sales_manager', { openExceptionCount: 0 })).toBe('export');
  });

  it('formatDownloadedAgo and KPI map', async () => {
    const { formatDownloadedAgo, KPI_EXPORT_MAP } = await import('./reportsExportCatalog');
    expect(KPI_EXPORT_MAP.produced).toBe('std-sales');
    expect(formatDownloadedAgo(new Date(Date.now() - 5000).toISOString(), Date.now())).toBe('just now');
    expect(formatDownloadedAgo(new Date(Date.now() - 120000).toISOString(), Date.now())).toBe('2m ago');
  });
});
