import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../lib/hrFormat';
import { formatPeriodYyyymm } from '../../lib/hrPayroll';
import {
  FAMILY_BENEFITS,
  formatTermCountdown,
  paymentHealthMeta,
  PAYMENT_KIND_ICON,
} from '../../lib/scholarshipUi';
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
import { ScholarshipTermCalendar } from './ScholarshipTermCalendar';
import { HR_SELF_SERVICE_PATH } from '../../lib/hrSelfServiceRoutes';
import { downloadScholarshipStatementPdf } from '../../lib/hrScholarship';

function NextUpCard({ item }) {
  const icon = PAYMENT_KIND_ICON[item.kind] || '💰';
  const kindLabel = item.kind === 'stipend' ? FAMILY_BENEFITS.stipendLabel : FAMILY_BENEFITS.schoolFeesLabel;
  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm ring-1 ring-violet-50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-violet-600">
            <span aria-hidden>{icon}</span>
            {kindLabel}
          </p>
          <p className="mt-1 text-base font-black text-slate-900">{item.label}</p>
          {item.dueDateIso ? (
            <p className="mt-1 text-xs text-slate-500">Due {String(item.dueDateIso).slice(0, 10)}</p>
          ) : item.periodYyyymm ? (
            <p className="mt-1 text-xs text-slate-500">{formatPeriodYyyymm(item.periodYyyymm)}</p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-xl font-black tabular-nums text-slate-900">
            {item.amountNgn != null ? formatNgn(item.amountNgn) : '—'}
          </p>
          <p className="mt-1 text-xs font-semibold text-violet-700">{item.statusLabel}</p>
        </div>
      </div>
      {item.tracker && item.status !== 'paid' ? (
        <div className="mt-3 border-t border-violet-50 pt-3">
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
      title={FAMILY_BENEFITS.checklistTitle}
      subtitle={`${checklistPct}% complete — ${FAMILY_BENEFITS.checklistSubtitle.toLowerCase()}`}
      className="border-violet-100 bg-violet-50/40"
    >
      <ul className="space-y-2">
        {checklist.map((item) => (
          <li key={item.id}>
            <Link
              to={item.path}
              className="flex min-h-10 items-center justify-between gap-2 rounded-xl border border-violet-100 bg-white px-3 py-2 text-sm no-underline transition hover:border-violet-200"
            >
              <span className={item.done ? 'text-slate-700' : 'font-semibold text-slate-900'}>
                {item.done ? '✓' : '○'} {item.label}
              </span>
              {!item.done && item.hint ? <span className="text-[11px] text-slate-500">{item.hint}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </ProfileOverviewSection>
  );
}

/** Executive family beneficiary home — school fees and monthly allowance. */
export default function ScholarshipSchoolProfile() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { ok, data } = await apiFetch('/api/hr/me/scholarship-summary');
      if (cancelled) return;
      if (!ok || !data?.ok) {
        setError(data?.error || 'Could not load your benefits profile.');
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
        <ProfileMetricSkeleton count={4} />
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
    termDaysRemaining,
    termEndingSoon,
    beneficiaryLinked,
    reminders = [],
    termCalendar = [],
  } = summary;
  const health = paymentHealthMeta(paymentHealth);
  const termNote = formatTermCountdown(termDaysRemaining);
  const recentPayments = payments.slice(0, 3);
  const parentLine =
    profile.familyParentLine ||
    (profile.linkedExecutiveLabel ? `Beneficiary of ${profile.linkedExecutiveLabel}` : null);

  return (
    <ProfilePageBody>
      <ProfilePageIntro title={FAMILY_BENEFITS.hubTitle} description={FAMILY_BENEFITS.hubSubtitle} />

      <div className="relative overflow-hidden rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-700 via-violet-800 to-indigo-950 p-5 text-white shadow-xl shadow-violet-900/20 sm:p-6">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_55%)]"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-violet-200/90">
              {FAMILY_BENEFITS.hubEyebrow}
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{profile.displayName}</h2>
            {parentLine ? (
              <p className="mt-1 inline-flex rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-violet-100">
                {parentLine}
                {profile.beneficiaryTypeLabel ? ` · ${profile.beneficiaryTypeLabel}` : ''}
              </p>
            ) : null}
            <p className="mt-3 text-sm font-medium text-violet-100">
              {profile.schoolName || 'School not set'}
              {profile.classLevel ? ` · ${profile.classLevel}` : ''}
            </p>
            {profile.currentTerm || profile.academicSession ? (
              <p className="mt-1 text-xs text-violet-200/90">
                {[profile.currentTerm, profile.academicSession].filter(Boolean).join(' · ')}
              </p>
            ) : null}
          </div>
          <span className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold ${health.className}`}>
            {health.label}
          </span>
        </div>

        <p className="relative mt-4 max-w-2xl rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-sm leading-relaxed text-violet-50/95">
          {FAMILY_BENEFITS.hubExplainer}
        </p>

        {termNote ? (
          <p
            className={`relative mt-3 rounded-xl px-3 py-2 text-sm font-semibold ${
              termEndingSoon ? 'bg-amber-400/20 text-amber-50' : 'bg-white/10 text-violet-50'
            }`}
          >
            {termNote}
          </p>
        ) : null}
        {!beneficiaryLinked ? (
          <p className="relative mt-3 rounded-xl border border-amber-300/30 bg-amber-400/15 px-3 py-2 text-xs text-amber-50">
            Your Executive benefits record is not fully linked yet — payments may take longer to appear. Contact the
            office to complete setup.
          </p>
        ) : null}
      </div>

      <ScholarshipRemindersPanel reminders={reminders} />

      {nextUp.length ? (
        <ProfileOverviewSection
          title="Coming up"
          subtitle="Next school fee payment and monthly allowance"
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

      <ProfileOverviewSection
        title="Your calendar"
        subtitle="Term dates, school fees, and allowance payments"
        className="border-violet-100"
      >
        <ScholarshipTermCalendar events={termCalendar} />
      </ProfileOverviewSection>

      <ProfileOverviewSection title="At a glance" subtitle="Amounts for this session">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard
            label={FAMILY_BENEFITS.schoolFeesLabel}
            value={profile.schoolFeesNgn != null ? formatNgn(profile.schoolFeesNgn) : '—'}
            hint={profile.feeCadence === 'yearly' ? 'Per year' : 'Per term · paid to school'}
          />
          <InfoCard
            label={FAMILY_BENEFITS.stipendLabel}
            value={profile.stipend?.monthlyAmountNgn != null ? formatNgn(profile.stipend.monthlyAmountNgn) : '—'}
            hint={
              profile.salaryStep != null
                ? `Step ${profile.salaryStep} · ${FAMILY_BENEFITS.stipendHint}`
                : FAMILY_BENEFITS.stipendHint
            }
          />
          <InfoCard label="Academic session" value={profile.academicSession || '—'} />
          <InfoCard
            label="Last allowance paid"
            value={profile.stipend?.lastPaidPeriod ? formatPeriodYyyymm(profile.stipend.lastPaidPeriod) : '—'}
          />
        </div>
      </ProfileOverviewSection>

      <ChecklistCard checklist={checklist} checklistPct={checklistPct} />

      {recentPayments.length ? (
        <ProfileOverviewSection
          title="Recent activity"
          subtitle={FAMILY_BENEFITS.paymentsSubtitle}
          actionTo={HR_SELF_SERVICE_PATH.payments}
          actionLabel="View all"
        >
          <ul className="divide-y divide-slate-100">
            {recentPayments.map((pmt) => (
              <li key={pmt.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{pmt.label}</p>
                  <p className="text-[11px] text-slate-500">{pmt.statusLabel}</p>
                </div>
                <p className="text-sm font-bold tabular-nums text-slate-900">{formatNgn(pmt.amountNgn)}</p>
              </li>
            ))}
          </ul>
        </ProfileOverviewSection>
      ) : null}

      <ProfileOverviewSection title="Quick actions" subtitle="Requests, documents, and your statement">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <QuickLink to={HR_SELF_SERVICE_PATH.requests} label="Submit request" />
          <QuickLink to={HR_SELF_SERVICE_PATH.payments} label="Payment history" />
          <QuickLink to={HR_SELF_SERVICE_PATH.documents} label="Documents" />
          <QuickLink to={HR_SELF_SERVICE_PATH.policies} label="Policies" />
          <button
            type="button"
            disabled={pdfBusy}
            onClick={async () => {
              setPdfBusy(true);
              await downloadScholarshipStatementPdf({
                academicSession: profile?.academicSession || undefined,
              });
              setPdfBusy(false);
            }}
            className="flex min-h-11 items-center justify-center rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm font-semibold text-violet-900 transition hover:bg-violet-50 disabled:opacity-60"
          >
            {pdfBusy ? 'Preparing…' : FAMILY_BENEFITS.pdfStatement}
          </button>
        </div>
      </ProfileOverviewSection>

      {summary.pendingRequests?.length ? (
        <ProfileOverviewSection
          title="Awaiting review"
          subtitle="Requests submitted to the office"
          actionTo={HR_SELF_SERVICE_PATH.requests}
          actionLabel="View all requests"
          className="border-amber-100 bg-amber-50/50"
        >
          <ul className="space-y-2">
            {summary.pendingRequests.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-amber-950">{r.title || r.kind}</span>
                <span className="text-xs font-semibold capitalize text-amber-800">
                  {String(r.status || '').replace(/_/g, ' ')}
                </span>
              </li>
            ))}
          </ul>
        </ProfileOverviewSection>
      ) : null}

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
      className="flex min-h-11 items-center justify-center rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-3 text-sm font-semibold text-violet-900 no-underline transition hover:border-violet-200 hover:bg-violet-100/60"
    >
      {label} →
    </Link>
  );
}
