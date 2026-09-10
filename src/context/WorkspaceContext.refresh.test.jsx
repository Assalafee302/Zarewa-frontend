import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, act, cleanup } from '@testing-library/react';
import { WorkspaceProvider, useWorkspace, reconnectBackoffMs } from './WorkspaceContext.jsx';

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
      <span data-testid="can-mutate">{String(ws.canMutate)}</span>
      <span data-testid="unstable">{String(Boolean(ws.connectionUnstable))}</span>
      <button type="button" onClick={() => void ws.refresh({ forceReconnect: true })}>
        reconnect
      </button>
      <button type="button" onClick={() => void ws.refresh({ poll: true, mode: 'dashboard' })}>
        poll
      </button>
    </div>
  );
}

function stubFetch(handler) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, init) => handler(String(url), init))
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
    stubFetch(async (u) => {
      if (u.includes('/api/livez') || u.includes('/api/health')) {
        return { ok: false, status: 503, json: async () => ({}), text: async () => '{}' };
      }
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
        // forceReconnect retries once — both attempts fail before livez decides hard lock.
        if (bootstrapCalls <= 3) {
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
    });

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

    await waitFor(
      () => {
        expect(document.querySelector('[data-testid="status"]')?.textContent).toBe('degraded');
      },
      { timeout: 8_000 }
    );

    await act(async () => {
      document.querySelector('button')?.click();
    });

    await waitFor(
      () => {
        expect(document.querySelector('[data-testid="status"]')?.textContent).toBe('ok');
        expect(document.querySelector('[data-testid="using-cached"]')?.textContent).toBe('false');
      },
      { timeout: 8_000 }
    );
  });

  it('absorbs flaky background poll failures without locking the app', async () => {
    let bootstrapCalls = 0;
    stubFetch(async (u) => {
      if (u.includes('/api/livez')) {
        return { ok: false, status: 0, json: async () => ({}), text: async () => '' };
      }
      if (u.includes('/api/health')) {
        throw new TypeError('Failed to fetch');
      }
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
        throw new Error('flaky network');
      }
      throw new Error(`unexpected fetch ${u}`);
    });

    render(
      <WorkspaceProvider>
        <Probe />
      </WorkspaceProvider>
    );

    await waitFor(() => {
      expect(document.querySelector('[data-testid="status"]')?.textContent).toBe('ok');
    });

    const pollButton = document.querySelectorAll('button')[1];

    // Default tolerance is 5 — first five poll failures stay live.
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        pollButton?.click();
      });
      expect(document.querySelector('[data-testid="status"]')?.textContent).toBe('ok');
    }

    // Sixth consecutive failure with dead livez → hard degraded.
    await act(async () => {
      pollButton?.click();
    });
    await waitFor(() => {
      expect(document.querySelector('[data-testid="status"]')?.textContent).toBe('degraded');
    });
  });

  it('uses soft unstable when API is reachable but sync fails', async () => {
    let bootstrapCalls = 0;
    stubFetch(async (u) => {
      if (u.includes('/api/livez')) {
        return { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => '{}' };
      }
      if (u.includes('/api/health')) {
        return { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => '{}' };
      }
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
        throw new Error('bootstrap timeout');
      }
      throw new Error(`unexpected fetch ${u}`);
    });

    render(
      <WorkspaceProvider>
        <Probe />
      </WorkspaceProvider>
    );

    await waitFor(() => {
      expect(document.querySelector('[data-testid="status"]')?.textContent).toBe('ok');
    });

    const pollButton = document.querySelectorAll('button')[1];
    for (let i = 0; i < 6; i++) {
      await act(async () => {
        pollButton?.click();
      });
    }

    await waitFor(() => {
      expect(document.querySelector('[data-testid="status"]')?.textContent).toBe('unstable');
      expect(document.querySelector('[data-testid="can-mutate"]')?.textContent).toBe('true');
      expect(document.querySelector('[data-testid="using-cached"]')?.textContent).toBe('false');
      expect(document.querySelector('[data-testid="unstable"]')?.textContent).toBe('true');
    });
  });

  it('resets the poll failure streak once a poll succeeds again', async () => {
    // Sequence: call 1 (mount) ok, calls 2-3 fail, call 4 ok (recovers), call 5 fails again.
    let bootstrapCalls = 0;
    stubFetch(async (u) => {
      if (u.includes('/api/livez') || u.includes('/api/health')) {
        throw new TypeError('Failed to fetch');
      }
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
    });

    render(
      <WorkspaceProvider>
        <Probe />
      </WorkspaceProvider>
    );

    await waitFor(() => {
      expect(document.querySelector('[data-testid="status"]')?.textContent).toBe('ok');
    });

    const pollButton = document.querySelectorAll('button')[1];

    await act(async () => {
      pollButton?.click();
    });
    expect(document.querySelector('[data-testid="status"]')?.textContent).toBe('ok');
    await act(async () => {
      pollButton?.click();
    });
    expect(document.querySelector('[data-testid="status"]')?.textContent).toBe('ok');

    await act(async () => {
      pollButton?.click();
    });
    expect(document.querySelector('[data-testid="status"]')?.textContent).toBe('ok');

    await act(async () => {
      pollButton?.click();
    });
    expect(document.querySelector('[data-testid="status"]')?.textContent).toBe('ok');
  });

});

describe('reconnectBackoffMs', () => {
  // Kaduna failure mode: a fixed 12s retry on a link that needs longer than 12s to
  // finish a bootstrap stacks requests onto a pipe that cannot drain them, so the
  // connection never recovers. Backoff is what breaks that loop.
  it('grows exponentially so a slow link is not asked to retry every tick', () => {
    expect(reconnectBackoffMs(12_000, 0)).toBe(12_000);
    expect(reconnectBackoffMs(12_000, 1)).toBe(24_000);
    expect(reconnectBackoffMs(12_000, 2)).toBe(48_000);
    expect(reconnectBackoffMs(12_000, 3)).toBe(96_000);
  });

  it('caps so an unattended tab still recovers on its own', () => {
    expect(reconnectBackoffMs(12_000, 4)).toBe(120_000);
    expect(reconnectBackoffMs(20_000, 10)).toBe(120_000);
    expect(reconnectBackoffMs(12_000, 500)).toBe(120_000);
  });

  it('never returns a zero or negative delay for junk input', () => {
    for (const [base, attempt] of [
      [0, 0],
      [-1, 3],
      [NaN, 2],
      [12_000, -5],
      [12_000, NaN],
    ]) {
      expect(reconnectBackoffMs(base, attempt)).toBeGreaterThan(0);
    }
  });
});
