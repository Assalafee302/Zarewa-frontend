import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { APP_DATA_TABLE_PAGE_SIZE, useAppTablePaging } from './appDataTable';

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
