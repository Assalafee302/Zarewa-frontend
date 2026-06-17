import React from 'react';
import { AlertCircle, CheckCircle2, Clock, Lock } from 'lucide-react';

/**
 * @param {{
 *   profileLocked?: boolean;
 *   profileSubmittedAtIso?: string | null;
 *   profileVerifiedAtIso?: string | null;
 *   missingCount?: number;
 * }} props
 */
export function ProfileOnboardingStatus({ profileLocked, profileSubmittedAtIso, profileVerifiedAtIso, missingCount = 0 }) {
  if (profileVerifiedAtIso) {
    return (
      <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden />
        <div>
          <p className="font-semibold">Profile verified by HR</p>
          <p className="mt-0.5 text-xs text-emerald-800">
            Your record is complete. To change any detail, submit a request below — HR will review and approve.
          </p>
        </div>
      </div>
    );
  }

  if (profileLocked && profileSubmittedAtIso) {
    return (
      <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <Clock size={20} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
        <div>
          <p className="font-semibold">Submitted — awaiting HR review</p>
          <p className="mt-0.5 text-xs text-amber-900">
            Submitted on {profileSubmittedAtIso.slice(0, 10)}. You can view your record but cannot edit until HR
            verifies or unlocks it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
      <AlertCircle size={20} className="mt-0.5 shrink-0 text-slate-500" aria-hidden />
      <div>
        <p className="font-semibold">Complete your employee profile</p>
        <p className="mt-0.5 text-xs text-slate-600">
          Open the profile form, fill in your personal details, then submit for HR review. Your full name is generated
          from first, middle, and surname — it cannot be edited separately.
          {missingCount > 0 ? (
            <span className="mt-1 block font-medium text-slate-700">{missingCount} required field(s) still missing.</span>
          ) : null}
        </p>
      </div>
    </div>
  );
}

export function ProfileLockedNotice() {
  return (
    <div className="flex gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
      <Lock size={18} className="mt-0.5 shrink-0 text-slate-400" aria-hidden />
      <p className="text-xs leading-relaxed">
        This section is read-only. Use <strong className="font-medium">Request an update</strong> below to ask HR to
        change locked fields.
      </p>
    </div>
  );
}
