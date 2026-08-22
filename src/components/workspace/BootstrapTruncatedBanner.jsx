import React from 'react';

/** Bootstrap truncation notice when server sends capped or deferred desk lists. */
export function BootstrapTruncatedBanner({ bootstrapMeta }) {
  const limits = bootstrapMeta?.listLimitsApplied;
  const truncated = bootstrapMeta?.truncated;
  const deferred = Array.isArray(bootstrapMeta?.deferredDeskArrays)
    ? bootstrapMeta.deferredDeskArrays.filter(Boolean)
    : [];
  if (deferred.length) {
    const sample = deferred.slice(0, 4).join(', ');
    return (
      <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
        First load skipped full {sample}. Open the desk (Sales, Operations, Account) for the complete
        register.
      </div>
    );
  }
  if (!limits || !truncated) return null;
  const keys = Object.keys(truncated).filter((k) => truncated[k]);
  if (!keys.length) return null;
  const sample = keys.slice(0, 3).map((k) => `${k} (recent ${limits[k]})`).join(', ');
  return (
    <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
      Showing recent workspace data only — {sample}. Search or open the full register for older records.
    </div>
  );
}
