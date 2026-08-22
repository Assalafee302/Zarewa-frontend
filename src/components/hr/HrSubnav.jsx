import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { hrNavItemIsActive } from '../../lib/hrMainNav';

const primaryClass = (isActive) =>
  `relative shrink-0 whitespace-nowrap px-2.5 py-2 text-[13px] font-medium no-underline transition-colors ${
    isActive
      ? 'text-slate-900 after:absolute after:inset-x-2 after:-bottom-px after:h-px after:bg-slate-800'
      : 'text-slate-500 hover:text-slate-800'
  }`;

const secondaryClass = (isActive) =>
  `relative shrink-0 whitespace-nowrap px-2 py-1.5 text-[12px] font-medium no-underline transition-colors ${
    isActive
      ? 'text-slate-900 after:absolute after:inset-x-1.5 after:-bottom-px after:h-px after:bg-slate-800'
      : 'text-slate-500 hover:text-slate-800'
  }`;

function NavItems({ items, ariaLabel, linkClass }) {
  const location = useLocation();
  return (
    <nav
      aria-label={ariaLabel}
      className="flex w-full min-w-0 gap-0.5 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]"
    >
      {items.map((item) => {
        const isActive = hrNavItemIsActive(item, location.pathname);
        return (
          <NavLink key={item.to} to={item.to} end={item.end} className={() => linkClass(isActive)}>
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

/**
 * Horizontal sub-navigation for HR module sections.
 */
export function HrSubnav({ items, secondaryItems = [], sticky = false }) {
  const location = useLocation();
  const showSecondary =
    secondaryItems.length > 0 &&
    (items.some((item) => item.label === 'Records' && hrNavItemIsActive(item, location.pathname)) ||
      secondaryItems.some((item) => hrNavItemIsActive(item, location.pathname)));

  const navCls = sticky
    ? 'sticky top-[var(--app-header-offset,0px)] z-20 mb-0 bg-[#f4f4f2]/95 py-2 -mx-1 px-1'
    : '';

  return (
    <div className={navCls}>
      <div className="border-b border-slate-200/90">
        <NavItems items={items} ariaLabel="HR sections" linkClass={primaryClass} />
      </div>
      {showSecondary ? (
        <div className="border-b border-slate-100">
          <NavItems items={secondaryItems} ariaLabel="HR records" linkClass={secondaryClass} />
        </div>
      ) : null}
    </div>
  );
}
