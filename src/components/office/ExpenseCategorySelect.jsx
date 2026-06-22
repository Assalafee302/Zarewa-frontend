import React, { useMemo } from 'react';
import { expenseCategoriesForActor, resolveExpenseCategoryPolicyLimits } from '../../shared/expenseCategoryPolicy.js';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { isExceptionExpenseCategory } from '../../shared/expenseCategoryLanes.js';
import { ExpenseCategoryHintPanel } from './ExpenseCategoryHintPanel.jsx';

/**
 * Grouped expense category picker with lane hints and role filtering.
 */
export function ExpenseCategorySelect({
  value,
  onChange,
  actor = null,
  hasPermission = () => false,
  othersMinJustificationLen: othersMinProp,
  className = '',
  required = false,
  disabled = false,
  showHints = true,
  compactHints = false,
}) {
  const ws = useWorkspace();
  const othersMinJustificationLen = useMemo(() => {
    if (Number.isFinite(Number(othersMinProp)) && Number(othersMinProp) >= 10) {
      return Math.round(Number(othersMinProp));
    }
    return resolveExpenseCategoryPolicyLimits(ws?.snapshot?.orgGovernanceLimits).othersMinJustificationLen;
  }, [othersMinProp, ws?.snapshot?.orgGovernanceLimits?.othersMinJustificationLen]);

  const groups = useMemo(
    () =>
      expenseCategoriesForActor(actor, hasPermission).map((group) => ({
        ...group,
        categories: group.categories.filter((cat) => cat !== 'Miscellaneous'),
      })),
    [actor, hasPermission]
  );

  const selectClass =
    className ||
    'w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-200/40';

  return (
    <div className="space-y-0">
      <select
        required={required}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
        aria-describedby={showHints ? 'expense-category-hints' : undefined}
      >
        <option value="" disabled>
          Select category…
        </option>
        {groups.map((group) => (
          <optgroup key={group.laneKey} label={group.label}>
            {group.categories.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {showHints ? (
        <div id="expense-category-hints">
          <ExpenseCategoryHintPanel
            category={value}
            othersMinJustificationLen={othersMinJustificationLen}
            compact={compactHints}
          />
        </div>
      ) : null}
    </div>
  );
}
