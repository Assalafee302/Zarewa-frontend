import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Users } from 'lucide-react';
import { HrStaffAvatar } from './HrStaffAvatar';
import {
  branchLabel,
  buildGroupedSections,
  roleFamilyLabel,
  sectionTitle,
  seniorityBadgeClass,
  seniorityLabel,
} from '../../lib/hrOrgChartUi';

function OrgPersonCard({
  node,
  linkPrefix,
  branches = [],
  compact = false,
  highlight = false,
  focused = false,
  inCycle = false,
  editMode = false,
  selected = false,
  linkTarget = false,
  onNodeClick,
}) {
  const reports = node.directReportCount || 0;
  const seniority = seniorityLabel(node.seniority);
  const branchName = node.branchId ? branchLabel(node.branchId, branches) : null;

  const cardClass = `group relative flex min-w-[168px] max-w-[220px] flex-col rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
    selected ? 'border-[#134e4a] ring-2 ring-[#134e4a]/40' : focused ? 'border-[#134e4a] ring-2 ring-[#134e4a]/30' : highlight ? 'border-[#134e4a]/40 ring-2 ring-[#134e4a]/10' : 'border-slate-200'
  } ${linkTarget ? 'ring-2 ring-amber-300/80' : ''} ${inCycle ? 'border-red-300 bg-red-50/40' : ''} ${node.orphanReason ? 'border-amber-200 bg-amber-50/40' : ''} ${
    editMode ? 'cursor-pointer hover:border-[#134e4a]/50' : ''
  }`;

  const inner = (
    <>
      <div className={`flex items-start gap-2.5 p-3 ${compact ? 'p-2.5' : ''}`}>
        <HrStaffAvatar staff={node} size={compact ? 'sm' : 'md'} />
        <div className="min-w-0 flex-1">
          {editMode ? (
            <span className="block truncate text-sm font-bold text-[#134e4a]" title={node.displayName || node.userId}>
              {node.displayName || node.userId}
            </span>
          ) : (
            <Link
              to={`${linkPrefix}/${node.userId}`}
              className="block truncate text-sm font-bold text-[#134e4a] hover:underline"
              title={node.displayName || node.userId}
            >
              {node.displayName || node.userId}
            </Link>
          )}
          {node.jobTitle ? (
            <p className="mt-0.5 truncate text-[11px] font-medium text-slate-600" title={node.jobTitle}>
              {node.jobTitle}
            </p>
          ) : null}
          {node.department && !compact ? (
            <p className="mt-0.5 truncate text-[10px] text-slate-400" title={node.department}>
              {node.department}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1 border-t border-slate-100 px-3 py-2">
        {seniority ? (
          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${seniorityBadgeClass(node.seniority)}`}>
            {seniority}
          </span>
        ) : null}
        {reports > 0 ? (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-600">
            <Users size={10} aria-hidden />
            {reports}
          </span>
        ) : null}
        {node.branchId && !compact ? (
          <span className="truncate text-[9px] font-medium text-slate-500" title={node.branchId}>
            {branchName}
          </span>
        ) : null}
      </div>
    </>
  );

  if (editMode) {
    return (
      <button type="button" className={`text-left ${cardClass}`} onClick={() => onNodeClick?.(node)}>
        {inner}
      </button>
    );
  }

  return <div className={cardClass}>{inner}</div>;
}

function HierarchyNode({
  node,
  linkPrefix,
  branches,
  collapseAll,
  depth = 0,
  editMode = false,
  linkSourceId = '',
  focusUserId = '',
  focusPath = null,
  cycleUserIds = null,
  onNodeClick,
}) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const showChildren = hasChildren && !collapseAll && open;
  const subtreeHasFocus =
    focusUserId &&
    (node.userId === focusUserId ||
      (node.children || []).some(function hasFocus(n) {
        return n.userId === focusUserId || (n.children || []).some(hasFocus);
      }));

  useEffect(() => {
    if (collapseAll) setOpen(false);
    else if (focusUserId && subtreeHasFocus) setOpen(true);
    else if (depth < 2) setOpen(true);
  }, [collapseAll, depth, focusUserId, subtreeHasFocus]);

  return (
    <li className="org-chart-node flex flex-col items-center">
      <div className="flex items-center gap-1">
        {hasChildren ? (
          <button
            type="button"
            className="mb-1 rounded p-0.5 text-slate-400 hover:bg-slate-100"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Collapse team' : 'Expand team'}
          >
            {showChildren ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : null}
        <OrgPersonCard
          node={node}
          linkPrefix={linkPrefix}
          branches={branches}
          highlight={depth === 0}
          focused={focusUserId === node.userId}
          inCycle={cycleUserIds?.has?.(node.userId)}
          editMode={editMode}
          selected={editMode && linkSourceId === node.userId}
          linkTarget={editMode && linkSourceId && linkSourceId !== node.userId}
          onNodeClick={onNodeClick}
        />
      </div>
      {showChildren ? (
        <>
          <div className="org-chart-connector-v h-6 w-px bg-slate-300" aria-hidden />
          <ul className="org-chart-children relative flex flex-wrap items-start justify-center gap-x-6 gap-y-8 pt-0">
            {node.children.map((child, idx) => (
              <li key={child.userId} className="relative flex flex-col items-center pt-6">
                {node.children.length > 1 ? (
                  <span
                    className={`org-chart-connector-h absolute top-0 h-px bg-slate-300 ${
                      idx === 0 ? 'left-1/2 right-0' : idx === node.children.length - 1 ? 'left-0 right-1/2' : 'left-0 right-0'
                    }`}
                    aria-hidden
                  />
                ) : null}
                <span className="absolute top-0 h-6 w-px bg-slate-300" aria-hidden />
                <HierarchyNode
                  node={child}
                  linkPrefix={linkPrefix}
                  branches={branches}
                  collapseAll={collapseAll}
                  depth={depth + 1}
                  editMode={editMode}
                  linkSourceId={linkSourceId}
                  focusUserId={focusUserId}
                  focusPath={focusPath}
                  cycleUserIds={cycleUserIds}
                  onNodeClick={onNodeClick}
                />
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </li>
  );
}

function GroupedSection({ section, view, linkPrefix, collapseAll, branches, editMode, linkSourceId, focusUserId, focusPath, cycleUserIds, onNodeClick }) {
  const title = sectionTitle(view, section.key, branches);
  const familyHint = view === 'department' && section.roots[0]?.roleFamily ? roleFamilyLabel(section.roots[0].roleFamily) : null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
        <div>
          <h3 className="text-sm font-black text-[#134e4a]">{title}</h3>
          {familyHint ? <p className="text-[10px] text-slate-500">{familyHint}</p> : null}
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold tabular-nums text-slate-600">
          {section.count} staff
        </span>
      </header>
      <div className="overflow-x-auto p-4 sm:p-6">
        <ul className="flex flex-wrap justify-center gap-8">
          {section.roots.map((root) => (
            <HierarchyNode
              key={root.userId}
              node={root}
              linkPrefix={linkPrefix}
              branches={branches}
              collapseAll={collapseAll}
              depth={0}
              editMode={editMode}
              linkSourceId={linkSourceId}
              focusUserId={focusUserId}
              focusPath={focusPath}
              cycleUserIds={cycleUserIds}
              onNodeClick={onNodeClick}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}

function OrphansPanel({ orphans, linkPrefix, branches, editMode, linkSourceId, focusUserId, cycleUserIds, onNodeClick, panelRef }) {
  if (!orphans.length) return null;
  return (
    <section ref={panelRef} className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5">
      <header className="mb-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-amber-800">
          Unlinked in scope ({orphans.length})
        </h3>
        <p className="mt-1 text-xs text-amber-700">
          These staff have no line manager in your view, or their manager is outside scope. Assign managers in the directory.
        </p>
      </header>
      <ul className="flex flex-wrap justify-center gap-3">
        {orphans.map((o) => (
          <li key={o.userId}>
            <OrgPersonCard
              node={o}
              linkPrefix={linkPrefix}
              branches={branches}
              compact
              focused={focusUserId === o.userId}
              inCycle={cycleUserIds?.has?.(o.userId)}
              editMode={editMode}
              selected={editMode && linkSourceId === o.userId}
              linkTarget={editMode && linkSourceId && linkSourceId !== o.userId}
              onNodeClick={onNodeClick}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * @param {{
 *   chart: { roots?: object[]; orphans?: object[]; total?: number };
 *   linkPrefix?: string;
 *   collapseAll?: boolean;
 *   view?: 'hierarchy' | 'department' | 'branch' | 'unit';
 *   branches?: { id: string; name?: string }[];
 *   editMode?: boolean;
 *   linkSourceId?: string;
 *   onNodeClick?: (node: object) => void;
 * }} props
 */
export function HrOrgChartTree({
  chart,
  linkPrefix = '/hr/employees',
  collapseAll = false,
  view = 'hierarchy',
  branches = [],
  editMode = false,
  linkSourceId = '',
  focusUserId = '',
  focusPath = null,
  cycleUserIds = null,
  orphansPanelRef = null,
  onNodeClick,
}) {
  const roots = chart?.roots || [];
  const orphans = chart?.orphans || [];

  if (!roots.length && !orphans.length) {
    return <p className="text-sm text-slate-600">No staff in scope to display.</p>;
  }

  if (view !== 'hierarchy') {
    const groupBy = view === 'branch' ? 'branch' : view === 'unit' ? 'unit' : 'department';
    const sections = buildGroupedSections(chart, groupBy);
    return (
      <div className="space-y-6">
        {sections.map((section) => (
          <GroupedSection
            key={section.key}
            section={section}
            view={view}
            linkPrefix={linkPrefix}
            collapseAll={collapseAll}
            branches={branches}
            editMode={editMode}
            linkSourceId={linkSourceId}
            focusUserId={focusUserId}
            focusPath={focusPath}
            cycleUserIds={cycleUserIds}
            onNodeClick={onNodeClick}
          />
        ))}
        <OrphansPanel
          orphans={orphans}
          linkPrefix={linkPrefix}
          branches={branches}
          editMode={editMode}
          linkSourceId={linkSourceId}
          focusUserId={focusUserId}
          cycleUserIds={cycleUserIds}
          onNodeClick={onNodeClick}
          panelRef={orphansPanelRef}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="overflow-x-auto pb-4">
        <ul className="flex min-w-max flex-wrap justify-center gap-10 px-2">
          {roots.map((root) => (
            <HierarchyNode
              key={root.userId}
              node={root}
              linkPrefix={linkPrefix}
              branches={branches}
              collapseAll={collapseAll}
              depth={0}
              editMode={editMode}
              linkSourceId={linkSourceId}
              focusUserId={focusUserId}
              focusPath={focusPath}
              cycleUserIds={cycleUserIds}
              onNodeClick={onNodeClick}
            />
          ))}
        </ul>
      </div>
      <OrphansPanel
        orphans={orphans}
        linkPrefix={linkPrefix}
        branches={branches}
        editMode={editMode}
        linkSourceId={linkSourceId}
        focusUserId={focusUserId}
        cycleUserIds={cycleUserIds}
        onNodeClick={onNodeClick}
        panelRef={orphansPanelRef}
      />
    </div>
  );
}
