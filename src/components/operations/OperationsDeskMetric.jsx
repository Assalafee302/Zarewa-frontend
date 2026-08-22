import React from 'react';

const TONE_VALUE = {
  default: 'text-[var(--z-text)]',
  ok: 'text-zarewa-teal',
  warn: 'text-amber-900',
  danger: 'text-[var(--z-error)]',
};

const TONE_SHELL = {
  default: 'border-[var(--z-border)] bg-white',
  ok: 'border-[var(--z-border)] bg-white',
  warn: 'border-amber-200/80 bg-amber-50/40',
  danger: 'border-[var(--z-error)]/25 bg-[var(--z-surface)]',
};

/**
 * Compact operations KPI. Color carries status only; selected is a teal ring.
 * @param {{ label: string; value: React.ReactNode; hint?: string; tone?: 'default' | 'ok' | 'warn' | 'danger'; selected?: boolean; onClick?: () => void; className?: string }} props
 */
export function OperationsDeskMetric({
  label,
  value,
  hint,
  tone = 'default',
  selected = false,
  onClick,
  className = '',
}) {
  const Tag = onClick ? 'button' : 'div';
  const shell = TONE_SHELL[tone] || TONE_SHELL.default;
  const valueCls = TONE_VALUE[tone] || TONE_VALUE.default;

  const valueText = value == null ? '—' : String(value);

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? selected : undefined}
      aria-label={hint ? `${label} ${valueText}, ${hint}` : `${label} ${valueText}`}
      className={`w-full rounded-md border px-3 py-2.5 text-left transition-colors ${shell} ${
        onClick
          ? 'cursor-pointer hover:border-zarewa-teal/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/25'
          : ''
      } ${selected ? 'border-zarewa-teal ring-2 ring-zarewa-teal/20' : ''} ${className}`.trim()}
    >
      <p className="z-label-caps">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums tracking-tight ${valueCls}`}>{value}</p>
      {hint ? (
        <p className="mt-0.5 hidden text-[11px] font-medium text-[var(--z-text-muted)] sm:block">{hint}</p>
      ) : null}
    </Tag>
  );
}
