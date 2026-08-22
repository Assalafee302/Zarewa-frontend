/* eslint-disable react-refresh/only-export-components -- zone icons colocated with the rail */
import React from 'react';
import { Activity, CheckSquare, FolderOpen, LayoutGrid } from 'lucide-react';
import { WORKSPACE_ZONE_HOTKEY_BY_ID } from '../../../lib/workspaceZoneConfig';

export const WORKSPACE_ZONE_ICONS = {
  activity: Activity,
  action: CheckSquare,
  records: FolderOpen,
  apps: LayoutGrid,
};

/**
 * Left rail — workspace zones (chat lives in the bottom-right dock).
 */
export default function WorkspaceRail({
  zones,
  activeZone,
  onZoneChange,
  unread = {},
  className = '',
}) {
  return (
    <nav
      aria-label="Workspace zones"
      className={`flex shrink-0 flex-col gap-0.5 border-r border-slate-200 bg-white p-2 ${className}`}
    >
      {zones.map((zone) => {
        const Icon = WORKSPACE_ZONE_ICONS[zone.id] || LayoutGrid;
        const count = Number(unread[zone.id] || 0);
        const active = activeZone === zone.id;
        const hotkey = WORKSPACE_ZONE_HOTKEY_BY_ID[zone.id];
        return (
          <button
            key={zone.id}
            type="button"
            onClick={() => onZoneChange?.(zone.id)}
            title={hotkey ? `${zone.label} (${hotkey})` : zone.label}
            aria-label={`${zone.label}${count > 0 ? `, ${count} unread` : ''}${hotkey ? `, shortcut ${hotkey}` : ''}`}
            aria-keyshortcuts={hotkey || undefined}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1 ${
              active
                ? 'bg-teal-50 text-teal-900 ring-1 ring-teal-100'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="relative">
              <Icon size={20} aria-hidden />
              {count > 0 ? (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-0.5 text-xs font-bold leading-none text-white">
                  {count > 99 ? '99+' : count}
                </span>
              ) : null}
            </span>
            <span className="hidden sm:inline">{zone.shortLabel}</span>
            {hotkey ? (
              <kbd
                className="hidden rounded border border-slate-200 bg-slate-50 px-1 font-sans text-ui-xs font-semibold tabular-nums text-slate-600 sm:inline"
                aria-hidden
              >
                {hotkey}
              </kbd>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
