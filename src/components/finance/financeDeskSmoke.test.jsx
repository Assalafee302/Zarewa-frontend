import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FinanceKpiCard } from './FinanceKpiCard';
import { FinanceEmptyState } from './FinanceEmptyState';
import { CreditExceptionStatusChip } from './CreditExceptionStatusChip';
import { FinanceTabs } from './FinanceTabs';
import { Ap2SupplierDiagnosticsPanel } from './Ap2SupplierDiagnosticsPanel';
import { Ap2ApRebuildModal } from './Ap2ApRebuildModal';
import { Ap2cAccountingSections } from './Ap2cAccountingSections';
import { Ap3CostingReadinessPanel } from './Ap3CostingReadinessPanel';
import { Ap3ReportsSection } from './Ap3ReportsSection';
import { Ap3MaterialCostSection } from './Ap3MaterialCostSection';

describe('finance desk components', () => {
  it('FinanceKpiCard renders label and value', () => {
    render(<FinanceKpiCard label="Pending" value={3} hint="test" />);
    expect(screen.getByText('Pending')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('FinanceEmptyState renders without crash', () => {
    render(<FinanceEmptyState title="All clear" description="Nothing queued" />);
    expect(screen.getByText('All clear')).toBeTruthy();
  });

  it('CreditExceptionStatusChip shows pending', () => {
    render(<CreditExceptionStatusChip status="pending" />);
    expect(screen.getByText(/Pending approval/i)).toBeTruthy();
  });

  it('FinanceTabs renders tab buttons', () => {
    const tabs = [
      { id: 'a', label: 'Overview' },
      { id: 'b', label: 'Credit' },
    ];
    render(<FinanceTabs tabs={tabs} active="a" onChange={() => {}} />);
    expect(screen.getByText('Overview')).toBeTruthy();
    expect(screen.getByText('Credit')).toBeTruthy();
  });

  it('FinanceTabs includes Supplier & AP tab label', () => {
    render(
      <FinanceTabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'supplier-ap', label: 'Supplier & AP' },
        ]}
        active="supplier-ap"
        onChange={() => {}}
      />
    );
    expect(screen.getByText('Supplier & AP')).toBeTruthy();
  });

  it('Ap2SupplierDiagnosticsPanel shows Preview AP correction when allowed', () => {
    render(
      <MemoryRouter>
        <Ap2SupplierDiagnosticsPanel enabled={false} mayPreviewRebuild />
      </MemoryRouter>
    );
    expect(screen.getByText(/Preview AP correction/i)).toBeTruthy();
  });

  it('Ap2ApRebuildModal requires approval note UI', () => {
    render(
      <Ap2ApRebuildModal
        open
        onClose={() => {}}
        preview={{
          status: 'preview_only',
          previewHash: 'abc',
          summary: { currentApNgn: 0, proposedApTotalNgn: 0, affectedPoCount: 0 },
          rows: [],
          flags: { apReceivedBasisRebuildEnabled: true },
        }}
        mayApply
        onApply={async () => null}
      />
    );
    expect(screen.getByLabelText(/Approval note/i)).toBeTruthy();
    expect(screen.getByText(/Head of Accounts has reviewed/i)).toBeTruthy();
  });

  it('Ap2cAccountingSections renders load button', () => {
    render(
      <MemoryRouter>
        <Ap2cAccountingSections enabled={false} />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /Load AP2c/i })).toBeTruthy();
    expect(screen.getByText(/Supplier advances & inventory/i)).toBeTruthy();
  });

  it('Ap2SupplierDiagnosticsPanel empty state renders', () => {
    render(
      <MemoryRouter>
        <Ap2SupplierDiagnosticsPanel enabled={false} compact />
      </MemoryRouter>
    );
    expect(screen.getAllByText(/No diagnostic loaded/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Head of Accounts should review/i).length).toBeGreaterThan(0);
  });

  it('FinanceTabs includes Costing tab label', () => {
    render(
      <FinanceTabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'costing', label: 'Costing' },
        ]}
        active="costing"
        onChange={() => {}}
      />
    );
    expect(screen.getByText('Costing')).toBeTruthy();
  });

  it('Ap3CostingReadinessPanel renders readiness empty state', () => {
    render(
      <MemoryRouter>
        <Ap3CostingReadinessPanel enabled={false} />
      </MemoryRouter>
    );
    expect(screen.getByText(/No costing readiness loaded/i)).toBeTruthy();
    expect(screen.getByText(/Readiness only/i)).toBeTruthy();
  });

  it('Ap3ReportsSection hidden when mayView false', () => {
    const { container } = render(<Ap3ReportsSection mayView={false} />);
    expect(container.textContent).toBe('');
  });

  it('Ap3MaterialCostSection renders load button', () => {
    render(<Ap3MaterialCostSection enabled={false} period="2026-06" />);
    expect(screen.getAllByRole('button', { name: /Load material cost/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Material cost per metre \(AP3b\)/i).length).toBeGreaterThan(0);
  });

  it('Ap3ReportsSection shows cards when mayView', () => {
    render(
      <MemoryRouter>
        <Ap3ReportsSection mayView />
      </MemoryRouter>
    );
    expect(screen.getByText(/Costing Readiness Report/i)).toBeTruthy();
    expect(screen.getAllByText(/not final cost per metre/i).length).toBeGreaterThan(0);
  });
});
