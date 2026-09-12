import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';

let warmup = { total: 0, done: 0, active: '', running: false };
vi.mock('../../context/WorkspaceContext', () => ({
  useWorkspace: () => ({ warmup }),
}));

const { WorkspaceWarmupIndicator } = await import('./WorkspaceWarmupIndicator.jsx');

beforeEach(() => {
  vi.useFakeTimers();
  warmup = { total: 0, done: 0, active: '', running: false };
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** Render at the given warm-up state. */
function show(next) {
  warmup = next;
  return render(<WorkspaceWarmupIndicator />);
}

describe('WorkspaceWarmupIndicator', () => {
  it('stays out of the way when nothing is warming', () => {
    const { container } = show({ total: 0, done: 0, active: '', running: false });
    expect(container.firstChild).toBeNull();
  });

  it('reports progress as a percentage of the desks planned', () => {
    show({ total: 4, done: 1, active: 'finance', running: true });
    expect(screen.getByText('25%')).toBeTruthy();
  });

  it('names the desk in words staff use, not the pack key', () => {
    show({ total: 4, done: 0, active: 'procurement', running: true });
    expect(screen.getByText(/Procurement & suppliers/)).toBeTruthy();
    expect(screen.queryByText(/^Loading procurement…$/)).toBeNull();
  });

  it('says the user can keep working, because they can', () => {
    // The desk they landed on is already loaded by the time this appears. A pill that
    // read like a blocking loader would make people wait for nothing.
    show({ total: 4, done: 2, active: 'sales', running: true });
    expect(screen.getByText(/keep working/i)).toBeTruthy();
  });

  it('never shows more than 100%, even if done overruns total', () => {
    show({ total: 2, done: 5, active: 'sales', running: true });
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('confirms completion, then leaves', () => {
    const { rerender } = show({ total: 4, done: 0, active: 'sales', running: true });
    warmup = { total: 4, done: 4, active: '', running: false };
    act(() => {
      rerender(<WorkspaceWarmupIndicator />);
    });
    expect(screen.getByText(/Whole workspace loaded/i)).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(screen.queryByText(/Whole workspace loaded/i)).toBeNull();
  });

  it('does not claim the workspace is ready when the warm-up was cut short', () => {
    // A branch switch supersedes the run and clears `running` with packs still missing.
    // Saying "loaded" there would be exactly the false reassurance silent loading gave.
    const { rerender } = show({ total: 4, done: 1, active: 'sales', running: true });
    warmup = { total: 4, done: 1, active: '', running: false };
    act(() => {
      rerender(<WorkspaceWarmupIndicator />);
    });
    expect(screen.queryByText(/Whole workspace loaded/i)).toBeNull();
  });

  it('survives a context with no warm-up state at all', () => {
    const { container } = show(undefined);
    expect(container.firstChild).toBeNull();
  });
});
