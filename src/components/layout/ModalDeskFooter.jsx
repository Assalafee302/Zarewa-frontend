import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Branded teal footer for Sales / Procurement desk modals (quotation, receipt, PO).
 */
export function ModalDeskFooter({ totalLabel = 'Total', totalValue, children, className = '' }) {
  return (
    <div
      className={cn(
        'px-4 py-2 bg-zarewa-teal flex justify-between items-center text-white shrink-0 flex-wrap gap-2',
        className
      )}
    >
      <div>
        <p className="text-[10px] font-semibold text-white/50 uppercase tracking-widest leading-none mb-0.5">
          {totalLabel}
        </p>
        <p className="text-lg font-bold text-white tabular-nums leading-tight">{totalValue}</p>
      </div>
      <div className="flex gap-1.5 flex-wrap justify-end">{children}</div>
    </div>
  );
}

const deskBtnBase =
  'h-8 px-2.5 rounded-md text-[11px] font-semibold uppercase tracking-wide inline-flex items-center justify-center gap-1 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed transition-colors';

const deskBtnVariants = {
  ghost: 'bg-white/10 border border-white/15 hover:bg-white/20 text-white',
  primary: 'bg-white text-zarewa-teal shadow-sm hover:bg-white/95',
  print: 'bg-white text-zarewa-teal shadow-sm hover:bg-white/95',
  danger: 'bg-rose-700/90 border border-rose-300/40 hover:bg-rose-700 text-white',
  success: 'bg-white/90 text-emerald-800 shadow-sm hover:bg-white',
};

export function DeskFooterButton({
  variant = 'ghost',
  className = '',
  type = 'button',
  children,
  ...props
}) {
  return (
    <button type={type} className={cn(deskBtnBase, deskBtnVariants[variant] || deskBtnVariants.ghost, className)} {...props}>
      {children}
    </button>
  );
}
