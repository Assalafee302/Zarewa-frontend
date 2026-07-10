/**
 * Reproduces the QuotationModal #185 pattern in miniature:
 * effect → setProductRows(apply…) → re-render → effect again.
 * apply must return the same array ref when nothing changed, or React blows up.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import { applyWorkbookPricesToProductRows } from './quotationWorkbookPriceApply.js';

afterEach(() => {
  cleanup();
});

function WorkbookRefreshProbe({ initialRows }) {
  const [rows, setRows] = useState(initialRows);
  const optionsRef = useRef([{ name: 'Roofing Sheet' }]);
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  const refresh = useCallback(() => {
    setRows((prev) =>
      applyWorkbookPricesToProductRows(prev, {
        options: optionsRef.current,
        resolveUnitPrice: () => 4500,
        resolveWorkbookLineMeta: () => ({
          floorPerMeter: 4000,
          suggestedListPerMeter: 4500,
        }),
      })
    );
  }, []);

  // Intentionally depends on `rows` like a naive “re-apply after every line edit”.
  useEffect(() => {
    refresh();
  }, [refresh, rows]);

  return (
    <div>
      <span data-testid="price">{rows[0]?.unitPrice ?? ''}</span>
      <span data-testid="renders">{renderCountRef.current}</span>
      <button
        type="button"
        data-testid="select-product"
        onClick={() =>
          setRows((prev) =>
            prev.map((row, i) =>
              i === 0
                ? {
                    ...row,
                    name: 'Roofing Sheet',
                    unitPrice: '4500',
                    floorPricePerMeter: 4000,
                    recommendedPricePerMeter: 4500,
                  }
                : row
            )
          )
        }
      >
        Select
      </button>
    </div>
  );
}

describe('applyWorkbookPricesToProductRows React #185 guard', () => {
  it('does not infinite-loop when an effect re-applies after every rows change', async () => {
    render(
      <WorkbookRefreshProbe
        initialRows={[{ id: '1', name: 'Roofing Sheet', unitPrice: '4500' }]}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('price').textContent).toBe('4500');
    });

    // First apply may attach floor/recommended; then must stabilize.
    await waitFor(() => {
      const n = Number(screen.getByTestId('renders').textContent);
      expect(n).toBeGreaterThan(0);
      expect(n).toBeLessThan(25);
    });
  });

  it('survives product select while a rows-dependent refresh effect is armed', async () => {
    render(
      <WorkbookRefreshProbe initialRows={[{ id: '1', name: '', unitPrice: '' }]} />
    );

    await act(async () => {
      screen.getByTestId('select-product').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('price').textContent).toBe('4500');
    });

    await waitFor(() => {
      expect(Number(screen.getByTestId('renders').textContent)).toBeLessThan(25);
    });
  });
});
