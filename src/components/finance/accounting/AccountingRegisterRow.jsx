import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatNgn } from '../../../Data/mockData';
import { AccountingRegisterNavLink } from '../AccountingRegisterNavLink';
import {
  accountingRegisterPartyLink,
  accountingRegisterReferenceLink,
} from '../../../lib/accountingRegisterLinks';
import { ACCOUNTING_CARD_ROW } from './AccountingDeskUi';

/**
 * @param {{
 *   sectionId: string;
 *   item: object;
 *   canManage?: boolean;
 *   onClear?: (item: object) => void;
 *   clearing?: boolean;
 * }} props
 */
export function AccountingRegisterRow({ sectionId, item, canManage, onClear, clearing }) {
  const partyLink = accountingRegisterPartyLink(sectionId, item);
  const refLink = accountingRegisterReferenceLink(sectionId, item);
  const refText = item.reference || item.partyRef || '—';
  const meta = [item.detail, item.asAtDateIso ? `As at ${item.asAtDateIso}` : null, item.branchId || null]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className={`${ACCOUNTING_CARD_ROW} flex flex-wrap items-start justify-between gap-2 min-w-0`}>
      <div className="min-w-0 leading-tight flex-1">
        <p className="text-[11px] font-bold text-[#134e4a] truncate">
          <AccountingRegisterNavLink link={partyLink} fallback={item.partyName} />
          {item.isSignificant ? (
            <span className="ml-1 rounded bg-amber-100 px-1 text-[8px] font-bold uppercase text-amber-800">
              Significant
            </span>
          ) : null}
          {item.isLegacy ? (
            <span className="ml-1 rounded bg-slate-200 px-1 text-[8px] font-bold uppercase text-slate-600">
              Legacy
            </span>
          ) : null}
        </p>
        <p className="text-[8px] text-slate-500 mt-0.5 leading-snug line-clamp-2" title={meta}>
          {meta || '—'}
        </p>
        <p className="text-[9px] text-slate-600 mt-1">
          Ref:{' '}
          <AccountingRegisterNavLink link={refLink} fallback={refText} className="text-[9px]" />
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[11px] font-black text-[#134e4a] tabular-nums text-right">
          <span className="block text-[8px] font-semibold text-slate-500 uppercase tracking-wide">Balance</span>
          {formatNgn(item.amountNgn)}
        </span>
        {canManage && sectionId === 'legacy_inherited' && onClear ? (
          <button
            type="button"
            disabled={clearing}
            onClick={() => onClear(item)}
            className="text-[8px] font-semibold uppercase tracking-wide text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md disabled:opacity-40"
          >
            {clearing ? '…' : 'Clear'}
          </button>
        ) : partyLink?.to ? (
          <Link
            to={partyLink.to}
            state={partyLink.state}
            className="p-1 rounded-md hover:bg-slate-100"
            aria-label="Open record"
          >
            <ExternalLink size={12} className="text-[#134e4a]" />
          </Link>
        ) : null}
      </div>
    </li>
  );
}
