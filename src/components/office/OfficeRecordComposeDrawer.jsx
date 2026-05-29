import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Paperclip, Pen, Send, X } from 'lucide-react';
import { SlideOverPanel } from '../layout/SlideOverPanel';
import { OfficeRecipientStrip } from './OfficeRecipientStrip';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { apiFetch } from '../../lib/apiBase';
import {
  clearComposeMemoDraft,
  composeDraftHasContent,
  loadComposeMemoDraft,
  saveComposeMemoDraft,
} from '../../lib/workspaceComposeDraft';
import { deleteComposeDraft, fetchComposeDrafts, saveComposeDraft } from '../../lib/composeMemoDraftApi';
import { callMemoAssist } from '../../lib/memoAssistApi';
import { SmartMemoComposerPanel } from './SmartMemoComposerPanel';
import {
  buildSmartMemoChecklist,
  buildSmartMemoPayload,
  buildSmartMemoSuggestions,
  detectSmartMemoType,
  improveMemoRuleBased,
} from '../../lib/smartMemoComposer';

/**
 * @param {{ isOpen: boolean, onDismiss?: () => void, presentation?: 'drawer' | 'floating' | 'gmail', onSent?: (threadId?: string) => void }} props
 */
export function OfficeRecordComposeDrawer({ isOpen, onDismiss, presentation = 'drawer', onSent }) {
  const ws = useWorkspace();
  const { show: showToast } = useToast();
  const canOffice = Boolean(ws?.canAccessModule?.('office'));
  const memoFileRef = useRef(null);
  const isFloating = presentation === 'floating' || presentation === 'gmail';

  const [directory, setDirectory] = useState([]);
  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newDocumentClass, setNewDocumentClass] = useState('correspondence');
  const [newOfficeKey, setNewOfficeKey] = useState('office_admin');
  const [newConfidentiality, setNewConfidentiality] = useState('internal');
  const [memoDate, setMemoDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [toIds, setToIds] = useState([]);
  const [ccIds, setCcIds] = useState([]);
  const [memoAttachments, setMemoAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const [composeTemplates, setComposeTemplates] = useState([]);
  const [selectedComposeTemplateId, setSelectedComposeTemplateId] = useState('');
  const [composeTemplateFields, setComposeTemplateFields] = useState({});
  const [smartMemoType, setSmartMemoType] = useState('');
  const [smartGuidedFields, setSmartGuidedFields] = useState({});
  const [smartPriority, setSmartPriority] = useState('normal');
  const [smartFilingCategory, setSmartFilingCategory] = useState('');
  const [smartExpenseCategory, setSmartExpenseCategory] = useState('');
  const [improvingMemo, setImprovingMemo] = useState(false);
  const [quickComposeMode, setQuickComposeMode] = useState(false);
  const [serverDraftId, setServerDraftId] = useState('');
  const [memoDueDate, setMemoDueDate] = useState('');
  const [requiresResponse, setRequiresResponse] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [attachmentDragOver, setAttachmentDragOver] = useState(false);
  const [attachmentError, setAttachmentError] = useState('');
  const [draftSyncStatus, setDraftSyncStatus] = useState('idle');

  const workspaceBranchId = String(
    ws?.session?.workspaceBranchId || ws?.snapshot?.workspaceBranchId || ''
  ).trim();

  const branchNameById = useMemo(() => {
    const branches = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
    return Object.fromEntries(
      branches.map((b) => [String(b.id || '').trim(), String(b.name || b.code || b.id || '').trim()])
    );
  }, [ws?.snapshot?.workspaceBranches, ws?.session?.branches]);

  const workspaceBranchLabel = useMemo(() => {
    const bid = String(ws?.session?.workspaceBranchId || ws?.snapshot?.workspaceBranchId || '').trim();
    return branchNameById[bid] || bid || 'Workspace branch';
  }, [ws?.session?.workspaceBranchId, ws?.snapshot?.workspaceBranchId, branchNameById]);

  const fromLine = useMemo(() => {
    const u = ws?.session?.user;
    const name = u?.displayName || u?.username || 'You';
    return `${name} · ${workspaceBranchLabel}`;
  }, [ws?.session?.user, workspaceBranchLabel]);

  const loadDirectory = useCallback(async () => {
    const { ok, data } = await apiFetch('/api/office/directory');
    if (ok && data?.ok && Array.isArray(data.users)) setDirectory(data.users);
    else setDirectory([]);
  }, []);

  const resetForm = useCallback(() => {
    setNewSubject('');
    setNewBody('');
    setNewDocumentClass('correspondence');
    setNewOfficeKey('office_admin');
    setNewConfidentiality('internal');
    setMemoDate(new Date().toISOString().slice(0, 10));
    setToIds([]);
    setCcIds([]);
    setMemoAttachments([]);
    setSelectedComposeTemplateId('');
    setComposeTemplateFields({});
    setSmartMemoType('');
    setSmartGuidedFields({});
    setSmartPriority('normal');
    setSmartFilingCategory('');
    setSmartExpenseCategory('');
    setServerDraftId('');
    if (memoFileRef.current) memoFileRef.current.value = '';
  }, []);

  const closeCompose = useCallback(
    (force = false) => {
      const uid = String(ws?.session?.user?.id || '').trim();
      const hasDraft = composeDraftHasContent({
        subject: newSubject,
        body: newBody,
        toIds,
      });
      if (!force && hasDraft && !window.confirm('Discard this memo draft?')) return;
      if (uid) clearComposeMemoDraft(uid);
      onDismiss?.();
      resetForm();
    },
    [onDismiss, resetForm, newSubject, newBody, toIds, ws?.session?.user?.id]
  );

  const loadComposeTemplates = useCallback(async () => {
    const { ok, data } = await apiFetch('/api/office/compose-templates');
    if (ok && data?.ok && Array.isArray(data.templates)) setComposeTemplates(data.templates);
    else setComposeTemplates([]);
  }, []);

  useEffect(() => {
    if (!isOpen || !canOffice) return;
    const uid = String(ws?.session?.user?.id || '').trim();
    const localDraft = uid ? loadComposeMemoDraft(uid) : null;
    let cancelled = false;

    const applyDraft = (draft) => {
      if (!draft || !composeDraftHasContent(draft)) return;
      setNewSubject(draft.subject || '');
      setNewBody(draft.body || '');
      setToIds(Array.isArray(draft.toIds) ? draft.toIds : []);
      setCcIds(Array.isArray(draft.ccIds) ? draft.ccIds : []);
      setNewDocumentClass(draft.documentClass || 'correspondence');
      setNewOfficeKey(draft.officeKey || 'office_admin');
      setNewConfidentiality(draft.confidentiality || 'internal');
      if (draft.memoDate) setMemoDate(draft.memoDate);
      if (draft.templateId) setSelectedComposeTemplateId(draft.templateId);
      if (draft.templateFields) setComposeTemplateFields(draft.templateFields);
      if (draft.smartMemoType) setSmartMemoType(draft.smartMemoType);
      if (draft.smartGuidedFields) setSmartGuidedFields(draft.smartGuidedFields);
      if (draft.id) setServerDraftId(String(draft.id));
    };

    applyDraft(localDraft);

    void (async () => {
      if (!uid || !workspaceBranchId) return;
      const serverDrafts = await fetchComposeDrafts(workspaceBranchId);
      if (cancelled || !serverDrafts.length) return;
      const latest = serverDrafts[0];
      const payload = latest.payload || {};
      const serverDraft = {
        id: latest.id,
        subject: latest.subject,
        body: latest.body,
        toIds: payload.toIds,
        ccIds: payload.ccIds,
        documentClass: payload.documentClass,
        officeKey: payload.officeKey,
        confidentiality: latest.confidentiality,
        smartMemoType: latest.smartMemoType,
        smartGuidedFields: payload.smartGuidedFields,
      };
      const localUpdated = localDraft?.updatedAtIso ? Date.parse(localDraft.updatedAtIso) : 0;
      const serverUpdated = latest.updatedAtIso ? Date.parse(latest.updatedAtIso) : 0;
      if (serverUpdated >= localUpdated) applyDraft(serverDraft);
    })();

    void loadDirectory();
    void loadComposeTemplates();
    return () => {
      cancelled = true;
    };
  }, [isOpen, canOffice, loadDirectory, loadComposeTemplates, ws?.session?.user?.id, workspaceBranchId]);

  useEffect(() => {
    if (!isOpen || !canOffice) return;
    const uid = String(ws?.session?.user?.id || '').trim();
    if (!uid) return;
    const t = window.setTimeout(() => {
      setDraftSyncStatus('saving');
      const draftPayload = {
        subject: newSubject,
        body: newBody,
        toIds,
        ccIds,
        documentClass: newDocumentClass,
        officeKey: newOfficeKey,
        confidentiality: newConfidentiality,
        memoDate,
        templateId: selectedComposeTemplateId,
        templateFields: composeTemplateFields,
        smartMemoType,
        smartGuidedFields,
        updatedAtIso: new Date().toISOString(),
      };
      saveComposeMemoDraft(uid, draftPayload);
      if (!ws?.apiOnline) {
        setDraftSyncStatus('offline');
        return;
      }
      if (ws?.apiOnline && workspaceBranchId && composeDraftHasContent(draftPayload)) {
        void saveComposeDraft({
          id: serverDraftId || undefined,
          branchId: workspaceBranchId,
          subject: newSubject,
          body: newBody,
          toIds,
          ccIds,
          confidentiality: newConfidentiality,
          officeKey: newOfficeKey,
          documentClass: newDocumentClass,
          smartMemoType,
          smartGuidedFields,
        }).then((saved) => {
          if (saved?.id) setServerDraftId(String(saved.id));
          setDraftSyncStatus('saved');
        }).catch(() => setDraftSyncStatus('unsynced'));
      } else {
        setDraftSyncStatus('saved');
      }
    }, 600);
    return () => window.clearTimeout(t);
  }, [
    isOpen,
    canOffice,
    newSubject,
    newBody,
    toIds,
    ccIds,
    newDocumentClass,
    newOfficeKey,
    newConfidentiality,
    memoDate,
    selectedComposeTemplateId,
    composeTemplateFields,
    smartMemoType,
    smartGuidedFields,
    ws?.session?.user?.id,
    ws?.apiOnline,
    workspaceBranchId,
    serverDraftId,
  ]);

  useEffect(() => {
    if (!isOpen) resetForm();
  }, [isOpen, resetForm]);

  const resolvedMemoType = smartMemoType || detectSmartMemoType(newSubject, newBody);

  const onImproveMemo = async (action = 'improve') => {
    setImprovingMemo(true);
    try {
      const assist = await callMemoAssist({
        action,
        subject: newSubject,
        body: newBody,
        memoType: resolvedMemoType,
        guidedFields: smartGuidedFields,
        attachmentCount: memoAttachments.length,
      });
      if (assist.ok) {
        if (assist.suggestedSubject) setNewSubject(String(assist.suggestedSubject));
        if (assist.improvedBody) setNewBody(String(assist.improvedBody));
        if (assist.responsibleOffice) setNewOfficeKey(String(assist.responsibleOffice));
        if (assist.priority) setSmartPriority(String(assist.priority));
        if (assist.filingCategory) setSmartFilingCategory(String(assist.filingCategory));
        if (assist.expenseCategory) setSmartExpenseCategory(String(assist.expenseCategory));
        if (assist.warnings?.length) showToast(assist.warnings[0], { variant: 'info' });
        showToast(
          assist.aiPolished
            ? 'Memo polished with AI.'
            : action === 'improve'
              ? 'Memo improved.'
              : 'Suggestion applied.'
        );
        return;
      }
      const { ok, status, data } = await apiFetch('/api/office/ai/polish-memo', {
        method: 'POST',
        body: JSON.stringify({ subject: newSubject, body: newBody, style: action }),
      });
      if (ok && data?.ok) {
        if (data.subject) setNewSubject(String(data.subject));
        if (data.body) setNewBody(String(data.body));
        showToast('Memo improved.');
        return;
      }
      if (status !== 503) {
        showToast(data?.error || assist.error || 'Could not improve memo.', { variant: 'error' });
        return;
      }
      const improved = improveMemoRuleBased(newSubject, newBody, resolvedMemoType);
      setNewSubject(improved.subject);
      setNewBody(improved.body);
      showToast('Memo formatted using templates (AI not configured).');
    } finally {
      setImprovingMemo(false);
    }
  };

  const addMemoFiles = (files) => {
    setAttachmentError('');
    const list = Array.from(files || []);
    if (memoAttachments.length + list.length > 5) {
      setAttachmentError('Maximum 5 supporting documents per memo.');
      return;
    }
    for (const f of list.slice(0, 5 - memoAttachments.length)) {
      const allowed = /\.(pdf|png|jpe?g|gif|webp|docx?|xlsx?|txt)$/i;
      if (!allowed.test(f.name)) {
        setAttachmentError(`${f.name}: file type not allowed.`);
        continue;
      }
      if (f.size > 2.5 * 1024 * 1024) {
        setAttachmentError(`${f.name} is too large (max 2.5 MB).`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const res = String(reader.result || '');
        const m = res.match(/^data:([^;]+);base64,(.+)$/);
        if (!m) {
          showToast(`Could not read ${f.name}.`, { variant: 'error' });
          return;
        }
        setMemoAttachments((prev) => [...prev, { name: f.name, mime: m[1], dataBase64: m[2] }].slice(0, 5));
      };
      reader.readAsDataURL(f);
    }
    if (memoFileRef.current) memoFileRef.current.value = '';
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!showReview) {
      setShowReview(true);
      return;
    }
    const subject = newSubject.trim();
    if (subject.length < 2) {
      showToast('Memo subject is required.', { variant: 'error' });
      return;
    }
    const selectedTpl = composeTemplates.find((t) => t.id === selectedComposeTemplateId);
    if (selectedTpl?.fields?.length) {
      for (const f of selectedTpl.fields) {
        if (!f.required) continue;
        const v = String(composeTemplateFields[f.key] ?? '').trim();
        if (!v) {
          showToast(`Fill required field: ${f.label}`, { variant: 'error' });
          return;
        }
      }
    }
    if (!ws?.canMutate) {
      showToast('Reconnect to send — workspace is read-only.', { variant: 'info' });
      return;
    }
    const checklist = buildSmartMemoChecklist(resolvedMemoType, smartGuidedFields, memoAttachments.length);
    if (checklist.warning && !window.confirm(`${checklist.warning}\n\nSend memo anyway?`)) {
      return;
    }
    const smartPayload = buildSmartMemoPayload({
      memoType: resolvedMemoType,
      priority: smartPriority,
      filingCategory: smartFilingCategory || buildSmartMemoSuggestions({ subject, body: newBody, memoType: resolvedMemoType }).filingCategory,
      expenseCategory: smartExpenseCategory || buildSmartMemoSuggestions({ subject, body: newBody, memoType: resolvedMemoType }).expenseCategory,
      guidedFields: smartGuidedFields,
    });
    setSending(true);
    try {
      const { ok, data } = await apiFetch('/api/office/threads', {
        method: 'POST',
        body: JSON.stringify({
          subject,
          body: newBody.trim(),
          toUserIds: toIds,
          ccUserIds: ccIds,
          kind: 'memo',
          documentClass: newDocumentClass,
          officeKey: newOfficeKey,
          memoDateIso: memoDate,
          attachments: memoAttachments,
          payload: {
            confidentiality: newConfidentiality,
            requiresResponse,
            requiresApproval,
            dueDateIso: memoDueDate || undefined,
            ...smartPayload,
            ...(selectedComposeTemplateId
              ? {
                  composeTemplateId: selectedComposeTemplateId,
                  composeTemplateFields,
                  suggestedFilingClass: selectedTpl?.filingClass || '',
                }
              : {}),
          },
        }),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not create thread.', { variant: 'error' });
        return;
      }
      showToast('Memo sent.');
      const uid = String(ws?.session?.user?.id || '').trim();
      if (uid) clearComposeMemoDraft(uid);
      if (serverDraftId) void deleteComposeDraft(serverDraftId);
      const threadId = data?.thread?.id || data?.threadId || data?.id;
      onSent?.(threadId ? String(threadId) : undefined);
      closeCompose(true);
      await ws.refresh();
    } finally {
      setSending(false);
    }
  };

  const metaSelectClass = isFloating
    ? 'mt-1 w-full rounded border border-[#dadce0] bg-white px-2 py-1.5 text-[13px] text-[#202124] outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600/40'
    : 'mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm';

  const metaLabelClass = isFloating ? 'block text-[11px] font-medium text-[#5f6368]' : 'block text-[11px] font-semibold text-slate-600';

  const bodyArea = !canOffice ? (
    <div
      className={`flex-1 overflow-y-auto text-sm text-slate-600 ${isFloating ? 'px-4 py-6' : 'px-4 py-6'}`}
    >
      <p>You do not have access to Office Desk on this account.</p>
    </div>
  ) : (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <SmartMemoComposerPanel
        subject={newSubject}
        body={newBody}
        memoType={smartMemoType || undefined}
        onMemoTypeChange={setSmartMemoType}
        guidedFields={smartGuidedFields}
        onGuidedFieldChange={(key, val) => setSmartGuidedFields((prev) => ({ ...prev, [key]: val }))}
        attachmentCount={memoAttachments.length}
        officeKey={newOfficeKey}
        onOfficeKeyChange={setNewOfficeKey}
        priority={smartPriority}
        onPriorityChange={setSmartPriority}
        dueDate={memoDueDate}
        onDueDateChange={setMemoDueDate}
        requiresResponse={requiresResponse}
        onRequiresResponseChange={setRequiresResponse}
        requiresApproval={requiresApproval}
        onRequiresApprovalChange={setRequiresApproval}
        confidentiality={newConfidentiality}
        onConfidentialityChange={setNewConfidentiality}
        onApplySuggestion={({ officeKey, priority, filingCategory, expenseCategory, memoType }) => {
          if (officeKey) setNewOfficeKey(officeKey);
          if (priority) setSmartPriority(priority);
          if (filingCategory) setSmartFilingCategory(filingCategory);
          if (expenseCategory) setSmartExpenseCategory(expenseCategory);
          if (memoType) setSmartMemoType(memoType);
        }}
        onImproveMemo={() => void onImproveMemo('improve')}
        onMemoAssist={(action) => void onImproveMemo(action)}
        improving={improvingMemo}
        quickMode={quickComposeMode}
      />
      {showReview ? (
        <div className="border-b border-amber-200 bg-amber-50/80 px-4 py-3 text-[12px] text-amber-950">
          <p className="font-semibold">Review before send</p>
          <ul className="mt-2 space-y-1 text-[11px]">
            <li>Recipients: {toIds.length || 0} · Copy: {ccIds.length || 0}</li>
            <li>Office: {newOfficeKey} · Priority: {smartPriority}</li>
            <li>Confidentiality: {newConfidentiality}</li>
            {memoDueDate ? <li>Due: {memoDueDate}</li> : null}
            {memoAttachments.length ? <li>Attachments: {memoAttachments.length}</li> : null}
          </ul>
          {buildSmartMemoChecklist(resolvedMemoType, smartGuidedFields, memoAttachments.length).warning ? (
            <p className="mt-2 text-amber-900">{buildSmartMemoChecklist(resolvedMemoType, smartGuidedFields, memoAttachments.length).warning}</p>
          ) : null}
          <button type="button" className="mt-2 text-[11px] font-semibold underline" onClick={() => setShowReview(false)}>
            Edit memo
          </button>
        </div>
      ) : null}
      <div className="flex shrink-0 items-center justify-end gap-2 border-b border-slate-100 px-3 py-1.5">
        <label className="inline-flex items-center gap-1.5 text-[10px] text-slate-600">
          <input
            type="checkbox"
            checked={quickComposeMode}
            onChange={(e) => setQuickComposeMode(e.target.checked)}
            className="rounded border-slate-300 text-teal-800"
          />
          Quick mode
        </label>
      </div>
      <div
        className={`min-h-0 flex-1 overflow-y-auto ${isFloating ? 'px-4 py-1 [&_.border-b]:border-[#f1f3f4]' : 'px-3 py-3 sm:px-4'}`}
      >
        <div
          className={`flex gap-3 py-2.5 ${isFloating ? 'border-b border-[#f1f3f4]' : 'border-b border-slate-200/90'}`}
        >
          <span
            className={`w-12 shrink-0 pt-2 text-right text-[13px] font-medium ${isFloating ? 'text-[#5f6368]' : 'text-slate-500'}`}
          >
            From
          </span>
          <p className={`flex-1 pt-2 text-[13px] ${isFloating ? 'text-[#202124]' : 'text-slate-900'}`}>{fromLine}</p>
        </div>
        <OfficeRecipientStrip
          label="Recipients"
          selectedIds={toIds}
          onChange={setToIds}
          directory={directory}
          branchNameById={branchNameById}
          placeholder="Recipients…"
        />
        <OfficeRecipientStrip
          label="Copy"
          selectedIds={ccIds}
          onChange={setCcIds}
          directory={directory}
          branchNameById={branchNameById}
          placeholder="Cc…"
        />
        <div className={`flex items-center gap-3 py-2 ${isFloating ? 'border-b border-[#f1f3f4]' : 'border-b border-slate-200/90'}`}>
          <span
            className={`w-12 shrink-0 text-right text-[13px] font-medium ${isFloating ? 'text-[#5f6368]' : 'text-slate-500'}`}
          >
            Memo Subject
          </span>
          <input
            required
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            className={`min-w-0 flex-1 border-0 border-b border-transparent bg-transparent py-2 text-[13px] outline-none ${
              isFloating
                ? 'text-[#202124] placeholder:text-[#80868b] focus:border-teal-600'
                : 'focus:border-teal-600/40'
            }`}
            placeholder="Memo subject"
          />
        </div>
        <div className={`grid grid-cols-1 gap-3 py-3 sm:grid-cols-2 ${isFloating ? 'border-b border-[#f1f3f4]' : 'border-b border-slate-100'}`}>
          <label className={metaLabelClass}>
            Document class
            <select value={newDocumentClass} onChange={(e) => setNewDocumentClass(e.target.value)} className={metaSelectClass}>
              <option value="correspondence">Official correspondence</option>
              <option value="request">Request</option>
              <option value="report">Report</option>
              <option value="approval">Approval submission</option>
            </select>
          </label>
          <label className={metaLabelClass}>
            Responsible office
            <select value={newOfficeKey} onChange={(e) => setNewOfficeKey(e.target.value)} className={metaSelectClass}>
              <option value="office_admin">Office administration</option>
              <option value="branch_manager">Branch manager</option>
              <option value="sales">Sales office</option>
              <option value="procurement">Procurement office</option>
              <option value="operations">Operations office</option>
              <option value="finance">Finance office</option>
              <option value="hr">HR office</option>
            </select>
          </label>
        </div>
        <div className={`grid grid-cols-1 gap-3 py-3 sm:grid-cols-2 ${isFloating ? 'border-b border-[#f1f3f4]' : 'border-b border-slate-100'}`}>
          <label className={metaLabelClass}>
            Confidentiality
            <select value={newConfidentiality} onChange={(e) => setNewConfidentiality(e.target.value)} className={metaSelectClass}>
              <option value="internal">Internal</option>
              <option value="restricted">Restricted</option>
              <option value="confidential">Confidential</option>
            </select>
          </label>
          <label className={metaLabelClass}>
            Memo date
            <input type="date" value={memoDate} onChange={(e) => setMemoDate(e.target.value)} className={metaSelectClass} />
          </label>
        </div>
        {composeTemplates.length > 0 ? (
          <div className={`space-y-3 py-3 ${isFloating ? 'border-b border-[#f1f3f4]' : 'border-b border-slate-100'}`}>
            <label className={metaLabelClass}>
              Operations template (optional)
              <select
                value={selectedComposeTemplateId}
                onChange={(e) => {
                  setSelectedComposeTemplateId(e.target.value);
                  setComposeTemplateFields({});
                }}
                className={metaSelectClass}
              >
                <option value="">None — free-form memo</option>
                {composeTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </label>
            {selectedComposeTemplateId ? (
              <p className={`text-[11px] leading-relaxed ${isFloating ? 'text-[#5f6368]' : 'text-slate-600'}`}>
                {composeTemplates.find((x) => x.id === selectedComposeTemplateId)?.summary}
              </p>
            ) : null}
            {(composeTemplates.find((x) => x.id === selectedComposeTemplateId)?.fields || []).map((f) => (
              <label key={f.key} className={metaLabelClass}>
                {f.label}
                {f.required ? <span className="text-rose-600"> *</span> : null}
                {f.type === 'number' ? (
                  <input
                    type="number"
                    className={metaSelectClass}
                    value={composeTemplateFields[f.key] ?? ''}
                    onChange={(e) =>
                      setComposeTemplateFields((prev) => ({ ...prev, [f.key]: e.target.value }))
                    }
                  />
                ) : f.type === 'date' ? (
                  <input
                    type="date"
                    className={metaSelectClass}
                    value={composeTemplateFields[f.key] ?? ''}
                    onChange={(e) =>
                      setComposeTemplateFields((prev) => ({ ...prev, [f.key]: e.target.value }))
                    }
                  />
                ) : (
                  <input
                    type="text"
                    className={metaSelectClass}
                    value={composeTemplateFields[f.key] ?? ''}
                    onChange={(e) =>
                      setComposeTemplateFields((prev) => ({ ...prev, [f.key]: e.target.value }))
                    }
                  />
                )}
              </label>
            ))}
          </div>
        ) : null}
        <div
          className={`py-2 ${attachmentDragOver ? 'rounded-lg bg-teal-50/50 ring-2 ring-teal-200' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setAttachmentDragOver(true);
          }}
          onDragLeave={() => setAttachmentDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setAttachmentDragOver(false);
            addMemoFiles(e.dataTransfer.files);
          }}
        >
          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            rows={isFloating ? 10 : 8}
            placeholder="Memo body…"
            className={
              isFloating
                ? 'min-h-[200px] w-full resize-y border-0 bg-white px-0 py-2 text-[13px] leading-relaxed text-[#202124] outline-none placeholder:text-[#80868b]'
                : 'min-h-[160px] w-full rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-[13px] leading-relaxed outline-none focus:ring-2 focus:ring-teal-500/20'
            }
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => memoFileRef.current?.click()}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium ${
                isFloating ? 'text-[#5f6368] hover:bg-[#f1f3f4]' : 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700'
              }`}
            >
              <Paperclip size={14} />
              Supporting documents
            </button>
            <input ref={memoFileRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xlsx,.xls,.txt" className="hidden" onChange={(e) => addMemoFiles(e.target.files)} />
          </div>
          {attachmentError ? <p className="mt-1 text-[11px] text-rose-700">{attachmentError}</p> : null}
          <p className="mt-1 text-[10px] text-slate-500">Drag and drop files here (max 5, 2.5 MB each)</p>
          {memoAttachments.length > 0 ? (
            <ul className={`mt-2 space-y-1 text-[11px] ${isFloating ? 'text-[#5f6368]' : 'text-slate-600'}`}>
              {memoAttachments.map((a, i) => (
                <li key={`${a.name}-${i}`} className="flex items-center justify-between gap-2">
                  <span className="truncate">{a.name}</span>
                  <button
                    type="button"
                    className="shrink-0 font-semibold text-[#d93025] hover:underline"
                    onClick={() => setMemoAttachments((prev) => prev.filter((_, j) => j !== i))}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <p className={`pb-3 text-[11px] ${isFloating ? 'text-[#5f6368]' : 'text-slate-500'}`}>
          After sending, open the thread from{' '}
          <Link to="/" className="font-semibold text-[#134e4a] underline-offset-2 hover:underline">
            Internal Memos
          </Link>{' '}
          on the workspace.
        </p>
      </div>
      <div
        className={`flex shrink-0 items-center gap-2 border-t px-4 py-3 ${
          isFloating ? 'justify-between border-[#f1f3f4] bg-[#f6f8fc]' : 'border-slate-200 bg-white'
        }`}
      >
        {isFloating ? (
          <button
            type="button"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
            onClick={closeCompose}
          >
            Discard
          </button>
        ) : (
          <button type="button" className="z-btn-secondary flex-1 justify-center" onClick={closeCompose}>
            Cancel
          </button>
        )}
        <span className="hidden text-[10px] text-slate-500 sm:inline" aria-live="polite">
          {draftSyncStatus === 'saving'
            ? 'Saving…'
            : draftSyncStatus === 'saved'
              ? 'Saved'
              : draftSyncStatus === 'offline'
                ? 'Offline draft'
                : draftSyncStatus === 'unsynced'
                  ? 'Draft not synced'
                  : ''}
        </span>
        <button
          type="submit"
          disabled={sending}
          className={
            isFloating
              ? 'inline-flex min-w-[88px] items-center justify-center gap-2 rounded-full bg-[#134e4a] px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#0f3d3a] disabled:opacity-50'
              : 'z-btn-primary flex-1 justify-center gap-2'
          }
        >
          <Send size={16} className={isFloating ? 'opacity-95' : ''} />
          {sending ? 'Sending…' : showReview ? 'Confirm send' : 'Review & send'}
        </button>
      </div>
    </form>
  );

  const drawerHeader = (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-teal-900/80">Office</p>
        <h2 className="text-base font-bold text-slate-900">Compose Memo</h2>
      </div>
      <button type="button" onClick={closeCompose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close panel">
        <X size={20} />
      </button>
    </div>
  );

  const gmailTitleBar = (
    <div className="flex shrink-0 cursor-default items-center justify-between rounded-t-xl bg-gradient-to-r from-teal-900 to-teal-800 px-1 py-0.5 pl-3 text-white shadow-inner">
      <DialogPrimitive.Title className="text-sm font-medium tracking-tight">Compose Memo</DialogPrimitive.Title>
      <div className="flex items-center">
        <button
          type="button"
          onClick={closeCompose}
          className="rounded p-2 text-teal-100 hover:bg-white/10"
          aria-label="Close compose"
        >
          <X size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  );

  if (isFloating) {
    return (
      <DialogPrimitive.Root
        open={isOpen}
        modal={false}
        onOpenChange={(open) => {
          if (!open) closeCompose();
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Content
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
            className="fixed bottom-3 right-3 z-[1090] flex w-[min(calc(100vw-1.5rem),572px)] max-h-[min(88vh,720px)] flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_12px_28px_-8px_rgba(15,23,42,0.25)] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-150 sm:bottom-4 sm:right-4"
          >
            <DialogPrimitive.Description className="sr-only">Compose a new internal memo</DialogPrimitive.Description>
            {gmailTitleBar}
            <div className="flex min-h-0 flex-1 flex-col bg-white">{bodyArea}</div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );
  }

  return (
    <SlideOverPanel
      isOpen={isOpen}
      onClose={closeCompose}
      title="Compose Memo"
      description="Create an internal official memo"
      maxWidthClass="max-w-lg"
    >
      {drawerHeader}
      {bodyArea}
    </SlideOverPanel>
  );
}

export function ComposeMemoButton({ onClick, className = '', 'aria-label': ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel || 'Compose Memo'}
      className={`group inline-flex w-full items-center gap-3 rounded-2xl border border-teal-200/80 bg-gradient-to-br from-white to-teal-50/90 px-4 py-3 text-left text-sm font-semibold text-teal-950 shadow-sm ring-1 ring-teal-900/[0.06] transition hover:border-teal-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 sm:pl-5 ${className}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-800 text-white shadow-sm transition group-hover:bg-teal-900">
        <Pen size={20} strokeWidth={2} aria-hidden />
      </span>
      <span>Compose Memo</span>
    </button>
  );
}

/** @deprecated Use ComposeMemoButton */
export const GmailComposeTriggerButton = ComposeMemoButton;
