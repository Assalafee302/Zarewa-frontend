import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, serializeApiRequestBody } from './apiBase.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('serializeApiRequestBody', () => {
  it('JSON.stringifies plain objects so fetch does not send [object Object]', () => {
    expect(serializeApiRequestBody({ machineId: 'M-1' })).toBe('{"machineId":"M-1"}');
  });

  it('leaves already-stringified JSON alone', () => {
    const raw = JSON.stringify({ a: 1 });
    expect(serializeApiRequestBody(raw)).toBe(raw);
  });
});

describe('apiFetch body', () => {
  it('posts object bodies as a JSON string', async () => {
    const fetchMock = vi.fn(async () => new Response('{"ok":true}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await apiFetch('/api/session/login', {
      method: 'POST',
      body: { username: 'store', password: 'x' },
    });
    expect(res.ok).toBe(true);
    expect(fetchMock.mock.calls[0][1].body).toBe('{"username":"store","password":"x"}');
    expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBe('application/json');
  });
});
