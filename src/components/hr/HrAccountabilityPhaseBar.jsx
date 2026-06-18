import React from 'react';
import { ACCOUNTABILITY_PHASES } from './hrAccountabilityStages';
import { accountabilityPhaseCompletion } from '../../lib/hrAccountabilityStageProgress';

/**
 * @param {{
 *   detail: object | null;
 *   responsibilityOk?: boolean;
 *   recoveryCount?: number;
 *   closureOk?: boolean;
 *   activePhase?: string;
 *   onPhaseClick?: (id: string) => void;
 * }} props
 */
export default function HrAccountabilityPhaseBar({
  detail,
  responsibilityOk = false,
  recoveryCount = 0,
  closureOk = false,
  activePhase,
  onPhaseClick,
}) {
  if (!detail) return null;

  const done = accountabilityPhaseCompletion(detail, { responsibilityOk, recoveryCount, closureOk });
  const activeMeta = ACCOUNTABILITY_PHASES.find((p) => p.id === activePhase);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Case workflow — 4 steps</p>
        <p className="text-[10px] text-slate-500">Green = ready · click any step to jump</p>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {ACCOUNTABILITY_PHASES.map((p) => {
          const complete = done[p.id];
          const active = activePhase === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPhaseClick?.(p.id)}
              title={p.hint}
              className={`shrink-0 rounded-lg px-3 py-2 text-left text-xs font-semibold leading-tight transition-colors min-w-[7rem] ${
                active
                  ? 'bg-teal-800 text-white shadow-sm'
                  : complete
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-teal-300'
              }`}
            >
              <span className="block">{complete && !active ? '✓ ' : ''}{p.label}</span>
            </button>
          );
        })}
      </div>
      {activeMeta ? (
        <p className="text-xs text-slate-600 border-t border-slate-200/80 pt-2">{activeMeta.summary}</p>
      ) : null}
    </div>
  );
}
