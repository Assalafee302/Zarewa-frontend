import React from 'react';
import { AppTableTd, AppTableTr } from '../ui/AppDataTable';

export function HrTableLoadingRow({ colSpan, message = 'Loading…' }) {
  return (
    <AppTableTr>
      <AppTableTd colSpan={colSpan} align="center" truncate={false}>
        <span className="block py-8 text-sm text-slate-500">{message}</span>
      </AppTableTd>
    </AppTableTr>
  );
}

export function HrTableEmptyRow({ colSpan, message = 'No records.' }) {
  return (
    <AppTableTr>
      <AppTableTd colSpan={colSpan} align="center" truncate={false}>
        <span className="block py-8 text-sm text-slate-500">{message}</span>
      </AppTableTd>
    </AppTableTr>
  );
}
