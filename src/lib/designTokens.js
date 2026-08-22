/**
 * Canonical design tokens for Zarewa ERP (Industrial Integrity).
 * CSS variables live in index.css; Tailwind aliases in @theme.
 * Prefer <Button>, FIELD, SURFACE over ad-hoc class strings.
 */

/** Semantic colors — mirror :root in index.css */
export const COLOR = {
  accent: '#134e4a',
  accentHover: '#0f3d39',
  accentMuted: '#2dd4bf',
  accentSoft: '#ccfbf1',
  bg: '#f8f9ff',
  surface: '#ffffff',
  surfaceMuted: '#eff4ff',
  text: '#0b1c30',
  textMuted: '#404946',
  border: '#bfc9c5',
  error: '#ba1a1a',
};

/** Border radius scale — 8px desk default */
export const RADIUS = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
};

/** Typography scale */
export const TEXT = {
  micro: 'text-ui-micro font-medium text-[var(--z-text-muted)]',
  label: 'text-ui-xs font-medium text-[var(--z-text-muted)]',
  labelCaps: 'z-label-caps',
  body: 'text-sm leading-relaxed text-[var(--z-text)]',
  bodyMuted: 'text-sm leading-relaxed text-[var(--z-text-muted)]',
  title: 'text-sm font-semibold text-[var(--z-text)]',
  pageTitle: 'z-page-title',
  pageSubtitle: 'z-page-subtitle',
  stencil: 'z-stencil',
};

/** Shadow presets */
export const SHADOW = {
  card: 'shadow-[var(--shadow-zarewa-card)]',
  overlay: 'shadow-[var(--shadow-zarewa-overlay)]',
  soft: 'shadow-sequence',
};

/** Surface presets */
export const SURFACE = {
  panel: 'z-panel',
  card: `${RADIUS.md} border border-[var(--z-border)] bg-white shadow-[var(--shadow-zarewa-card)]`,
  muted: `${RADIUS.md} border border-dashed border-[var(--z-border)] bg-[var(--z-surface-muted)]`,
  kpi: 'z-kpi-card',
  toolbar: 'z-toolbar-shell',
};

/** Form field — canonical input styling */
export const FIELD = {
  base: 'z-input',
  label: 'z-field-label',
  compact:
    'w-full min-h-11 rounded-md border border-[var(--z-border)] bg-white px-3 py-2.5 text-base sm:text-sm font-medium text-[var(--z-text)] outline-none transition-colors focus:border-zarewa-teal/50 focus:ring-2 focus:ring-zarewa-teal/15',
};

/** Form layout — modals, drawers, page forms */
export const FORM = {
  section:
    'rounded-lg border border-[var(--z-border-subtle)] bg-[var(--z-surface-muted)]/35 p-4 sm:p-5 space-y-4',
  sectionFlat: 'space-y-4',
  sectionTitle: 'text-sm font-semibold text-zarewa-teal flex items-center gap-2',
  sectionEyebrow: 'z-label-caps mb-1',
  grid: 'grid grid-cols-1 gap-4 sm:grid-cols-2',
  gridThree: 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3',
  stack: 'flex flex-col gap-4',
  hint: 'text-ui-xs text-[var(--z-text-muted)] leading-relaxed',
  error: 'text-ui-xs font-medium text-[var(--z-error)]',
  modalTitle: 'text-lg font-bold tracking-tight text-[var(--z-text)]',
  modalSubtitle: 'mt-1 text-sm text-[var(--z-text-muted)] leading-relaxed',
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
  accentBg: 'bg-zarewa-teal text-white',
};
