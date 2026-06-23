import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WorkspaceExpenseQuickActions } from './WorkspaceExpenseQuickActions.jsx';

vi.mock('../../context/WorkspaceContext.jsx', () => ({
  useWorkspace: () => ({
    hasWorkspaceData: true,
    snapshot: {
      treasuryAccounts: [{ id: 'TA-1', name: 'Main till', balance: 1000, branchId: 'BR-KD' }],
    },
    session: { user: { displayName: 'Demo' }, currentBranchId: 'BR-KD', viewAllBranches: false },
    branchScope: 'BR-KD',
    viewAllBranches: false,
    hasPermission: (p) => p === 'expenses.create',
    canAccessModule: () => true,
  }),
}));

vi.mock('../../context/ToastContext.jsx', () => ({
  useToast: () => ({ show: vi.fn() }),
}));

describe('WorkspaceExpenseQuickActions', () => {
  it('renders without treasuryAccountsForWorkspace ReferenceError', () => {
    render(
      <MemoryRouter>
        <WorkspaceExpenseQuickActions />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /new expense request/i })).toBeTruthy();
  });
});
