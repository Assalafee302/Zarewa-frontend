import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useUserProfile } from '../../context/UserProfileContext';
import {
  buildUserProfileActions,
  USER_PROFILE_ACTION_CATEGORIES,
} from '../../lib/userProfileActions';

const TONE_CLASS = {
  teal: 'border-teal-100 bg-teal-50/50 hover:border-teal-200 hover:bg-teal-50',
  amber: 'border-amber-100 bg-amber-50/40 hover:border-amber-200 hover:bg-amber-50',
  violet: 'border-violet-100 bg-violet-50/40 hover:border-violet-200 hover:border-violet-50',
  slate: 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-50',
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
    return (
      <p className="text-sm text-slate-500">
        No extra actions for your role. You can still update your account and password.
      </p>
    );
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
          <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            {group.label}
          </h3>
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
  const tone = TONE_CLASS[action.tone || 'slate'];
  const isExternal = action.to.startsWith('/manager') || action.to.startsWith('/hr') || action.to.startsWith('/settings') || action.to.startsWith('/team') || action.to.startsWith('/executive');

  return (
    <Link
      to={action.to}
      className={`group flex items-start justify-between gap-3 rounded-2xl border p-4 no-underline transition-colors ${tone}`}
    >
      <div className="min-w-0 flex gap-3">
        {action.icon ? (
          <span className={`shrink-0 ${compact ? 'text-lg' : 'text-xl'}`} aria-hidden>
            {action.icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <p className={`font-bold text-slate-900 ${compact ? 'text-xs' : 'text-[15px]'}`}>{action.label}</p>
          {action.description && !compact ? (
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{action.description}</p>
          ) : null}
          {isExternal && !compact ? (
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Opens workspace</p>
          ) : null}
        </div>
      </div>
      <ChevronRight
        size={16}
        className="mt-0.5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#134e4a]"
      />
    </Link>
  );
}
