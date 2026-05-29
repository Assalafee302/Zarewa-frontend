import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { HrNotificationsPanel } from '../../components/hr/HrNotificationsPanel';
import { HrStaffLifecyclePanel } from '../../components/hr/HrStaffLifecyclePanel';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrSensitiveGate } from '../../components/hr/HrSensitiveGate';
import { useHrSensitiveAccess } from '../../hooks/useHrSensitiveAccess';
import { canViewOrgSensitiveHr } from '../../lib/hrAccess';

export default function MyProfileOverview() {
  const ws = useWorkspace();
  const sensitive = useHrSensitiveAccess();
  const perms = ws?.permissions || [];
  const showSensitiveInline = canViewOrgSensitiveHr(perms);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!profile) setLoading(true);
      const fetcher = showSensitiveInline || sensitive.isUnlocked ? sensitive.fetchWithSensitive : apiFetch;
      const { ok, data } = await fetcher('/api/hr/me');
      if (cancelled) return;
      if (!ok || !data?.ok) {
        setError(data?.error || 'Could not load your HR profile.');
        setProfile(null);
      } else {
        setProfile(data);
        setError('');
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [sensitive.isUnlocked, showSensitiveInline, sensitive.fetchWithSensitive]);

  if (loading && !profile) return <p className="text-sm text-slate-600">Loading your profile…</p>;
  if (error) {
    return <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>;
  }

  const hr = profile?.hr;
  const user = profile?.user;
  const userId = user?.id || ws?.session?.userId;
  const onboarding = profile?.onboardingChecklist;
  const lifecycleOnboarding = profile?.lifecycle?.onboarding;

  const body = (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
      <div>
        <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Display name</dt>
        <dd className="mt-1 font-semibold text-slate-900">{user?.displayName || '—'}</dd>
      </div>
      <div>
        <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Employee no.</dt>
        <dd className="mt-1 font-semibold text-slate-900">{hr?.employeeNo || '—'}</dd>
      </div>
      <div>
        <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Job title</dt>
        <dd className="mt-1 font-semibold text-slate-900">{hr?.jobTitle || '—'}</dd>
      </div>
      <div>
        <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Branch</dt>
        <dd className="mt-1 font-semibold text-slate-900">{hr?.branchId || '—'}</dd>
      </div>
      <div>
        <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Department</dt>
        <dd className="mt-1 font-semibold text-slate-900">{hr?.department || '—'}</dd>
      </div>
      <div>
        <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date joined</dt>
        <dd className="mt-1 font-semibold text-slate-900">{hr?.dateJoinedIso || '—'}</dd>
      </div>
      {hr?.compensationRedacted ? (
        <div className="sm:col-span-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Compensation figures are hidden until you unlock this section.
        </div>
      ) : (
        <>
          <div>
            <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Base salary (monthly)</dt>
            <dd className="mt-1 font-semibold text-slate-900 tabular-nums">
              {hr?.baseSalaryNgn != null ? `₦${Number(hr.baseSalaryNgn).toLocaleString('en-NG')}` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bank</dt>
            <dd className="mt-1 font-semibold text-slate-900">
              {hr?.bankName || '—'}
              {hr?.bankAccountNoMasked ? ` · ${hr.bankAccountNoMasked}` : ''}
            </dd>
          </div>
        </>
      )}
    </dl>
  );

  return (
    <div className="space-y-6">
      <HrNotificationsPanel />
      {onboarding && !onboarding.complete ? (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Onboarding file incomplete</p>
          <p className="mt-1 text-xs">
            Missing: {(onboarding.missingLabels || []).slice(0, 4).join(' · ')}
            {(onboarding.missingLabels || []).length > 4 ? '…' : ''}
          </p>
          <Link to="/my-profile/documents" className="mt-2 inline-block text-[10px] font-bold uppercase text-[#134e4a]">
            Upload documents
          </Link>
        </div>
      ) : null}
      {lifecycleOnboarding && !lifecycleOnboarding.complete ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Onboarding tasks</p>
          <p className="mt-1 text-sm text-slate-700">
            {lifecycleOnboarding.pendingCount} task{lifecycleOnboarding.pendingCount === 1 ? '' : 's'} remaining — you
            can confirm HR policy acknowledgement below.
          </p>
        </div>
      ) : null}
      {userId ? (
        <HrStaffLifecyclePanel userId={userId} isSelf initialLifecycle={profile?.lifecycle} />
      ) : null}
      {showSensitiveInline ? body : <HrSensitiveGate label="View your compensation and bank details">{body}</HrSensitiveGate>}
    </div>
  );
}
