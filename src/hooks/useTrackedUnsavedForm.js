import { useCallback, useEffect, useState } from 'react';
import { useUnsavedWorkRegistry, UNSAVED_LEAVE_MESSAGE } from '../context/UnsavedWorkContext';
import { appConfirm } from '../lib/appConfirm';

/**
 * Tracks “user edited this modal” for global leave guards and optional close confirmation.
 *
 * @param {string} id — stable id per modal instance (e.g. 'modal-quotation')
 * @param {{ isOpen: boolean; blockTracking: boolean; hydrateKey: string }} opts
 *        blockTracking: true when the form cannot be edited (view-only)
 */
export function useTrackedUnsavedForm(id, { isOpen, blockTracking, hydrateKey }) {
  const ctx = useUnsavedWorkRegistry();
  const [edited, setEdited] = useState(false);

  useEffect(() => {
    if (!isOpen) setEdited(false);
  }, [isOpen]);

  useEffect(() => {
    setEdited(false);
  }, [hydrateKey]);

  const active = Boolean(isOpen && !blockTracking && edited);

  useEffect(() => {
    if (!ctx) return undefined;
    ctx.setFlag(id, active);
    return () => ctx.clearFlag(id);
  }, [ctx, id, active]);

  const captureEdited = useCallback(() => {
    if (!blockTracking) setEdited(true);
  }, [blockTracking]);

  const wrapClose = useCallback(
    (fn) => async () => {
      if (edited && !blockTracking) {
        const ok = await appConfirm({ title: 'Unsaved changes', message: UNSAVED_LEAVE_MESSAGE });
        if (!ok) return;
      }
      setEdited(false);
      fn();
    },
    [edited, blockTracking]
  );

  const abandonUnsavedAndRun = useCallback((fn) => {
    setEdited(false);
    fn();
  }, []);

  return { captureEdited, wrapClose, abandonUnsavedAndRun };
}
