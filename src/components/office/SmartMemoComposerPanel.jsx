import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Sparkles, Wand2 } from 'lucide-react';
import { buildSmartMemoSuggestions, SMART_MEMO_TYPES } from '../../lib/smartMemoComposer';
import { WS_SECTION_LABEL } from '../../lib/workspaceUiTokens';
import { ZareComposeAssistBar } from './ZareComposeAssistBar';

function ComposerStep({ step, title, children, defaultOpen = true }) {
  return (
    <details open={defaultOpen} className="rounded-lg border border-slate-200/80 bg-white">
      <summary className={`cursor-pointer list-none px-3 py-2.5 ${WS_SECTION_LABEL}`}>
        <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-[10px] font-bold text-teal-900">
          {step}
        </span>
        {title}
      </summary>
      <div className="border-t border-slate-100 px-3 py-3">{children}</div>
    </details>
  );
}

export function SmartMemoComposerPanel({
  subject = '',
  body = '',
  memoType: memoTypeProp,
  onMemoTypeChange,
  guidedFields = {},
  onGuidedFieldChange,
  attachmentCount = 0,
  onApplySuggestion,
  onImproveMemo,
  onMemoAssist,
  improving = false,
  quickMode = false,
  officeKey = '',
  priority = 'normal',
  dueDate = '',
  requiresResponse = false,
  requiresApproval = false,
  confidentiality = 'internal',
  onOfficeKeyChange,
  onPriorityChange,
  onDueDateChange,
  onRequiresResponseChange,
  onRequiresApprovalChange,
  onConfidentialityChange,
}) {
  const suggestions = useMemo(
    () =>
      buildSmartMemoSuggestions({
        subject,
        body,
        memoType: memoTypeProp,
        guidedFields,
        attachmentCount,
      }),
    [subject, body, memoTypeProp, guidedFields, attachmentCount]
  );

  const memoType = memoTypeProp || suggestions.memoType;

  const applyOfficeAndPriority = () => {
    onApplySuggestion?.({
      memoType,
      officeKey: suggestions.responsibleOfficeKey,
      priority: suggestions.priority,
      filingCategory: suggestions.filingCategory,
      expenseCategory: suggestions.expenseCategory,
    });
  };

  return (
    <div className="space-y-0 border-b border-slate-200 bg-slate-50/40">
      <ZareComposeAssistBar
        subject={subject}
        body={body}
        memoType={memoType}
        onMemoAssist={onMemoAssist}
        improving={improving}
        attachmentCount={attachmentCount}
      />
      <div className="space-y-3 px-3 py-3 sm:px-4">
      <div className="flex items-start justify-between gap-2 rounded-lg border border-teal-100 bg-white px-3 py-2.5">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-teal-900">
            <Sparkles size={12} aria-hidden />
            Suggested setup
          </p>
          {!quickMode ? (
            <p className="mt-1 text-xs text-slate-600">
              Type: <strong className="text-slate-800">{suggestions.memoTypeLabel}</strong>
            </p>
          ) : null}
        </div>
        <button
          type="button"
          disabled={improving || (!subject.trim() && !body.trim())}
          onClick={onImproveMemo}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-teal-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-teal-900 hover:bg-teal-50 disabled:opacity-50"
        >
          <Wand2 size={13} className={improving ? 'animate-pulse' : ''} />
          Improve memo
        </button>
      </div>

      <div className="flex flex-wrap gap-1">
        {[
          ['improve', 'Improve'],
          ['make_shorter', 'Shorter'],
          ['make_formal', 'Formal'],
          ['fix_grammar', 'Grammar'],
          ['suggest_route', 'Route'],
        ].map(([action, label]) => (
          <button
            key={action}
            type="button"
            disabled={improving || (!subject.trim() && !body.trim())}
            onClick={() => (action === 'improve' ? onImproveMemo?.() : onMemoAssist?.(action))}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {label}
          </button>
        ))}
      </div>

      {!quickMode ? (
        <ComposerStep step="1" title="Memo purpose">
        <div className="grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2">
          <label className="block font-medium text-slate-700">
            Memo type
            <select
              className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-[12px]"
              value={memoType}
              onChange={(e) => onMemoTypeChange?.(e.target.value)}
            >
              {Object.entries(SMART_MEMO_TYPES).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block font-medium text-slate-700">
            Responsible office
            <select
              className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-[12px]"
              value={officeKey}
              onChange={(e) => onOfficeKeyChange?.(e.target.value)}
            >
              <option value="office_admin">Office administration</option>
              <option value="branch_manager">Branch manager</option>
              <option value="sales">Sales office</option>
              <option value="procurement">Procurement office</option>
              <option value="operations">Operations office</option>
              <option value="finance">Finance office</option>
              <option value="hr">HR office</option>
            </select>
          </label>
          <label className="block font-medium text-slate-700">
            Priority
            <select
              className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-[12px] capitalize"
              value={priority}
              onChange={(e) => onPriorityChange?.(e.target.value)}
            >
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label className="block font-medium text-slate-700">
            Due date
            <input
              type="date"
              className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-[12px]"
              value={dueDate}
              onChange={(e) => onDueDateChange?.(e.target.value)}
            />
          </label>
          <label className="block font-medium text-slate-700">
            Confidentiality
            <select
              className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-[12px]"
              value={confidentiality}
              onChange={(e) => onConfidentialityChange?.(e.target.value)}
            >
              <option value="internal">Internal</option>
              <option value="restricted">Restricted</option>
              <option value="confidential">Confidential</option>
            </select>
          </label>
          <div className="flex flex-col justify-end gap-1.5">
            <label className="inline-flex items-center gap-2 text-[11px]">
              <input
                type="checkbox"
                checked={requiresResponse}
                onChange={(e) => onRequiresResponseChange?.(e.target.checked)}
              />
              Requires response
            </label>
            <label className="inline-flex items-center gap-2 text-[11px]">
              <input
                type="checkbox"
                checked={requiresApproval}
                onChange={(e) => onRequiresApprovalChange?.(e.target.checked)}
              />
              Requires approval
            </label>
          </div>
        </div>
        </ComposerStep>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {Object.entries(SMART_MEMO_TYPES)
          .filter(([k]) => k !== 'general_internal')
          .slice(0, quickMode ? 5 : 10)
          .map(([key, meta]) => (
            <button
              key={key}
              type="button"
              onClick={() => onMemoTypeChange?.(key)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                memoType === key
                  ? 'bg-teal-100 text-teal-950 ring-1 ring-teal-200'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {meta.label.split(' / ')[0]}
            </button>
          ))}
      </div>

      <div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200/80 bg-white p-2.5 text-[11px] sm:grid-cols-2">
        <SuggestionRow label="Responsible office" value={suggestions.responsibleOfficeLabel} />
        <SuggestionRow label="Priority" value={suggestions.priority} />
        <SuggestionRow label="Filing category" value={suggestions.filingCategory} />
        {suggestions.expenseCategory ? (
          <SuggestionRow label="Expense category" value={suggestions.expenseCategory} />
        ) : null}
      </div>

      <p className="text-[11px] leading-relaxed text-slate-600">{suggestions.nextAction}</p>

      <button
        type="button"
        onClick={applyOfficeAndPriority}
        className="text-[11px] font-semibold text-teal-800 hover:underline"
      >
        Apply suggested office &amp; routing
      </button>

      {suggestions.guidedFieldDefs.length > 0 ? (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Guided details</p>
          {suggestions.guidedFieldDefs.map((f) => (
            <label key={f.key} className="block text-[11px] font-medium text-slate-700">
              {f.label}
              {f.required ? <span className="text-rose-600"> *</span> : null}
              {f.type === 'textarea' ? (
                <textarea
                  rows={3}
                  className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-[12px]"
                  value={guidedFields[f.key] ?? ''}
                  onChange={(e) => onGuidedFieldChange?.(f.key, e.target.value)}
                />
              ) : f.type === 'select' ? (
                <select
                  className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-[12px]"
                  value={guidedFields[f.key] ?? ''}
                  onChange={(e) => onGuidedFieldChange?.(f.key, e.target.value)}
                >
                  <option value="">Select…</option>
                  {(f.options || []).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                  className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-[12px]"
                  value={guidedFields[f.key] ?? ''}
                  onChange={(e) => onGuidedFieldChange?.(f.key, e.target.value)}
                />
              )}
            </label>
          ))}
        </div>
      ) : null}

      {suggestions.checklist.items.length > 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-2.5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Required details</p>
          <ul className="space-y-1">
            {suggestions.checklist.items.map((item) => (
              <li key={item.id} className="flex items-start gap-2 text-[11px] text-slate-700">
                {item.satisfied ? (
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle
                    size={14}
                    className={`mt-0.5 shrink-0 ${item.required ? 'text-amber-600' : 'text-slate-400'}`}
                  />
                )}
                <span>
                  {item.label}
                  {item.required ? ' (required)' : ''}
                </span>
              </li>
            ))}
          </ul>
          {suggestions.checklist.warning ? (
            <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900">
              {suggestions.checklist.warning}
            </p>
          ) : null}
        </div>
      ) : null}

      {(suggestions.zareHints || suggestions.runaHints)?.length ? (
        <div className="rounded border border-teal-100 bg-teal-50/50 px-2.5 py-2 text-[10px] leading-relaxed text-teal-900">
          {(suggestions.zareHints || suggestions.runaHints).map((h, i) => (
            <p key={i}>{h}</p>
          ))}
        </div>
      ) : null}
      </div>
    </div>
  );
}

function SuggestionRow({ label, value }) {
  return (
    <div>
      <span className="text-slate-500">{label}: </span>
      <span className="font-semibold capitalize text-slate-800">{value || '—'}</span>
    </div>
  );
}
