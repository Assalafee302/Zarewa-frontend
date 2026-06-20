import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AccountingDeskNav } from './AccountingDeskNav';

describe('AccountingDeskNav', () => {
  it('renders zone tabs without invalid element type crash', () => {
    render(<AccountingDeskNav tab="overview" onTabChange={() => {}} />);
    expect(screen.getByRole('tab', { name: /Home/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Close/i })).toBeInTheDocument();
  });

  it('renders secondary tabs for close zone', () => {
    render(<AccountingDeskNav tab="opening" onTabChange={() => {}} />);
    expect(screen.getByRole('tab', { name: /Opening Pack/i })).toBeInTheDocument();
  });
});
