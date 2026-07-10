import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useUserProfile } from '../../context/UserProfileContext';
import { buildUserProfileActions, USER_PROFILE_ACTION_CATEGORIES } from '../../lib/userProfileActions';
import { ProfileServiceTile } from './profileServicesUi';

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
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
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
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {group.items.map((action) => (
              <ProfileServiceTile key={action.id} action={action} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** @param {{ action: import('../../lib/userProfileActions').UserProfileAction }} props */
function ActionChip({ action }) {
  return (
    <Link
      to={action.to}
      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center text-xs font-semibold leading-tight text-slate-800 no-underline shadow-sm transition hover:border-zarewa-teal/40 hover:bg-teal-50/50 active:scale-[0.99] sm:rounded-full sm:px-3 sm:py-2"
    >
      {action.label}
    </Link>
  );
}

/** @deprecated Use ProfileServiceTile */
export function ActionTile({ action }) {
  return <ProfileServiceTile action={action} />;
}
