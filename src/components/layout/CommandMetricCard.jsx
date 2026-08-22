import React from 'react';
import {
  COMMAND_ICON_CHIP,
  COMMAND_METRIC_CARD,
  COMMAND_METRIC_CARD_INTERACTIVE,
  COMMAND_METRIC_DECOR,
  COMMAND_METRIC_LABEL,
  COMMAND_METRIC_META,
  COMMAND_METRIC_VALUE,
} from '../../lib/execPageUi';

/**
 * Overview KPI tile for Executive Office and Branch Manager Today tabs.
 */
export function CommandMetricCard({
  label,
  value,
  meta,
  badge,
  icon: Icon,
  iconTone = 'secondary',
  warn = false,
  onClick,
  className = '',
  valueClassName = '',
  children,
}) {
  const Tag = onClick ? 'button' : 'div';
  const shell = onClick ? COMMAND_METRIC_CARD_INTERACTIVE : COMMAND_METRIC_CARD;

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`${shell} ${className}`.trim()}
    >
      <div className={COMMAND_METRIC_DECOR} aria-hidden />
      <div className="relative z-10">
        <div className="mb-4 flex items-start justify-between gap-2">
          {Icon ? (
            <span className={COMMAND_ICON_CHIP[iconTone] || COMMAND_ICON_CHIP.secondary}>
              <Icon size={18} strokeWidth={2} aria-hidden />
            </span>
          ) : (
            <span />
          )}
          {badge ? (
            <span className="rounded-md border border-[var(--z-border-subtle)] bg-[var(--z-surface-muted)] px-2 py-0.5 text-ui-xs font-semibold text-[var(--z-text-muted)]">
              {badge}
            </span>
          ) : null}
        </div>
        <p className={COMMAND_METRIC_LABEL}>{label}</p>
        <p
          className={`${COMMAND_METRIC_VALUE} ${warn ? 'text-amber-900' : ''} ${valueClassName}`.trim()}
        >
          {value}
        </p>
        {meta ? <p className={COMMAND_METRIC_META}>{meta}</p> : null}
        {children}
      </div>
    </Tag>
  );
}
