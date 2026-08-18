import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';


const linkClass = ({ isActive }) =>
  `relative shrink-0 whitespace-nowrap px-2.5 py-2 text-[13px] font-semibold no-underline transition-colors ${
    isActive
      ? 'text-zarewa-teal after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-zarewa-teal'
      : 'text-slate-500 hover:text-zarewa-teal'
  }`;

/**
 * Horizontal sub-navigation for HR module sections.
 * @param {{ items: { to: string; label: string; end?: boolean }[]; moreLabel?: string }} props
 */
export function HrSubnav({ items, moreItems = [], moreLabel = 'Programs', sticky = false }) {
  const [moreOpen, setMoreOpen] = React.useState(false);
  const location = useLocation();
  const moreActive = moreItems.some((item) => location.pathname.startsWith(item.to));

  React.useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  const navCls = sticky
    ? 'sticky top-[var(--app-header-offset,0px)] z-20 mb-0 bg-[#f8fafc]/95 backdrop-blur-sm py-2 -mx-1 px-1'
    : '';

  return (
    <div className={navCls}>
      <nav
        aria-label="HR sections"
        className="flex w-full min-w-0 gap-0.5 overflow-x-auto overscroll-x-contain border-b border-slate-200/90 [-webkit-overflow-scrolling:touch]"
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
              className={`relative min-h-9 whitespace-nowrap px-2.5 py-2 text-[13px] font-semibold transition-colors ${
                moreOpen || moreActive
                  ? 'text-zarewa-teal after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-zarewa-teal'
                  : 'text-slate-500 hover:text-zarewa-teal'
              }`}
              aria-expanded={moreOpen}
            >
              {moreLabel} ▾
            </button>
            {moreOpen ? (
              <div className="absolute right-0 top-full z-30 mt-1 min-w-[180px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                {moreItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className="block px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-teal-50 hover:text-zarewa-teal no-underline"
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
