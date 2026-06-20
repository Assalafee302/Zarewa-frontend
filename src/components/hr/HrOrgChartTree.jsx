import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';

/**
 * @param {{ node: object; depth?: number; linkPrefix?: string; defaultCollapsed?: boolean; forceCollapsed?: boolean }} props
 */
function OrgNode({ node, depth = 0, linkPrefix = '/hr/employees', collapseAll = false }) {
  const [open, setOpen] = useState(depth < 2);
  if (!node) return null;
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const showChildren = hasChildren && !collapseAll && open;

  return (
    <li className="list-none">
      <div className="flex items-start gap-1">
        {hasChildren ? (
          <button
            type="button"
            className="mt-2 rounded p-0.5 text-slate-400 hover:bg-slate-100"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Collapse' : 'Expand'}
          >
            {open && !forceCollapsed ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-5" aria-hidden />
        )}
        <div
          className={`inline-flex max-w-full flex-col rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm ${
            depth === 0 ? 'border-[#134e4a]/30' : ''
          } ${!node.lineManagerUserId && depth > 0 ? 'border-amber-200 bg-amber-50/30' : ''}`}
        >
          <Link to={`${linkPrefix}/${node.userId}`} className="font-semibold text-[#134e4a] hover:underline truncate">
            {node.displayName || node.userId}
          </Link>
          {node.jobTitle ? <span className="text-[10px] text-slate-500 truncate">{node.jobTitle}</span> : null}
          {node.department ? <span className="text-[10px] text-slate-400 truncate">{node.department}</span> : null}
        </div>
      </div>
      {hasChildren && open && !forceCollapsed ? (
        <ul className="mt-3 ml-6 space-y-3 border-l-2 border-slate-200 pl-4">
          {node.children.map((child) => (
            <OrgNode
              key={child.userId}
              node={child}
              depth={depth + 1}
              linkPrefix={linkPrefix}
              defaultCollapsed={defaultCollapsed}
              forceCollapsed={forceCollapsed}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/**
 * @param {{ chart: { roots?: object[]; orphans?: object[]; total?: number }; linkPrefix?: string; collapseAll?: boolean }} props
 */
export function HrOrgChartTree({ chart, linkPrefix = '/hr/employees', collapseAll = false }) {
  const roots = chart?.roots || [];
  const orphans = chart?.orphans || [];

  if (!roots.length && !orphans.length) {
    return <p className="text-sm text-slate-600">No staff in scope to display.</p>;
  }

  return (
    <div className="space-y-8">
      {roots.length > 0 ? (
        <ul className="space-y-6">
          {roots.map((root) => (
            <OrgNode key={root.userId} node={root} linkPrefix={linkPrefix} forceCollapsed={collapseAll} />
          ))}
        </ul>
      ) : null}
      {orphans.length > 0 ? (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-3">
            No line manager in scope ({orphans.length})
          </p>
          <ul className="flex flex-wrap gap-3">
            {orphans.map((o) => (
              <li key={o.userId} className="list-none">
                <OrgNode node={{ ...o, children: [] }} linkPrefix={linkPrefix} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
