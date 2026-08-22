import React from 'react';
import { ModalFrame } from './ModalFrame';
import {
  ModalScrollShell,
  ModalScrollHeader,
  ModalScrollBody,
  ModalScrollFooter,
} from './ModalScrollShell';
import { ModalActionButtons } from './ModalActionFooter';
import { useTrackedUnsavedForm } from '../../hooks/useTrackedUnsavedForm';
import { FORM } from '../../lib/designTokens';

const SIZE = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  xl: 'xl',
};

/**
 * Canonical form popup shell — ModalFrame + scroll body + optional footer.
 */
export function FormModal({
  isOpen,
  onClose,
  title,
  eyebrow,
  description,
  children,
  size = 'lg',
  footer,
  formId,
  onSubmit,
  trackUnsaved = true,
  trackId,
  trackHydrateKey,
  closeDisabled = false,
  layer = 'default',
  headerExtra,
  bodyClassName = '',
  shellClassName = '',
}) {
  const stableTrackId =
    trackId ||
    `form-${String(title || 'modal')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}`.replace(/^-|-$/g, '');

  const { captureEdited, wrapClose } = useTrackedUnsavedForm(stableTrackId, {
    isOpen,
    blockTracking: !trackUnsaved,
    hydrateKey: trackHydrateKey ?? title,
  });

  const handleClose = onClose && !closeDisabled ? wrapClose(onClose) : undefined;
  const scrollSize = SIZE[size] || SIZE.lg;

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={handleClose}
      title={title || 'Form'}
      description={description}
      surface="plain"
      closeDisabled={closeDisabled}
      layer={layer}
    >
      <ModalScrollShell size={scrollSize} className={shellClassName}>
        <ModalScrollHeader>
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              {eyebrow ? <p className={FORM.sectionEyebrow}>{eyebrow}</p> : null}
              {title ? <h2 className={FORM.modalTitle}>{title}</h2> : null}
              {description ? <p className={FORM.modalSubtitle}>{description}</p> : null}
            </div>
            {headerExtra}
          </div>
        </ModalScrollHeader>
        <ModalScrollBody className={bodyClassName}>
          {formId || onSubmit ? (
            <form
              id={formId}
              onSubmit={onSubmit}
              onInput={trackUnsaved ? captureEdited : undefined}
              onChange={trackUnsaved ? captureEdited : undefined}
            >
              {children}
            </form>
          ) : (
            <div
              onInput={trackUnsaved ? captureEdited : undefined}
              onChange={trackUnsaved ? captureEdited : undefined}
            >
              {children}
            </div>
          )}
        </ModalScrollBody>
        {footer ? <ModalScrollFooter>{footer}</ModalScrollFooter> : null}
      </ModalScrollShell>
    </ModalFrame>
  );
}

/** Save/cancel row inside FormModal — FormModal already wraps ModalScrollFooter. */
export function FormModalFooter(props) {
  return <ModalActionButtons {...props} />;
}
