import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Banknote, ExternalLink, FileText, Pencil, Trash2, User } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import {
  accountingRegisterPartyLink,
  accountingRegisterReferenceLink,
} from '../../lib/accountingRegisterLinks';
import { REGISTER_CATEGORY_LABELS } from '../../lib/accountingRegisterConfig';
import { ModalFrame } from '../layout/ModalFrame';
import { ProcurementFormSection } from '../procurement/ProcurementFormSection';
import { AccountingRegisterNavLink } from './AccountingRegisterNavLink';
import { useRegisterSettlements, useRegisterSettlementMutations } from '../../hooks/useAccountingRegisterSettlements';
import { useWorkspace } from '../../context/WorkspaceContext';
import { AccountingRegisterSettlementRequestModal } from './AccountingRegisterSettlementRequestModal';
import { AccountingRegisterSettlementPayModal } from './AccountingRegisterSettlementPayModal';
import { AccountingRegisterSettlementDecisionModal } from './AccountingRegisterSettlementDecisionModal';

const SECTION_ACTIONS = {
  staff_loans: [
    { label: 'HR employee record', icon: User, resolve: (s, i) => accountingRegisterPartyLink(s, i) },
    { label: 'Payroll & deductions', to: '/accounting', state: { focusTab: 'payroll' } },
  ],
  customer_receivables: [
    { label: 'Customer financial tab', icon: User, resolve: (s, i) => accountingRegisterPartyLink(s, i) },
    { label: 'Sales quotations', to: '/sales' },
  ],
  supplier_prepayments: [
    { label: 'Supplier profile', icon: Building2, resolve: (s, i) => accountingRegisterPartyLink(s, i) },
    { label: 'Procurement payables', to: '/procurement', state: { focusTab: 'payables' } },
  ],
  supplier_payables: [
    { label: 'Supplier profile', icon: Building2, resolve: (s, i) => accountingRegisterPartyLink(s, i) },
    { label: 'Procurement payables', to: '/procurement', state: { focusTab: 'payables' } },
  ],
  customer_deposits: [
    { label: 'Customer ledger', icon: User, resolve: (s, i) => accountingRegisterPartyLink(s, i) },
    { label: 'Finance receipts', to: '/accounts?tab=receipts' },
  ],
  deposit_on_production_line: [
    { label: 'Operations production', to: '/operations', state: { focusTab: 'production' } },
    { label: 'Quotation', icon: FileText, resolve: (s, i) => accountingRegisterReferenceLink(s, i) },
  ],
  deposit_paid_backlog: [
    { label: 'Sales quotations', to: '/sales' },
    { label: 'Customer ledger', icon: User, resolve: (s, i) => accountingRegisterPartyLink(s, i) },
  ],
  customer_refund_commitments: [
    { label: 'Customer record', icon: User, resolve: (s, i) => accountingRegisterPartyLink(s, i) },
    { label: 'Finance refunds', to: '/accounts?tab=refunds' },
  ],
  unallocated_receipts: [
    { label: 'Open receipt in Sales', icon: FileText, resolve: (s, i) => accountingRegisterReferenceLink(s, i) },
    { label: 'Finance receipts queue', to: '/accounts?tab=receipts' },
  ],
  bank_deposit_suspense: [
    { label: 'Finance bank deposit pool', to: '/accounts?tab=receipts' },
    { label: 'Link from Sales', to: '/sales' },
  ],
  inter_branch_receivable: [{ label: 'Treasury movements', to: '/accounts?tab=movements' }],
  inter_branch_payable: [{ label: 'Treasury movements', to: '/accounts?tab=movements' }],
  external_loans: [
    { label: 'Record settlement payment', icon: Banknote, to: '/accounting', state: { focusTab: 'creditors' } },
    { label: 'Finance desk', to: '/accounts?tab=desk' },
  ],
  legacy_inherited: [
    { label: 'Open linked party', icon: User, resolve: (s, i) => accountingRegisterPartyLink(s, i) },
  ],
};

function DetailField({ label, children }) {
  if (children == null || children === '') return null;
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-0.5 text-[11px] font-semibold text-slate-800 break-words">{children}</p>
    </div>
  );
}

/**
 * @param {{
 *   item: object | null;
 *   sectionId: string;
 *   sectionTitle?: string;
 *   registerSide: 'creditor' | 'debtor';
 *   canManage?: boolean;
 *   onClose: () => void;
 *   onClear?: (item: object) => void;
 *   onEdit?: (item: object) => void;
 *   onSettlementChanged?: () => void;
 *   clearing?: boolean;
 * }} props
 */
export function AccountingRegisterDetailModal({
  item,
  sectionId,
  sectionTitle,
  registerSide,
  canManage,
  onClose,
  onClear,
  onEdit,
  onSettlementChanged,
  clearing,
}) {
  const ws = useWorkspace();
  const [requestOpen, setRequestOpen] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [decisionTarget, setDecisionTarget] = useState(null);
  const [decisionMode, setDecisionMode] = useState('Approved');
  const legacyLine = Boolean(item?.isLegacy && sectionId === 'legacy_inherited');
  const canWithdraw = legacyLine && registerSide === 'debtor' && canManage;
  const { items: settlements, loading: settlementsLoading, reload: reloadSettlements } = useRegisterSettlements({
    registerLineId: legacyLine ? item?.id : undefined,
    enabled: legacyLine && Boolean(item?.id),
  });
  const { busy: settleBusy, withdrawSettlement } = useRegisterSettlementMutations();
  const canApprove =
    ws?.hasPermission?.('finance.approve') ||
    ws?.hasPermission?.('refunds.approve') ||
    ws?.hasPermission?.('*');
  const canPay = ws?.hasPermission?.('finance.pay');
  const currentUserId = String(ws?.session?.user?.id || '').trim();

  if (!item) return null;

  const partyLink = accountingRegisterPartyLink(sectionId, item);
  const refLink = accountingRegisterReferenceLink(sectionId, item);
  const categoryLabel = item.category ? REGISTER_CATEGORY_LABELS[item.category] || item.category : null;
  const actions = (SECTION_ACTIONS[sectionId] || []).map((a) => {
    if (a.resolve) {
      const link = a.resolve(sectionId, item);
      return link?.to ? { ...a, to: link.to, state: link.state } : null;
    }
    return a;
  }).filter(Boolean);

  const sideLabel = registerSide === 'creditor' ? 'Receivable' : 'Payable / credit';
  const activeSettlements = settlements.filter((s) => s.status === 'Pending' || s.status === 'Approved');
  const historySettlements = settlements.filter((s) => s.status !== 'Pending' && s.status !== 'Approved');

  const handleWithdraw = async (settlement) => {
    const result = await withdrawSettlement(settlement.settlementId);
    if (result.ok) {
      void reloadSettlements();
      onSettlementChanged?.();
    }
  };

  return (
    <ModalFrame isOpen onClose={onClose} title="Register line detail" surface="plain">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200/90 bg-white shadow-xl overflow-hidden">
        <div className="h-1 bg-[#134e4a]" />
        <div className="p-5 sm:p-6 max-h-[min(85dvh,720px)] overflow-y-auto custom-scrollbar">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{sectionTitle || 'Register line'}</p>
              <h2 className="text-lg font-bold text-[#134e4a] mt-1 break-words">
                {partyLink?.to ? (
                  <AccountingRegisterNavLink link={partyLink} fallback={item.partyName} showIcon={false} />
                ) : (
                  item.partyName || '—'
                )}
              </h2>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {item.isSignificant ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-bold uppercase text-amber-900">
                    Significant
                  </span>
                ) : null}
                {item.isLegacy ? (
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[8px] font-bold uppercase text-slate-700">
                    Legacy
                  </span>
                ) : null}
                {categoryLabel ? (
                  <span className="rounded-full bg-teal-50 border border-teal-100 px-2 py-0.5 text-[8px] font-bold uppercase text-teal-900">
                    {categoryLabel}
                  </span>
                ) : null}
                {item.partyLinkStatus === 'unlinked' ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-bold uppercase text-amber-900">
                    Not linked
                  </span>
                ) : null}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{sideLabel}</p>
              <p className="text-xl font-black text-[#134e4a] tabular-nums">{formatNgn(item.amountNgn)}</p>
            </div>
          </div>

          {item.partyLinkStatus === 'unlinked' && item.partyLinkWarning ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-950 leading-relaxed">
              {item.partyLinkWarning}
              {canManage && onEdit ? (
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  className="mt-2 block text-[10px] font-bold uppercase tracking-wide text-amber-900 underline hover:no-underline"
                >
                  Edit and link party
                </button>
              ) : null}
            </div>
          ) : null}

          <ProcurementFormSection letter="D" title="Details" compact>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailField label="Party reference">{item.partyRef}</DetailField>
              <DetailField label="Branch">{item.branchId}</DetailField>
              <DetailField label="As-at date">{item.asAtDateIso}</DetailField>
              <DetailField label="Reference">
                {refLink?.to ? (
                  <AccountingRegisterNavLink link={refLink} fallback={item.reference || item.partyRef} className="text-[11px]" />
                ) : (
                  item.reference || item.partyRef || '—'
                )}
              </DetailField>
              <DetailField label="Description">{item.detail || item.description}</DetailField>
              {item.notes ? <DetailField label="Internal notes">{item.notes}</DetailField> : null}
            </div>
          </ProcurementFormSection>

          {actions.length ? (
            <ProcurementFormSection letter="A" title="Quick actions" compact>
              <ul className="space-y-1.5">
                {actions.map((a) => {
                  const ActionIcon = a.icon;
                  return (
                  <li key={a.label}>
                    <Link
                      to={a.to}
                      state={a.state}
                      onClick={onClose}
                      className={`${registerSide === 'creditor' ? '' : ''} flex items-center justify-between gap-2 rounded-lg border border-slate-200/80 bg-slate-50/50 px-3 py-2 text-[10px] font-bold text-[#134e4a] hover:bg-white hover:border-[#134e4a]/20 transition-colors`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {ActionIcon ? <ActionIcon size={12} /> : <ExternalLink size={12} />}
                        {a.label}
                      </span>
                      <ArrowRight size={12} className="opacity-50" />
                    </Link>
                  </li>
                  );
                })}
              </ul>
            </ProcurementFormSection>
          ) : null}

          {legacyLine ? (
            <ProcurementFormSection letter="S" title="Withdrawal requests" compact>
              {settlementsLoading ? (
                <p className="text-[10px] text-slate-500">Loading withdrawal requests…</p>
              ) : activeSettlements.length ? (
              <ul className="space-y-1.5">
                {activeSettlements.map((s) => {
                  const out = Math.max(0, (s.approvedAmountNgn || s.amountNgn) - (s.paidAmountNgn || 0));
                  const isOwnPending =
                    s.status === 'Pending' &&
                    currentUserId &&
                    String(s.requestedByUserId || '') === currentUserId;
                  return (
                    <li
                      key={s.settlementId}
                      className="rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-[10px]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-[#134e4a]">{s.settlementId}</span>
                        <span className="font-semibold text-slate-600">{s.status}</span>
                      </div>
                      <p className="mt-0.5 text-slate-600">
                        {formatNgn(s.amountNgn)}
                        {s.status === 'Approved' ? ` · pay ${formatNgn(out)}` : ''}
                        {s.status === 'Pending' ? ' · holds balance until approved, rejected, or withdrawn' : ''}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {s.status === 'Pending' && canApprove ? (
                          <>
                            <button
                              type="button"
                              disabled={settleBusy}
                              onClick={() => {
                                setDecisionTarget(s);
                                setDecisionMode('Approved');
                              }}
                              className="rounded border border-teal-200 bg-teal-50 px-2 py-0.5 text-[8px] font-bold uppercase text-teal-900"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={settleBusy}
                              onClick={() => {
                                setDecisionTarget(s);
                                setDecisionMode('Rejected');
                              }}
                              className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[8px] font-bold uppercase text-rose-800"
                            >
                              Reject
                            </button>
                          </>
                        ) : null}
                        {isOwnPending || (s.status === 'Pending' && canManage) ? (
                          <button
                            type="button"
                            disabled={settleBusy}
                            onClick={() => void handleWithdraw(s)}
                            className="rounded border border-slate-300 bg-slate-50 px-2 py-0.5 text-[8px] font-bold uppercase text-slate-800"
                          >
                            Withdraw
                          </button>
                        ) : null}
                        {s.status === 'Pending' && !canApprove && !isOwnPending ? (
                          <span className="text-[9px] font-medium text-amber-800 self-center">
                            Awaiting MD/finance approval
                          </span>
                        ) : null}
                        {s.status === 'Approved' && canPay && out > 0 ? (
                          <button
                            type="button"
                            onClick={() => setPayTarget(s)}
                            className="rounded bg-[#134e4a] text-white px-2 py-0.5 text-[8px] font-bold uppercase"
                          >
                            Pay
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
              ) : (
                <p className="text-[10px] text-slate-500">No active withdrawal requests on this line.</p>
              )}
              {historySettlements.length ? (
                <p className="mt-2 text-[9px] text-slate-500">
                  {historySettlements.length} earlier request(s) — paid, rejected, or withdrawn.
                </p>
              ) : null}
            </ProcurementFormSection>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-3 mt-2 border-t border-slate-100">
            {canWithdraw ? (
              <button
                type="button"
                onClick={() => setRequestOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-teal-950 hover:bg-teal-100"
              >
                <Banknote size={12} />
                Request withdrawal
              </button>
            ) : null}
            {canManage && sectionId === 'legacy_inherited' && onEdit ? (
              <button
                type="button"
                onClick={() => {
                  onEdit(item);
                  onClose();
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#134e4a] hover:bg-slate-50"
              >
                <Pencil size={12} />
                Edit line
              </button>
            ) : null}
            {canManage && sectionId === 'legacy_inherited' && onClear ? (
              <button
                type="button"
                disabled={clearing}
                onClick={() => onClear(item)}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-rose-800 hover:bg-rose-100 disabled:opacity-50"
              >
                <Trash2 size={12} />
                {clearing ? 'Clearing…' : 'Mark cleared'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center rounded-lg bg-[#134e4a] text-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <AccountingRegisterSettlementRequestModal
        item={item}
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        onSaved={() => {
          setRequestOpen(false);
          void reloadSettlements();
          onSettlementChanged?.();
        }}
      />
      <AccountingRegisterSettlementDecisionModal
        settlement={decisionTarget}
        open={Boolean(decisionTarget)}
        mode={decisionMode}
        onClose={() => setDecisionTarget(null)}
        onDone={() => {
          void reloadSettlements();
          onSettlementChanged?.();
        }}
      />
      <AccountingRegisterSettlementPayModal
        settlement={payTarget}
        open={Boolean(payTarget)}
        onClose={() => setPayTarget(null)}
        onPaid={() => {
          setPayTarget(null);
          void reloadSettlements();
          onSettlementChanged?.();
          onClose();
        }}
      />
    </ModalFrame>
  );
}
