import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, act, cleanup } from '@testing-library/react';
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
      <button type="button" onClick={() => void ws.refresh({ poll: true, mode: 'dashboard' })}>
        poll
      </button>
    </div>
  );
}

describe('WorkspaceProvider refresh recovery', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
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

  it('absorbs a couple of flaky background poll failures without locking the app', async () => {
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
          // Two transient poll failures — a flaky connection, not a real outage.
          throw new Error('flaky network');
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

    const pollButton = document.querySelectorAll('button')[1];

    // First and second poll failures: absorbed silently, still live.
    await act(async () => {
      pollButton?.click();
    });
    expect(document.querySelector('[data-testid="status"]')?.textContent).toBe('ok');

    await act(async () => {
      pollButton?.click();
    });
    expect(document.querySelector('[data-testid="status"]')?.textContent).toBe('ok');

    // Third consecutive poll failure: tolerance exhausted, falls back to the cached snapshot.
    await act(async () => {
      pollButton?.click();
    });
    await waitFor(() => {
      expect(document.querySelector('[data-testid="status"]')?.textContent).toBe('degraded');
    });
  });

  it('resets the poll failure streak once a poll succeeds again', async () => {
    // Sequence: call 1 (mount) ok, calls 2-3 fail, call 4 ok (recovers), call 5 fails again.
    // If the streak resets on recovery, call 5 is only the 1st failure since — stays live.
    // If it didn't reset, call 5 would be the 3rd failure overall — would wrongly degrade.
    let bootstrapCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const u = String(url);
        if (u.includes('/api/bootstrap')) {
          bootstrapCalls += 1;
          if (bootstrapCalls === 2 || bootstrapCalls === 3 || bootstrapCalls === 5) {
            throw new Error('flaky network');
          }
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify(cachedBootstrap),
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

    const pollButton = document.querySelectorAll('button')[1];

    // Calls 2 and 3: two failures — right at the tolerance boundary, still live.
    await act(async () => {
      pollButton?.click();
    });
    expect(document.querySelector('[data-testid="status"]')?.textContent).toBe('ok');
    await act(async () => {
      pollButton?.click();
    });
    expect(document.querySelector('[data-testid="status"]')?.textContent).toBe('ok');

    // Call 4: a poll succeeds — this must reset the streak, not just avoid incrementing it.
    await act(async () => {
      pollButton?.click();
    });
    expect(document.querySelector('[data-testid="status"]')?.textContent).toBe('ok');

    // Call 5: a fresh single failure after the recovery must not immediately lock the app.
    await act(async () => {
      pollButton?.click();
    });
    expect(document.querySelector('[data-testid="status"]')?.textContent).toBe('ok');
  });
});
