import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from './test/renderWithProviders';
import App from './App.jsx';

vi.mock('./lib/firebase.js', () => ({
  firebaseConfigured: false,
  auth: null,
  app: null,
  db: null,
  storage: null,
  functions: null,
  analyticsPromise: Promise.resolve(null),
}));

vi.mock('./context/WorkspaceContext.jsx', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useWorkspace: () => ({
      status: 'auth_required',
      authRequired: true,
      snapshot: null,
      apiOnline: false,
      hasWorkspaceData: false,
      usingCachedData: false,
      canMutate: false,
      permissions: [],
      hasPermission: () => false,
      canAccessModule: () => false,
      login: vi.fn(),
      loginWithFirebase: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    }),
  };
});

describe('App smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login screen without crashing', async () => {
    renderWithProviders(<App />);
    expect(await screen.findByText(/enter workspace/i)).toBeTruthy();
  });
});
