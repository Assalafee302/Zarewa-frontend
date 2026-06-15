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
export function HrSubnav({ items, moreItems = [], sticky = false }) {
  const [moreOpen, setMoreOpen] = React.useState(false);
  const navCls = sticky
    ? 'sticky top-[var(--app-header-offset,0px)] z-20 mb-0 bg-[#f8fafc]/95 backdrop-blur-sm py-2 -mx-1 px-1'
    : '';

  return (
    <div className={navCls}>
      <nav
        aria-label="HR sections"
        className="flex w-full min-w-0 gap-1 overflow-x-auto overscroll-x-contain rounded-2xl border border-white/80 bg-white/90 p-1.5 shadow-sm [-webkit-overflow-scrolling:touch]"
      >
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
            {item.label}
          </NavLink>
        ))}
        {moreItems.length > 0 ? (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              className={`rounded-xl px-3 py-2 min-h-11 text-[10px] font-bold uppercase tracking-[0.12em] transition ${
                moreOpen ? 'bg-[#134e4a] text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-[#134e4a]'
              }`}
            >
              More ▾
            </button>
            {moreOpen ? (
              <div className="absolute right-0 top-full z-30 mt-1 min-w-[180px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                {moreItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className="block px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-600 hover:bg-teal-50 hover:text-[#134e4a] no-underline"
                    onClick={() => setMoreOpen(false)}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </nav>
    </div>
  );
}
