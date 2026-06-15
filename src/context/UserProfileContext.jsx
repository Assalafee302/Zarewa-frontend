import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../lib/apiBase';
import { useWorkspace } from './WorkspaceContext';
import { canAccessMyProfileHr } from '../lib/hrAccess';

const UserProfileContext = createContext(null);

export function UserProfileProvider({ children }) {
  const ws = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [me, setMe] = useState(null);
  const hasDataRef = useRef(false);
  const loadGenRef = useRef(0);

  const permissionsKey = useMemo(() => (ws?.permissions || []).join('|'), [ws?.permissions]);
  const hasHrSelfService = useMemo(() => canAccessMyProfileHr(ws?.permissions), [permissionsKey]);

  const reload = useCallback(async (opts = {}) => {
    if (!hasHrSelfService) {
      setMe(null);
      setError('');
      setLoading(false);
      hasDataRef.current = false;
      return;
    }
    const forceSpinner = opts?.forceSpinner === true;
    const gen = ++loadGenRef.current;
    if (forceSpinner || !hasDataRef.current) setLoading(true);

    const { ok, data } = await apiFetch('/api/hr/me');
    if (gen !== loadGenRef.current) return;

    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not load your profile.');
      if (!hasDataRef.current) setMe(null);
    } else {
      setMe(data);
      setError('');
      hasDataRef.current = true;
    }
    setLoading(false);
  }, [hasHrSelfService]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!hasHrSelfService) hasDataRef.current = false;
  }, [hasHrSelfService]);

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
      initialLoading: loading && !me,
    }),
    [loading, error, me, cohort, hasHrSelfService, reload, ws?.session?.user]
  );

  return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUserProfile() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error('useUserProfile must be used within UserProfileProvider');
  return ctx;
}
