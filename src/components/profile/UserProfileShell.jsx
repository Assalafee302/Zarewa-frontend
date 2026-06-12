import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader, PageShell, MainPanel } from '../layout';

const NAV = [
  { to: '/me', label: 'Overview', end: true },
  { to: '/me/account', label: 'Account' },
  { to: '/me/security', label: 'Security' },
  { to: '/me/actions', label: 'What I can do' },
];

function ProfileSubnav() {
  return (
    <nav
      className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 custom-scrollbar"
      aria-label="Profile sections"
    >
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `shrink-0 rounded-xl px-3.5 py-2 text-[11px] font-bold uppercase tracking-wide border transition-colors ${
              isActive
                ? 'bg-[#134e4a] text-white border-[#134e4a] shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function UserProfileShell() {
  return (
    <PageShell className="pb-10">
      <PageHeader
        eyebrow="Account"
        title="My profile"
        subtitle="Your personal workspace — account details, security, and shortcuts to what you can do."
      />
      <div className="mb-6">
        <ProfileSubnav />
      </div>
      <MainPanel>
        <Outlet />
      </MainPanel>
    </PageShell>
  );
}
