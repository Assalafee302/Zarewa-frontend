import React, { useMemo } from 'react';
import { Paperclip, Plus, X } from 'lucide-react';
import { ExpenseCategorySelect } from './ExpenseCategorySelect.jsx';
import { isExceptionExpenseCategory } from '../../shared/expenseCategorySelectUtils.js';
import { ExpenseCategoryRecommendationCard } from './ExpenseCategoryRecommendationCard.jsx';
import { OthersJustificationField } from './OthersJustificationField.jsx';
import { resolveExpenseCategoryPolicyLimits } from '../../shared/expenseCategoryPolicy.js';
import { useExpenseCategoryMemoSuggestion } from '../../hooks/useExpenseCategoryMemoSuggestion.js';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import {
  createExpenseRequestLineItem,
  expenseRequestLineTotal,
} from '../../lib/expenseRequestFormCore.js';

/**
 * @param {object} props
 * @param {object} props.form
 * @param {(fn: (prev: object) => object) => void} props.setForm
 * @param {(e: React.FormEvent) => void} props.onSubmit
 * @param {React.RefObject<HTMLInputElement | null>} props.fileInputRef
 * @param {(msg: string, opts?: { variant?: string }) => void} props.showToast
 * @param {(n: number) => string} props.formatNgn
 * @param {string} [props.submitLabel]
 * @param {boolean} [props.submitting]
 * @param {string} [props.hintBeforeSubmit]
 * @param {{ category: string, reason?: string, onApply?: () => void } | null} [props.categoryRecommendation]
 * @param {{ roleKey?: string; permissions?: string[] } | null | undefined} [props.actor]
 * @param {(perm: string) => boolean} [props.hasPermission]
 * @param {boolean} [props.scrollable] sticky footer + scrollable body (modal layouts)
 */
export function ExpenseRequestFormFields({
  form,
  setForm,
  onSubmit,
  fileInputRef,
  showToast,
  formatNgn,
  submitLabel = 'Submit for approval',
  submitting = false,
  hintBeforeSubmit,
  categoryRecommendation = null,
  actor = null,
  hasPermission = () => false,
  scrollable = false,
}) {
  const ws = useWorkspace();
  const othersMinJustificationLen = resolveExpenseCategoryPolicyLimits(
    ws?.snapshot?.orgGovernanceLimits
  ).othersMinJustificationLen;

  const memoSuggestion = useExpenseCategoryMemoSuggestion({
    description: form.description,
    reference: form.requestReference,
    actor,
    hasPermission,
    enabled: !categoryRecommendation?.category,
  }).suggestion;

  const activeRecommendation = useMemo(() => {
    if (categoryRecommendation?.category) return categoryRecommendation;
    if (!memoSuggestion?.category || memoSuggestion.category === form.expenseCategory) return null;
    return {
      category: memoSuggestion.category,
      reason:
        memoSuggestion.reasons?.length > 0
          ? `Matched keywords (${memoSuggestion.reasons.join(', ')}).`
          : 'Suggested from description text.',
      onApply: () => setForm((f) => ({ ...f, expenseCategory: memoSuggestion.category })),
    };
  }, [categoryRecommendation, form.expenseCategory, memoSuggestion, setForm]);

  const requestTotalNgn = form.lines.reduce((s, row) => s + expenseRequestLineTotal(row), 0);

  const fields = (
    <>
      <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-4 space-y-4">
        <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Request details</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">Request date</label>
          <input
            type="date"
            required
            value={form.requestDate}
            onChange={(e) => setForm((f) => ({ ...f, requestDate: e.target.value }))}
            className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
          />
        </div>
        <div>
          <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">Reference</label>
          <input
            value={form.requestReference}
            onChange={(e) => setForm((f) => ({ ...f, requestReference: e.target.value }))}
            placeholder="Invoice / PO / internal ref"
            className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
          />
        </div>
      </div>
      <div>
        <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">Description</label>
        <textarea
          rows={4}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Purpose, vendor, cost centre, or other context for approvers."
          className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-medium outline-none resize-y min-h-[96px]"
        />
      </div>
      <div>
        <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">Expense category</label>
        {activeRecommendation?.category ? (
          <ExpenseCategoryRecommendationCard
            category={activeRecommendation.category}
            reason={activeRecommendation.reason}
            onApply={activeRecommendation.onApply}
          />
        ) : memoSuggestion?.suggestedCategory && !memoSuggestion.actorMaySelect ? (
          <ExpenseCategoryRecommendationCard
            category={memoSuggestion.suggestedCategory}
            blocked
            blockedReason={memoSuggestion.blockedReason}
          />
        ) : null}
        <ExpenseCategorySelect
          required
          value={form.expenseCategory}
          onChange={(expenseCategory) => setForm((f) => ({ ...f, expenseCategory }))}
          actor={actor}
          hasPermission={hasPermission}
          othersMinJustificationLen={othersMinJustificationLen}
          className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-200/40"
        />
        {isExceptionExpenseCategory(form.expenseCategory) ? (
          <OthersJustificationField
            value={form.categoryJustification || ''}
            onChange={(e) => setForm((f) => ({ ...f, categoryJustification: e.target.value }))}
            minLength={othersMinJustificationLen}
          />
        ) : null}
      </div>
      </div>
      <div className="rounded-xl border border-sky-200/70 bg-sky-50/40 p-4 space-y-3">
        <p className="text-ui-xs font-bold uppercase tracking-wide text-sky-900/80">
          Pay to (bank account)
        </p>
        <p className="text-ui-xs text-slate-500 -mt-1">
          Optional. Account details for treasury to transfer payment when the request is approved.
        </p>
        <div>
          <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
            Beneficiary name
          </label>
          <input
            value={form.payeeName || ''}
            onChange={(e) => setForm((f) => ({ ...f, payeeName: e.target.value }))}
            placeholder="Name on the account"
            className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">Bank name</label>
            <input
              value={form.payeeBankName || ''}
              onChange={(e) => setForm((f) => ({ ...f, payeeBankName: e.target.value }))}
              placeholder="e.g. Access Bank"
              className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none"
            />
          </div>
          <div>
            <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
              Account number
            </label>
            <input
              value={form.payeeAccountNo || ''}
              onChange={(e) => setForm((f) => ({ ...f, payeeAccountNo: e.target.value }))}
              placeholder="Nigerian bank account no."
              inputMode="numeric"
              autoComplete="off"
              className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold font-mono outline-none tabular-nums"
            />
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200/70 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1">Line items</label>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, lines: [...f.lines, createExpenseRequestLineItem()] }))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-ui-xs font-bold uppercase tracking-wide text-zarewa-teal inline-flex items-center gap-1"
          >
            <Plus size={12} /> Add item
          </button>
        </div>
        <div className="rounded-xl border border-slate-200/80 overflow-hidden max-h-[min(42vh,320px)] overflow-y-auto overscroll-contain">
          <div className="hidden sm:grid grid-cols-[1fr_72px_100px_96px_40px] gap-2 px-3 py-2 bg-slate-50 text-ui-xs font-black uppercase tracking-wide text-slate-500 sticky top-0 z-[1]">
            <span>Item</span>
            <span className="text-center">Unit</span>
            <span className="text-right">Unit price</span>
            <span className="text-right">Total</span>
            <span />
          </div>
          <ul className="divide-y divide-slate-100">
            {form.lines.map((row) => (
              <li
                key={row.id}
                className="p-3 sm:grid sm:grid-cols-[1fr_72px_100px_96px_40px] sm:items-center sm:gap-2 space-y-2 sm:space-y-0 bg-white/60"
              >
                <input
                  value={row.item}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      lines: f.lines.map((x) => (x.id === row.id ? { ...x, item: e.target.value } : x)),
                    }))
                  }
                  placeholder="Description of item or service"
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-2 text-xs font-semibold outline-none"
                />
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={row.unit}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      lines: f.lines.map((x) => (x.id === row.id ? { ...x, unit: e.target.value } : x)),
                    }))
                  }
                  placeholder="Qty"
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-2 text-xs font-bold outline-none text-center"
                />
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={row.unitPriceNgn}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      lines: f.lines.map((x) => (x.id === row.id ? { ...x, unitPriceNgn: e.target.value } : x)),
                    }))
                  }
                  placeholder="₦"
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-2 text-xs font-bold outline-none text-right tabular-nums"
                />
                <p className="text-xs font-black text-zarewa-teal tabular-nums text-right py-2 sm:py-0">
                  {formatNgn(expenseRequestLineTotal(row))}
                </p>
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={form.lines.length <= 1}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        lines: f.lines.length <= 1 ? f.lines : f.lines.filter((x) => x.id !== row.id),
                      }))
                    }
                    className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 disabled:opacity-35"
                    title="Remove line (keep at least one)"
                  >
                    <X size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-ui-xs text-slate-500">
          Total requested:{' '}
          <span className="font-black text-zarewa-teal tabular-nums">{formatNgn(requestTotalNgn)}</span>
        </p>
      </div>
      <div className="rounded-xl border border-slate-200/70 bg-slate-50/40 p-4">
        <label className="text-ui-xs font-bold text-gray-400 uppercase ml-1 block mb-1">
          <span className="inline-flex items-center gap-1">
            <Paperclip size={12} className="opacity-60" />
            Attachment (invoice / receipt)
          </span>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 2.5 * 1024 * 1024) {
                showToast('File too large (max 2.5 MB).', { variant: 'error' });
                e.target.value = '';
                return;
              }
              const reader = new FileReader();
              reader.onload = () => {
                const res = String(reader.result || '');
                const m = res.match(/^data:([^;]+);base64,(.+)$/);
                if (!m) {
                  showToast('Could not read file.', { variant: 'error' });
                  return;
                }
                setForm((prev) => ({
                  ...prev,
                  attachment: { name: f.name, mime: m[1], dataBase64: m[2] },
                }));
              };
              reader.readAsDataURL(f);
            }}
            className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-ui-xs file:font-bold file:bg-teal-50 file:text-zarewa-teal"
          />
          {form.attachment ? (
            <button
              type="button"
              onClick={() => {
                setForm((f) => ({ ...f, attachment: null }));
                if (fileInputRef?.current) fileInputRef.current.value = '';
              }}
              className="text-ui-xs font-bold uppercase text-rose-700 bg-rose-50 px-3 py-2 rounded-lg"
            >
              Remove file
            </button>
          ) : null}
        </div>
        {form.attachment ? (
          <p className="text-ui-xs text-slate-500 mt-1 truncate" title={form.attachment.name}>
            Selected: {form.attachment.name}
          </p>
        ) : (
          <p className="text-ui-xs text-gray-400 mt-1">PDF or image. Optional but recommended.</p>
        )}
      </div>
    </>
  );

  const footer = (
    <>
      {hintBeforeSubmit ? <p className="text-ui-xs text-slate-500 leading-snug">{hintBeforeSubmit}</p> : null}
      <button
        type="submit"
        disabled={submitting}
        className="z-btn-primary w-full justify-center py-3 disabled:opacity-60 disabled:pointer-events-none"
      >
        {submitting ? 'Submitting…' : submitLabel}
      </button>
    </>
  );

  if (scrollable) {
    return (
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1 -mr-1">{fields}</div>
        <div className="mt-4 shrink-0 space-y-3 border-t border-slate-200/80 bg-white/95 pt-4 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3 rounded-lg bg-teal-50/80 px-3 py-2">
            <span className="text-ui-xs font-bold uppercase tracking-wide text-teal-900/80">Total</span>
            <span className="text-sm font-black tabular-nums text-zarewa-teal">{formatNgn(requestTotalNgn)}</span>
          </div>
          {footer}
        </div>
      </form>
    );
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      {fields}
      {footer}
    </form>
  );
}
