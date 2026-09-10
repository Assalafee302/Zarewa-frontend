import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { APP_DATA_TABLE_PAGE_SIZE, useAppTablePaging, useInfiniteReveal } from './appDataTable';

describe('useAppTablePaging', () => {
  it('pages a list and resets when filter deps change', () => {
    const items = Array.from({ length: 45 }, (_, i) => ({ id: i + 1 }));
    const { result, rerender } = renderHook(
      ({ rows, filter }) => useAppTablePaging(rows, APP_DATA_TABLE_PAGE_SIZE, filter),
      { initialProps: { rows: items, filter: 'a' } }
    );

    expect(result.current.total).toBe(45);
    expect(result.current.slice).toHaveLength(APP_DATA_TABLE_PAGE_SIZE);
    expect(result.current.showingFrom).toBe(1);
    expect(result.current.showingTo).toBe(20);
    expect(result.current.hasNext).toBe(true);

    act(() => result.current.goNext());
    expect(result.current.page).toBe(1);
    expect(result.current.slice[0].id).toBe(21);

    rerender({ rows: items, filter: 'b' });
    expect(result.current.page).toBe(0);
    expect(result.current.slice[0].id).toBe(1);
  });
});

describe('useInfiniteReveal', () => {
  it('reveals pageSize more items on loadMore and resets the window when filter deps change', () => {
    const items = Array.from({ length: 45 }, (_, i) => ({ id: i + 1 }));
    const { result, rerender } = renderHook(
      ({ rows, filter }) => useInfiniteReveal(rows, APP_DATA_TABLE_PAGE_SIZE, filter),
      { initialProps: { rows: items, filter: 'a' } }
    );

    expect(result.current.total).toBe(45);
    expect(result.current.slice).toHaveLength(APP_DATA_TABLE_PAGE_SIZE);
    expect(result.current.shown).toBe(20);
    expect(result.current.hasMore).toBe(true);

    act(() => result.current.loadMore());
    expect(result.current.shown).toBe(40);
    expect(result.current.slice[39].id).toBe(40);
    expect(result.current.hasMore).toBe(true);

    act(() => result.current.loadMore());
    expect(result.current.shown).toBe(45);
    expect(result.current.hasMore).toBe(false);

    rerender({ rows: items, filter: 'b' });
    expect(result.current.shown).toBe(20);
    expect(result.current.slice[0].id).toBe(1);
  });
});
