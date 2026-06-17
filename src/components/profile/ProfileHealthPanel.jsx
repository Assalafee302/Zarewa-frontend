import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HrProfileCompleteness } from '../hr/HrProfileCompleteness';
import { ProfileActionQueue } from './ProfileActionQueue';
import { hrSelfServicePathForTab } from '../../lib/hrSelfServiceRoutes';

/**
 * Combined profile health: completeness meter + actionable queue.
 */
export function ProfileHealthPanel({
  completeness,
  documentSummary,
  pendingProfileRequests,
  unreadNotifications = 0,
  compact = false,
  className = '',
}) {
  const navigate = useNavigate();
  const onFixSection = (tabId) => navigate(hrSelfServicePathForTab(tabId));

  const hasCompleteness = Boolean(completeness?.sections?.length);
  const hasQueue =
    (documentSummary?.pending || 0) > 0 ||
    (documentSummary?.rejected || 0) > 0 ||
    (pendingProfileRequests?.length || 0) > 0 ||
    unreadNotifications > 0 ||
    (completeness?.sections || []).some((s) => s.pct < 100);

  if (!hasCompleteness && !hasQueue) return null;

  return (
    <div className={`space-y-4 ${className}`}>
      {hasCompleteness ? (
        <HrProfileCompleteness completeness={completeness} compact={compact} onFixSection={onFixSection} />
      ) : null}
      <ProfileActionQueue
        completeness={completeness}
        documentSummary={documentSummary}
        pendingProfileRequests={pendingProfileRequests}
        unreadNotifications={unreadNotifications}
        onFixSection={onFixSection}
      />
    </div>
  );
}
