import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/apiBase';
import { useWorkspace } from './WorkspaceContext';
import { canAccessMyProfileHr } from '../lib/hrAccess';

const UserProfileContext = createContext(null);

export function UserProfileProvider({ children }) {
  const ws = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [me, setMe] = useState(null);

  const hasHrSelfService = canAccessMyProfileHr(ws?.permissions);

  const reload = useCallback(async () => {
    if (!hasHrSelfService) {
      setMe(null);
      setError('');
      setLoading(false);
      return;
    }
    setLoading(true);
    const { ok, data } = await apiFetch('/api/hr/me');
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not load your profile.');
      setMe(null);
    } else {
      setMe(data);
      setError('');
    }
    setLoading(false);
  }, [hasHrSelfService]);

  useEffect(() => {
    void reload();
  }, [reload, ws?.refreshEpoch]);

  const cohort = useMemo(() => {
    if (!hasHrSelfService || !me?.hr) return hasHrSelfService ? 'employee' : 'account_only';
    if (me.hr.isScholarshipBeneficiary) return 'scholarship';
    if (me.hr.isDomesticStaff) return 'domestic';
    if (me.hr.isNonBranchStaff) return 'special';
    return 'employee';
  }, [hasHrSelfService, me?.hr]);

  const value = useMemo(
    () => ({
      loading,
      error,
      me,
      hr: me?.hr ?? null,
      user: me?.user ?? ws?.session?.user ?? null,
      cohort,
      hasHrSelfService,
      reload,
      isScholarship: cohort === 'scholarship',
      isDomestic: cohort === 'domestic',
      completeness: me?.completeness ?? null,
      documentSummary: me?.documentSummary ?? null,
      pendingProfileRequests: me?.pendingProfileRequests ?? [],
      loanPolicy: me?.loanPolicy ?? null,
      leaveEntitlementDays: me?.leaveEntitlementDays ?? null,
      isEmployee: cohort === 'employee' || cohort === 'special',
    }),
    [loading, error, me, cohort, hasHrSelfService, reload, ws?.session?.user]
  );

  return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>;
}

export function useUserProfile() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error('useUserProfile must be used within UserProfileProvider');
  return ctx;
}
