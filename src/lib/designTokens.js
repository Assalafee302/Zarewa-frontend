/**
 * Canonical design tokens for Zarewa ERP.
 * Use these class strings in new code; legacy z-* CSS classes remain supported.
 */

/** Border radius scale */
export const RADIUS = {
  sm: 'rounded-xl',       // 12px — inputs, buttons, chips
  md: 'rounded-2xl',      // 16px — cards, modals inner panels
  lg: 'rounded-[24px]',   // 24px — panels, KPI cards (matches --radius-zarewa)
  xl: 'rounded-[28px]',   // 28px — hero panels, toolbars
};

/** Typography scale */
export const TEXT = {
  micro: 'text-ui-micro font-bold uppercase tracking-wider',
  label: 'text-ui-xs font-bold uppercase tracking-wider text-slate-500',
  body: 'text-sm leading-relaxed text-slate-700',
  bodyMuted: 'text-sm leading-relaxed text-slate-500',
  title: 'text-sm font-black text-slate-900',
  pageTitle: 'z-page-title',
  pageSubtitle: 'z-page-subtitle',
};

/** Shadow presets */
export const SHADOW = {
  card: 'shadow-[var(--shadow-zarewa-card)]',
  soft: 'shadow-sequence',
};

/** Surface presets */
export const SURFACE = {
  panel: `${RADIUS.lg} border border-white/80 bg-white/60 backdrop-blur-3xl`,
  card: `${RADIUS.md} border border-slate-200/90 bg-white shadow-sm`,
  muted: `${RADIUS.md} border border-dashed border-slate-200 bg-slate-50/80`,
};

/** Form field — canonical input styling */
export const FIELD = {
  base: 'w-full min-h-11 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-base sm:text-sm font-semibold text-zarewa-teal outline-none transition-all focus:border-teal-500/35 focus:ring-2 focus:ring-zarewa-teal/10 disabled:opacity-50 disabled:cursor-not-allowed',
  label: 'z-field-label',
  compact: 'w-full min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base sm:text-sm font-semibold text-slate-800 outline-none transition-all focus:border-zarewa-teal/35 focus:ring-2 focus:ring-zarewa-teal/10',
};

/** Button class aliases — prefer <Button> component over these */
export const BTN = {
  primary: 'z-btn-primary',
  secondary: 'z-btn-secondary',
};

/** Semantic theme surfaces — backed by CSS variables in index.css */
export const THEME = {
  bg: 'bg-[var(--z-bg)]',
  surface: 'bg-[var(--z-surface)] text-[var(--z-text)]',
  surfaceMuted: 'bg-[var(--z-surface-muted)]',
  text: 'text-[var(--z-text)]',
  textMuted: 'text-[var(--z-text-muted)]',
  border: 'border-[var(--z-border)]',
  accent: 'text-[var(--z-accent)]',
};
