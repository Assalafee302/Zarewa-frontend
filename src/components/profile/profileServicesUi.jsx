/* eslint-disable react-refresh/only-export-components */
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  CreditCard,
  FileText,
  FolderOpen,
  GraduationCap,
  Home,
  Inbox,
  LayoutGrid,
  MessageSquare,
  Receipt,
  ScrollText,
  Search,
  Settings,
  Star,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import { USER_PROFILE_ACTION_CATEGORIES } from '../../lib/userProfileActions';

export const ACTION_ICONS = {
  user: User,
  school: GraduationCap,
  fileText: FileText,
  creditCard: CreditCard,
  folderOpen: FolderOpen,
  scrollText: ScrollText,
  messageSquare: MessageSquare,
  calendarDays: CalendarDays,
  wallet: Wallet,
  receipt: Receipt,
  home: Home,
  briefcase: Briefcase,
  badgeCheck: BadgeCheck,
  checkCircle: CheckCircle,
  users: Users,
  inbox: Inbox,
  settings: Settings,
  building: Building2,
  star: Star,
};

const CATEGORY_META = {
  account: { tone: 'teal', description: 'Sign-in, profile, and password' },
  self_service: { tone: 'violet', description: 'Leave, pay, documents, and HR tasks' },
  team: { tone: 'amber', description: 'Team tools and approvals' },
  workspace: { tone: 'slate', description: 'Opens in another workspace area' },
};

const TILE_SHELL = {
  teal: 'border-teal-100/90 bg-white hover:border-teal-200 hover:bg-teal-50/40',
  violet: 'border-violet-100/90 bg-white hover:border-violet-200 hover:bg-violet-50/40',
  amber: 'border-amber-100/90 bg-white hover:border-amber-200 hover:bg-amber-50/40',
  slate: 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/80',
};

const ICON_SHELL = {
  teal: 'bg-teal-50 text-zarewa-teal',
  violet: 'bg-violet-50 text-violet-800',
  amber: 'bg-amber-50 text-amber-900',
  slate: 'bg-slate-100 text-slate-700',
};

/** @param {{ action: import('../../lib/userProfileActions').UserProfileAction }} props */
export function ProfileServiceTile({ action }) {
  const Icon = action.icon ? ACTION_ICONS[action.icon] : LayoutGrid;
  const tone = action.tone || CATEGORY_META[action.category]?.tone || 'slate';
  const shell = TILE_SHELL[tone] || TILE_SHELL.slate;
  const iconShell = ICON_SHELL[tone] || ICON_SHELL.slate;
  const isWorkspace =
    action.category === 'workspace' ||
    action.category === 'team' ||
    action.to.startsWith('/manager') ||
    action.to.startsWith('/hr') ||
    action.to.startsWith('/settings') ||
    action.to.startsWith('/team') ||
    action.to.startsWith('/executive');

  return (
    <Link
      to={action.to}
      className={`group flex min-h-[4.5rem] items-center gap-3 rounded-xl border p-3.5 no-underline shadow-sm transition active:scale-[0.99] sm:min-h-[5rem] sm:p-4 ${shell}`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${iconShell}`}
      >
        <Icon size={20} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-900">{action.label}</p>
        {action.description ? (
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-600">{action.description}</p>
        ) : null}
        {isWorkspace ? (
          <p className="mt-1 text-ui-xs font-semibold uppercase tracking-wide text-slate-400">Workspace</p>
        ) : null}
      </div>
      <ChevronRight
        size={18}
        className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-zarewa-teal"
        aria-hidden
      />
    </Link>
  );
}

export function ProfileServicesHero({ title, description, count }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zarewa-teal via-[#0f5c55] to-zarewa-teal p-5 text-white shadow-lg shadow-teal-950/10 sm:p-6">
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-ui-xs font-bold uppercase tracking-[0.14em] text-teal-100/90">Account</p>
          <h2 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">{title}</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-teal-50/90">{description}</p>
        </div>
        {count != null ? (
          <div className="shrink-0 rounded-xl bg-white/15 px-4 py-3 text-center ring-1 ring-white/20">
            <p className="text-2xl font-black tabular-nums">{count}</p>
            <p className="text-ui-xs font-semibold uppercase tracking-wide text-teal-100/90">services</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * @param {{
 *   actions: import('../../lib/userProfileActions').UserProfileAction[];
 *   showSearch?: boolean;
 *   className?: string;
 * }} props
 */
export function ProfileServicesCatalog({ actions, showSearch = true, className = '' }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
    );
  }, [actions, query]);

  const byCategory = USER_PROFILE_ACTION_CATEGORIES.map((cat) => ({
    ...cat,
    meta: CATEGORY_META[cat.key],
    items: filtered.filter((a) => a.category === cat.key),
  })).filter((g) => g.items.length > 0);

  if (!actions.length) {
    return <p className="text-sm text-slate-500">No services are available for your role yet.</p>;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {showSearch && actions.length > 4 ? (
        <label className="relative block">
          <span className="sr-only">Search services</span>
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search services…"
            className="z-input w-full !pl-10"
            autoComplete="off"
          />
        </label>
      ) : null}

      {byCategory.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
          No services match &ldquo;{query}&rdquo;.
        </p>
      ) : (
        byCategory.map((group) => (
          <section key={group.key} aria-labelledby={`services-cat-${group.key}`}>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h3 id={`services-cat-${group.key}`} className="text-sm font-bold text-slate-900">
                  {group.label}
                </h3>
                {group.meta?.description ? (
                  <p className="mt-0.5 text-xs text-slate-500">{group.meta.description}</p>
                ) : null}
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-ui-xs font-bold text-slate-600">
                {group.items.length}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {group.items.map((action) => (
                <ProfileServiceTile key={action.id} action={action} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
