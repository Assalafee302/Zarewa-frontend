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
import { canAccessMyProfileHr } from '../../lib/hrAccess';

/**
 * Workspace-only entry for expense payment requests.
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

  const [showPayRequestModal, setShowPayRequestModal] = useState(false);
  const [savingPayRequest, setSavingPayRequest] = useState(false);
  const [requestForm, setRequestForm] = useState(() => ({
    ...initialExpenseRequestFormState(),
    requestDate: '',
    requestReference: '',
    expenseCategory: '',
    description: '',
    attachment: null,
  }));

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

  const closeExpenseRequest = useCallback(() => {
    setShowPayRequestModal(false);
  }, []);

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

  if (!ws?.session) return null;

  if (!canSubmitExpenseRequest) {
    return (
      <div className="rounded-zarewa border border-slate-200/75 bg-white p-5 shadow-[var(--shadow-sequence)] ring-1 ring-teal-500/10">
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-zarewa-teal flex items-center gap-2">
          <ClipboardList size={14} strokeWidth={2} aria-hidden />
          Expense requests
        </h3>
        <p className="mt-2 text-ui-xs text-slate-600 leading-snug">
          Your account does not have <strong>expenses.create</strong> permission. Ask an administrator to assign the
          Sales officer role (or add expense request permission), then sign out and back in.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-zarewa border border-slate-200/75 bg-white p-5 shadow-[var(--shadow-sequence)] space-y-3 ring-1 ring-teal-500/10">
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-zarewa-teal flex items-center gap-2">
          <ClipboardList size={14} strokeWidth={2} aria-hidden />
          Expense requests
        </h3>
        <p className="text-ui-xs text-gray-500 leading-snug">
          Submit one payment request for approval — no Finance screen required. Paid expenses are recorded by treasury
          after approval.
        </p>
        <button
          type="button"
          onClick={openExpenseRequest}
          className="z-btn-primary w-full justify-center gap-2 !text-xs"
        >
          <Plus size={16} aria-hidden /> New expense request
        </button>
        {canFinance ? (
          <Link
            to="/accounts?tab=desk"
            className="block text-center text-ui-xs font-bold uppercase tracking-wide text-teal-800 hover:underline"
          >
            Finance desk — pay approved requests
          </Link>
        ) : null}
        {canAccessMyProfileHr(ws?.permissions) ? (
          <Link to="/my-profile" className="block text-center text-xs font-semibold text-zarewa-teal hover:underline">
            My HR — leave, loans, payslips
          </Link>
        ) : null}
      </div>

      <ModalFrame
        isOpen={showPayRequestModal}
        onClose={closeExpenseRequest}
        surface="plain"
        title="Expense request"
        description="Submit a payment request for manager or finance approval."
      >
        <div className="z-modal-panel flex max-h-[min(90dvh,760px)] w-full max-w-2xl flex-col overflow-hidden p-0 sm:rounded-2xl">
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200/80 px-5 py-4 sm:px-6">
            <div>
              <h3 className="text-lg font-bold text-zarewa-teal sm:text-xl">Expense request</h3>
              <p className="mt-1 text-xs leading-snug text-slate-500">
                Add line items and attach proof. Approvers see this in workspace Needs action.
              </p>
            </div>
            <button
              type="button"
              onClick={closeExpenseRequest}
              className="shrink-0 rounded-xl p-2 text-gray-400 hover:bg-slate-100 hover:text-red-500"
              aria-label="Close"
            >
              <X size={22} />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col px-5 py-4 sm:px-6 sm:py-5">
            <ExpenseRequestFormFields
              scrollable
              form={requestForm}
              setForm={setRequestForm}
              onSubmit={savePayRequest}
              fileInputRef={payRequestFileRef}
              showToast={showToast}
              formatNgn={formatNgn}
              submitting={savingPayRequest}
              submitLabel="Submit expense request"
              hintBeforeSubmit="Blank line rows are ignored. Request ID is assigned when you submit."
              actor={{ roleKey: ws?.session?.user?.roleKey, permissions: ws?.session?.permissions }}
              hasPermission={(p) => Boolean(ws?.hasPermission?.(p))}
            />
          </div>
        </div>
      </ModalFrame>
    </>
  );
}
