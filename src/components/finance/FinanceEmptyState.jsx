import React from 'react';
import { ListEmptyState } from '../ui/ListEmptyState';

/** @deprecated Prefer ListEmptyState directly — thin finance wrapper for backward compatibility. */
export function FinanceEmptyState({ title, description, action }) {
  return <ListEmptyState title={title} description={description} action={action} />;
}
