import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUserProfile } from '../../context/UserProfileContext';

/**
 * @param {{ requireHr?: boolean; requireScholarship?: boolean; requireNotScholarship?: boolean; children: React.ReactNode }} props
 */
export function ProfileSectionGuard({
  requireHr = false,
  requireScholarship = false,
  requireNotScholarship = false,
  children,
}) {
  const { hasHrSelfService, isScholarship, initialLoading } = useUserProfile();

  if (initialLoading) return <p className="text-sm text-slate-600 py-8">Loading…</p>;

  if (requireScholarship && !isScholarship) {
    return <Navigate to="/me" replace />;
  }
  if (requireNotScholarship && isScholarship) {
    return <Navigate to="/me/school" replace />;
  }
  if (requireHr && !hasHrSelfService) {
    return (
      <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        This section is not available for your role. You can still update your account and password here.
      </div>
    );
  }

  return children;
}
