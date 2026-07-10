/* eslint-disable react-refresh/only-export-components */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserProfile } from '../../context/UserProfileContext';
import { hrSelfServicePathForTab } from '../../lib/hrSelfServiceRoutes';
import { isOnboardingWizardDismissed } from '../../lib/profileOnboardingDismiss';
import { HrProfileCompleteness } from '../hr/HrProfileCompleteness';
import { ProfileActionQueue } from './ProfileActionQueue';
import { ProfileOnboardingWizard } from './ProfileOnboardingWizard';

function SetupColumn({ title, subtitle, children, className = '' }) {
  return (
    <div
      className={`flex h-full min-h-[12rem] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <div className="shrink-0 border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
    </div>
  );
}

export function actionQueueHasItems({
  completeness,
  documentSummary,
  pendingProfileRequests,
  unreadNotifications = 0,
}) {
  const docs = documentSummary || {};
  return (
    (docs.pending || 0) > 0 ||
    (docs.rejected || 0) > 0 ||
    (pendingProfileRequests?.length || 0) > 0 ||
    unreadNotifications > 0 ||
    (completeness?.sections || []).some((s) => s.pct < 100)
  );
}

function useShowOnboardingPanel(onboardingHidden) {
  const { onboardingChecklist, cohort, hasHrSelfService, user } = useUserProfile();
  if (onboardingHidden) return false;
  if (!hasHrSelfService || cohort === 'scholarship' || cohort === 'domestic') return false;
  if (!onboardingChecklist || onboardingChecklist.complete) return false;
  if (isOnboardingWizardDismissed(user?.id)) return false;
  return true;
}

/**
 * Onboarding, profile health, and action queue — side by side on large screens.
 */
export function ProfileSetupRow({
  completeness,
  documentSummary,
  pendingProfileRequests,
  unreadNotifications = 0,
  compact = false,
  className = '',
}) {
  const navigate = useNavigate();
  const onFixSection = (tabId) => navigate(hrSelfServicePathForTab(tabId, { openForm: tabId === 'employment' }));
  const [onboardingHidden, setOnboardingHidden] = useState(false);
  const showOnboarding = useShowOnboardingPanel(onboardingHidden);

  const hasCompleteness = Boolean(completeness?.sections?.length);
  const hasQueue = actionQueueHasItems({
    completeness,
    documentSummary,
    pendingProfileRequests,
    unreadNotifications,
  });

  const columnCount = [showOnboarding, hasCompleteness, hasQueue].filter(Boolean).length;
  if (columnCount === 0) return null;

  const gridClass =
    columnCount >= 3 ? 'lg:grid-cols-3' : columnCount === 2 ? 'lg:grid-cols-2' : 'grid-cols-1';

  return (
    <div className={`grid grid-cols-1 gap-4 ${gridClass} lg:items-stretch ${className}`}>
      {showOnboarding ? (
        <ProfileOnboardingWizard
          className="h-full min-h-[12rem]"
          column
          onDismissed={() => setOnboardingHidden(true)}
        />
      ) : null}

      {hasCompleteness ? (
        <SetupColumn title="Profile health" subtitle="Completeness by section">
          <HrProfileCompleteness
            completeness={completeness}
            compact={compact}
            onFixSection={onFixSection}
            embedded
          />
        </SetupColumn>
      ) : null}

      {hasQueue ? (
        <SetupColumn title="Action queue" subtitle="Items that need your attention">
          <ProfileActionQueue
            completeness={completeness}
            documentSummary={documentSummary}
            pendingProfileRequests={pendingProfileRequests}
            unreadNotifications={unreadNotifications}
            onFixSection={onFixSection}
            embedded
          />
        </SetupColumn>
      ) : null}
    </div>
  );
}
