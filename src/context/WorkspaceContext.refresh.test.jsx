import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { WorkspaceProvider, useWorkspace } from './WorkspaceContext.jsx';

const cachedBootstrap = {
  ok: true,
  session: {
    user: { id: 'u1', username: 'demo', permissions: [] },
    authenticated: true,
    currentBranchId: 'b1',
  },
  permissions: [],
  quotations: [],
  unifiedWorkItems: [],
};

function Probe() {
  const ws = useWorkspace();
  return (
    <div>
      <span data-testid="status">{ws.status}</span>
      <span data-testid="using-cached">{String(ws.usingCachedData)}</span>
      <button type="button" onClick={() => void ws.refresh({ forceReconnect: true })}>
        reconnect
      </button>
    </div>
  );
}

describe('WorkspaceProvider refresh recovery', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it('clears degraded lock when bootstrap reconnect returns 304', async () => {
    let bootstrapCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const u = String(url);
        if (u.includes('/api/bootstrap')) {
          bootstrapCalls += 1;
          if (bootstrapCalls === 1) {
            return {
              ok: true,
              status: 200,
              text: async () => JSON.stringify(cachedBootstrap),
              headers: { get: () => '"etag-live"' },
            };
          }
          if (bootstrapCalls === 2) {
            throw new Error('network down');
          }
          return {
            ok: false,
            status: 304,
            text: async () => '',
            headers: { get: () => '"etag-live"' },
          };
        }
        throw new Error(`unexpected fetch ${u}`);
      })
    );

    render(
      <WorkspaceProvider>
        <Probe />
      </WorkspaceProvider>
    );

    await waitFor(() => {
      expect(document.querySelector('[data-testid="status"]')?.textContent).toBe('ok');
    });

    await act(async () => {
      document.querySelector('button')?.click();
    });

    await waitFor(() => {
      expect(document.querySelector('[data-testid="status"]')?.textContent).toBe('degraded');
    });

    await act(async () => {
      document.querySelector('button')?.click();
    });

    await waitFor(() => {
      expect(document.querySelector('[data-testid="status"]')?.textContent).toBe('ok');
      expect(document.querySelector('[data-testid="using-cached"]')?.textContent).toBe('false');
    });
  });
});
