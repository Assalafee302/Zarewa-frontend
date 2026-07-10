import { HrButton, HrAddButton } from '../../components/hr/hrPageUi';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HR_BTN_PRIMARY } from '../../components/hr/hrFormStyles';
import { ProfilePageBody, ProfilePageIntro } from '../../components/profile/profilePageUi';
import { DomesticStaffContextBar } from '../../components/hr/DomesticStaffContextBar';
import ScholarshipPaymentsPanel from '../../components/hr/ScholarshipPaymentsPanel';
import { DOMESTIC_BENEFITS } from '../../lib/domesticStaffUi';
import { downloadDomesticStatementPdf } from '../../lib/hrDomestic';
import { HR_SELF_SERVICE_PATH } from '../../lib/hrSelfServiceRoutes';
import {
  ProfileInlineAlert,
  ProfileMetricSkeleton,
  ProfileOverviewSection,
} from '../../components/profile/profileOverviewUi';
import { apiFetch } from '../../lib/apiBase';

export default function MyProfileDomesticPayments() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payments, setPayments] = useState([]);
  const [profile, setProfile] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { ok, data } = await apiFetch('/api/hr/me/domestic-summary');
      if (cancelled) return;
      if (!ok || !data?.ok) {
        setError(data?.error || 'Could not load payments.');
        setPayments([]);
      } else {
        setPayments(data.payments || []);
        setProfile(data.profile || null);
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
    const r = await downloadDomesticStatementPdf();
    setDownloading(false);
    if (!r.ok) setDownloadError(r.error || 'Download failed.');
  };

  if (loading) {
    return (
      <ProfilePageBody>
        <ProfileMetricSkeleton count={1} />
      </ProfilePageBody>
    );
  }

  if (error) {
    return (
      <ProfilePageBody>
        <ProfileInlineAlert variant="error">{error}</ProfileInlineAlert>
      </ProfilePageBody>
    );
  }

  return (
    <ProfilePageBody>
      <ProfilePageIntro
        title={DOMESTIC_BENEFITS.paymentsPageTitle}
        description={DOMESTIC_BENEFITS.paymentsSubtitle}
        actions={
          <Link
            to={HR_SELF_SERVICE_PATH.home}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-amber-800 no-underline hover:underline"
          >
            ← {DOMESTIC_BENEFITS.hubTitle}
          </Link>
        }
      />

      <DomesticStaffContextBar profile={profile} />

      <ProfileOverviewSection title={DOMESTIC_BENEFITS.pdfStatementTitle} subtitle={DOMESTIC_BENEFITS.pdfStatementSubtitle}>
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
          <HrButton type="button" onClick={onDownload} disabled={downloading} >
            {downloading ? 'Generating…' : 'Download PDF statement'}
          </HrButton>
        </div>
        {downloadError ? <ProfileInlineAlert variant="error">{downloadError}</ProfileInlineAlert> : null}
      </ProfileOverviewSection>

      <ProfileOverviewSection title={DOMESTIC_BENEFITS.paymentsTitle} subtitle={DOMESTIC_BENEFITS.paymentsSubtitle}>
        <ScholarshipPaymentsPanel
          payments={payments}
          emptyTitle={DOMESTIC_BENEFITS.paymentsEmpty}
          emptyHint={DOMESTIC_BENEFITS.paymentsEmptyHint}
          hubTitle={DOMESTIC_BENEFITS.hubTitle}
          hubPath={HR_SELF_SERVICE_PATH.home}
        />
      </ProfileOverviewSection>
    </ProfilePageBody>
  );
}
