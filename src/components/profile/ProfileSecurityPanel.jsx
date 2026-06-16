import React, { useState } from 'react';
import { Lock, Save } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ProfileFormActions, ProfileFormField, ProfileFormSection } from './profileFormUi';

export default function ProfileSecurityPanel() {
  const { show: showToast } = useToast();
  const ws = useWorkspace();
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      showToast('Enter your current and new password.', { variant: 'error' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('New password and confirmation do not match.', { variant: 'error' });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      showToast('New password must be at least 8 characters.', { variant: 'error' });
      return;
    }
    setBusy(true);
    try {
      const r = await ws?.changePassword?.(passwordForm.currentPassword, passwordForm.newPassword);
      if (!r?.ok) {
        showToast(r?.error || 'Could not change password.', { variant: 'error' });
        return;
      }
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast('Password updated successfully.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ProfileFormSection
      icon={<Lock size={16} />}
      title="Password & security"
      subtitle="Changing your password affects this login. You may need to sign in again on other devices."
    >
      <form className="space-y-4" onSubmit={submit}>
        <ProfileFormField label="Current password" htmlFor="current-password">
          <input
            id="current-password"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
            className="z-input"
            autoComplete="current-password"
          />
        </ProfileFormField>
        <ProfileFormField label="New password" htmlFor="new-password" hint="At least 8 characters.">
          <input
            id="new-password"
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
            className="z-input"
            autoComplete="new-password"
            minLength={8}
          />
        </ProfileFormField>
        <ProfileFormField label="Confirm new password" htmlFor="confirm-password">
          <input
            id="confirm-password"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
            className="z-input"
            autoComplete="new-password"
          />
        </ProfileFormField>
        <ProfileFormActions>
          <button type="submit" disabled={busy} className="z-btn-secondary min-h-11 w-full justify-center disabled:opacity-50 sm:w-auto">
            <Save size={16} aria-hidden /> {busy ? 'Updating…' : 'Update password'}
          </button>
        </ProfileFormActions>
      </form>
    </ProfileFormSection>
  );
}
