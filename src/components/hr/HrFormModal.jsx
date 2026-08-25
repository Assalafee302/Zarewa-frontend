import React from 'react';
import { FormModal } from '../layout/FormModal';
import { HrAddButton } from '../hr/hrPageUi';

/**
 * Standard HR popup for create/edit forms — thin wrapper over FormModal.
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
  footer,
  formId,
  onSubmit,
  layer = 'default',
}) {
  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size={size}
      closeDisabled={closeDisabled}
      trackUnsaved={trackUnsaved}
      trackId={trackId}
      trackHydrateKey={trackHydrateKey}
      footer={footer}
      formId={formId}
      onSubmit={onSubmit}
      eyebrow="Human resources"
      layer={layer}
    >
      {children}
    </FormModal>
  );
}

export function HrAddFormButton({ children, onClick, disabled }) {
  return (
    <HrAddButton type="button" onClick={onClick} disabled={disabled}>
      {children}
    </HrAddButton>
  );
}
