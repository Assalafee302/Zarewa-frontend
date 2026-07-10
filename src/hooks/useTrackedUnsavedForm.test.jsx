import { describe, it, expect, vi } from 'vitest';
import React, { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { UnsavedWorkProvider, useUnsavedWorkRegistry } from '../context/UnsavedWorkContext';
import { useTrackedUnsavedForm } from './useTrackedUnsavedForm';

vi.mock('../lib/appConfirm', () => ({
  appConfirm: vi.fn(async () => true),
}));

function EditedOpenModal() {
  const { hasUnsavedWork } = useUnsavedWorkRegistry();
  const { captureEdited } = useTrackedUnsavedForm('modal-probe', {
    isOpen: true,
    blockTracking: false,
    hydrateKey: 'k1',
  });

  // Mark edited on mount — previously this oscillated setFlag/clearFlag via ctx identity (#185).
  useEffect(() => {
    captureEdited();
  }, [captureEdited]);

  return <div data-testid="status">{hasUnsavedWork ? 'unsaved' : 'clean'}</div>;
}

describe('useTrackedUnsavedForm', () => {
  it('does not infinite-loop when a open modal becomes edited (React #185)', async () => {
    render(
      <UnsavedWorkProvider>
        <EditedOpenModal />
      </UnsavedWorkProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('unsaved');
    });
  });
});
