import React, { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const linkClass = ({ isActive }) =>
  `block rounded-lg px-3 py-2 text-sm font-medium transition no-underline ${
    isActive ? 'bg-[#134e4a] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-[#134e4a]'
  }`;

const mobileLinkClass = ({ isActive }) =>
  `shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition no-underline ${
    isActive ? 'bg-[#134e4a] text-white' : 'text-slate-600 hover:bg-slate-50'
  }`;

/**
 * HR section navigation — grouped sidebar (desktop) and compact bar (mobile).
 * @param {{ items?: { to: string; label: string; end?: boolean }[]; groups?: { label: string; items: { to: string; label: string; end?: boolean }[] }[] }} props
 */
export function HrSubnav({ items = [], groups: groupsProp }) {
  const location = useLocation();
  const groups = useMemo(() => {
    if (groupsProp?.length) return groupsProp;
    if (items.length) return [{ label: 'Menu', items }];
    return [];
  }, [groupsProp, items]);

  const activeGroup = useMemo(() => {
    const path = location.pathname;
    for (const g of groups) {
      if (g.items.some((it) => path === it.to || path.startsWith(`${it.to}/`))) return g.label;
    }
    return groups[0]?.label ?? '';
  }, [groups, location.pathname]);

  const [openMobileGroup, setOpenMobileGroup] = useState(activeGroup);

  return (
    <>
      {/* Mobile: group picker + horizontal links */}
      <div className="lg:hidden space-y-2">
        <label className="sr-only" htmlFor="hr-nav-group">
          HR section
        </label>
        <select
          id="hr-nav-group"
          value={openMobileGroup}
          onChange={(e) => setOpenMobileGroup(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
        >
          {groups.map((g) => (
            <option key={g.label} value={g.label}>
              {g.label}
            </option>
          ))}
        </select>
        <nav
          aria-label="HR sections"
          className="flex gap-1 overflow-x-auto overscroll-x-contain rounded-xl border border-slate-100 bg-white p-1.5 shadow-sm"
        >
          {(groups.find((g) => g.label === openMobileGroup) || groups[0])?.items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={mobileLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Desktop: grouped sidebar */}
      <nav aria-label="HR sections" className="hidden lg:block">
        <div className="rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
          {groups.map((group) => (
            <div key={group.label} className="mb-1 last:mb-0">
              <p className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{group.label}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink to={item.to} end={item.end} className={linkClass}>
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>
    </>
  );
}
