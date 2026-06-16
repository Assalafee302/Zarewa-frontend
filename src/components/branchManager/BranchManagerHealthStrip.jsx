import React from 'react';
import { Activity } from 'lucide-react';

const TONE_STYLES = {
  green: 'border-emerald-200/80 bg-emerald-50/90 text-emerald-950',
  amber: 'border-amber-200/80 bg-amber-50/90 text-amber-950',
  red: 'border-rose-200/80 bg-rose-50/95 text-rose-950',
};

const DOT_STYLES = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-rose-500',
};

/**
 * Branch health at a glance — one chip per operational area.
 */
export function BranchManagerHealthStrip({ signals = [], onSelect, compact = false }) {
  if (!signals.length) return null;

  return (
    <section
      className={`mb-6 rounded-2xl border border-slate-200/90 bg-white shadow-sm ${
        compact ? 'p-3 sm:p-4' : 'p-4'
      }`}
      aria-label="Branch health"
    >
      <div className={`flex items-center gap-2 ${compact ? 'mb-2 sm:mb-3' : 'mb-3'}`}>
        <Activity size={compact ? 14 : 16} className="text-[#134e4a] shrink-0" aria-hidden />
        <h2 className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.18em] text-[#134e4a]">
          Branch pulse
        </h2>
        <p className="text-[10px] text-slate-500 ml-auto hidden sm:block">
          Green = clear · Amber = attention · Red = urgent
        </p>
      </div>
      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 custom-scrollbar -mx-0.5 px-0.5">
        {signals.map((s) => {
          const tone = s.tone || 'green';
          const clickable = typeof onSelect === 'function';
          const Tag = clickable ? 'button' : 'div';
          return (
            <Tag
              key={s.key}
              type={clickable ? 'button' : undefined}
              title={s.hint || s.label}
              onClick={clickable ? () => onSelect(s.key) : undefined}
              className={`shrink-0 flex items-center gap-1.5 sm:gap-2 rounded-xl border transition-colors ${
                compact ? 'px-2.5 py-1.5 sm:px-3 sm:py-2 min-w-[6.25rem] sm:min-w-[7.5rem]' : 'px-3 py-2 min-w-[7.5rem]'
              } ${TONE_STYLES[tone] || TONE_STYLES.green} ${clickable ? 'hover:brightness-[0.98] cursor-pointer' : ''}`}
            >
              <span className={`h-2 w-2 rounded-full shrink-0 ${DOT_STYLES[tone] || DOT_STYLES.green}`} aria-hidden />
              <span className="min-w-0 text-left">
                <span className="block text-[8px] sm:text-[9px] font-bold uppercase tracking-wide opacity-80">
                  {s.label}
                </span>
                <span className={`block font-black tabular-nums leading-tight ${compact ? 'text-xs sm:text-sm' : 'text-sm'}`}>
                  {s.count}
                </span>
              </span>
            </Tag>
          );
        })}
      </div>
    </section>
  );
}
