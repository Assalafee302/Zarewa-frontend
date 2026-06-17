import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Shield, User } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useUserProfile } from '../../context/UserProfileContext';
import { apiFetch } from '../../lib/apiBase';
import ProfileSecurityPanel from './ProfileSecurityPanel';
import { MyAccessExplainer } from './MyAccessExplainer';
import { AccountSettingsHero } from './AccountSettingsHero';
import { ProfileFormActions, ProfileFormField, ProfileFormSection, ProfilePageAnchors } from './profileFormUi';
import { ProfileModuleSection } from './profileDesign';
import { composeLegalDisplayName } from '../../lib/hrLegalDisplayName';
import { HR_SELF_SERVICE_PATH } from '../../lib/hrSelfServiceRoutes';

const ACCOUNT_ANCHORS = [
  { id: 'profile-details', label: 'Profile' },
  { id: 'security', label: 'Password' },
  { id: 'your-access', label: 'Access' },
];

function AvatarPreview({ url, displayName }) {
  const valid = url && (url.startsWith('https://') || url.startsWith('data:image/'));
  const initials = (displayName || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return valid ? (
    <img src={url} alt="" className="h-14 w-14 rounded-xl border border-slate-200 object-cover shadow-sm sm:h-16 sm:w-16 sm:rounded-2xl" />
  ) : (
    <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 bg-[#134e4a] text-base font-black text-white shadow-sm sm:h-16 sm:w-16 sm:rounded-2xl sm:text-lg">
      {initials}
    </div>
  );
}

export default function ProfileAccountPage() {
  const { show: showToast } = useToast();
  const ws = useWorkspace();
  const { user: hrUser, cohort, hr } = useUserProfile();

  const sessionUser = ws?.session?.user;
  const user = hrUser || sessionUser;
  const canMutate = ws?.canMutate !== false;

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [usernameRequest, setUsernameRequest] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [requestBusy, setRequestBusy] = useState(false);
  const formDirtyRef = useRef(false);

  const legalName = useMemo(() => {
    const personal = hr?.profileExtra?.personal || {};
    const composed = composeLegalDisplayName(personal);
    return composed || user?.displayName || '—';
  }, [hr?.profileExtra?.personal, user?.displayName]);

  const hasHrRecord = Boolean(hr);
  const canChangeUsernameFreely = user?.canChangeUsernameFreely !== false && (user?.usernameChangeCount || 0) < 1;
  const anchors = canChangeUsernameFreely
    ? ACCOUNT_ANCHORS
    : [...ACCOUNT_ANCHORS.slice(0, 1), { id: 'username-request', label: 'Username' }, ...ACCOUNT_ANCHORS.slice(1)];

  useEffect(() => {
    if (formDirtyRef.current) return;
    setEmail(user?.email ?? '');
    setUsername(user?.username ?? '');
    setAvatarUrl(user?.avatarUrl ?? '');
  }, [user?.id, user?.email, user?.username, user?.avatarUrl]);

  const submitProfile = async (e) => {
    e.preventDefault();
    if (!canMutate) {
      showToast('Reconnect to the server before saving.', { variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      const body = {
        email: email.trim() ? email.trim().toLowerCase() : null,
        avatarUrl: avatarUrl.trim() || null,
      };
      if (canChangeUsernameFreely && username.trim().toLowerCase() !== String(user?.username || '').toLowerCase()) {
        body.username = username.trim().toLowerCase();
      }
      const r = await ws?.updateProfile?.(body);
      if (!r?.ok) {
        if (r?.code === 'USERNAME_HR_REQUIRED') {
          showToast('Use the HR request form below to change username again.', { variant: 'error' });
        } else {
          showToast(r?.error || 'Could not save profile.', { variant: 'error' });
        }
        return;
      }
      showToast('Profile saved.');
      formDirtyRef.current = false;
    } finally {
      setSaving(false);
    }
  };

  const submitUsernameRequest = async (e) => {
    e.preventDefault();
    const next = usernameRequest.trim().toLowerCase();
    if (!next || next.length < 3) {
      showToast('Enter a valid username.', { variant: 'error' });
      return;
    }
    setRequestBusy(true);
    const { ok, data } = await apiFetch('/api/hr/requests', {
      method: 'POST',
      body: JSON.stringify({
        kind: 'profile_change',
        title: `Username change to @${next}`,
        body: `Request to change login username from @${user?.username} to @${next}.`,
        payload: { field: 'username', requestedValue: next, currentValue: user?.username },
      }),
    });
    if (!ok || !data?.ok) {
      setRequestBusy(false);
      showToast(data?.error || 'Could not submit request.', { variant: 'error' });
      return;
    }
    const id = data.request?.id;
    const submitted = await apiFetch(`/api/hr/requests/${encodeURIComponent(id)}/submit`, { method: 'PATCH' });
    setRequestBusy(false);
    if (!submitted.ok || !submitted.data?.ok) {
      showToast(submitted.data?.error || 'Request saved but submit failed. Check My requests to submit the draft.', {
        variant: 'error',
      });
      return;
    }
    showToast('Username change submitted for HR approval.');
    setUsernameRequest('');
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <AccountSettingsHero />

      <ProfilePageAnchors items={anchors} />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
        <ProfileFormSection
          id="profile-details"
          flat
          icon={<User size={16} />}
          title="Profile & login"
          subtitle="How you appear in Zarewa. Official employment data is maintained by HR."
        >
          <form className="space-y-4" onSubmit={submitProfile}>
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 sm:gap-4 sm:p-4">
              <AvatarPreview url={avatarUrl} displayName={legalName} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900">{legalName}</p>
                <p className="text-xs text-slate-500">@{username || user?.username || '—'}</p>
              </div>
            </div>

            <ProfileFormField
              label="Full legal name"
              hint={
                hasHrRecord
                  ? 'Set from first, middle, and surname under HR services → Employment.'
                  : 'Your display name on the system.'
              }
            >
              <div className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800">
                <Lock size={14} className="shrink-0 text-slate-400" aria-hidden />
                <span className="min-w-0 truncate">{legalName}</span>
              </div>
              {hasHrRecord ? (
                <p className="mt-2 text-xs">
                  <Link
                    to={`${HR_SELF_SERVICE_PATH.employment}?form=1`}
                    className="font-semibold text-[#134e4a] hover:underline"
                  >
                    Update name in Employment record
                  </Link>
                  {hr?.profileLocked ? ' via HR request' : ''}
                </p>
              ) : null}
            </ProfileFormField>

            <ProfileFormField
              label="App profile photo URL"
              htmlFor="profile-avatar-url"
              hint="Optional. Shown in chat and approvals — not your HR ID photo."
            >
              <input
                id="profile-avatar-url"
                className="z-input"
                value={avatarUrl}
                onChange={(e) => {
                  formDirtyRef.current = true;
                  setAvatarUrl(e.target.value);
                }}
                placeholder="https://…"
                disabled={!canMutate}
              />
            </ProfileFormField>

            <ProfileFormField label="Username (login)" htmlFor="profile-username">
              {canChangeUsernameFreely ? (
                <>
                  <input
                    id="profile-username"
                    className="z-input font-mono"
                    value={username}
                    onChange={(e) => {
                      formDirtyRef.current = true;
                      setUsername(e.target.value.toLowerCase());
                    }}
                    pattern="[a-z0-9._-]{3,40}"
                    disabled={!canMutate}
                    autoComplete="username"
                  />
                  <p className="mt-1.5 rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-900">
                    You may change your username once freely. Further changes require HR approval.
                  </p>
                </>
              ) : (
                <>
                  <p className="flex min-h-11 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-sm">
                    @{user?.username}
                  </p>
                  <p className="mt-1.5 text-[11px] text-slate-500">Request HR to change it again below.</p>
                </>
              )}
            </ProfileFormField>

            <ProfileFormField label="Email (optional)" htmlFor="profile-email">
              <input
                id="profile-email"
                type="email"
                className="z-input"
                value={email}
                onChange={(e) => {
                  formDirtyRef.current = true;
                  setEmail(e.target.value);
                }}
                disabled={!canMutate}
                autoComplete="email"
                inputMode="email"
              />
            </ProfileFormField>

            <ProfileFormActions>
              <button type="submit" className="z-btn-primary min-h-11 w-full sm:w-auto" disabled={saving || !canMutate}>
                {saving ? 'Saving…' : 'Save profile'}
              </button>
            </ProfileFormActions>
          </form>
        </ProfileFormSection>

        <div className="space-y-6">
          <div id="security">
            <ProfileSecurityPanel flat />
          </div>

          {!canChangeUsernameFreely ? (
            <ProfileFormSection
              id="username-request"
              flat
              icon={<User size={16} />}
              title="Request username change"
              subtitle="HR will review and apply approved username changes."
            >
              <form className="space-y-3" onSubmit={submitUsernameRequest}>
                <ProfileFormField label="New username" htmlFor="username-request-input">
                  <input
                    id="username-request-input"
                    className="z-input font-mono"
                    placeholder="new.username"
                    value={usernameRequest}
                    onChange={(e) => setUsernameRequest(e.target.value.toLowerCase())}
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                  />
                </ProfileFormField>
                <ProfileFormActions>
                  <button type="submit" className="z-btn-primary min-h-11 w-full sm:w-auto" disabled={requestBusy}>
                    {requestBusy ? 'Submitting…' : 'Submit to HR'}
                  </button>
                </ProfileFormActions>
              </form>
            </ProfileFormSection>
          ) : null}
        </div>
      </div>

      <ProfileModuleSection
        id="your-access"
        title="Your access"
        subtitle="Roles and permissions are assigned by HR and administrators."
        flush
      >
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Current role</p>
              <p className="mt-0.5 text-sm font-black text-[#134e4a]">{user?.roleLabel || '—'}</p>
            </div>
            <Shield size={20} className="shrink-0 text-slate-300" aria-hidden />
          </div>
          {cohort !== 'account_only' ? (
            <p className="mt-4 text-xs leading-relaxed text-slate-600">
              Complete your{' '}
              <Link to={HR_SELF_SERVICE_PATH.documents} className="font-semibold text-[#134e4a] hover:underline">
                documents
              </Link>{' '}
              and{' '}
              <Link to={HR_SELF_SERVICE_PATH.policies} className="font-semibold text-[#134e4a] hover:underline">
                policies
              </Link>{' '}
              in HR services so HR can verify and activate full access.
            </p>
          ) : null}
        </div>
      </ProfileModuleSection>

      <MyAccessExplainer />
    </div>
  );
}
