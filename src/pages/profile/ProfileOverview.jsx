import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUserProfile } from '../../context/UserProfileContext';
import { formatNgn } from '../../lib/hrFormat';
import { ProfileHealthPanel } from '../../components/profile/ProfileHealthPanel';
import { ProfileHeroCard } from '../../components/profile/ProfileHeroCard';
import { ProfileActionGrid } from '../../components/profile/ProfileActionGrid';
import {
  ProfileHeroSkeleton,
  ProfileInlineAlert,
} from '../../components/profile/profileOverviewUi';
import { ProfileKpiSkeleton, ProfileModuleSection } from '../../components/profile/profileDesign';
import { ACCOUNT_PATH, HR_SELF_SERVICE_PATH } from '../../lib/hrSelfServiceRoutes';
import { FAMILY_BENEFITS, familyParentLine } from '../../lib/familyBenefitsUi';
import { DOMESTIC_BENEFITS, domesticEmployerLine } from '../../lib/domesticStaffUi';
import { apiFetch } from '../../lib/apiBase';
import { ProfileOnboardingWizard } from '../../components/profile/ProfileOnboardingWizard';
import { ProfileProbationBanner } from '../../components/profile/ProfileProbationBanner';

function ScholarshipTeaser() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { ok, data } = await apiFetch('/api/hr/me/scholarship-summary');
      if (!cancelled) {
        setProfile(ok && data?.ok ? data.profile : null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ProfileModuleSection
      title={FAMILY_BENEFITS.accountTeaserTitle}
      subtitle={FAMILY_BENEFITS.accountTeaserSubtitle}
      actionTo={HR_SELF_SERVICE_PATH.school}
      actionLabel={FAMILY_BENEFITS.accountTeaserAction}
    >
      {loading ? (
        <ProfileKpiSkeleton count={2} />
      ) : profile ? (
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          {profile.linkedExecutiveLabel || profile.linkedExecutive ? (
            <div className="sm:col-span-2 lg:col-span-4 rounded-lg bg-violet-50 px-3 py-2">
              <dt className="text-xs font-medium text-violet-700">Linked executive</dt>
              <dd className="mt-0.5 font-semibold text-violet-950">{familyParentLine(profile)}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs text-slate-500">School</dt>
            <dd className="mt-0.5 font-semibold">{profile.schoolName || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Class</dt>
            <dd className="mt-0.5 font-semibold">{profile.classLevel || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">School fees</dt>
            <dd className="mt-0.5 font-semibold tabular-nums">
              {profile.schoolFeesNgn != null ? formatNgn(profile.schoolFeesNgn) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Salary step</dt>
            <dd className="mt-0.5 font-semibold">{profile.salaryStep != null ? `Step ${profile.salaryStep}` : '—'}</dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-slate-500">Open HR services for full school and payment details.</p>
      )}
    </ProfileModuleSection>
  );
}

function DomesticTeaser() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { ok, data } = await apiFetch('/api/hr/me/domestic-summary');
      if (!cancelled) {
        setProfile(ok && data?.ok ? data.profile : null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ProfileModuleSection
      title={DOMESTIC_BENEFITS.accountTeaserTitle}
      subtitle={DOMESTIC_BENEFITS.accountTeaserSubtitle}
      actionTo={HR_SELF_SERVICE_PATH.home}
      actionLabel={DOMESTIC_BENEFITS.accountTeaserAction}
    >
      {loading ? (
        <ProfileKpiSkeleton count={2} />
      ) : profile ? (
        <dl className="grid gap-4 sm:grid-cols-3 text-sm">
          {profile.assignedExecutiveLabel ? (
            <div className="sm:col-span-3 rounded-lg bg-amber-50 px-3 py-2">
              <dt className="text-xs font-medium text-amber-800">Employer</dt>
              <dd className="mt-0.5 font-semibold text-amber-950">{domesticEmployerLine(profile)}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs text-slate-500">Role</dt>
            <dd className="mt-0.5 font-semibold">{profile.designation || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Location</dt>
            <dd className="mt-0.5 font-semibold">{profile.workLocation || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Monthly salary</dt>
            <dd className="mt-0.5 font-semibold tabular-nums">
              {profile.monthlySalaryNgn != null ? formatNgn(profile.monthlySalaryNgn) : '—'}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-slate-500">Open HR services for payment details.</p>
      )}
    </ProfileModuleSection>
  );
}

export default function ProfileOverview() {
  const {
    cohort,
    hasHrSelfService,
    initialLoading,
    error,
    unreadNotifications,
    completeness,
    documentSummary,
    pendingProfileRequests,
  } = useUserProfile();

  if (initialLoading && hasHrSelfService) {
    return (
      <div className="space-y-6">
        <ProfileHeroSkeleton />
        <ProfileKpiSkeleton count={3} />
      </div>
    );
  }

  const showHealth =
    hasHrSelfService &&
    cohort !== 'account_only' &&
    (cohort !== 'scholarship' || completeness);

  return (
    <div className="space-y-8">
      <ProfileHeroCard />

      {error ? <ProfileInlineAlert variant="error">{error}</ProfileInlineAlert> : null}

      <ProfileOnboardingWizard />
      <ProfileProbationBanner />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ProfileModuleSection title="Shortcuts" subtitle="Frequently used actions" flush>
            <ProfileActionGrid compact excludeWorkspace />
          </ProfileModuleSection>

          {cohort === 'scholarship' ? <ScholarshipTeaser /> : null}
          {cohort === 'domestic' ? <DomesticTeaser /> : null}

          {cohort === 'account_only' ? (
            <ProfileModuleSection
              title="Account & security"
              subtitle="Update sign-in details and password"
              actionTo={ACCOUNT_PATH.account}
              actionLabel="Open settings"
            >
              <p className="text-sm text-slate-600">
                Manage display name, email, username, and password under Account settings.
              </p>
            </ProfileModuleSection>
          ) : null}
        </div>

        <div className="space-y-6">
          {showHealth ? (
            <ProfileHealthPanel
              completeness={completeness}
              documentSummary={documentSummary}
              pendingProfileRequests={pendingProfileRequests}
              unreadNotifications={unreadNotifications}
              compact
            />
          ) : null}

          {hasHrSelfService && cohort !== 'account_only' ? (
            <p className="text-xs leading-relaxed text-slate-500">
              Employment records and payslips are in{' '}
              <Link to={HR_SELF_SERVICE_PATH.overview} className="font-semibold text-[#134e4a] hover:underline">
                HR services
              </Link>
              .
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
