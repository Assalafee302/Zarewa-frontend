import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Shield, User } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useUserProfile } from '../../context/UserProfileContext';
import { apiFetch } from '../../lib/apiBase';
import ProfileSecurityPanel from './ProfileSecurityPanel';
import { MyAccessExplainer } from './MyAccessExplainer';
import { ProfileCompletionPanel } from './ProfileCompletionPanel';
import { ProfileFormActions, ProfileFormField, ProfileFormSection, ProfilePageAnchors } from './profileFormUi';
import { HR_SELF_SERVICE_PATH, hrSelfServicePathForTab } from '../../lib/hrSelfServiceRoutes';

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
    <img src={url} alt="" className="h-16 w-16 rounded-2xl border-2 border-slate-200 object-cover shadow-sm" />
  ) : (
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-slate-200 bg-[#134e4a] text-lg font-black text-white shadow-sm">
      {initials}
    </div>
  );
}

export default function ProfileAccountPage() {
  const { show: showToast } = useToast();
  const ws = useWorkspace();
  const { me, user: hrUser, hasHrSelfService, reload, completeness, cohort } = useUserProfile();
  const navigate = useNavigate();

  const sessionUser = ws?.session?.user;
  const user = hrUser || sessionUser;
  const canMutate = ws?.canMutate !== false;

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [usernameRequest, setUsernameRequest] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [requestBusy, setRequestBusy] = useState(false);
  const formDirtyRef = useRef(false);

  const canChangeUsernameFreely = user?.canChangeUsernameFreely !== false && (user?.usernameChangeCount || 0) < 1;
  const anchors = canChangeUsernameFreely
    ? ACCOUNT_ANCHORS
    : [...ACCOUNT_ANCHORS.slice(0, 1), { id: 'username-request', label: 'Username' }, ...ACCOUNT_ANCHORS.slice(1)];

  useEffect(() => {
    if (formDirtyRef.current) return;
    setDisplayName(user?.displayName ?? '');
    setEmail(user?.email ?? '');
    setUsername(user?.username ?? '');
    setAvatarUrl(user?.avatarUrl ?? '');
  }, [user?.id, user?.displayName, user?.email, user?.username, user?.avatarUrl]);

  const submitProfile = async (e) => {
    e.preventDefault();
    if (!canMutate) {
      showToast('Reconnect to the server before saving.', { variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      const body = {
        displayName: displayName.trim(),
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
      await reload?.();
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
      showToast(submitted.data?.error || 'Request saved but submit failed. Check My requests to submit the draft.', { variant: 'error' });
      return;
    }
    showToast('Username change submitted for HR approval.');
    setUsernameRequest('');
    await reload?.();
  };

  return (
    <div className="space-y-6">
      <ProfilePageAnchors items={anchors} />

      {hasHrSelfService ? (
        <ProfileCompletionPanel
          variant={cohort === 'scholarship' ? 'scholarship' : 'employee'}
          completeness={completeness}
          documentSummary={me?.documentSummary}
          pendingProfileRequests={me?.pendingProfileRequests}
          onFixSection={(tab) => navigate(hrSelfServicePathForTab(tab))}
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <ProfileFormSection
          id="profile-details"
          icon={<User size={16} />}
          title="Profile & login"
          subtitle="How you appear in Zarewa. Official employment data is maintained by HR."
        >
          <form className="space-y-5" onSubmit={submitProfile}>
            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <AvatarPreview url={avatarUrl} displayName={displayName || user?.displayName} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900">{displayName || user?.displayName || '—'}</p>
                <p className="text-xs text-slate-500">@{username || user?.username || '—'}</p>
              </div>
            </div>

            <ProfileFormField label="Display name" htmlFor="profile-display-name">
              <input
                id="profile-display-name"
                className="z-input"
                value={displayName}
                onChange={(e) => {
                  formDirtyRef.current = true;
                  setDisplayName(e.target.value);
                }}
                maxLength={120}
                disabled={!canMutate}
              />
            </ProfileFormField>

            <ProfileFormField
              label="Profile photo URL"
              htmlFor="profile-avatar-url"
              hint="Optional. Use an https:// image link. Shown on your account hub and ID previews."
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
                  />
                  <p className="mt-1.5 rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900">
                    You may change your username once freely. Further changes require HR approval.
                  </p>
                </>
              ) : (
                <>
                  <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-sm">
                    @{user?.username}
                  </p>
                  <p className="mt-1.5 text-[11px] text-slate-500">Request HR to change it again in the Username section.</p>
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
            <ProfileSecurityPanel />
          </div>

          {!canChangeUsernameFreely ? (
            <ProfileFormSection
              id="username-request"
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

      <ProfileFormSection
        id="your-access"
        icon={<Shield size={16} />}
        title="Your access"
        subtitle="Roles and permissions are assigned by HR and administrators."
      >
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Role</p>
          <p className="mt-1 text-sm font-black text-[#134e4a]">{user?.roleLabel || '—'}</p>
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
            in HR self-service so HR can verify and activate full access.
          </p>
        ) : null}
      </ProfileFormSection>

      <MyAccessExplainer />
    </div>
  );
}
