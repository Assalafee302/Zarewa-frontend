import React, { useMemo } from 'react';
import { Activity, Banknote, Gauge, HeartPulse, Ruler, Wallet } from 'lucide-react';
import { formatNgn } from '../../lib/formatNgn';
import { CommandMetricCard } from '../layout/CommandMetricCard';
import {
  COMMAND_HERO_CARD,
  COMMAND_METRIC_GRID,
  COMMAND_METRIC_LABEL,
  COMMAND_SECTION_EYEBROW,
} from '../../lib/execPageUi';

/**
 * Morning board production figures — hero metres tile + overview metric grid.
 */
export function ManagerTodayPulse({
  salesProduced = 0,
  cashCleared = 0,
  metresProduced = 0,
  metresCuttingLists = 0,
  openActions = 0,
  healthScore = null,
  salesTarget = 0,
  metresTarget = 0,
  periodLabel = 'This period',
  loading = false,
}) {
  const salesPct = salesTarget > 0 ? Math.round((salesProduced / salesTarget) * 100) : null;
  const metresPct = metresTarget > 0 ? Math.round((metresProduced / metresTarget) * 100) : null;
  const health = healthScore?.score ?? null;

  const sideTiles = useMemo(
    () => [
      {
        key: 'sales',
        label: 'Sales produced',
        value: formatNgn(salesProduced),
        meta: salesPct != null ? `${salesPct}% of target` : periodLabel,
        icon: Wallet,
        iconTone: 'secondary',
        badge: salesPct != null ? `${salesPct}%` : null,
      },
      {
        key: 'cash',
        label: 'Collected on quotes',
        value: formatNgn(cashCleared),
        meta: periodLabel,
        icon: Banknote,
        iconTone: 'tertiary',
      },
      {
        key: 'open',
        label: 'Open actions',
        value: String(openActions),
        meta: openActions > 0 ? 'Needs your decision' : 'Queue clear',
        warn: openActions > 0,
        icon: Activity,
        iconTone: openActions > 0 ? 'warn' : 'neutral',
        badge: openActions > 0 ? 'Urgent' : null,
      },
      {
        key: 'health',
        label: 'Branch health',
        value: health != null ? String(health) : '—',
        meta: healthScore?.status || 'Working indicator (not SOP policy)',
        icon: HeartPulse,
        iconTone: 'primary',
      },
    ],
    [cashCleared, health, healthScore?.status, openActions, periodLabel, salesPct, salesProduced]
  );

  return (
    <section className="space-y-4" aria-label="Today pulse">
      <div className={COMMAND_HERO_CARD}>
        <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[var(--z-surface-muted)] opacity-50" aria-hidden />
        <div className="relative z-10 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zarewa-teal text-white">
            <Ruler size={20} strokeWidth={2} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className={COMMAND_SECTION_EYEBROW}>Metres produced · {periodLabel}</p>
            <p className="z-stencil mt-1 text-3xl text-[var(--z-text)] sm:text-4xl">
              {loading ? '…' : `${Number(metresProduced || 0).toLocaleString()} m`}
            </p>
            {metresPct != null ? (
              <p className="mt-1 text-ui-xs tabular-nums text-[var(--z-text-muted)]">{metresPct}% of target</p>
            ) : null}
          </div>
          {metresPct != null ? (
            <span className="hidden shrink-0 rounded-md border border-[var(--z-border-subtle)] bg-[var(--z-surface-muted)] px-2 py-1 text-ui-xs font-semibold text-zarewa-teal sm:inline">
              {metresPct}%
            </span>
          ) : null}
        </div>
        <div className="relative z-10 mt-4 grid grid-cols-1 gap-4 border-t border-[var(--z-border-subtle)] pt-4 sm:grid-cols-2">
          <div>
            <p className={COMMAND_METRIC_LABEL}>Cutting lists (dated in period)</p>
            <p className="z-stencil mt-1 text-xl text-[var(--z-text)]">
              {loading ? '…' : `${Number(metresCuttingLists || 0).toLocaleString()} m`}
            </p>
          </div>
          {metresTarget > 0 ? (
            <div>
              <div className="mb-1.5 flex justify-between text-ui-xs font-medium text-[var(--z-text-muted)]">
                <span>Vs target</span>
                <span className="tabular-nums">{metresPct ?? 0}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-sm bg-[var(--z-surface-muted)]">
                <div
                  className="h-full bg-zarewa-teal transition-all"
                  style={{ width: `${Math.min(100, metresPct ?? 0)}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className={COMMAND_METRIC_GRID}>
        {sideTiles.map((t) => (
          <CommandMetricCard
            key={t.key}
            label={t.label}
            value={loading ? '…' : t.value}
            meta={t.meta}
            icon={t.icon}
            iconTone={t.iconTone}
            badge={t.badge}
            warn={t.warn}
          />
        ))}
      </div>
    </section>
  );
}
