import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUserProfile } from '../../context/UserProfileContext';
import { formatNgn } from '../../lib/hrFormat';
import { ProfileHealthPanel } from '../../components/profile/ProfileHealthPanel';
import { ProfileHeroCard } from '../../components/profile/ProfileHeroCard';
import { ProfileActionGrid } from '../../components/profile/ProfileActionGrid';
import {
  ProfileHeroSkeleton,
  ProfileHubBanner,
  ProfileInlineAlert,
  ProfileOverviewSection,
} from '../../components/profile/profileOverviewUi';
import { ACCOUNT_PATH, HR_SELF_SERVICE_PATH } from '../../lib/hrSelfServiceRoutes';
import { FAMILY_BENEFITS, familyParentLine } from '../../lib/familyBenefitsUi';
import { DOMESTIC_BENEFITS, domesticEmployerLine } from '../../lib/domesticStaffUi';
import { apiFetch } from '../../lib/apiBase';
import { ProfileKpiSkeleton } from '../../components/profile/profileDesign';
import { ProfileOnboardingWizard } from '../../components/profile/ProfileOnboardingWizard';
import { ProfileProbationBanner } from '../../components/profile/ProfileProbationBanner';

function ScholarshipTeaserSkeleton() {
  return <ProfileKpiSkeleton count={4} />;
}

function ScholarshipOverviewTeaser() {
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
    <ProfileOverviewSection
      title={FAMILY_BENEFITS.accountTeaserTitle}
      subtitle={FAMILY_BENEFITS.accountTeaserSubtitle}
      actionTo={HR_SELF_SERVICE_PATH.school}
      actionLabel={FAMILY_BENEFITS.accountTeaserAction}
    >
      {loading ? (
        <ScholarshipTeaserSkeleton />
      ) : profile ? (
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          {profile.linkedExecutiveLabel || profile.linkedExecutive ? (
            <div className="rounded-lg border border-violet-100/80 bg-violet-50/40 px-3 py-2.5 sm:col-span-2 lg:col-span-4">
              <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Linked executive</dt>
              <dd className="mt-1 font-semibold text-violet-900">{familyParentLine(profile)}</dd>
            </div>
          ) : null}
          <div className="z-list-row-compact">
            <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">School</dt>
            <dd className="mt-1 font-semibold text-slate-900">{profile.schoolName || '—'}</dd>
          </div>
          <div className="z-list-row-compact">
            <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Class / level</dt>
            <dd className="mt-1 font-semibold text-slate-900">{profile.classLevel || '—'}</dd>
          </div>
          <div className="z-list-row-compact">
            <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">School fees</dt>
            <dd className="mt-1 font-semibold tabular-nums text-slate-900">
              {profile.schoolFeesNgn != null ? formatNgn(profile.schoolFeesNgn) : '—'}
            </dd>
          </div>
          <div className="z-list-row-compact">
            <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Monthly allowance</dt>
            <dd className="mt-1 font-semibold text-slate-900">
              {profile.salaryStep != null ? `Step ${profile.salaryStep}` : '—'}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-slate-500">Open HR services to view school fees and allowance details.</p>
      )}
    </ProfileOverviewSection>
  );
}

function DomesticOverviewTeaser() {
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
    <ProfileOverviewSection
      title={DOMESTIC_BENEFITS.accountTeaserTitle}
      subtitle={DOMESTIC_BENEFITS.accountTeaserSubtitle}
      actionTo={HR_SELF_SERVICE_PATH.home}
      actionLabel={DOMESTIC_BENEFITS.accountTeaserAction}
    >
      {loading ? (
        <ScholarshipTeaserSkeleton />
      ) : profile ? (
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          {profile.assignedExecutiveLabel ? (
            <div className="rounded-lg border border-amber-100/80 bg-amber-50/40 px-3 py-2.5 sm:col-span-2 lg:col-span-3">
              <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Employer</dt>
              <dd className="mt-1 font-semibold text-amber-900">{domesticEmployerLine(profile)}</dd>
            </div>
          ) : null}
          <div className="z-list-row-compact">
            <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Role</dt>
            <dd className="mt-1 font-semibold text-slate-900">{profile.designation || '—'}</dd>
          </div>
          <div className="z-list-row-compact">
            <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Location</dt>
            <dd className="mt-1 font-semibold text-slate-900">{profile.workLocation || '—'}</dd>
          </div>
          <div className="z-list-row-compact">
            <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Monthly salary</dt>
            <dd className="mt-1 font-semibold tabular-nums text-slate-900">
              {profile.monthlySalaryNgn != null ? formatNgn(profile.monthlySalaryNgn) : '—'}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-slate-500">Open HR services to view salary and payment details.</p>
      )}
    </ProfileOverviewSection>
  );
}

export default function ProfileOverview() {
  const {
    cohort,
    hasHrSelfService,
    initialLoading,
    error,
    unreadNotifications,
  } = useUserProfile();

  if (initialLoading && hasHrSelfService) {
    return (
      <div className="space-y-6">
        <ProfileHeroSkeleton />
        <ProfileKpiSkeleton count={4} />
      </div>
    );
  }

  const hrHubTo =
    cohort === 'scholarship'
      ? HR_SELF_SERVICE_PATH.school
      : cohort === 'domestic'
        ? HR_SELF_SERVICE_PATH.home
        : HR_SELF_SERVICE_PATH.overview;
  const hrHubTitle =
    cohort === 'scholarship'
      ? FAMILY_BENEFITS.hubTitle
      : cohort === 'domestic'
        ? DOMESTIC_BENEFITS.hubTitle
        : 'HR services';

  return (
    <div className="space-y-6">
      <ProfileHeroCard />

      {error ? <ProfileInlineAlert variant="error">{error}</ProfileInlineAlert> : null}

      <ProfileOnboardingWizard />
      <ProfileProbationBanner />

      {hasHrSelfService && cohort !== 'account_only' && cohort !== 'scholarship' ? (
        <ProfileHealthPanel
          completeness={completeness}
          documentSummary={documentSummary}
          pendingProfileRequests={pendingProfileRequests}
          unreadNotifications={unreadNotifications}
          compact
        />
      ) : null}

      <ProfileOverviewSection title="Quick actions" subtitle="Jump to the page you need" actionTo={ACCOUNT_PATH.services} actionLabel="All services">
        <ProfileActionGrid compact excludeWorkspace />
      </ProfileOverviewSection>

      {cohort === 'scholarship' ? <ScholarshipOverviewTeaser /> : null}
      {cohort === 'domestic' ? <DomesticOverviewTeaser /> : null}

      {hasHrSelfService && cohort === 'scholarship' ? (
        <ProfileHealthPanel
          completeness={completeness}
          documentSummary={documentSummary}
          pendingProfileRequests={pendingProfileRequests}
          unreadNotifications={unreadNotifications}
          compact
        />
      ) : null}

      {hasHrSelfService && cohort !== 'account_only' ? (
        <ProfileHubBanner
          to={hrHubTo}
          title={hrHubTitle}
          description="Leave, payslips, documents, employment records, and company policies."
          tone="teal"
        />
      ) : null}

      {cohort === 'account_only' ? (
        <ProfileHubBanner
          to={ACCOUNT_PATH.account}
          title="Account & security"
          description="Profile details, access info, and password."
          tone="slate"
        />
      ) : null}

      {hasHrSelfService && cohort !== 'account_only' ? (
        <p className="z-meta-text">
          Official employment data lives under{' '}
          <Link to={hrHubTo} className="font-semibold text-[#134e4a] hover:underline">
            {hrHubTitle}
          </Link>
          . Update sign-in details under{' '}
          <Link to={ACCOUNT_PATH.account} className="font-semibold text-[#134e4a] hover:underline">
            Account & security
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
