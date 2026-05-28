import React from 'react';
import { NavLink } from 'react-router-dom';

const linkClass = ({ isActive }) =>
  `shrink-0 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] transition no-underline ${
    isActive
      ? 'bg-[#134e4a] text-white shadow-md shadow-teal-950/15'
      : 'text-slate-500 hover:bg-slate-50 hover:text-[#134e4a]'
  }`;

/**
 * Horizontal sub-navigation for HR module sections.
 * @param {{ items: { to: string; label: string; end?: boolean }[] }} props
 */
export function HrSubnav({ items }) {
  return (
    <nav
      aria-label="HR sections"
      className="flex w-full min-w-0 gap-1 overflow-x-auto overscroll-x-contain rounded-2xl border border-white/80 bg-white/90 p-1.5 shadow-sm [-webkit-overflow-scrolling:touch]"
    >
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
