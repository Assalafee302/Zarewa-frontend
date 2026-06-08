import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import ForcePasswordChangeModal from './ForcePasswordChangeScreen';
import RoleTrainingGuideModal from './RoleTrainingGuideModal';

/**
 * First-login password change (modal), then role-based training, then normal workspace access.
 * @param {{ children: React.ReactNode }} props
 */
export default function UserOnboardingGate({ children }) {
  const ws = useWorkspace();
  const user = ws?.session?.user;
  const needsPassword = Boolean(user?.mustChangePassword);
  const needsTraining = Boolean(user && user.trainingCompleted === false);

  return (
    <>
      <div className={needsPassword ? 'pointer-events-none select-none' : undefined} aria-hidden={needsPassword}>
        {children}
      </div>
      {needsPassword ? <ForcePasswordChangeModal /> : null}
      {!needsPassword && needsTraining ? <RoleTrainingGuideModal /> : null}
    </>
  );
}
