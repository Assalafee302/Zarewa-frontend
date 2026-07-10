import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { hasPendingPasswordChange } from '../../lib/pendingPasswordChange';
import ForcePasswordChangeModal from './ForcePasswordChangeScreen';
import RoleTrainingGuideModal from './RoleTrainingGuideModal';

/**
 * First-login password change (modal), then role-based training, then normal workspace access.
 * @param {{ children: React.ReactNode }} props
 */
export default function UserOnboardingGate({ children }) {
  const ws = useWorkspace();
  const user = ws?.session?.user;
  const userId = user?.id;
  const needsPassword =
    Boolean(user?.mustChangePassword) ||
    (user && user.mustChangePassword !== false && userId ? hasPendingPasswordChange(userId) : false);
  const needsTraining = Boolean(user && !needsPassword && user.trainingCompleted === false);

  return (
    <>
      <div className={needsPassword ? 'pointer-events-none select-none opacity-40' : undefined}>
        {children}
      </div>
      {needsPassword ? <ForcePasswordChangeModal /> : null}
      {needsTraining ? <RoleTrainingGuideModal /> : null}
    </>
  );
}
