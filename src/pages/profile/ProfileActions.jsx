import React, { useMemo } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useUserProfile } from '../../context/UserProfileContext';
import { buildUserProfileActions } from '../../lib/userProfileActions';
import { ProfileServicesCatalog, ProfileServicesHero } from '../../components/profile/profileServicesUi';
import { ACCOUNT_PATH, HR_SELF_SERVICE_PATH } from '../../lib/hrSelfServiceRoutes';
import { Link } from 'react-router-dom';

export default function ProfileActions() {
  const ws = useWorkspace();
  const { cohort, hasHrSelfService } = useUserProfile();

  const actions = useMemo(
    () =>
      buildUserProfileActions({
        permissions: ws?.permissions,
        roleKey: ws?.session?.user?.roleKey,
        canAccessModule: ws?.canAccessModule,
        cohort,
        hasHrSelfService,
      }),
    [ws?.permissions, ws?.session?.user?.roleKey, ws?.canAccessModule, cohort, hasHrSelfService]
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <ProfileServicesHero
        title="All services"
        description="Every shortcut for your role — account settings stay here; HR tasks open in My HR; team and admin areas open in their workspaces."
        count={actions.length}
      />

      <p className="text-sm leading-relaxed text-slate-600">
        Need account or password changes?{' '}
        <Link to={ACCOUNT_PATH.account} className="font-semibold text-[#134e4a] hover:underline">
          Account & security
        </Link>
        {hasHrSelfService ? (
          <>
            {' '}
            · HR overview{' '}
            <Link to={HR_SELF_SERVICE_PATH.overview} className="font-semibold text-[#134e4a] hover:underline">
              here
            </Link>
          </>
        ) : null}
      </p>

      <ProfileServicesCatalog actions={actions} />
    </div>
  );
}
