import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import {
  profileNavFlatItems,
  profileNavForCohort,
  profileNavMoreItems,
  profileNavPrimaryItems,
} from '../../lib/profileNavConfig';

const linkClass = ({ isActive }) =>
  `flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium no-underline transition-colors ${
    isActive
      ? 'bg-[#134e4a] text-white'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

/**
 * Desktop sidebar — Procurement transport-agent aside pattern with teal accent.
 */
export function ProfileSidebarNav({ cohort = 'employee' }) {
  const groups = profileNavForCohort(cohort);

  return (
    <nav aria-label="HR sections" className="space-y-1">
      {groups.map((group) => (
        <div key={group.id} className="mb-4 last:mb-0">
          <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} className={linkClass}>
                    <Icon size={16} className="shrink-0 opacity-90" aria-hidden />
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
 * Mobile: primary tabs + More sheet — matches Sales PageTabs scroll pattern.
 */
export function ProfileMobileNav({ cohort = 'employee' }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = profileNavPrimaryItems(cohort);
  const more = profileNavMoreItems(cohort);
  const all = profileNavFlatItems(cohort);

  const tabClass = (active) =>
    `inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold no-underline transition-colors ${
      active
        ? 'bg-[#134e4a] text-white'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <div className="relative">
      <nav
        aria-label="HR sections"
        className="flex gap-1 overflow-x-auto border-b border-slate-200/80 pb-2 [-webkit-overflow-scrolling:touch]"
      >
        {primary.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => tabClass(isActive)}>
              <Icon size={14} aria-hidden />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
        {more.length > 0 ? (
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className={`${tabClass(moreOpen)} min-h-[42px]`}
            aria-expanded={moreOpen}
            aria-haspopup="true"
          >
            <MoreHorizontal size={14} aria-hidden />
            <span>More</span>
          </button>
        ) : null}
      </nav>

      {moreOpen && more.length > 0 ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[1px]"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <ul className="max-h-[min(60vh,320px)] overflow-y-auto p-2">
              {more.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={() => setMoreOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium no-underline ${
                          isActive ? 'bg-teal-50 text-[#134e4a]' : 'text-slate-700 hover:bg-slate-50'
                        }`
                      }
                    >
                      <Icon size={16} aria-hidden />
                      {item.label}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-400">
              {all.length} sections · scroll primary tabs for quick access
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
