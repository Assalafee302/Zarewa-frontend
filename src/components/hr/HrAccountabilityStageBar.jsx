import React from 'react';
import { ACCOUNTABILITY_STAGES } from './hrAccountabilityStages';
import { accountabilityStageCompletion } from '../../lib/hrAccountabilityStageProgress';

/**
 * @param {{
 *   detail: object | null;
 *   responsibilityOk?: boolean;
 *   recoveryCount?: number;
 *   closureOk?: boolean;
 *   activeStage?: string;
 *   onStageClick?: (id: string) => void;
 * }} props
 */
export default function HrAccountabilityStageBar({
  detail,
  responsibilityOk = false,
  recoveryCount = 0,
  closureOk = false,
  activeStage,
  onStageClick,
}) {
  if (!detail) return null;

  const done = accountabilityStageCompletion(detail, { responsibilityOk, recoveryCount, closureOk });

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Accountability stages</p>
      <p className="text-[11px] text-slate-500 mb-2">Select a stage to focus the form. Green ticks require saved content, not status alone.</p>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {ACCOUNTABILITY_STAGES.map((s) => {
          const complete = done[s.id];
          const active = activeStage === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onStageClick?.(s.id)}
              title={s.hint}
              className={`shrink-0 rounded-lg px-2 py-1.5 text-left text-[10px] font-semibold leading-tight transition-colors ${
                active
                  ? 'bg-teal-800 text-white'
                  : complete
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-teal-300'
              }`}
            >
              <span className="block">{complete && !active ? '✓ ' : ''}{s.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
