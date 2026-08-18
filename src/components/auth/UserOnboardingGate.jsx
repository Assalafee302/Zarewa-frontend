import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { hasPendingPasswordChange } from '../../lib/pendingPasswordChange';
import ForcePasswordChangeModal from './ForcePasswordChangeScreen';

/**
 * First-login password change (modal), then normal workspace access.
 * Role training is opt-in from Settings — it no longer blocks the app.
 * @param {{ children: React.ReactNode }} props
 */
export default function UserOnboardingGate({ children }) {
  const ws = useWorkspace();
  const user = ws?.session?.user;
  const userId = user?.id;
  const needsPassword =
    Boolean(user?.mustChangePassword) ||
    (user && user.mustChangePassword !== false && userId ? hasPendingPasswordChange(userId) : false);

  return (
    <>
      <div className={needsPassword ? 'pointer-events-none select-none opacity-40' : undefined}>
        {children}
      </div>
      {needsPassword ? <ForcePasswordChangeModal /> : null}
    </>
  );
}
