import React from 'react';
import { Sparkles } from 'lucide-react';

/**
 * Zare writing assist — suggestions only applied on user confirmation.
 */
export default function ZareWritingAssistCard({
  suggestion,
  onApplyWording,
  onAddMissingFields,
  onChangeCategory,
  onIgnore,
}) {
  if (!suggestion) return null;
  const { suggestedTitle, improvedBody, missingFields = [], recordTypeLabel } = suggestion;

  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50/80 p-4 shadow-sm" role="region" aria-label="Zare writing assist">
      <div className="flex items-start gap-2">
        <Sparkles size={18} className="mt-0.5 shrink-0 text-teal-700" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-teal-900">Zare suggestion</p>
          {recordTypeLabel ? (
            <p className="mt-1 text-sm text-teal-950">
              This looks like a <strong>{recordTypeLabel}</strong>.
            </p>
          ) : null}
          {suggestedTitle ? (
            <p className="mt-2 text-xs text-slate-700">
              <span className="font-semibold">Suggested title:</span> {suggestedTitle}
            </p>
          ) : null}
          {improvedBody ? (
            <p className="mt-2 text-sm leading-relaxed text-slate-800">{improvedBody}</p>
          ) : null}
          {missingFields.length > 0 ? (
            <div className="mt-2">
              <p className="text-xs font-semibold text-amber-900">Missing details:</p>
              <ul className="mt-1 list-inside list-disc text-xs text-amber-950">
                {missingFields.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {onApplyWording ? (
              <button
                type="button"
                onClick={onApplyWording}
                className="rounded-lg bg-teal-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-900"
              >
                Apply improved wording
              </button>
            ) : null}
            {onAddMissingFields ? (
              <button
                type="button"
                onClick={onAddMissingFields}
                className="rounded-lg border border-teal-300 bg-white px-3 py-1.5 text-xs font-semibold text-teal-900 hover:bg-teal-50"
              >
                Add missing details
              </button>
            ) : null}
            {onChangeCategory ? (
              <button
                type="button"
                onClick={onChangeCategory}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Change category
              </button>
            ) : null}
            {onIgnore ? (
              <button type="button" onClick={onIgnore} className="px-2 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900">
                Ignore
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
