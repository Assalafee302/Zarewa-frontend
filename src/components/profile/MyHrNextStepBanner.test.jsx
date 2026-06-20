import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { MyHrNextStepBanner } from './MyHrNextStepBanner.jsx';

describe('MyHrNextStepBanner', () => {
  it('returns null when nothing needs attention', () => {
    const { container } = render(
      <MemoryRouter>
        <MyHrNextStepBanner />
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });

  it('prioritizes rejected documents over pending requests', () => {
    render(
      <MemoryRouter>
        <MyHrNextStepBanner rejectedDocs={2} pendingRequests={3} incompleteSections={1} />
      </MemoryRouter>
    );
    expect(screen.getByText(/2 documents need attention/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Fix documents/i })).toHaveAttribute('href', '/my-profile/documents');
  });

  it('shows pending requests when no document issues', () => {
    render(
      <MemoryRouter>
        <MyHrNextStepBanner pendingRequests={2} />
      </MemoryRouter>
    );
    expect(screen.getByText(/2 requests awaiting review/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View my requests/i })).toHaveAttribute('href', '/my-profile/requests');
  });

  it('shows profile setup when only completeness gaps remain', () => {
    render(
      <MemoryRouter>
        <MyHrNextStepBanner incompleteSections={2} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Complete your HR profile/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Finish setup/i })).toHaveAttribute('href', '/my-profile/employment');
  });
});
