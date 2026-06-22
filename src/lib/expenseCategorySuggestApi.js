import { apiFetch } from './apiBase.js';
import { suggestExpenseCategoryForActor } from '../shared/lib/expenseCategorySuggestions.js';

/**
 * Server-first category suggestion with client fallback when offline or API errors.
 */
export async function fetchExpenseCategorySuggestion(fields, actor, hasPermission = () => false) {
  const description = String(fields?.description || fields?.body || '').trim();
  const reference = String(fields?.reference || fields?.subject || '').trim();
  const clientFallback = () =>
    suggestExpenseCategoryForActor({ description, reference }, actor, hasPermission);

  try {
    const { ok, data } = await apiFetch('/api/expense-categories/suggest', {
      method: 'POST',
      body: JSON.stringify({ description, reference }),
    });
    if (ok && data && (data.category || data.suggestedCategory)) {
      return {
        ...clientFallback(),
        ...data,
        category: data.category || data.suggestedCategory || null,
        suggestedCategory: data.suggestedCategory || data.category || null,
        source: 'api',
      };
    }
  } catch {
    /* use client fallback */
  }

  return { ...clientFallback(), source: 'client' };
}
