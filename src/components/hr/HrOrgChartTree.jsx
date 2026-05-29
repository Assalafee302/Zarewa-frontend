import React from 'react';
import { Link } from 'react-router-dom';

/**
 * @param {{ node: object; depth?: number; linkPrefix?: string }} props
 */
function OrgNode({ node, depth = 0, linkPrefix = '/hr/staff' }) {
  if (!node) return null;
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  return (
    <li className="list-none">
      <div
        className={`inline-flex max-w-full flex-col rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm ${
          depth === 0 ? 'border-[#134e4a]/30' : ''
        }`}
      >
        <Link to={`${linkPrefix}/${node.userId}`} className="font-semibold text-[#134e4a] hover:underline truncate">
          {node.displayName || node.userId}
        </Link>
        {node.jobTitle ? <span className="text-[10px] text-slate-500 truncate">{node.jobTitle}</span> : null}
        {node.department ? <span className="text-[10px] text-slate-400 truncate">{node.department}</span> : null}
      </div>
      {hasChildren ? (
        <ul className="mt-3 ml-4 space-y-3 border-l-2 border-slate-200 pl-4">
          {node.children.map((child) => (
            <OrgNode key={child.userId} node={child} depth={depth + 1} linkPrefix={linkPrefix} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/**
 * @param {{ chart: { roots?: object[]; orphans?: object[]; total?: number }; linkPrefix?: string }} props
 */
export function HrOrgChartTree({ chart, linkPrefix = '/hr/staff' }) {
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
            <OrgNode key={root.userId} node={root} linkPrefix={linkPrefix} />
          ))}
        </ul>
      ) : null}
      {orphans.length > 0 ? (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
            Unassigned / manager outside scope ({orphans.length})
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
