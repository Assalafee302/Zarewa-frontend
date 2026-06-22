import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { ExpenseCategoryLaneBadge } from './ExpenseCategoryLaneBadge.jsx';
import { ExpenseCategoryRecommendationCard } from './ExpenseCategoryRecommendationCard.jsx';
import { OthersJustificationField } from './OthersJustificationField.jsx';
import { ExpenseCategoryPayoutReadinessPanel } from './ExpenseCategoryPayoutReadinessPanel.jsx';
import { ExpenseCategoryReclassPreviewPanel } from './ExpenseCategoryReclassPreviewPanel.jsx';
import { ExpenseCategoryOthersTrendTable } from './ExpenseCategoryOthersTrendTable.jsx';
import { ExpenseCategoryExceptionBanner } from './ExpenseCategoryExceptionBanner.jsx';

beforeEach(() => cleanup());
afterEach(() => cleanup());

describe('ExpenseCategoryLaneBadge', () => {
  it('renders lane label for production category', () => {
    render(<ExpenseCategoryLaneBadge category="Fuel & lubricant" />);
    expect(screen.getByText('Production')).toBeTruthy();
  });
});

describe('ExpenseCategoryRecommendationCard', () => {
  it('renders apply action for open suggestion', () => {
    const onApply = vi.fn();
    render(
      <ExpenseCategoryRecommendationCard
        category="Maintenance"
        reason="Matched keywords."
        onApply={onApply}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /use category/i }));
    expect(onApply).toHaveBeenCalledOnce();
  });

  it('renders blocked state', () => {
    render(
      <ExpenseCategoryRecommendationCard
        category="Land and buildings"
        blocked
        blockedReason="Finance must select this category."
      />
    );
    expect(screen.getByText(/needs approval/i)).toBeTruthy();
  });
});

describe('OthersJustificationField', () => {
  it('shows progress toward minimum length', () => {
    render(
      <OthersJustificationField value="short" onChange={() => {}} minLength={40} />
    );
    expect(screen.getByText(/0\/40|short/i)).toBeTruthy();
  });
});

describe('ExpenseCategoryPayoutReadinessPanel', () => {
  it('shows blocked payout gate', () => {
    render(
      <ExpenseCategoryPayoutReadinessPanel
        glPreview={{
          gl: { debitAccountCode: '5100', isCapex: false },
          expenseCategory: 'Maintenance',
        }}
        payoutGate={{
          ok: false,
          error: 'Complete checklist',
          checks: [{ key: 'attach', ok: false, label: 'Attachment', detail: 'Missing file' }],
        }}
      />
    );
    expect(screen.getByText(/complete items below/i)).toBeTruthy();
    expect(screen.getByText('Attachment')).toBeTruthy();
  });
});

describe('ExpenseCategoryReclassPreviewPanel', () => {
  it('shows GL path preview', () => {
    render(
      <ExpenseCategoryReclassPreviewPanel
        preview={{
          priorCategory: 'Others',
          paidAmountNgn: 50000,
          gl: { fromAccountCode: '5999', toAccountCode: '5100' },
        }}
        newCategory="Maintenance"
      />
    );
    expect(screen.getByText(/GL reclass preview/i)).toBeTruthy();
    expect(screen.getByText(/Posts Dr 5100/i)).toBeTruthy();
  });
});

describe('ExpenseCategoryOthersTrendTable', () => {
  it('renders heat cells for branch months', () => {
    render(
      <ExpenseCategoryOthersTrendTable
        trend={{
          monthKeys: ['2026-01'],
          branches: [
            {
              branchId: 'BR-KD',
              months: [{ monthKey: '2026-01', othersPct: 20, totalNgn: 1000 }],
              summary: { othersPct: 20 },
            },
          ],
        }}
        branchLabel={(id) => id}
      />
    );
    expect(screen.getAllByText('20%').length).toBeGreaterThan(0);
  });
});

describe('ExpenseCategoryExceptionBanner', () => {
  it('renders chips and export action', () => {
    const onExport = vi.fn();
    render(
      <ExpenseCategoryExceptionBanner
        summary={{
          shouldAlert: true,
          exceptionRowCount: 2,
          exceptionTotalNgn: 100000,
          othersCount: 1,
          ap3UnclassifiedNgn: 0,
        }}
        formatNgn={(n) => `₦${n}`}
        onExportCsv={onExport}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(onExport).toHaveBeenCalledOnce();
  });
});
