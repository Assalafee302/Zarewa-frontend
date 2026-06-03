/**
 * Regression: BranchWorkspaceBar must not call hooks after conditional return (React #300).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React, { StrictMode } from 'react';
import { BranchWorkspaceBar } from './BranchWorkspaceBar.jsx';

const workspaceState = {
  apiOnline: true,
  session: {
    currentBranchId: 'BR1',
    viewAllBranches: false,
    user: { roleKey: 'branch_manager' },
    branches: [{ id: 'BR1', name: 'Branch One' }],
  },
  snapshot: {
    workspaceBranches: [{ id: 'BR1', name: 'Branch One' }],
  },
  hasPermission: () => false,
  updateWorkspace: vi.fn(async () => ({ ok: true })),
};

vi.mock('../../context/WorkspaceContext.jsx', () => ({
  useWorkspace: () => workspaceState,
}));

describe('BranchWorkspaceBar hook order', () => {
  afterEach(() => {
    cleanup();
    workspaceState.apiOnline = true;
  });

  it('survives rerender when apiOnline drops after first paint', () => {
    const { rerender } = render(
      <StrictMode>
        <BranchWorkspaceBar />
      </StrictMode>
    );
    expect(screen.getByText('Branch One')).toBeTruthy();

    workspaceState.apiOnline = false;
    rerender(
      <StrictMode>
        <BranchWorkspaceBar />
      </StrictMode>
    );
    expect(screen.queryByText('Branch One')).toBeNull();
  });
});
