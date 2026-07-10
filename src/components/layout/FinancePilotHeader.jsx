import React from 'react';

/**
 * Sequence-style finance pilot header: title block left, tab search + actions right,
 * section tabs on a dedicated row below (full width scroll on small screens).
 */
export function FinancePilotHeader({
  eyebrow = 'Finance',
  title,
  subtitle,
  tabs,
  search,
  trailing,
}) {
  const a11yTitle = title || eyebrow || 'Finance';

  return (
    <header className="mb-6 sm:mb-8 space-y-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between xl:gap-8">
        <div className="min-w-0 flex gap-3 sm:gap-4 flex-1">
          <span
            className="hidden sm:block w-1 shrink-0 rounded-full bg-gradient-to-b from-teal-400 via-teal-600 to-zarewa-teal self-stretch min-h-[3rem] shadow-sm"
            aria-hidden
          />
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400 mb-1">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="z-page-title">{a11yTitle}</h1>
            {subtitle ? <p className="z-page-subtitle">{subtitle}</p> : null}
          </div>
        </div>

        <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center xl:max-w-[min(100%,28rem)] xl:shrink-0">
          {search ? <div className="min-w-0 w-full flex-1">{search}</div> : null}
          {trailing ? (
            <div className="flex flex-wrap items-center gap-2 shrink-0 sm:justify-end">{trailing}</div>
          ) : null}
        </div>
      </div>

      {tabs ? (
        <div className="border-t border-slate-100 pt-4 -mx-0.5 px-0.5 overflow-x-auto [-webkit-overflow-scrolling:touch]">
          {tabs}
        </div>
      ) : null}
    </header>
  );
}
