import React from 'react';
import { ModalFrame } from '../layout/ModalFrame';

const SIZE_CLASS = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

/**
 * Standard HR popup for create/edit forms.
 * Header stays visible; body scrolls when content is tall.
 * @param {{ isOpen: boolean; onClose: () => void; title: string; description?: string; children: React.ReactNode; size?: 'sm'|'md'|'lg'|'xl' }} props
 */
export function HrFormModal({ isOpen, onClose, title, description, children, size = 'lg' }) {
  return (
    <ModalFrame isOpen={isOpen} onClose={onClose} title={title} description={description} surface="plain">
      <div
        className={`z-modal-panel flex w-full min-h-0 max-h-[min(90dvh,920px)] flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl ${SIZE_CLASS[size] || SIZE_CLASS.lg}`}
      >
        <div className="shrink-0 border-b border-slate-100 px-6 pb-4 pt-6 pr-12">
          <h3 className="text-lg font-black text-[#134e4a]">{title}</h3>
          {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 py-5 [-webkit-overflow-scrolling:touch]">
          {children}
        </div>
      </div>
    </ModalFrame>
  );
}

/**
 * @param {{ children: React.ReactNode; onClick: () => void; disabled?: boolean }} props
 */
export function HrAddFormButton({ children, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="hr-add-form-btn rounded-xl bg-[#134e4a] px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-white hover:bg-[#0f3d3a] disabled:opacity-50"
    >
      {children}
    </button>
  );
}
