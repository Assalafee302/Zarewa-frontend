import React from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  conversionReasonOptionsForBand,
  findConversionReasonOption,
} from '../../shared/productionConversionReasons';

/**
 * Storekeeper preset picker when conversion preview is High or Low.
 *
 * @param {{
 *   band: 'High' | 'Low' | string;
 *   code: string;
 *   onCodeChange: (code: string) => void;
 *   text: string;
 *   onTextChange: (text: string) => void;
 *   disabled?: boolean;
 * }} props
 */
export function ProductionConversionReasonFields({
  band,
  code,
  onCodeChange,
  text,
  onTextChange,
  disabled = false,
}) {
  const options = conversionReasonOptionsForBand(band);
  const selected = findConversionReasonOption(code, band);
  const needsText = Boolean(selected?.requiresText);

  if (!band || (band !== 'High' && band !== 'Low') || options.length === 0) {
    return null;
  }

  const tone =
    band === 'High'
      ? 'border-amber-200 bg-amber-50/95 text-amber-950'
      : 'border-sky-200 bg-sky-50/95 text-sky-950';

  return (
    <div className={`rounded-lg border p-2 sm:p-2.5 space-y-2 ${tone}`}>
      <div className="flex items-start gap-1.5">
        <AlertTriangle size={15} className="mt-0.5 shrink-0 opacity-80" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-widest">
            {band} conversion — reason required
          </p>
          <p className="mt-1 text-[10px] leading-snug opacity-90">
            Pick the closest cause before you press <strong className="font-semibold">Complete</strong>. Managers see
            this on review.
          </p>
        </div>
      </div>
      <label className="block space-y-1">
        <span className="text-[9px] font-bold uppercase tracking-wide opacity-80">Reason</span>
        <select
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          disabled={disabled}
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-[#134e4a]/20 disabled:opacity-50"
        >
          <option value="">Select a reason…</option>
          {options.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      {needsText ? (
        <label className="block space-y-1">
          <span className="text-[9px] font-bold uppercase tracking-wide opacity-80">Details (required)</span>
          <textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            disabled={disabled}
            rows={2}
            placeholder="Briefly describe what happened…"
            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-800 outline-none focus:ring-2 focus:ring-[#134e4a]/20 resize-y min-h-[2.5rem] disabled:opacity-50"
          />
        </label>
      ) : null}
    </div>
  );
}
