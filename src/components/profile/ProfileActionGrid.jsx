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
    return <p className="text-sm text-slate-500">No extra actions for your role.</p>;
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {filtered
          .filter((a) => a.category === 'account' || a.category === 'self_service')
          .slice(0, 8)
          .map((action) => (
            <ActionChip key={action.id} action={action} />
          ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {byCategory.map((group) => (
        <section key={group.key}>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{group.label}</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {group.items.map((action) => (
              <ActionTile key={action.id} action={action} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ActionChip({ action }) {
  const Icon = action.icon ? ACTION_ICONS[action.icon] : null;
  return (
    <Link
      to={action.to}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 no-underline shadow-sm transition hover:border-[#134e4a]/40 hover:bg-teal-50/50"
    >
      {Icon ? <Icon size={14} className="text-[#134e4a]" aria-hidden /> : null}
      {action.label}
    </Link>
  );
}

/** @param {{ action: import('../../lib/userProfileActions').UserProfileAction; compact?: boolean }} props */
function ActionTile({ action, compact = false }) {
  const Icon = action.icon ? ACTION_ICONS[action.icon] : null;

  return (
    <Link
      to={action.to}
      className={`group flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white no-underline shadow-sm transition hover:border-[#134e4a]/25 hover:shadow-md ${compact ? 'p-3' : 'p-4'}`}
    >
      {Icon ? (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-[#134e4a]">
          <Icon size={18} aria-hidden />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className={`font-semibold text-slate-900 ${compact ? 'text-xs' : 'text-sm'}`}>{action.label}</p>
        {action.description && !compact ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{action.description}</p>
        ) : null}
      </div>
      <ChevronRight size={16} className="shrink-0 text-slate-300 group-hover:text-[#134e4a]" aria-hidden />
    </Link>
  );
}
