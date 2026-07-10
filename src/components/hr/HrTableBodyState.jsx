import React from 'react';
import { TableLoadingSkeleton, TableEmptyRow } from '../ui/TableLoadingSkeleton';

/** @deprecated Use TableLoadingSkeleton directly. */
export function HrTableLoadingRow({ colSpan, message, rows = 5 }) {
  if (message && message !== 'Loading…') {
    return <TableEmptyRow colSpan={colSpan} message={message} />;
  }
  return <TableLoadingSkeleton colSpan={colSpan} rows={rows} />;
}

/** @deprecated Use TableEmptyRow directly. */
export function HrTableEmptyRow({ colSpan, message = 'No records.', description }) {
  return <TableEmptyRow colSpan={colSpan} message={message} description={description} />;
}

export { TableLoadingSkeleton, TableEmptyRow };
