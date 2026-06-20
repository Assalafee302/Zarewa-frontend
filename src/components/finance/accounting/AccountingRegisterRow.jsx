import React from 'react';
import { ChevronRight } from 'lucide-react';
import { formatNgn } from '../../../Data/mockData';
import { REGISTER_CATEGORY_LABELS } from '../../../lib/accountingRegisterConfig';
import {
  accountingRegisterPartyLink,
  accountingRegisterReferenceLink,
} from '../../../lib/accountingRegisterLinks';
import { AccountingRegisterNavLink } from '../AccountingRegisterNavLink';
import { ACCOUNTING_CARD_ROW } from './AccountingDeskUi';

/**
 * @param {{
 *   sectionId: string;
 *   item: object;
 *   canManage?: boolean;
 *   onSelect?: (item: object) => void;
 *   onClear?: (item: object) => void;
 *   clearing?: boolean;
 * }} props
 */
export function AccountingRegisterRow({ sectionId, item, canManage, onSelect, onClear, clearing }) {
  const partyLink = accountingRegisterPartyLink(sectionId, item);
  const refLink = accountingRegisterReferenceLink(sectionId, item);
  const refText = item.reference || item.partyRef || '—';
  const categoryLabel = item.category ? REGISTER_CATEGORY_LABELS[item.category] : null;
  const meta = [
    item.detail,
    item.asAtDateIso ? `As at ${item.asAtDateIso}` : null,
    item.branchId || null,
    categoryLabel,
  ]
    .filter(Boolean)
    .join(' · ');

  const stopNav = (e) => e.stopPropagation();

  return (
    <li
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(item);
        }
      }}
      className={`${ACCOUNTING_CARD_ROW} group flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-3 min-w-0 cursor-pointer hover:border-[#134e4a]/25 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#134e4a]/20 py-3 sm:py-2 min-h-[44px] max-sm:shadow-sm max-sm:border-slate-200/90 max-sm:bg-white`}
    >
      <div className="min-w-0 leading-tight flex-1">
        <p className="text-[11px] font-bold text-[#134e4a] truncate">
          <AccountingRegisterNavLink
            link={partyLink}
            fallback={item.partyName || '—'}
            showIcon={false}
            onClick={stopNav}
          />
          {item.isSignificant ? (
            <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-900">
              Significant
            </span>
          ) : null}
          {item.isLegacy ? (
            <span className="ml-1 rounded-full bg-slate-200/90 px-1.5 py-0.5 text-[8px] font-bold uppercase text-slate-600">
              Legacy
            </span>
          ) : null}
          {item.partyLinkStatus === 'unlinked' ? (
            <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-900">
              Not linked
            </span>
          ) : null}
        </p>
        <p className="text-[8px] text-slate-500 mt-0.5 leading-snug line-clamp-2" title={meta}>
          {meta || '—'}
        </p>
        <p className="text-[9px] text-slate-600 mt-1">
          Ref:{' '}
          <AccountingRegisterNavLink
            link={refLink}
            fallback={refText}
            className="text-[9px] font-semibold"
            showIcon={Boolean(refLink?.to)}
            onClick={stopNav}
          />
        </p>
      </div>
      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 w-full sm:w-auto">
        <span className="text-sm sm:text-[11px] font-black text-[#134e4a] tabular-nums text-right">
          <span className="block text-[8px] font-semibold text-slate-500 uppercase tracking-wide">Balance</span>
          {formatNgn(item.amountNgn)}
        </span>
        {canManage && sectionId === 'legacy_inherited' && onClear ? (
          <button
            type="button"
            disabled={clearing}
            onClick={(e) => {
              e.stopPropagation();
              onClear(item);
            }}
            className="text-[9px] font-semibold uppercase tracking-wide text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-md disabled:opacity-40 min-h-11 min-w-[44px]"
          >
            {clearing ? '…' : 'Clear'}
          </button>
        ) : (
          <ChevronRight
            size={18}
            className="text-slate-400 group-hover:text-[#134e4a] transition-colors shrink-0 min-h-11 min-w-[44px] p-2"
            aria-hidden
          />
        )}
      </div>
    </li>
  );
}
