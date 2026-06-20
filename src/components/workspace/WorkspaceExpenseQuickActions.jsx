import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Plus, X } from 'lucide-react';
import { ModalFrame } from '../layout';
import { ExpenseRequestFormFields } from '../office/ExpenseRequestFormFields.jsx';
import { formatNgn } from '../../Data/mockData';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { apiFetch } from '../../lib/apiBase';
import { buildPaymentRequestBodyFromForm, initialExpenseRequestFormState } from '../../lib/expenseRequestFormCore.js';
import { EXPENSE_CATEGORY_OPTIONS } from '../../shared/expenseCategories.js';
import { treasuryAccountDisplayName, treasuryAccountsForWorkspace } from '../../lib/treasuryAccountsStore';
import { compareSelectLabels } from '../../lib/selectOptionSort';
import { canAccessMyProfileHr } from '../../lib/hrAccess';

/**
 * Workspace-only entry for expense payment requests (and optional direct expense for finance or sales).
 * Does not navigate to /accounts — users without the Finance module can still submit requests for approval.
 */
export function WorkspaceExpenseQuickActions() {
  const ws = useWorkspace();
  const { show: showToast } = useToast();
  const payRequestFileRef = useRef(null);
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const canFinance = ws?.canAccessModule?.('finance') !== false;
  const canSubmitExpenseRequest =
    Boolean(ws?.hasPermission?.('expenses.create')) || Boolean(ws?.hasPermission?.('finance.post'));
  const canRecordDirectExpense =
    Boolean(ws?.hasPermission?.('finance.post')) || Boolean(ws?.hasPermission?.('expenses.create'));
  const activeActorLabel = ws?.session?.user?.displayName ?? 'User';

  const bankAccounts = useMemo(
    () =>
      ws?.hasWorkspaceData
        ? treasuryAccountsForWorkspace(ws?.snapshot, ws?.session, {
            branchScope: ws?.branchScope,
            viewAllBranches: ws?.viewAllBranches,
          })
        : [],
    [
      ws?.hasWorkspaceData,
      ws?.snapshot,
      ws?.session,
      ws?.branchScope,
      ws?.viewAllBranches,
    ]
  );

  const bankAccountsSorted = useMemo(
    () => [...bankAccounts].sort((a, b) => compareSelectLabels(treasuryAccountDisplayName(a), treasuryAccountDisplayName(b))),
    [bankAccounts]
  );

  const expenseCategoriesSorted = useMemo(
    () => [...EXPENSE_CATEGORY_OPTIONS].sort((a, b) => compareSelectLabels(a, b)),
    []
  );

  const [showPayRequestModal, setShowPayRequestModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [savingPayRequest, setSavingPayRequest] = useState(false);
  const [requestForm, setRequestForm] = useState(() => ({
    ...initialExpenseRequestFormState(),
    requestDate: '',
    requestReference: '',
    expenseCategory: '',
    description: '',
    attachment: null,
  }));
  const [expenseForm, setExpenseForm] = useState({
    expenseType: 'COGS — materials & stock',
    amountNgn: '',
    date: '',
    category: '',
    paymentMethod: 'Bank Transfer',
    debitAccountId: '',
    reference: '',
  });

  const openExpenseRequest = useCallback(() => {
    setRequestForm({
      ...initialExpenseRequestFormState(),
      requestDate: todayIso,
      requestReference: '',
      expenseCategory: '',
      description: '',
      attachment: null,
    });
    if (payRequestFileRef.current) payRequestFileRef.current.value = '';
    setShowPayRequestModal(true);
  }, [todayIso]);

  const openExpenseEntry = useCallback(() => {
    setExpenseForm((f) => ({
      ...f,
      debitAccountId: String(bankAccounts[0]?.id ?? ''),
    }));
    setShowExpenseModal(true);
  }, [bankAccounts]);

  const savePayRequest = async (e) => {
    e.preventDefault();
    if (savingPayRequest) return;
    const body = buildPaymentRequestBodyFromForm(requestForm);
    if (!String(body.expenseCategory || '').trim()) {
      showToast('Select an expense category from the list.', { variant: 'error' });
      return;
    }
    if (!body.lineItems?.length) {
      showToast('Add at least one line with description, quantity, and unit price.', { variant: 'error' });
      return;
    }
    if (ws?.canMutate) {
      setSavingPayRequest(true);
      try {
        const { ok, data } = await apiFetch('/api/payment-requests', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        if (!ok || !data?.ok) {
          showToast(data?.error || 'Could not save request on server.', { variant: 'error' });
          return;
        }
        await ws.refresh();
      } finally {
        setSavingPayRequest(false);
      }
    } else {
      showToast(
        ws?.usingCachedData
          ? 'Reconnect to submit payment requests — workspace is read-only.'
          : 'Connect to the API to submit payment requests.',
        { variant: 'info' }
      );
      return;
    }
    setRequestForm({
      ...initialExpenseRequestFormState(),
      requestDate: '',
      requestReference: '',
      expenseCategory: '',
      description: '',
      attachment: null,
    });
    if (payRequestFileRef.current) payRequestFileRef.current.value = '';
    setShowPayRequestModal(false);
    showToast('Expense request submitted for approval.');
  };

  const saveExpense = async (e) => {
    e.preventDefault();
    if (savingExpense) return;
    const amount = Number(expenseForm.amountNgn);
    const debitId = Number(expenseForm.debitAccountId);
    if (!expenseForm.category.trim() || Number.isNaN(amount) || amount <= 0) return;
    if (!debitId) {
      showToast('Select the account paying this expense.', { variant: 'error' });
      return;
    }
    const debitAcc = bankAccounts.find((a) => a.id === debitId);
    if (!debitAcc || debitAcc.balance < amount) {
      showToast('Selected account has insufficient balance.', { variant: 'error' });
      return;
    }
    const row = {
      expenseType: expenseForm.expenseType,
      amountNgn: amount,
      date: expenseForm.date || new Date().toISOString().slice(0, 10),
      category: expenseForm.category.trim(),
      paymentMethod: expenseForm.paymentMethod,
      debitAccountId: debitId,
      reference: expenseForm.reference.trim() || '—',
    };
    if (ws?.canMutate) {
      setSavingExpense(true);
      let ok = false;
      let data = null;
      try {
        ({ ok, data } = await apiFetch('/api/expenses', {
          method: 'POST',
          body: JSON.stringify({
            ...row,
            treasuryAccountId: debitId,
            createdBy: activeActorLabel,
          }),
        }));
      } finally {
        setSavingExpense(false);
      }
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not save expense on server.', { variant: 'error' });
        return;
      }
      await ws.refresh();
    } else {
      showToast(
        ws?.usingCachedData
          ? 'Reconnect to save expenses — workspace is read-only.'
          : 'Connect to the API to record expenses.',
        { variant: 'info' }
      );
      return;
    }
    setExpenseForm({
      expenseType: 'COGS — materials & stock',
      amountNgn: '',
      date: '',
      category: '',
      paymentMethod: 'Bank Transfer',
      debitAccountId: String(bankAccounts[0]?.id ?? ''),
      reference: '',
    });
    setShowExpenseModal(false);
    showToast('Expense recorded and synced.');
  };

  if (!ws?.session) return null;

  if (!canSubmitExpenseRequest) {
    return (
      <div className="rounded-zarewa border border-slate-200/75 bg-white p-5 shadow-[var(--shadow-sequence)] ring-1 ring-teal-500/10">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#134e4a] flex items-center gap-2">
          <ClipboardList size={14} strokeWidth={2} aria-hidden />
          Expenses &amp; requests
        </h3>
        <p className="mt-2 text-[10px] text-slate-600 leading-snug">
          Your account does not have <strong>expenses.create</strong> permission. Ask an administrator to assign the
          Sales officer role (or add expense request permission), then sign out and back in.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-zarewa border border-slate-200/75 bg-white p-5 shadow-[var(--shadow-sequence)] space-y-3 ring-1 ring-teal-500/10">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#134e4a] flex items-center gap-2">
          <ClipboardList size={14} strokeWidth={2} aria-hidden />
          Expenses &amp; requests
        </h3>
        <p className="text-[10px] text-gray-500 leading-snug">
          Submit a payment request from here — you do not need the Finance screen. Approvals stay in Management or
          workspace <span className="font-semibold text-slate-700">Needs action</span>.
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={openExpenseRequest}
            className="z-btn-primary w-full justify-center gap-2 !text-[11px]"
          >
            <Plus size={16} aria-hidden /> New expense request
          </button>
          {canRecordDirectExpense ? (
            <button
              type="button"
              onClick={openExpenseEntry}
              className="z-btn-secondary w-full justify-center gap-2 !text-[11px]"
            >
              <Plus size={16} aria-hidden /> New expense
            </button>
          ) : (
            <p className="text-[9px] text-slate-500 leading-snug rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-2">
              Direct expense entry (treasury) requires finance posting rights or sales expense permission.
            </p>
          )}
          {canFinance ? (
            <Link
              to="/accounts?tab=treasury"
              className="text-center text-[9px] font-bold uppercase tracking-wide text-teal-800 hover:underline"
            >
              Finance &amp; treasury
            </Link>
          ) : null}
          {canAccessMyProfileHr(ws?.permissions) ? (
            <Link
              to="/my-profile"
              className="text-center text-xs font-semibold text-[#134e4a] hover:underline"
            >
              My HR — leave, loans, payslips
            </Link>
          ) : null}
        </div>
      </div>

      <ModalFrame
        isOpen={showPayRequestModal}
        onClose={() => {
          setShowPayRequestModal(false);
        }}
      >
        <div className="z-modal-panel max-w-2xl p-6 sm:p-8 overflow-y-auto max-h-[90vh]">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-xl font-bold text-[#134e4a]">Expense request</h3>
            <button
              type="button"
              onClick={() => setShowPayRequestModal(false)}
              className="p-2 text-gray-400 hover:text-red-500 rounded-xl"
              aria-label="Close"
            >
              <X size={22} />
            </button>
          </div>
          <ExpenseRequestFormFields
            form={requestForm}
            setForm={setRequestForm}
            onSubmit={savePayRequest}
            fileInputRef={payRequestFileRef}
            showToast={showToast}
            formatNgn={formatNgn}
            submitting={savingPayRequest}
            hintBeforeSubmit="Extra rows can be left blank — only completed lines are sent. Request ID is assigned on save."
          />
        </div>
      </ModalFrame>

      <ModalFrame isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)}>
        <div className="z-modal-panel max-w-lg p-8 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-[#134e4a]">Expense entry</h3>
            <button
              type="button"
              onClick={() => setShowExpenseModal(false)}
              className="p-2 text-gray-400 hover:text-red-500 rounded-xl"
              aria-label="Close"
            >
              <X size={22} />
            </button>
          </div>
          <form className="space-y-4" onSubmit={saveExpense}>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">Expense type</label>
              <select
                value={expenseForm.expenseType}
                onChange={(e) => setExpenseForm((f) => ({ ...f, expenseType: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
              >
                <option value="COGS — materials & stock">COGS — materials & stock</option>
                <option value="Employee — payroll & commissions">Employee — payroll & commissions</option>
                <option value="Logistics & haulage">Logistics & haulage</option>
                <option value="Maintenance — plant & equipment">Maintenance — plant & equipment</option>
                <option value="Operational — rent & utilities">Operational — rent & utilities</option>
              </select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">Amount (₦)</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={expenseForm.amountNgn}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, amountNgn: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">Date</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">Category</label>
              <select
                required
                value={expenseForm.category}
                onChange={(e) => setExpenseForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
              >
                <option value="">Select category…</option>
                {expenseCategoriesSorted.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">Payment method</label>
              <select
                value={expenseForm.paymentMethod}
                onChange={(e) => setExpenseForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="POS">POS</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">Pay from account</label>
              <select
                required
                value={expenseForm.debitAccountId}
                onChange={(e) => setExpenseForm((f) => ({ ...f, debitAccountId: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
              >
                <option value="">Select account…</option>
                {bankAccountsSorted.map((a) => (
                  <option key={a.id} value={a.id}>
                    {treasuryAccountDisplayName(a)} ({formatNgn(a.balance)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">
                Receipt / invoice reference
              </label>
              <input
                value={expenseForm.reference}
                onChange={(e) => setExpenseForm((f) => ({ ...f, reference: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
              />
            </div>
            <p className="text-[10px] text-gray-400">Expense ID is generated on save (e.g. EXP-26-015).</p>
            <button
              type="submit"
              disabled={savingExpense}
              className="z-btn-primary w-full justify-center py-3 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {savingExpense ? 'Saving expense...' : 'Save expense'}
            </button>
          </form>
        </div>
      </ModalFrame>
    </>
  );
}
