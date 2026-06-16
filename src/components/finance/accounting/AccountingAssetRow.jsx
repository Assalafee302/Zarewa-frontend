import React from 'react';
import { ChevronRight } from 'lucide-react';
import { formatNgn } from '../../../Data/mockData';
import { ACCOUNTING_CARD_ROW } from './AccountingDeskUi';

/**
 * @param {{ asset: object; categoryLabel: string; branchLabel: string; onSelect: (asset: object) => void }} props
 */
export function AccountingAssetRow({ asset, categoryLabel, branchLabel, onSelect }) {
  const meta = [
    categoryLabel,
    branchLabel,
    asset.acquisitionDateIso ? `Acq ${String(asset.acquisitionDateIso).slice(0, 10)}` : null,
    asset.status === 'active' ? 'Active' : 'Disposed',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <li
      role="button"
      tabIndex={0}
      onClick={() => onSelect(asset)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(asset);
        }
      }}
      className={`${ACCOUNTING_CARD_ROW} group flex flex-wrap items-start justify-between gap-2 min-w-0 cursor-pointer hover:border-[#134e4a]/25 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#134e4a]/20`}
    >
      <div className="min-w-0 flex-1 leading-tight">
        <p className="text-[11px] font-bold text-[#134e4a] truncate">{asset.name}</p>
        <p className="text-[8px] text-slate-500 mt-0.5">{meta}</p>
        <p className="text-[9px] text-slate-600 mt-1 tabular-nums">
          Cost {formatNgn(asset.costNgn)} · Dep {formatNgn(asset.accumulatedDepreciationNgn)}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[11px] font-black text-[#134e4a] tabular-nums text-right">
          <span className="block text-[8px] font-semibold text-slate-500 uppercase tracking-wide">NBV</span>
          {formatNgn(asset.netBookValueNgn)}
        </span>
        <ChevronRight size={14} className="text-slate-400 group-hover:text-[#134e4a]" aria-hidden />
      </div>
    </li>
  );
}
