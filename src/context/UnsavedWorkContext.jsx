/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const UnsavedWorkContext = createContext(null);

/** Shown for in-app navigation (links, programmatic navigate) and modal dismiss. */
export const UNSAVED_LEAVE_MESSAGE =
  'You have unsaved changes. Leave without saving?';

/** Browser may replace this with a generic string on refresh/close tab. */
export const UNSAVED_BEFORE_UNLOAD_MESSAGE = UNSAVED_LEAVE_MESSAGE;

export function UnsavedWorkProvider({ children }) {
  const [flags, setFlags] = useState(() => new Map());

  const setFlag = useCallback((id, on) => {
    setFlags((prev) => {
      const next = new Map(prev);
      if (on) next.set(id, true);
      else next.delete(id);
      if (next.size === prev.size && [...next.keys()].every((k) => prev.has(k))) return prev;
      return next;
    });
  }, []);

  const clearFlag = useCallback(
    (id) => {
      setFlag(id, false);
    },
    [setFlag]
  );

  const hasUnsavedWork = flags.size > 0;

  const value = useMemo(
    () => ({ setFlag, clearFlag, hasUnsavedWork }),
    [setFlag, clearFlag, hasUnsavedWork]
  );

  return <UnsavedWorkContext.Provider value={value}>{children}</UnsavedWorkContext.Provider>;
}

export function useUnsavedWorkRegistry() {
  const ctx = useContext(UnsavedWorkContext);
  if (!ctx) {
    return {
      setFlag: () => {},
      clearFlag: () => {},
      hasUnsavedWork: false,
    };
  }
  return ctx;
}
