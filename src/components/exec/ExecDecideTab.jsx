import React, { useMemo, useState } from 'react';
import { ExecWorkTrayPanel } from './ExecWorkTrayPanel';

export function ExecDecideTab({
  busy,
  readOnly,
  formatNgn,
  filteredWorkTrayItems,
  workTrayFilter,
  onWorkTrayFilterChange,
  mdOnlyCount,
  sharedCount,
  onReview,
}) {
  const [search, setSearch] = useState('');

  const searched = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    if (!q) return filteredWorkTrayItems;
    return filteredWorkTrayItems.filter((row) => {
      const hay = [
        row.title,
        row.kind,
        row.branchName,
        row.status,
        row.requestedBy,
        row.approvalTierLabel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [filteredWorkTrayItems, search]);

  return (
    <div className="pb-10">
      <ExecWorkTrayPanel
        title="Decide"
        subtitle={
          readOnly
            ? 'Summary and read-only items for executive oversight.'
            : 'Approvals and reviews you can action here — refunds, payments, payroll, staff credit, price exceptions, stock register, inter-branch loans, and more.'
        }
        items={searched}
        busy={busy}
        readOnly={readOnly}
        workTrayFilter={workTrayFilter}
        onWorkTrayFilterChange={onWorkTrayFilterChange}
        mdOnlyCount={mdOnlyCount}
        sharedCount={sharedCount}
        onReview={onReview}
        search={search}
        onSearchChange={setSearch}
        formatNgn={formatNgn}
      />
    </div>
  );
}
