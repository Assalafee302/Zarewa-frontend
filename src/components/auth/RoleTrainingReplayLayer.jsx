import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import RoleTrainingGuideModal from './RoleTrainingGuideModal';

/** Non-blocking replay of the post-login role tour (Settings or Zare). */
export function RoleTrainingReplayLayer() {
  const ws = useWorkspace();
  if (!ws?.roleTrainingReplayOpen) return null;

  return (
    <div className="fixed inset-0 z-[250]" role="presentation">
      <RoleTrainingGuideModal
        variant="replay"
        onClose={() => ws.closeRoleTrainingReplay?.()}
      />
    </div>
  );
}
