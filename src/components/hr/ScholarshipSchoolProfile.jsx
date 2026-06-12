import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../lib/hrFormat';
import { formatPeriodYyyymm } from '../../lib/hrPayroll';

function InfoCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-900">{value || '—'}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

/** School-style profile for scholarship beneficiaries (chairman children / school fees). */
export default function ScholarshipSchoolProfile() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { ok, data } = await apiFetch('/api/hr/me/school-profile');
      if (cancelled) return;
      if (!ok || !data?.ok) {
        setError(data?.error || 'Could not load your school profile.');
        setProfile(null);
      } else {
        setProfile(data.profile);
        setError('');
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p className="text-sm text-slate-600">Loading school profile…</p>;
  if (error) {
    return <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>;
  }
  if (!profile) return null;

  const feeLabel = profile.feeCadence === 'yearly' ? 'Yearly school fees' : 'Term school fees';

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-600">Scholarship profile</p>
        <h2 className="mt-1 text-xl font-black text-slate-900">{profile.displayName}</h2>
        <p className="text-sm text-slate-600">{profile.schoolName || 'School not set'}</p>
        {profile.classLevel ? (
          <p className="mt-1 text-xs text-slate-500">Class / level: {profile.classLevel}</p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard label="School fees" value={profile.schoolFeesNgn != null ? formatNgn(profile.schoolFeesNgn) : '—'} hint={feeLabel} />
        <InfoCard
          label="Fee schedule"
          value={profile.feeCadence === 'yearly' ? 'Yearly' : 'Termly'}
          hint={profile.currentTerm ? `Current: ${profile.currentTerm}` : undefined}
        />
        <InfoCard
          label="Academic session"
          value={profile.academicSession || '—'}
          hint={
            profile.termStartIso && profile.termEndIso
              ? `Term ${profile.termStartIso} → ${profile.termEndIso}`
              : undefined
          }
        />
        <InfoCard
          label="Stipend step"
          value={profile.salaryStep != null ? `Step ${profile.salaryStep}` : '—'}
          hint={profile.stipend ? `${formatNgn(profile.stipend.monthlyAmountNgn)} / ${profile.stipend.paymentFrequency}` : 'Monthly support'}
        />
        <InfoCard
          label="Next payment"
          value={profile.nextPayment?.amountNgn != null ? formatNgn(profile.nextPayment.amountNgn) : '—'}
          hint={
            profile.nextPayment?.dueDateIso
              ? `Due ${profile.nextPayment.dueDateIso} · ${profile.nextPayment.status}`
              : profile.nextPayment?.status
          }
        />
        <InfoCard
          label="Last stipend period"
          value={
            profile.stipend?.lastPaidPeriod
              ? formatPeriodYyyymm(profile.stipend.lastPaidPeriod)
              : '—'
          }
        />
      </div>

      {profile.recentFeePayments?.length ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-black text-slate-900">Recent school fee payments</h3>
          <ul className="mt-3 divide-y divide-slate-100">
            {profile.recentFeePayments.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {f.term || 'Fees'} {f.academicSession ? `· ${f.academicSession}` : ''}
                  </p>
                  <p className="text-[11px] text-slate-500 capitalize">{String(f.status || '').replace(/_/g, ' ')}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-bold tabular-nums">{formatNgn(f.amountNgn)}</p>
                  {f.amountPaidNgn > 0 ? (
                    <p className="text-[11px] text-emerald-700">Paid {formatNgn(f.amountPaidNgn)}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {profile.notes ? (
        <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">{profile.notes}</p>
      ) : null}
    </div>
  );
}
