import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { downloadScholarshipStatementPdf } from '../../lib/hrScholarship';
import { HR_BTN_PRIMARY, HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';
import { HrPageBody, HrPageIntro } from '../../components/hr/hrPageUi';
import { FamilyBenefitsContextBar } from '../../components/hr/FamilyBenefitsContextBar';
import ScholarshipPaymentsPanel from '../../components/hr/ScholarshipPaymentsPanel';
import { FAMILY_BENEFITS } from '../../lib/familyBenefitsUi';
import { HR_SELF_SERVICE_PATH } from '../../lib/hrSelfServiceRoutes';
import { ProfileFormField } from '../../components/profile/profileFormUi';
import {
  ProfileInlineAlert,
  ProfileMetricSkeleton,
  ProfileOverviewSection,
} from '../../components/profile/profileOverviewUi';

export default function MyProfileScholarshipPayments() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payments, setPayments] = useState([]);
  const [profile, setProfile] = useState(null);
  const [sessionFilter, setSessionFilter] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { ok, data } = await apiFetch('/api/hr/me/scholarship-summary');
      if (cancelled) return;
      if (!ok || !data?.ok) {
        setError(data?.error || 'Could not load payments.');
        setPayments([]);
      } else {
        setPayments(data.payments || []);
        setProfile(data.profile || null);
        setSessionFilter((prev) => prev || data.profile?.academicSession || '');
        setError('');
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onDownload = async () => {
    setDownloading(true);
    setDownloadError('');
    const r = await downloadScholarshipStatementPdf({
      academicSession: sessionFilter || undefined,
    });
    setDownloading(false);
    if (!r.ok) setDownloadError(r.error || 'Download failed.');
  };

  const sessions = [
    ...new Set(
      payments.map((p) => p.academicSession).filter(Boolean).concat(profile?.academicSession ? [profile.academicSession] : [])
    ),
  ];

  if (loading) {
    return (
      <HrPageBody>
        <ProfileMetricSkeleton count={1} />
      </HrPageBody>
    );
  }

  if (error) {
    return (
      <HrPageBody>
        <ProfileInlineAlert variant="error">{error}</ProfileInlineAlert>
      </HrPageBody>
    );
  }

  return (
    <HrPageBody>
      <HrPageIntro
        title={FAMILY_BENEFITS.paymentsPageTitle}
        description={FAMILY_BENEFITS.paymentsSubtitle}
        actions={
          <Link
            to={HR_SELF_SERVICE_PATH.school}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-violet-700 no-underline hover:underline"
          >
            ← {FAMILY_BENEFITS.hubTitle}
          </Link>
        }
      />

      <FamilyBenefitsContextBar profile={profile} />

      <ProfileOverviewSection title={FAMILY_BENEFITS.pdfStatementTitle} subtitle={FAMILY_BENEFITS.pdfStatementSubtitle}>
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
          <ProfileFormField label="Statement session (optional)" htmlFor="statement-session">
            <select
              id="statement-session"
              className={`${HR_FIELD_CLASS} min-w-[10rem]`}
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
            >
              <option value="">All payments</option>
              {sessions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </ProfileFormField>
          <button type="button" onClick={onDownload} disabled={downloading} className={HR_BTN_PRIMARY}>
            {downloading ? 'Generating…' : 'Download PDF statement'}
          </button>
        </div>
        {downloadError ? <ProfileInlineAlert variant="error">{downloadError}</ProfileInlineAlert> : null}
      </ProfileOverviewSection>

      <ProfileOverviewSection title={FAMILY_BENEFITS.paymentsTitle} subtitle={FAMILY_BENEFITS.paymentsSubtitle}>
        <ScholarshipPaymentsPanel payments={payments} />
      </ProfileOverviewSection>
    </HrPageBody>
  );
}
