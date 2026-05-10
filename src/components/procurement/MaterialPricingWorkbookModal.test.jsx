import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MaterialPricingWorkbookModal } from './MaterialPricingWorkbookModal.jsx';
import { apiFetch } from '../../lib/apiBase';

vi.mock('../../context/WorkspaceContext', () => ({
  useWorkspace: () => ({
    snapshot: {
      workspaceBranches: [{ id: 'BR-T', name: 'Test Branch' }],
    },
    session: {},
  }),
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ show: vi.fn() }),
}));

vi.mock('../../lib/apiBase', () => ({
  apiFetch: vi.fn(),
}));

function sheetResponse() {
  const baseRow = {
    designKey: '',
    conversionStandardKgPerM: null,
    conversionReferenceKgPerM: null,
    conversionHistoryKgPerM: null,
    conversionUsedKgPerM: 1,
    costPerKgNgn: 0,
    overheadNgnPerM: 0,
    profitNgnPerM: 0,
    commissionNgnPerM: 0,
    minimumPricePerMeterNgn: 0,
    notes: '',
  };
  return {
    ok: true,
    data: {
      ok: true,
      materialKey: 'alu',
      branchId: 'BR-T',
      gauges: ['0.40', '0.45'],
      theoreticalStandardByGauge: { '0.40': 1.0, '0.45': 1.1 },
      catalogHintByGauge: {},
      purchaseAvgConversionByGauge: {},
      gaugeHistoryAvgConversionByGauge: {},
      resolvedByGauge: {
        '0.40': { std: 1.0, ref: null, hist: null, usedSuggested: 1.0, used: 1.0 },
        '0.45': { std: 1.1, ref: null, hist: null, usedSuggested: 1.1, used: 1.1 },
      },
      recommendedCostPerKgNgn: null,
      isStoneCoatedWorkbook: false,
      purchaseCostLookbackDays: 30,
      rows: [
        { gaugeMm: '0.40', ...baseRow },
        { gaugeMm: '0.45', ...baseRow },
      ],
    },
  };
}

describe('MaterialPricingWorkbookModal', () => {
  afterEach(() => {
    cleanup();
    vi.mocked(apiFetch).mockReset();
  });

  it('syncs material ₦/kg to every gauge row for cost/m', async () => {
    vi.mocked(apiFetch).mockImplementation(async (url) => {
      const u = String(url);
      if (u.includes('/material-sheet/events')) {
        return { ok: true, data: { ok: true, events: [] } };
      }
      if (u.includes('/material-sheet?')) {
        return sheetResponse();
      }
      return { ok: false, data: { error: 'unexpected' } };
    });

    render(<MaterialPricingWorkbookModal open onClose={vi.fn()} initialMaterialKey="alu" />);

    await waitFor(() => {
      expect(screen.getByText('0.40 mm')).toBeInTheDocument();
    });

    const costField = screen.getByRole('textbox', { name: /material cost per kilogram/i });
    // Radix scroll-lock sets pointer-events:none on body; use change events instead of userEvent.type.
    fireEvent.change(costField, { target: { value: '800' } });

    await waitFor(() => {
      expect(screen.getAllByText(/^₦800$/).length).toBeGreaterThanOrEqual(2);
    });
  });
});
