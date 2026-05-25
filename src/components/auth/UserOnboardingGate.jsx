import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import ForcePasswordChangeScreen from './ForcePasswordChangeScreen';
import RoleTrainingGuideModal from './RoleTrainingGuideModal';

/**
 * Enforces first-login password change, then role-based training.
 * @param {{ children: React.ReactNode }} props
 */
export default function UserOnboardingGate({ children }) {
  const ws = useWorkspace();
  const user = ws?.session?.user;

  if (user?.mustChangePassword) {
    return <ForcePasswordChangeScreen />;
  }

  if (user && user.trainingCompleted === false) {
    return <RoleTrainingGuideModal />;
  }

  return children;
}
