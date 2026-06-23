import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Smartphone } from 'lucide-react';
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
        <p className="text-[11px] text-slate-600">
          On your phone? Use the touch-first approve queue — same in-modal reviews, fewer taps.
        </p>
        <Link
          to="/exec/m"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#134e4a] px-4 py-2 text-[10px] font-black uppercase text-white hover:brightness-105"
        >
          <Smartphone size={14} />
          Mobile Decide
        </Link>
      </div>
      <ExecWorkTrayPanel
        title="Decide"
        subtitle={
          readOnly
            ? 'Summary and read-only items for executive oversight.'
            : 'All approvals and reviews you can action from Command Centre — refunds, payments, payroll, staff credit, price exceptions, stock register, inter-branch loans, and more.'
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
