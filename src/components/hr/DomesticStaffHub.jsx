import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../lib/hrFormat';
import { formatPeriodYyyymm } from '../../lib/hrPayroll';
import { DOMESTIC_BENEFITS } from '../../lib/domesticStaffUi';
import { PAYMENT_KIND_ICON, paymentHealthMeta } from '../../lib/scholarshipUi';
import { ProfilePageBody, ProfilePageIntro } from '../profile/profilePageUi';
import {
  ProfileHeroSkeleton,
  ProfileInlineAlert,
  ProfileMetricSkeleton,
  ProfileOverviewSection,
} from '../profile/profileOverviewUi';
import { ProfileKpiCard } from '../profile/profileDesign';
import { ScholarshipPaymentTracker } from './ScholarshipPaymentTracker';
import { ScholarshipRemindersPanel } from './ScholarshipRemindersPanel';
import { HR_SELF_SERVICE_PATH } from '../../lib/hrSelfServiceRoutes';
import { downloadDomesticStatementPdf } from '../../lib/hrDomestic';

function NextUpCard({ item }) {
  const icon = PAYMENT_KIND_ICON[item.kind] || PAYMENT_KIND_ICON.salary || '💰';
  return (
    <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm ring-1 ring-amber-50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-ui-xs font-black uppercase tracking-widest text-amber-700">
            <span aria-hidden>{icon}</span>
            {DOMESTIC_BENEFITS.salaryLabel}
          </p>
          <p className="mt-1 text-base font-black text-slate-900">{item.label}</p>
          {item.periodYyyymm ? (
            <p className="mt-1 text-xs text-slate-500">{formatPeriodYyyymm(item.periodYyyymm)}</p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-xl font-black tabular-nums text-slate-900">
            {item.amountNgn != null ? formatNgn(item.amountNgn) : '—'}
          </p>
          <p className="mt-1 text-xs font-semibold text-amber-800">{item.statusLabel}</p>
        </div>
      </div>
      {item.tracker && item.status !== 'paid' ? (
        <div className="mt-3 border-t border-amber-50 pt-3">
          <ScholarshipPaymentTracker tracker={item.tracker} compact />
        </div>
      ) : null}
    </div>
  );
}

function ChecklistCard({ checklist, checklistPct }) {
  if (!checklist?.length) return null;
  return (
    <ProfileOverviewSection
      title={DOMESTIC_BENEFITS.checklistTitle}
      subtitle={`${checklistPct}% complete — ${DOMESTIC_BENEFITS.checklistSubtitle.toLowerCase()}`}
      className="border-amber-100 bg-amber-50/40"
    >
      <ul className="space-y-2">
        {checklist.map((item) => (
          <li key={item.id}>
            <Link
              to={item.path}
              className="flex min-h-10 items-center justify-between gap-2 rounded-xl border border-amber-100 bg-white px-3 py-2 text-sm no-underline transition hover:border-amber-200"
            >
              <span className={item.done ? 'text-slate-700' : 'font-semibold text-slate-900'}>
                {item.done ? '✓' : '○'} {item.label}
              </span>
              {!item.done && item.hint ? <span className="text-xs text-slate-500">{item.hint}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </ProfileOverviewSection>
  );
}

/** Executive household staff home — monthly salary via Executive benefits. */
export default function DomesticStaffHub() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { ok, data } = await apiFetch('/api/hr/me/domestic-summary');
      if (cancelled) return;
      if (!ok || !data?.ok) {
        setError(data?.error || 'Could not load your pay profile.');
        setSummary(null);
      } else {
        setSummary(data);
        setError('');
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <ProfilePageBody>
        <ProfileHeroSkeleton />
        <ProfileMetricSkeleton count={3} />
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
  if (!summary?.profile) return null;

  const {
    profile,
    nextUp = [],
    payments = [],
    checklist = [],
    checklistPct = 0,
    paymentHealth,
    benefitsLinked,
    reminders = [],
  } = summary;
  const health = paymentHealthMeta(paymentHealth);
  const recentPayments = payments.slice(0, 3);
  const employerLine = profile.executiveEmployerLine;

  return (
    <ProfilePageBody>
      <ProfilePageIntro title={DOMESTIC_BENEFITS.hubTitle} description={DOMESTIC_BENEFITS.hubSubtitle} />

      <div className="relative overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-700 via-amber-800 to-orange-950 p-5 text-white shadow-xl shadow-amber-900/20 sm:p-6">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_55%)]"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-ui-xs font-bold uppercase tracking-[0.22em] text-amber-200/90">
              {DOMESTIC_BENEFITS.hubEyebrow}
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{profile.displayName}</h2>
            {employerLine ? (
              <p className="mt-1 inline-flex rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-amber-100">
                {employerLine}
              </p>
            ) : null}
            <p className="mt-3 text-sm font-medium text-amber-100">
              {profile.designation || 'Role not set'}
              {profile.workLocation ? ` · ${profile.workLocation}` : ''}
            </p>
          </div>
          <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${health.className}`}>
            {health.label}
          </span>
        </div>

        <p className="relative mt-4 max-w-2xl rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-sm leading-relaxed text-amber-50/95">
          {DOMESTIC_BENEFITS.hubExplainer}
        </p>

        {!benefitsLinked ? (
          <p className="relative mt-3 rounded-xl border border-amber-300/30 bg-amber-400/15 px-3 py-2 text-xs text-amber-50">
            Your Executive benefits record is not fully linked yet — salary payments may take longer to appear. Contact
            the office to complete setup.
          </p>
        ) : null}
      </div>

      <ScholarshipRemindersPanel reminders={reminders} />

      {nextUp.length ? (
        <ProfileOverviewSection
          title="Coming up"
          subtitle="Your next monthly salary payment"
          actionTo={HR_SELF_SERVICE_PATH.payments}
          actionLabel="All payments"
        >
          <div className="grid gap-3 lg:grid-cols-2">
            {nextUp.map((item, i) => (
              <NextUpCard key={`${item.kind}-${i}`} item={item} />
            ))}
          </div>
        </ProfileOverviewSection>
      ) : null}

      <ProfileOverviewSection title="At a glance" subtitle="Your employment and pay">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <InfoCard
            label={DOMESTIC_BENEFITS.salaryLabel}
            value={profile.monthlySalaryNgn != null ? formatNgn(profile.monthlySalaryNgn) : '—'}
            hint={DOMESTIC_BENEFITS.salaryHint}
          />
          <InfoCard
            label="Last salary paid"
            value={profile.lastPaidPeriod ? formatPeriodYyyymm(profile.lastPaidPeriod) : '—'}
          />
          <InfoCard label="Date joined" value={profile.dateJoinedIso || '—'} />
        </div>
      </ProfileOverviewSection>

      <ChecklistCard checklist={checklist} checklistPct={checklistPct} />

      {recentPayments.length ? (
        <ProfileOverviewSection
          title="Recent activity"
          subtitle={DOMESTIC_BENEFITS.paymentsSubtitle}
          actionTo={HR_SELF_SERVICE_PATH.payments}
          actionLabel="View all"
        >
          <ul className="divide-y divide-slate-100">
            {recentPayments.map((pmt) => (
              <li key={pmt.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{pmt.label}</p>
                  <p className="text-xs text-slate-500">{pmt.statusLabel}</p>
                </div>
                <p className="text-sm font-bold tabular-nums text-slate-900">{formatNgn(pmt.amountNgn)}</p>
              </li>
            ))}
          </ul>
        </ProfileOverviewSection>
      ) : null}

      <ProfileOverviewSection title="Quick actions" subtitle="Payments, documents, and your statement">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLink to={HR_SELF_SERVICE_PATH.payments} label="Payment history" />
          <QuickLink to={HR_SELF_SERVICE_PATH.documents} label="Documents" />
          <QuickLink to={HR_SELF_SERVICE_PATH.policies} label="Policies" />
          <button
            type="button"
            disabled={pdfBusy}
            onClick={async () => {
              setPdfBusy(true);
              await downloadDomesticStatementPdf();
              setPdfBusy(false);
            }}
            className="flex min-h-11 items-center justify-center rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-amber-900 transition hover:bg-amber-50 disabled:opacity-60"
          >
            {pdfBusy ? 'Preparing…' : DOMESTIC_BENEFITS.pdfStatement}
          </button>
        </div>
      </ProfileOverviewSection>

      {profile.notes ? <ProfileInlineAlert variant="info">{profile.notes}</ProfileInlineAlert> : null}
    </ProfilePageBody>
  );
}

function InfoCard({ label, value, hint }) {
  return (
    <ProfileKpiCard label={label} hint={hint}>
      <p className="text-xl font-black tabular-nums tracking-tight text-slate-900">{value || '—'}</p>
    </ProfileKpiCard>
  );
}

function QuickLink({ to, label }) {
  return (
    <Link
      to={to}
      className="flex min-h-11 items-center justify-center rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-3 text-sm font-semibold text-amber-900 no-underline transition hover:border-amber-200 hover:bg-amber-100/60"
    >
      {label} →
    </Link>
  );
}
