import React from 'react';
import { createPortal } from 'react-dom';
import { Z } from '../../lib/zLayers';

/**
 * Shared full-screen print preview overlay — consistent z-index and backdrop.
 */
export function PrintModalPortal({ open, onClose, children, className = '' }) {
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <>
      <button
        type="button"
        className="no-print fixed inset-0 bg-black/50"
        style={{ zIndex: Z.printBackdrop }}
        aria-label="Close print preview"
        onClick={onClose}
      />
      <div
        className={`print-portal-scroll fixed inset-0 overflow-y-auto overscroll-y-contain p-4 sm:p-8 ${className}`}
        style={{ zIndex: Z.printContent }}
        role="dialog"
        aria-modal="true"
        aria-label="Print preview"
      >
        {children}
      </div>
    </>,
    document.body
  );
}
