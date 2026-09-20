import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { AccountingDeskNav } from './AccountingDeskNav';

afterEach(() => cleanup());

describe('AccountingDeskNav', () => {
  it('renders zone tabs without invalid element type crash', () => {
    render(<AccountingDeskNav tab="overview" onTabChange={() => {}} />);
    expect(screen.getByRole('tab', { name: /Home/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Month-end/i })).toBeInTheDocument();
  });

  it('renders secondary tabs for close zone', () => {
    render(<AccountingDeskNav tab="opening" onTabChange={() => {}} />);
    expect(screen.getByRole('tab', { name: /Opening balances/i })).toBeInTheDocument();
  });

  it('hides month-end GL tabs when local posting is off', () => {
    const { container } = render(
      <AccountingDeskNav tab="creditors" onTabChange={() => {}} glPostingEnabled={false} />
    );
    const zoneBar = container.querySelector('[aria-label="Accounting desk zone"]');
    expect(zoneBar?.textContent).toContain('Registers');
    expect(zoneBar?.textContent).not.toMatch(/Home/);
    expect(zoneBar?.textContent).not.toMatch(/Month-end/);
  });
});
