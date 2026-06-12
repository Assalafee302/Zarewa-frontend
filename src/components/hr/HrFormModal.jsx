import React from 'react';
import { ModalFrame } from '../layout/ModalFrame';
import { useTrackedUnsavedForm } from '../../hooks/useTrackedUnsavedForm';

const SIZE_CLASS = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

/**
 * Standard HR popup for create/edit forms.
 * @param {{
 *   isOpen: boolean;
 *   onClose: () => void;
 *   title: string;
 *   description?: string;
 *   children: React.ReactNode;
 *   size?: 'sm'|'md'|'lg'|'xl';
 *   closeDisabled?: boolean;
 *   trackUnsaved?: boolean;
 *   trackId?: string;
 *   trackHydrateKey?: string;
 * }} props
 */
export function HrFormModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'lg',
  closeDisabled = false,
  trackUnsaved = true,
  trackId,
  trackHydrateKey,
}) {
  const stableTrackId =
    trackId || `hr-${String(title || 'modal').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`.replace(/^-|-$/g, '');
  const { captureEdited, wrapClose } = useTrackedUnsavedForm(stableTrackId, {
    isOpen,
    blockTracking: !trackUnsaved,
    hydrateKey: trackHydrateKey ?? title,
  });
  const handleClose = onClose && !closeDisabled ? wrapClose(onClose) : undefined;

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      description={description}
      surface="plain"
      closeDisabled={closeDisabled}
    >
      <div
        className={`z-modal-panel w-full max-w-[min(100%,42rem)] ${SIZE_CLASS[size] || SIZE_CLASS.lg} rounded-2xl border border-slate-100 bg-white p-4 shadow-xl max-h-[min(92dvh,920px)] overflow-y-auto sm:p-6`}
        onInput={trackUnsaved ? captureEdited : undefined}
        onChange={trackUnsaved ? captureEdited : undefined}
      >
        {description ? <p className="text-sm text-slate-600">{description}</p> : null}
        <div className={description ? 'mt-5' : 'mt-1'}>{children}</div>
      </div>
    </ModalFrame>
  );
}

/**
 * @param {{ children: React.ReactNode; onClick: () => void; disabled?: boolean }} props
 */
export function HrAddFormButton({ children, onClick, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="hr-add-form-btn rounded-xl bg-[#134e4a] px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-white hover:bg-[#0f3d3a] disabled:opacity-50">
      {children}
    </button>
  );
}
