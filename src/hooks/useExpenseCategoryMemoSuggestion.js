import { useEffect, useState } from 'react';
import { fetchExpenseCategorySuggestion } from '../lib/expenseCategorySuggestApi.js';

/**
 * Debounced memo → expense category suggestion (API with client fallback).
 */
export function useExpenseCategoryMemoSuggestion({
  description = '',
  reference = '',
  actor = null,
  hasPermission = () => false,
  enabled = true,
  debounceMs = 350,
}) {
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setSuggestion(null);
      setLoading(false);
      return undefined;
    }
    const text = [description, reference].filter(Boolean).join('\n');
    if (String(text).trim().length < 8) {
      setSuggestion(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      void fetchExpenseCategorySuggestion({ description, reference }, actor, hasPermission).then((result) => {
        if (!cancelled) {
          setSuggestion(result);
          setLoading(false);
        }
      });
    }, debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [description, reference, actor, hasPermission, enabled, debounceMs]);

  return { suggestion, loading };
}
