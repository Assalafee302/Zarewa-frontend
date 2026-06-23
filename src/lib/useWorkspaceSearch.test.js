import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { useWorkspaceSearch } from './useWorkspaceSearch';

function wrapper({ children }) {
  return React.createElement(MemoryRouter, null, children);
}

describe('useWorkspaceSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not loop when permission callbacks are recreated each render', () => {
    const snapshot = { ok: true, customers: [] };
    let renderCount = 0;
    const { rerender } = renderHook(
      () => {
        renderCount += 1;
        return useWorkspaceSearch({
          query: '',
          apiOnline: false,
          snapshot,
          hasPermission: () => true,
          canAccessModule: () => true,
        });
      },
      { wrapper }
    );

    for (let i = 0; i < 8; i += 1) {
      act(() => {
        rerender();
      });
    }

    expect(renderCount).toBeLessThan(20);
  });
});
