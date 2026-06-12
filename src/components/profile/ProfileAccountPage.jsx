import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Shield, User } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useUserProfile } from '../../context/UserProfileContext';
import { apiFetch } from '../../lib/apiBase';
import ProfileSecurityPanel from './ProfileSecurityPanel';
import { MyAccessExplainer } from './MyAccessExplainer';
import { ProfileCompletionPanel } from './ProfileCompletionPanel';

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

  const canChangeUsernameFreely = user?.canChangeUsernameFreely !== false && (user?.usernameChangeCount || 0) < 1;

  useEffect(() => {
    setDisplayName(user?.displayName ?? '');
    setEmail(user?.email ?? '');
    setUsername(user?.username ?? '');
    setAvatarUrl(user?.avatarUrl ?? '');
  }, [user?.id, user?.displayName, user?.email, user?.username, user?.avatarUrl, ws?.refreshEpoch]);

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
    <div className="space-y-8">
      {hasHrSelfService ? (
        <ProfileCompletionPanel
          variant={cohort === 'scholarship' ? 'scholarship' : 'employee'}
          completeness={completeness}
          documentSummary={me?.documentSummary}
          pendingProfileRequests={me?.pendingProfileRequests}
          onFixSection={(tab) => {
            const map = {
              documents: '/me/documents',
              employment: '/me/employment',
              policies: '/me/policies',
              school: '/me/school',
            };
            navigate(map[tab] || '/me/documents');
          }}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
            <User size={16} className="text-[#134e4a]" /> Profile & login
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            How you appear in Zarewa. Official employment data is maintained by HR after they verify your uploads.
          </p>
          <form className="mt-5 space-y-4" onSubmit={submitProfile}>
            <div>
              <label className="z-field-label">Display name</label>
              <input className="z-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={120} disabled={!canMutate} />
            </div>
            <div>
              <label className="z-field-label">Username (login)</label>
              {canChangeUsernameFreely ? (
                <>
                  <input
                    className="z-input font-mono"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    pattern="[a-z0-9._-]{3,40}"
                    disabled={!canMutate}
                  />
                  <p className="mt-1 text-[11px] text-amber-800 bg-amber-50 rounded-lg px-2 py-1 border border-amber-100">
                    You may change your username once freely. Further changes require HR approval.
                  </p>
                </>
              ) : (
                <>
                  <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm">@{user?.username}</p>
                  <p className="mt-1 text-[11px] text-slate-500">Username already changed. Request HR to change it again below.</p>
                </>
              )}
            </div>
            <div>
              <label className="z-field-label">Email (optional)</label>
              <input type="email" className="z-input" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!canMutate} />
            </div>
            <button type="submit" className="z-btn-primary" disabled={saving || !canMutate}>
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </form>
        </section>

        <section id="security" className="space-y-6">
          <ProfileSecurityPanel />
          {!canChangeUsernameFreely ? (
            <div className="rounded-3xl border border-violet-100 bg-violet-50/40 p-5">
              <h4 className="text-sm font-black text-slate-900">Request username change</h4>
              <p className="mt-1 text-xs text-slate-600">HR will review and apply approved username changes.</p>
              <form className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap" onSubmit={submitUsernameRequest}>
                <input
                  className="z-input flex-1 font-mono"
                  placeholder="new.username"
                  value={usernameRequest}
                  onChange={(e) => setUsernameRequest(e.target.value.toLowerCase())}
                />
                <button type="submit" className="z-btn-primary min-h-11 w-full sm:w-auto" disabled={requestBusy}>
                  {requestBusy ? 'Submitting…' : 'Submit to HR'}
                </button>
              </form>
            </div>
          ) : null}
        </section>
      </div>

      <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
          <Shield size={16} className="text-[#134e4a]" /> Your access
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Roles and permissions are assigned by HR and administrators. They control which parts of the software you can
          use.
        </p>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Role</p>
          <p className="text-sm font-black text-[#134e4a]">{user?.roleLabel || '—'}</p>
        </div>
        {cohort !== 'account_only' ? (
          <p className="mt-4 text-xs text-slate-600">
            Complete your{' '}
            <Link to="/me/documents" className="font-semibold text-[#134e4a] hover:underline">
              documents
            </Link>{' '}
            and{' '}
            <Link to="/me/policies" className="font-semibold text-[#134e4a] hover:underline">
              policies
            </Link>{' '}
            so HR can verify and activate full self-service.
          </p>
        ) : null}
      </section>

      <MyAccessExplainer />
    </div>
  );
}
