import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReportsExport } from './useReportsExport.js';
import { PACK_GL_AUDIT, PACK_SALES_CUSTOMER } from '../lib/reportsExportCatalog.js';
import {
  downloadStandardFinanceWorkbook,
  downloadStandardPurchasesWorkbook,
  downloadStandardSalesWorkbook,
  downloadStandardStockWorkbook,
} from '../lib/standardReportsDownload.js';

vi.mock('../lib/standardReportsDownload.js', () => ({
  downloadStandardSalesWorkbook: vi.fn(),
  downloadStandardFinanceWorkbook: vi.fn(),
  downloadStandardPurchasesWorkbook: vi.fn(),
  downloadStandardStockWorkbook: vi.fn(),
}));

vi.mock('xlsx', () => ({
  utils: {
    book_new: vi.fn(() => ({})),
    json_to_sheet: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

function emptyExportArgs(overrides = {}) {
  return {
    apiFetch: vi.fn(),
    showToast: vi.fn(),
    hasFinanceView: true,
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    expenses: [],
    paymentRequests: [],
    coilLots: [],
    movements: [],
    bankReconciliation: [],
    ledgerEntries: [],
    treasuryMovements: [],
    quotations: [],
    receipts: [],
    productionJobs: [],
    refunds: [],
    liveProducts: [],
    purchaseOrders: [],
    accessoryUsage: [],
    ...overrides,
  };
}

describe('useReportsExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handlePackDownload shows permission toast when locked', () => {
    const showToast = vi.fn();
    const { result } = renderHook(() => useReportsExport(emptyExportArgs({ showToast })));

    act(() => {
      result.current.handlePackDownload(PACK_GL_AUDIT, 'Excel', true);
    });

    expect(showToast).toHaveBeenCalledWith('This export needs the finance.view permission.', { variant: 'info' });
  });

  it('handlePackPrint blocks GL print without finance.view', () => {
    const showToast = vi.fn();
    const { result } = renderHook(() =>
      useReportsExport(emptyExportArgs({ showToast, hasFinanceView: false }))
    );

    act(() => {
      result.current.handlePackPrint(PACK_GL_AUDIT);
    });

    expect(showToast).toHaveBeenCalledWith('General ledger pack requires finance.view.', { variant: 'info' });
  });

  it('runApiWorkbook delegates to standard download helpers', () => {
    const showToast = vi.fn();
    const apiFetch = vi.fn();
    const { result } = renderHook(() => useReportsExport(emptyExportArgs({ showToast, apiFetch })));

    act(() => {
      result.current.runApiWorkbook('sales');
      result.current.runApiWorkbook('finance');
      result.current.runApiWorkbook('purchases');
      result.current.runApiWorkbook('stock');
    });

    expect(downloadStandardSalesWorkbook).toHaveBeenCalledWith(apiFetch, '2026-03-01', '2026-03-31', showToast);
    expect(downloadStandardFinanceWorkbook).toHaveBeenCalledWith(apiFetch, '2026-03-01', '2026-03-31', showToast);
    expect(downloadStandardPurchasesWorkbook).toHaveBeenCalledWith(apiFetch, '2026-03-01', '2026-03-31', showToast);
    expect(downloadStandardStockWorkbook).toHaveBeenCalledWith(apiFetch, '2026-03-31', showToast);
  });

  it('downloadMonthEndBundle warns when no pack rows exist', () => {
    const showToast = vi.fn();
    const { result } = renderHook(() => useReportsExport(emptyExportArgs({ showToast })));

    act(() => {
      result.current.downloadMonthEndBundle();
    });

    expect(showToast).toHaveBeenCalledWith('No rows in any core pack for this period.', { variant: 'info' });
  });

  it('opens generic print modal for workspace sales pack config', async () => {
    const ledgerEntries = [
      {
        type: 'RECEIPT',
        atISO: '2026-03-10',
        amountNgn: 50_000,
        customerName: 'Acme',
        quotationRef: 'QT-1001',
        paymentMethod: 'Transfer',
        bankReference: 'REF1',
        id: 'LE-1',
      },
    ];
    const { result } = renderHook(() => useReportsExport(emptyExportArgs({ ledgerEntries })));

    await act(async () => {
      await result.current.handlePackPrint(PACK_SALES_CUSTOMER);
    });

    expect(result.current.printOpen).toBe(true);
    expect(result.current.printPayload?.title).toBe(PACK_SALES_CUSTOMER);
    expect(result.current.printPayload?.rows?.length).toBeGreaterThan(0);
  });
});
