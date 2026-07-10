/**
 * Production-mode startup test — catches TDZ during App module load.
 */
import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from './test/renderWithProviders';
import React from 'react';

vi.mock('./lib/firebase.js', () => ({
  firebaseConfigured: false,
  auth: null,
  app: null,
  db: null,
  storage: null,
  functions: null,
  analyticsPromise: Promise.resolve(null),
}));

vi.mock('./lib/apiBase.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    apiFetch: vi.fn(async () => ({ ok: false, data: null })),
  };
});

describe('production startup TDZ', () => {
  it('loads App module without ReferenceError', async () => {
    let mod;
    await expect(import('./App.jsx')).resolves.toBeTruthy();
    mod = await import('./App.jsx');
    expect(typeof mod.default).toBe('function');
  }, 120_000);

  it('renders login shell without error boundary crash', async () => {
    const { default: App } = await import('./App.jsx');
    renderWithProviders(<App />);
    await waitFor(
      () => {
        expect(screen.queryByText(/Zarewa could not load/i)).toBeNull();
      },
      { timeout: 12000 }
    );
    expect(await screen.findByText(/enter workspace/i, {}, { timeout: 12000 })).toBeTruthy();
  });
});
