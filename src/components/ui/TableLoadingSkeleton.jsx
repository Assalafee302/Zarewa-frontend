import React from 'react';
import { AppTableTd, AppTableTr } from './AppDataTable';

/**
 * Shimmer skeleton rows for data tables (replaces plain "Loading…" text).
 */
export function TableLoadingSkeleton({ colSpan, rows = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <AppTableTr key={i} className="animate-pulse">
          <AppTableTd colSpan={colSpan} truncate={false} className="py-3">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 shrink-0 rounded bg-slate-100" />
              <div
                className="h-4 rounded-lg bg-slate-100"
                style={{ width: `${55 + ((i * 17) % 35)}%` }}
              />
            </div>
          </AppTableTd>
        </AppTableTr>
      ))}
      <tr aria-hidden="true">
        <td colSpan={colSpan}>
          <span className="sr-only" role="status" aria-live="polite">
            Loading table data…
          </span>
        </td>
      </tr>
    </>
  );
}

/**
 * Inline empty row for tables — uses compact EmptyState styling.
 */
export function TableEmptyRow({ colSpan, message = 'No records.', description }) {
  return (
    <AppTableTr>
      <AppTableTd colSpan={colSpan} align="center" truncate={false}>
        <div className="py-6">
          <p className="text-sm font-bold text-slate-700">{message}</p>
          {description ? (
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{description}</p>
          ) : null}
        </div>
      </AppTableTd>
    </AppTableTr>
  );
}
