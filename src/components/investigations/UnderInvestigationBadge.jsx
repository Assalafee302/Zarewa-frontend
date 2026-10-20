import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';

/**
 * Red badge for a record linked to an open investigation hold.
 * Shows the case number only. It does not open the case file.
 */
export function UnderInvestigationBadge({ kind, id, caseId = '', label = '' }) {
  const [text, setText] = useState(label || (caseId ? `Under investigation: ${caseId}` : ''));

  useEffect(() => {
    if (label || caseId || !kind || !id) return undefined;
    let cancelled = false;
    apiFetch(
      `/api/investigation-platform/badges?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(id)}`
    ).then(({ ok, data }) => {
      if (cancelled || !ok) return;
      const badge = data?.badges?.[id];
      setText(badge?.label || '');
    });
    return () => {
      cancelled = true;
    };
  }, [kind, id, caseId, label]);

  if (!text) return null;
  return (
    <span className="inline-flex items-center rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
      {text}
    </span>
  );
}
