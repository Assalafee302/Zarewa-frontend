import React, { useEffect } from 'react';
import { UNSAVED_BEFORE_UNLOAD_MESSAGE, useUnsavedWorkRegistry } from '../context/UnsavedWorkContext';

/**
 * When any modal registers unsaved edits: warn on tab close/refresh, and confirm before
 * in-app navigation via same-origin `<a href>`. (Programmatic `navigate()` is handled separately.)
 */
export function UnsavedWorkNavigationGuard() {
  const { hasUnsavedWork } = useUnsavedWorkRegistry();

  useEffect(() => {
    if (!hasUnsavedWork) return undefined;
    const beforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = UNSAVED_BEFORE_UNLOAD_MESSAGE;
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [hasUnsavedWork]);

  useEffect(() => {
    if (!hasUnsavedWork) return undefined;
    const onClick = (e) => {
      if (e.defaultPrevented) return;
      const a = e.target?.closest?.('a[href]');
      if (!a) return;
      if (a.target === '_blank' || a.getAttribute('download') != null) return;
      const href = a.getAttribute('href') || '';
      if (!href || href.startsWith('#')) return;
      if (/^mailto:|^tel:/i.test(href)) return;
      if (/^https?:\/\//i.test(href)) {
        try {
          const u = new URL(href);
          if (u.origin !== window.location.origin) return;
        } catch {
          return;
        }
      }
      let url;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      const next = `${url.pathname}${url.search}${url.hash}`;
      const cur = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (next === cur) return;
      if (!window.confirm(UNSAVED_BEFORE_UNLOAD_MESSAGE)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [hasUnsavedWork]);

  return null;
}
