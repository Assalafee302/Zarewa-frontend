import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  UserRound,
  Wallet,
  Clock,
  Building,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { CashierOtPayPanel } from './CashierOtPayPanel.jsx';
import { PartnerWalletCashierPanel } from './PartnerWalletCashierPanel.jsx';
import { CompanyRetentionPanel } from './CompanyRetentionPanel.jsx';
import { StaffPaymentsCashierPanel } from './StaffPaymentsCashierPanel.jsx';
import { RefundCreditApplicationsPanel } from './RefundCreditApplicationsPanel.jsx';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';

export function CashierSecondaryServicesPanel({
  staffRecoveriesDue = [],
  staffObligationsDue = [],
  staffRecoveriesTotalNgn = 0,
  staffObligationsTotalNgn = 0,
  partnerWalletsDue = [],
  treasuryAccounts = [],
  onWithdrawnPartnerWallets,
  onReceiveStaffRecovery,
  onReceiveStaffObligation,
  onReverseRefundCredit,
  defaultOpen = false,
  initialTab = 'staff',
}) {
  const ws = useWorkspace();
  const staffPaymentsDueCount = staffRecoveriesDue.length + staffObligationsDue.length;
  const partnerWalletsCount = partnerWalletsDue.length;
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeSubTab, setActiveSubTab] = useState(initialTab);

  useEffect(() => {
    if (defaultOpen) setIsOpen(true);
  }, [defaultOpen]);

  useEffect(() => {
    if (initialTab) setActiveSubTab(initialTab);
  }, [initialTab]);

  const subTabs = [
    {
      id: 'staff',
      label: 'Staff Payments',
      count: staffPaymentsDueCount,
      icon: UserRound,
      highlight: staffPaymentsDueCount > 0,
    },
    {
      id: 'partner',
      label: 'Partner Wallets',
      count: partnerWalletsCount,
      icon: Wallet,
      highlight: partnerWalletsCount > 0,
    },
    {
      id: 'ot',
      label: 'Cashier OT Pay',
      count: 0,
      icon: Clock,
      highlight: false,
    },
    {
      id: 'retention',
      label: 'Company Retention',
      count: 0,
      icon: Building,
      highlight: false,
    },
    {
      id: 'credits',
      label: 'Refund Credit Apps',
      count: (ws?.snapshot?.refundCreditApplications || []).length,
      icon: RotateCcw,
      highlight: false,
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
      {/* Accordion Header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex flex-wrap items-center justify-between gap-3 p-4 text-left hover:bg-slate-50/70 transition"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-zarewa-teal">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Counter &amp; Secondary Services
            </h3>
            <p className="text-ui-xs text-slate-500">
              Staff loan recoveries, partner wallets, retention floats, and overtime pay.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {staffPaymentsDueCount > 0 && (
            <span className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-900">
              {staffPaymentsDueCount} Staff Recovery Due
            </span>
          )}
          {partnerWalletsCount > 0 && (
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-900">
              {partnerWalletsCount} Partner Wallets
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
            {isOpen ? 'Collapse' : 'Expand'}
            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </div>
      </button>

      {/* Accordion Body */}
      {isOpen && (
        <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50/40">
          {/* Sub Tab Navigation */}
          <div className="flex flex-wrap gap-1.5 border-b border-slate-200/80 pb-3">
            {subTabs.map((t) => {
              const Icon = t.icon;
              const active = activeSubTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveSubTab(t.id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    active
                      ? 'bg-zarewa-teal text-white shadow-xs'
                      : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Icon size={13} />
                  <span>{t.label}</span>
                  {t.count > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                        active
                          ? 'bg-teal-900/60 text-teal-100'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Tab Panel */}
          <div>
            {activeSubTab === 'staff' && (
              <StaffPaymentsCashierPanel
                recoveries={staffRecoveriesDue}
                obligations={staffObligationsDue}
                staffRecoveriesTotalNgn={staffRecoveriesTotalNgn}
                staffObligationsTotalNgn={staffObligationsTotalNgn}
                onReceiveRecovery={onReceiveStaffRecovery}
                onReceiveObligation={onReceiveStaffObligation}
                expanded={true}
              />
            )}

            {activeSubTab === 'partner' && (
              <PartnerWalletCashierPanel
                balances={partnerWalletsDue}
                treasuryAccounts={treasuryAccounts}
                canPay={Boolean(ws?.hasPermission?.("finance.pay"))}
                onWithdrawn={onWithdrawnPartnerWallets}
              />
            )}

            {activeSubTab === 'ot' && (
              <CashierOtPayPanel embedded />
            )}

            {activeSubTab === 'retention' && (
              <CompanyRetentionPanel
                treasuryAccounts={treasuryAccounts}
                canPay={Boolean(ws?.hasPermission?.("finance.pay"))}
                canApprove={Boolean(
                  ws?.hasPermission?.("refunds.approve") || ws?.hasPermission?.("finance.approve")
                )}
                canRequest={Boolean(
                  ws?.hasPermission?.("finance.pay") ||
                    ws?.hasPermission?.("refunds.approve") ||
                    ws?.hasPermission?.("finance.approve")
                )}
              />
            )}

            {activeSubTab === 'credits' && (
              <RefundCreditApplicationsPanel
                applications={ws?.snapshot?.refundCreditApplications}
                canReverse={Boolean(ws?.hasPermission?.('finance.reverse') && onReverseRefundCredit)}
                onReverse={onReverseRefundCredit}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
