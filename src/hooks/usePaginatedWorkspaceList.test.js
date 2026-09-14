import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePaginatedWorkspaceList } from './usePaginatedWorkspaceList';

vi.mock('../lib/apiBase', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../lib/apiBase';

describe('usePaginatedWorkspaceList', () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads the first page with limit/offset and reports hasMore from total', async () => {
    apiFetch.mockResolvedValueOnce({
      ok: true,
      data: {
        ok: true,
        quotations: [{ id: 'Q-1' }, { id: 'Q-2' }],
        total: 5,
      },
    });

    const { result } = renderHook(() =>
      usePaginatedWorkspaceList('/api/quotations', {
        pageSize: 50,
        itemsKey: 'quotations',
        query: { includeLines: '0' },
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(apiFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/quotations\?.*limit=50.*offset=0/)
    );
    expect(apiFetch.mock.calls[0][0]).toContain('includeLines=0');
    expect(result.current.items).toHaveLength(2);
    expect(result.current.total).toBe(5);
    expect(result.current.hasMore).toBe(true);
  });

  it('loadMore appends without duplicating ids', async () => {
    apiFetch
      .mockResolvedValueOnce({
        ok: true,
        data: { ok: true, items: [{ id: 'A' }, { id: 'B' }], total: 3 },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: { ok: true, items: [{ id: 'B' }, { id: 'C' }], total: 3 },
      });

    const { result } = renderHook(() =>
      usePaginatedWorkspaceList('/api/sales-receipts', { pageSize: 50, itemsKey: 'items' })
    );

    await waitFor(() => expect(result.current.items).toHaveLength(2));

    await act(async () => {
      await result.current.loadMore();
    });

    await waitFor(() => expect(result.current.items.map((r) => r.id)).toEqual(['A', 'B', 'C']));
    expect(result.current.hasMore).toBe(false);
  });

  it('re-fetches when search query changes', async () => {
    apiFetch
      .mockResolvedValueOnce({
        ok: true,
        data: { ok: true, quotations: [{ id: 'Q-1' }], total: 1 },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: { ok: true, quotations: [{ id: 'Q-99' }], total: 1 },
      });

    const { result, rerender } = renderHook(
      ({ q }) =>
        usePaginatedWorkspaceList('/api/quotations', {
          pageSize: 50,
          itemsKey: 'quotations',
          query: { q },
        }),
      { initialProps: { q: '' } }
    );

    await waitFor(() => expect(result.current.items[0]?.id).toBe('Q-1'));

    rerender({ q: 'Q-99' });

    await waitFor(() => expect(result.current.items[0]?.id).toBe('Q-99'));
    expect(apiFetch.mock.calls[1][0]).toContain('q=Q-99');
  });
});
