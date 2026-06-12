import React, { useState } from 'react';
import { Lock, Save } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';

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
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm max-w-xl">
      <h3 className="z-section-title flex items-center gap-2">
        <Lock size={14} /> Password & security
      </h3>
      <p className="text-xs text-slate-500 mb-5 leading-relaxed">
        Changing your password affects this login. You may need to sign in again on other devices.
      </p>
      <form className="space-y-4" onSubmit={submit}>
        <div>
          <label className="z-field-label">Current password</label>
          <input
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
            className="z-input"
            autoComplete="current-password"
          />
        </div>
        <div>
          <label className="z-field-label">New password</label>
          <input
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
            className="z-input"
            autoComplete="new-password"
            minLength={8}
          />
        </div>
        <div>
          <label className="z-field-label">Confirm new password</label>
          <input
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
            className="z-input"
            autoComplete="new-password"
          />
        </div>
        <button type="submit" disabled={busy} className="z-btn-secondary w-full justify-center disabled:opacity-50">
          <Save size={16} /> {busy ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
