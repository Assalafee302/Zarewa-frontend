import React, { useMemo } from 'react';
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
  MessageSquare,
  Receipt,
  ScrollText,
  Settings,
  Star,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useUserProfile } from '../../context/UserProfileContext';
import {
  buildUserProfileActions,
  USER_PROFILE_ACTION_CATEGORIES,
} from '../../lib/userProfileActions';
import { ProfileAccentBar } from './profileDesign';

const ACTION_ICONS = {
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

/**
 * @param {{ categoryFilter?: string | null; compact?: boolean; excludeWorkspace?: boolean }} props
 */
export function ProfileActionGrid({ categoryFilter = null, compact = false, excludeWorkspace = false }) {
  const ws = useWorkspace();
  const { cohort, hasHrSelfService } = useUserProfile();

  const actions = useMemo(
    () =>
      buildUserProfileActions({
        permissions: ws?.permissions,
        roleKey: ws?.session?.user?.roleKey,
        canAccessModule: ws?.canAccessModule,
        cohort,
        hasHrSelfService,
      }).filter((a) => (excludeWorkspace ? a.category !== 'workspace' && a.category !== 'team' : true)),
    [
      ws?.permissions,
      ws?.session?.user?.roleKey,
      ws?.canAccessModule,
      cohort,
      hasHrSelfService,
      excludeWorkspace,
    ]
  );

  const filtered = categoryFilter ? actions.filter((a) => a.category === categoryFilter) : actions;

  const byCategory = USER_PROFILE_ACTION_CATEGORIES.map((cat) => ({
    ...cat,
    items: filtered.filter((a) => a.category === cat.key),
  })).filter((g) => g.items.length > 0);

  if (filtered.length === 0) {
    return <p className="z-meta-text">No extra actions for your role. You can still update account and password.</p>;
  }

  if (compact) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {filtered
          .filter((a) => a.category === 'account' || a.category === 'self_service')
          .slice(0, 8)
          .map((action) => (
            <ActionTile key={action.id} action={action} compact />
          ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {byCategory.map((group) => (
        <section key={group.key}>
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">{group.label}</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((action) => (
              <ActionTile key={action.id} action={action} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** @param {{ action: import('../../lib/userProfileActions').UserProfileAction; compact?: boolean }} props */
function ActionTile({ action, compact = false }) {
  const Icon = action.icon ? ACTION_ICONS[action.icon] : null;
  const isExternal =
    action.to.startsWith('/manager') ||
    action.to.startsWith('/hr') ||
    action.to.startsWith('/settings') ||
    action.to.startsWith('/team') ||
    action.to.startsWith('/executive');

  return (
    <Link
      to={action.to}
      className={`group relative flex min-h-[72px] items-start justify-between gap-3 overflow-hidden rounded-xl border border-slate-200/90 bg-white no-underline shadow-sm transition-colors hover:border-[#134e4a]/25 hover:bg-teal-50/20 ${compact ? 'p-3' : 'p-4'}`}
    >
      <ProfileAccentBar className="absolute inset-x-0 top-0 rounded-none" />
      <div className="min-w-0 flex gap-3 pt-1">
        {Icon ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-[#134e4a]">
            <Icon size={compact ? 16 : 18} aria-hidden />
          </span>
        ) : null}
        <div className="min-w-0">
          <p className={`font-semibold text-slate-900 ${compact ? 'text-xs' : 'text-sm'}`}>{action.label}</p>
          {action.description && !compact ? (
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{action.description}</p>
          ) : null}
          {isExternal && !compact ? (
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Opens workspace</p>
          ) : null}
        </div>
      </div>
      <ChevronRight
        size={16}
        className="mt-1 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#134e4a]"
      />
    </Link>
  );
}
