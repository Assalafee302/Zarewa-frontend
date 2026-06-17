import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ChevronRight, FileText, ScrollText, Shield } from 'lucide-react';
import { HR_SELF_SERVICE_PATH, hrSelfServicePathForTab } from '../../lib/hrSelfServiceRoutes';
import { ProfileListRow, ProfileModuleSection, ProfileStatusChip } from './profileDesign';

/**
 * Surfaces pending profile work — documents, policies, HR requests, notifications.
 * @param {{
 *   completeness?: object;
 *   documentSummary?: object;
 *   pendingProfileRequests?: object[];
 *   unreadNotifications?: number;
 *   onFixSection?: (tabId: string) => void;
 *   className?: string;
 * }} props
 */
export function ProfileActionQueue({
  completeness,
  documentSummary,
  pendingProfileRequests = [],
  unreadNotifications = 0,
  onFixSection,
  className = '',
}) {
  const items = useMemo(() => {
    /** @type {{ id: string; label: string; to?: string; onClick?: () => void; variant: string; icon: import('react').ReactNode }[]} */
    const queue = [];

    const docs = documentSummary || {};
    if ((docs.pending || 0) > 0) {
      queue.push({
        id: 'docs-pending',
        label: `${docs.pending} document(s) awaiting HR verification`,
        to: HR_SELF_SERVICE_PATH.documents,
        variant: 'pending',
        icon: <FileText size={14} className="shrink-0 text-amber-600" aria-hidden />,
      });
    }
    if ((docs.rejected || 0) > 0) {
      queue.push({
        id: 'docs-rejected',
        label: `${docs.rejected} document(s) rejected — re-upload`,
        to: HR_SELF_SERVICE_PATH.documents,
        variant: 'rejected',
        icon: <FileText size={14} className="shrink-0 text-rose-600" aria-hidden />,
      });
    }

    const policiesSection = completeness?.sections?.find((s) => s.id === 'policies');
    if (policiesSection && policiesSection.pct < 100) {
      queue.push({
        id: 'policies',
        label: 'Sign company policies',
        to: HR_SELF_SERVICE_PATH.policies,
        variant: 'pending',
        icon: <ScrollText size={14} className="shrink-0 text-amber-600" aria-hidden />,
      });
    }

    const documentsSection = completeness?.sections?.find((s) => s.id === 'documents');
    if (documentsSection && documentsSection.pct < 100 && !(docs.pending || docs.rejected)) {
      queue.push({
        id: 'docs-missing',
        label: 'Upload missing onboarding documents',
        to: HR_SELF_SERVICE_PATH.documents,
        variant: 'pending',
        icon: <FileText size={14} className="shrink-0 text-amber-600" aria-hidden />,
      });
    }

    for (const section of completeness?.sections || []) {
      if (section.pct >= 100 || !section.fixTab) continue;
      if (['documents', 'policies'].includes(section.id)) continue;
      queue.push({
        id: `section-${section.id}`,
        label: `Complete ${section.label?.toLowerCase() || section.id}`,
        onClick: onFixSection ? () => onFixSection(section.fixTab) : undefined,
        to: onFixSection ? undefined : hrSelfServicePathForTab(section.fixTab),
        variant: 'info',
        icon: <Shield size={14} className="shrink-0 text-sky-600" aria-hidden />,
      });
    }

    for (const r of pendingProfileRequests) {
      queue.push({
        id: `req-${r.id}`,
        label: r.title || 'Profile change request',
        variant: 'pending',
        icon: <AlertCircle size={14} className="shrink-0 text-violet-600" aria-hidden />,
      });
    }

    if (unreadNotifications > 0) {
      queue.push({
        id: 'notifications',
        label: `${unreadNotifications} unread HR notification${unreadNotifications === 1 ? '' : 's'}`,
        to: HR_SELF_SERVICE_PATH.overview,
        variant: 'info',
        icon: <AlertCircle size={14} className="shrink-0 text-sky-600" aria-hidden />,
      });
    }

    return queue;
  }, [completeness, documentSummary, pendingProfileRequests, unreadNotifications, onFixSection]);

  if (!items.length) return null;

  return (
    <ProfileModuleSection
      title="Action queue"
      subtitle="Items that need your attention"
      className={className}
    >
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.id}>
            <ProfileListRow to={item.to} onClick={item.onClick}>
              <span className="flex min-w-0 flex-1 items-center gap-2.5">
                {item.icon}
                <span className="min-w-0 truncate font-medium">{item.label}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <ProfileStatusChip variant={item.variant === 'rejected' ? 'rejected' : item.variant === 'approved' ? 'approved' : 'pending'}>
                  {item.variant === 'rejected' ? 'Action' : 'Pending'}
                </ProfileStatusChip>
                <ChevronRight size={14} className="text-slate-400" aria-hidden />
              </span>
            </ProfileListRow>
          </li>
        ))}
      </ul>
    </ProfileModuleSection>
  );
}
