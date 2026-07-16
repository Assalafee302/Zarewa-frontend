import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./apiBase.js', () => ({
  apiFetch: vi.fn(),
  apiUrl: (path) => path,
}));

import { apiFetch } from './apiBase.js';
import {
  fetchRoomMessages,
  sendRoomMessage,
  promoteRoomMessage,
  createWorkspaceDm,
  workspaceRealtimeSupportsCredentials,
  openWorkspaceRealtime,
} from './workspaceV3Api.js';

describe('workspaceV3Api helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects empty room id for messages', async () => {
    const r = await fetchRoomMessages('');
    expect(r.error).toMatch(/required/i);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('rejects blank send body', async () => {
    const r = await sendRoomMessage('WR1', '   ');
    expect(r.error).toMatch(/required/i);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('rejects promote without excerpt', async () => {
    const r = await promoteRoomMessage('WR1', { kind: 'work_item', excerpt: '' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/excerpt/i);
  });

  it('rejects DM without peer', async () => {
    const r = await createWorkspaceDm('');
    expect(r.ok).toBe(false);
  });

  it('reports EventSource credential support', () => {
    expect(typeof workspaceRealtimeSupportsCredentials()).toBe('boolean');
  });

  it('openWorkspaceRealtime returns null when EventSource missing', () => {
    const prev = globalThis.EventSource;
    // eslint-disable-next-line no-global-assign
    globalThis.EventSource = undefined;
    expect(openWorkspaceRealtime({})).toBeNull();
    globalThis.EventSource = prev;
  });

  it('clamps activity limit via fetch path', async () => {
    apiFetch.mockResolvedValue({ ok: true, data: { ok: true, events: [] } });
    const { fetchWorkspaceActivity } = await import('./workspaceV3Api.js');
    await fetchWorkspaceActivity({ limit: 999 });
    expect(apiFetch).toHaveBeenCalledWith('/api/workspace/activity?limit=100');
  });
});
