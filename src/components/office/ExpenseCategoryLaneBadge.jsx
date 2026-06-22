/**
 * Lane badge for expense categories (Finance + manager inbox).
 */
import React from 'react';
import { expenseCategoryLaneBadge, getExpenseCategoryLaneMeta, getExpenseCategoryLane } from '../../shared/expenseCategoryLanes.js';

/**
 * @param {{ category?: string; laneKey?: string; className?: string; showTooltip?: boolean }} props
 */
export function ExpenseCategoryLaneBadge({
  category = '',
  laneKey = '',
  className = '',
  showTooltip = true,
}) {
  const cat = String(category || '').trim();
  if (!cat && !laneKey) return null;
  const lane = laneKey || getExpenseCategoryLane(cat);
  const badge = expenseCategoryLaneBadge(cat, lane);
  const meta = getExpenseCategoryLaneMeta(lane);
  const title = showTooltip
    ? [cat, meta?.label, meta?.hint].filter(Boolean).join(' · ')
    : undefined;

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${badge.className} ${className}`.trim()}
      title={title}
    >
      {badge.label}
    </span>
  );
}
