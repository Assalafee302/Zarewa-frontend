import React from 'react';

/**
 * Compact page chrome: title, then wrapping tools, then section tabs.
 * @param {string} [eyebrow] — Quiet module label above the title
 * @param {string} [title] — Visible page heading
 * @param {React.ReactNode} [subtitle]
 * @param {React.ReactNode} [tabs]
 * @param {React.ReactNode} [search]
 * @param {React.ReactNode} [toolbar]
 * @param {React.ReactNode} [actions]
 * @param {React.ReactNode} [trailing] — Alias for toolbar (finance header)
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  tabs,
  search,
  toolbar,
  actions,
  trailing,
}) {
  const tools = toolbar ?? actions ?? trailing;
  const hasSearch = search != null && search !== false;
  const hasTools = tools != null && tools !== false;
  const a11yTitle = title || eyebrow || 'Page';

  return (
    <header className="mb-4 sm:mb-5">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="min-w-0 overflow-hidden">
          {eyebrow ? (
            <p className="z-label-caps mb-1">{eyebrow}</p>
          ) : null}
          <h1 className="z-page-title">{a11yTitle}</h1>
          {subtitle ? <p className="z-page-subtitle">{subtitle}</p> : null}
        </div>
        {hasSearch || hasTools ? (
          <div className="flex min-w-0 w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            {hasSearch ? <div className="min-w-0 w-full sm:flex-1 sm:max-w-md">{search}</div> : null}
            {hasTools ? (
              <div className="flex min-w-0 w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
                {tools}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {tabs ? <div className="mt-3 min-w-0">{tabs}</div> : null}
    </header>
  );
}
