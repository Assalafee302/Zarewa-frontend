import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useUserProfile } from '../../context/UserProfileContext';
import {
  buildUserProfileActions,
  USER_PROFILE_ACTION_CATEGORIES,
} from '../../lib/userProfileActions';
import { ProfileActionGrid } from '../../components/profile/ProfileActionGrid';
import { ProfileOverviewSection } from '../../components/profile/profileOverviewUi';
import { ACCOUNT_PATH, HR_SELF_SERVICE_PATH } from '../../lib/hrSelfServiceRoutes';
import { ChevronRight } from 'lucide-react';

const TONE_CLASS = {
  teal: 'border-teal-100 bg-teal-50/50 hover:border-teal-200 hover:bg-teal-50',
  amber: 'border-amber-100 bg-amber-50/40 hover:border-amber-200 hover:bg-amber-50',
  violet: 'border-violet-100 bg-violet-50/40 hover:border-violet-200 hover:bg-violet-50',
  slate: 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-50',
};

function ServiceTile({ action }) {
  const tone = TONE_CLASS[action.tone || 'slate'];
  const isExternal =
    action.to.startsWith('/manager') ||
    action.to.startsWith('/hr') ||
    action.to.startsWith('/settings') ||
    action.to.startsWith('/team') ||
    action.to.startsWith('/executive');

  return (
    <Link
      to={action.to}
      className={`group flex min-h-[76px] items-start justify-between gap-3 rounded-2xl border p-4 no-underline transition-all active:scale-[0.99] hover:shadow-sm ${tone}`}
    >
      <div className="min-w-0 flex gap-3">
        {action.icon ? (
          <span className="shrink-0 text-xl" aria-hidden>
            {action.icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="font-bold text-slate-900">{action.label}</p>
          {action.description ? (
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{action.description}</p>
          ) : null}
          {isExternal ? (
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Opens workspace</p>
          ) : null}
        </div>
      </div>
      <ChevronRight
        size={16}
        className="mt-0.5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#134e4a]"
        aria-hidden
      />
    </Link>
  );
}

export default function ProfileActions() {
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
      }),
    [ws?.permissions, ws?.session?.user?.roleKey, ws?.canAccessModule, cohort, hasHrSelfService]
  );

  const byCategory = USER_PROFILE_ACTION_CATEGORIES.map((cat) => ({
    ...cat,
    items: actions.filter((a) => a.category === cat.key),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <ProfileOverviewSection
        title="All services"
        subtitle="Grouped by type. HR tasks open in HR self-service; account settings stay here."
        actionTo={hasHrSelfService ? HR_SELF_SERVICE_PATH.overview : ACCOUNT_PATH.account}
        actionLabel={hasHrSelfService ? 'HR hub' : 'Account'}
      >
        <p className="text-sm leading-relaxed text-slate-600">
          Use this page when you know the category but not the exact menu path. Team and admin workspaces open in their
          own areas.
        </p>
      </ProfileOverviewSection>

      {byCategory.map((group) => (
        <ProfileOverviewSection key={group.key} title={group.label}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {group.items.map((action) => (
              <ServiceTile key={action.id} action={action} />
            ))}
          </div>
        </ProfileOverviewSection>
      ))}

      {actions.length === 0 ? (
        <ProfileActionGrid />
      ) : null}
    </div>
  );
}
