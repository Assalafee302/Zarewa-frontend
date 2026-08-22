/**
 * Production register desk — shop-floor UI tokens (Operations → production register modal).
 * Readable metrics, touch-friendly actions, teal Industrial Integrity chrome.
 */

export const PROD_REG = {
  /** Section shell (coil log, conversion preview, job summary) */
  panel:
    'overflow-hidden rounded-xl border border-[var(--z-border-subtle)] bg-white shadow-[var(--shadow-zarewa-card)]',
  panelHeader:
    'flex flex-col gap-2 border-b border-[var(--z-border-subtle)] bg-gradient-to-r from-[var(--z-surface-muted)]/50 via-white to-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between',
  panelBody: 'space-y-3 p-3 sm:p-3.5',
  panelBodyCompact: 'space-y-2 p-2',
  shopFloorGap: 'space-y-1.5',
  eyebrow: 'z-label-caps text-zarewa-teal',
  hint: 'text-ui-xs leading-snug text-[var(--z-text-muted)]',

  /** Live job metrics (modal strip) */
  metricGrid: 'grid grid-cols-3 gap-1.5 sm:grid-cols-5 sm:gap-2',
  metricGridCompact: 'grid grid-cols-3 gap-1 sm:grid-cols-5 sm:gap-1.5',
  metricCell:
    'rounded-lg border border-[var(--z-border-subtle)] bg-white px-2.5 py-2 text-left shadow-sm transition-colors hover:border-zarewa-teal/25',
  metricCellCompact: 'rounded-md border border-[var(--z-border-subtle)] bg-white px-2 py-1.5 text-left',
  metricLabel: 'text-[10px] font-bold uppercase tracking-wide text-[var(--z-text-muted)]',
  metricValue: 'z-stencil mt-1 text-base font-bold tabular-nums leading-none text-zarewa-teal',
  metricValueNeutral: 'z-stencil mt-1 text-base font-bold tabular-nums leading-none text-[var(--z-text)]',
  metricUnit: 'ml-0.5 text-[10px] font-medium text-[var(--z-text-muted)]',

  /** Coil row cards */
  coilRow:
    'rounded-xl border bg-white shadow-sm transition-[box-shadow,border-color]',
  coilRowInModal: 'rounded-lg border bg-white p-2 shadow-sm transition-[box-shadow,border-color]',
  coilRowBorder: 'border-[var(--z-border-subtle)]',
  coilRowUnsaved: 'border-amber-300 ring-2 ring-amber-200/70',
  coilRowPreviewReady: 'ring-1 ring-teal-400/35',

  /** Desktop column header (lg+) */
  coilGridHeader:
    'mb-1 hidden min-w-0 items-end gap-x-2 pb-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--z-text-muted)] lg:grid lg:grid-cols-[1.25rem_3.25rem_minmax(0,1fr)_minmax(3.25rem,1fr)_minmax(3.25rem,1fr)_minmax(3.25rem,1fr)_minmax(0,1fr)_2.25rem_2rem] lg:gap-x-1.5',

  /** Sticky modal action bar */
  actionBar:
    'shrink-0 border-t border-[var(--z-border-subtle)] bg-white/98 px-2.5 py-2 backdrop-blur-md shadow-[0_-6px_16px_rgba(11,28,48,0.06)] sm:px-3',

  /** Modal shell — shop-floor form width (not full desk) */
  modalPanel:
    'z-modal-panel mx-auto flex h-[min(92dvh,880px)] w-full min-w-0 max-w-[min(42rem,calc(100dvw-1rem))] flex-col overflow-hidden rounded-xl border border-[var(--z-border-subtle)] bg-white shadow-[var(--shadow-zarewa-overlay)] sm:max-w-[min(44rem,calc(100dvw-1.5rem))]',

  /** Coil grid — fixed columns so inputs do not stretch with viewport */
  coilGridHeaderModal:
    'mb-1 hidden min-w-0 items-end gap-x-1.5 pb-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--z-text-muted)] md:grid md:grid-cols-[1.25rem_2.75rem_minmax(7rem,9.5rem)_3.75rem_3.75rem_3.75rem_minmax(5rem,7rem)_2rem_1.5rem]',
  coilGridRowModal:
    'md:grid md:grid-cols-[1.25rem_2.75rem_minmax(7rem,9.5rem)_3.75rem_3.75rem_3.75rem_minmax(5rem,7rem)_2rem_1.5rem] md:items-end md:gap-x-1.5',

  actionCluster: 'flex flex-wrap items-center justify-end gap-2',

  /** Shop-floor buttons — min 44px touch on mobile */
  btnBase:
    'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/30 focus-visible:ring-offset-2 disabled:opacity-45 sm:min-h-9 sm:px-2.5 sm:py-1.5 sm:text-ui-xs',
  btnStart: 'bg-sky-600 text-white hover:bg-sky-700 shadow-sm',
  btnStartPulse: 'animate-pulse bg-amber-500 text-white ring-2 ring-amber-300 hover:bg-amber-600',
  btnSave: 'bg-slate-800 text-white hover:bg-slate-900 shadow-sm',
  btnSavePulse: 'animate-pulse bg-amber-500 text-white ring-2 ring-amber-300 hover:bg-amber-600',
  btnComplete: 'bg-zarewa-teal text-white hover:bg-zarewa-teal-hover shadow-sm',
  btnGhost:
    'border border-[var(--z-border)] bg-white text-[var(--z-text)] hover:bg-[var(--z-surface-muted)]',
  btnWarn:
    'border border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100',
  btnDanger:
    'border border-rose-300 bg-rose-50 text-rose-950 hover:bg-rose-100',
  btnRecall:
    'border border-violet-300 bg-violet-50 text-violet-950 hover:bg-violet-100',

  /** Mode toggle (coil vs offcut) */
  modeToggle: 'flex flex-wrap items-center gap-1 rounded-lg border border-[var(--z-border-subtle)] bg-[var(--z-surface-muted)]/40 p-1',
  modeBtn: 'inline-flex min-h-9 flex-1 items-center justify-center rounded-md px-2.5 py-1.5 text-ui-xs font-semibold transition-colors sm:flex-none',
  modeBtnActive: 'bg-zarewa-teal text-white shadow-sm',
  modeBtnIdle: 'text-[var(--z-text-muted)] hover:bg-white hover:text-[var(--z-text)]',

  /** Inline alerts */
  bannerRunning:
    'flex items-start gap-2.5 rounded-xl border border-teal-200/80 bg-gradient-to-r from-teal-50/90 to-white px-3 py-2.5',
  bannerIssue:
    'flex items-start gap-2.5 rounded-xl border px-3 py-2.5',
};

export function registerStatusTone(status) {
  switch (status) {
    case 'Completed':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200/80';
    case 'Cancelled':
      return 'bg-slate-200 text-slate-700 border-slate-300/80';
    case 'Running':
      return 'bg-sky-100 text-sky-800 border-sky-200/80';
    default:
      return 'bg-amber-100 text-amber-900 border-amber-200/80';
  }
}

export function prodRegBtnClass({ base, pulse, saving = false, savingClass = 'bg-slate-100 text-slate-600', unsaved = false }) {
  if (saving) return `${PROD_REG.btnBase} ${savingClass}`;
  if (unsaved && pulse) return `${PROD_REG.btnBase} ${pulse}`;
  return `${PROD_REG.btnBase} ${base}`;
}
