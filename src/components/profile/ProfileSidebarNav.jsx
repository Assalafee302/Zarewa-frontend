import React from 'react';
import { NavLink } from 'react-router-dom';
import { profileNavForCohort } from '../../lib/profileNavConfig';

const linkClass = ({ isActive }) =>
  `flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium no-underline transition-colors ${
    isActive
      ? 'bg-slate-900 text-white'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

/**
 * Grouped sidebar navigation for My Profile HR self-service.
 */
export function ProfileSidebarNav({ cohort = 'employee' }) {
  const groups = profileNavForCohort(cohort);

  return (
    <nav aria-label="Profile sections" className="space-y-5">
      {groups.map((group) => (
        <div key={group.id}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} className={linkClass}>
                    <Icon size={16} className="shrink-0 opacity-80" aria-hidden />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/**
 * Compact horizontal nav for small screens.
 */
export function ProfileMobileNav({ cohort = 'employee' }) {
  const groups = profileNavForCohort(cohort);
  const items = groups.flatMap((g) => g.items);

  return (
    <nav
      aria-label="Profile sections"
      className="flex gap-1 overflow-x-auto overscroll-x-contain rounded-xl border border-slate-200 bg-white p-1 [-webkit-overflow-scrolling:touch]"
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium no-underline transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <Icon size={14} aria-hidden />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
