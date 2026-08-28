import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PacEmptyState, PacKindPill, PacSlaChip, PAC_INBOX_ROW_CLASS } from './PacInboxChrome.jsx';

describe('PacInboxChrome', () => {
  it('exports the shared inbox row class used by Issues and Needs approval', () => {
    expect(PAC_INBOX_ROW_CLASS).toMatch(/group w-full/);
    expect(PAC_INBOX_ROW_CLASS).toMatch(/border-b border-slate-100/);
  });

  it('renders the standard empty queue copy', () => {
    render(<PacEmptyState />);
    expect(screen.getByText('Nothing in this queue')).toBeTruthy();
    expect(screen.getByText(/Queue clear/i)).toBeTruthy();
  });

  it('renders kind and SLA chips', () => {
    render(
      <>
        <PacKindPill label="fault" tone="urgent" />
        <PacSlaChip kind="issues" row={{ openedAtIso: new Date(Date.now() - 30 * 36e5).toISOString() }} />
      </>
    );
    expect(screen.getByText('fault')).toBeTruthy();
    expect(screen.getByText(/1d/)).toBeTruthy();
  });
});
