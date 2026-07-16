import React from 'react';
import { Activity, MessageSquare, CheckSquare, FolderOpen, LayoutGrid } from 'lucide-react';

const ICONS = {
  activity: Activity,
  rooms: MessageSquare,
  action: CheckSquare,
  records: FolderOpen,
  apps: LayoutGrid,
};

/**
 * Left rail — five zones only.
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
        const Icon = ICONS[zone.id] || LayoutGrid;
        const count = Number(unread[zone.id] || 0);
        const active = activeZone === zone.id;
        return (
          <button
            key={zone.id}
            type="button"
            onClick={() => onZoneChange?.(zone.id)}
            title={zone.label}
            aria-label={`${zone.label}${count > 0 ? `, ${count} unread` : ''}`}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
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
          </button>
        );
      })}
    </nav>
  );
}
