import React from 'react';

const WIDTH = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
};

/**
 * Scrollable modal card — full dynamic viewport height on phones, inner body scroll.
 */
export function ModalScrollShell({ children, className = '', size = 'md' }) {
  return (
    <div
      className={`z-modal-panel ${WIDTH[size] || WIDTH.md} w-full min-h-0 max-h-[min(100dvh,920px)] sm:max-h-[min(92dvh,900px)] flex flex-col overflow-hidden p-0 ${className}`}
    >
      {children}
    </div>
  );
}

export function ModalScrollHeader({ children, className = '' }) {
  return (
    <div
      className={`shrink-0 border-b border-slate-100 px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4 ${className}`}
    >
      {children}
    </div>
  );
}

export function ModalScrollBody({ children, className = '' }) {
  return (
    <div
      className={`min-h-0 flex-1 overflow-y-auto overscroll-y-contain custom-scrollbar px-4 py-4 sm:px-6 sm:py-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function ModalScrollFooter({ children, className = '' }) {
  return (
    <div
      className={`shrink-0 border-t border-slate-100 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4 ${className}`}
    >
      {children}
    </div>
  );
}
