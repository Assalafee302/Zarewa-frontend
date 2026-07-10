import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useUserProfile } from '../../context/UserProfileContext';
import { HR_SELF_SERVICE_PATH } from '../../lib/hrSelfServiceRoutes';
import { ProfileBanner } from './profilePageUi';

function daysUntilIso(iso) {
  if (!iso) return null;
  const end = Date.parse(String(iso).slice(0, 10));
  if (!Number.isFinite(end)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((end - today.getTime()) / 86_400_000);
  return diff;
}

export function ProfileProbationBanner({ className = '' }) {
  const { hr, cohort, hasHrSelfService } = useUserProfile();

  const probation = useMemo(() => {
    const days = daysUntilIso(hr?.probationEndIso);
    if (days == null) return null;
    if (days < 0) return { ended: true, days };
    return { ended: false, days, endIso: hr.probationEndIso };
  }, [hr?.probationEndIso]);

  if (!hasHrSelfService || !probation || cohort === 'scholarship' || cohort === 'domestic') {
    return null;
  }

  if (probation.ended) {
    return (
      <ProfileBanner tone="success" title="Probation completed" className={className}>
        Your probation period ended on {String(hr.probationEndIso).slice(0, 10)}. Contact HR if your employment
        status has not been updated.
      </ProfileBanner>
    );
  }

  const urgent = probation.days <= 14;

  return (
    <ProfileBanner
      tone={urgent ? 'warning' : 'info'}
      title={
        probation.days === 0
          ? 'Probation ends today'
          : `Probation — ${probation.days} day${probation.days === 1 ? '' : 's'} remaining`
      }
      action={
        <Link
          to={HR_SELF_SERVICE_PATH.employment}
          className="z-btn-secondary !px-4 !py-2 !text-ui-xs uppercase tracking-wide"
        >
          View record
        </Link>
      }
      className={className}
    >
      Probation ends on <strong>{String(probation.endIso).slice(0, 10)}</strong>. Ensure your profile and documents
      are complete before HR confirms your permanent status.
    </ProfileBanner>
  );
}
