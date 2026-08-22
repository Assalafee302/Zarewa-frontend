import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { OperationsDeskToolbar } from './OperationsDeskToolbar';

vi.mock('../AiAskButton', () => ({
  AiAskButton: ({ children, className, title }) => (
    <button type="button" className={className} title={title}>
      {children}
    </button>
  ),
}));

afterEach(() => cleanup());

function renderToolbar(props) {
  return render(
    <MemoryRouter>
      <OperationsDeskToolbar {...props} />
    </MemoryRouter>
  );
}

describe('OperationsDeskToolbar', () => {
  it('styles Ask AI as a ghost control', () => {
    renderToolbar({ activeTab: 'overview' });
    expect(screen.getByRole('button', { name: /ask ai/i }).className).toMatch(/text-slate-500/);
    expect(screen.queryByRole('button', { name: /print follow-up/i })).toBeNull();
  });

  it('puts Print follow-up on Register as the primary', () => {
    renderToolbar({ activeTab: 'production', onPrintFollowUp: vi.fn() });
    const print = screen.getByRole('button', { name: /print follow-up/i });
    expect(print.className).toMatch(/bg-zarewa-teal/);
  });
});
