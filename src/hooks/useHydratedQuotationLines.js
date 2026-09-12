import { useEffect, useMemo, useRef, useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { apiFetch } from '../lib/apiBase';

/**
 * Make sure a quotation's product lines are in the snapshot, fetching them if not.
 *
 * Desk packs omit `quotationLines` because lines_json is most of a quotation's weight on
 * the wire, and the shell only keeps them for users without sales permission. Anyone
 * holding sales *and* operations therefore sees quotations with no lines, and a screen
 * that reads `quotationLines.products` gets `undefined` — which several of them quietly
 * treat as "this quote has none".
 *
 * Returns the load state as well, because an empty result and a failed fetch look
 * identical downstream. A caller showing a form seeded from those lines should say the
 * lines could not be read rather than presenting an empty form as fact.
 *
 * @param {string} quotationRef
 * @returns {{ lines: object | null, status: 'idle' | 'present' | 'loading' | 'failed' }}
 */
export function useHydratedQuotationLines(quotationRef) {
  const ws = useWorkspace();
  const ref = String(quotationRef || '').trim();
  const quotations = ws?.snapshot?.quotations;
  const [failedRef, setFailedRef] = useState('');
  const [loadingRef, setLoadingRef] = useState('');
  /** Refs already attempted this mount — one shot each, so a failure cannot spin. */
  const attemptedRef = useRef(new Set());

  const lines = useMemo(() => {
    if (!ref || !Array.isArray(quotations)) return null;
    const q = quotations.find((row) => row?.id === ref);
    const ql = q?.quotationLines;
    const usable =
      ql &&
      typeof ql === 'object' &&
      (Array.isArray(ql.products) || Array.isArray(ql.accessories) || Array.isArray(ql.services));
    return usable ? ql : null;
  }, [ref, quotations]);

  useEffect(() => {
    if (!ref || lines) return undefined;
    if (attemptedRef.current.has(ref)) return undefined;
    attemptedRef.current.add(ref);
    let cancelled = false;
    setLoadingRef(ref);
    void (async () => {
      const { ok, data } = await apiFetch(`/api/quotations/${encodeURIComponent(ref)}`);
      if (cancelled) return;
      setLoadingRef('');
      if (!ok || !data?.ok || !data.quotation) {
        // Surfaced, not swallowed: the caller decides how to say the lines are missing.
        setFailedRef(ref);
        return;
      }
      ws?.mergeQuotationIntoSnapshot?.(data.quotation);
    })();
    return () => {
      cancelled = true;
    };
  }, [ref, lines, ws]);

  const status = !ref ? 'idle' : lines ? 'present' : loadingRef === ref ? 'loading' : failedRef === ref ? 'failed' : 'loading';
  return { lines, status };
}
