import React, { useCallback, useMemo, useState } from 'react';
import { CheckCircle2, Download, ShieldAlert, Trash2, Upload, XCircle } from 'lucide-react';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import {
  dataUrlToUploadPayload,
  deleteHrStaffDocument,
  fetchHrStaffDocuments,
  hrStaffDocumentDownloadUrl,
  HR_STAFF_DOC_KINDS,
  readFileAsDataUrl,
  uploadHrStaffDocument,
  uploadHrStaffPassportPhoto,
  verifyHrStaffDocument,
} from '../../lib/hrStaffDocuments';
import { GUARANTOR_FORM_TEMPLATE_URL } from '../../lib/hrStaffDocumentKinds';
import { HrFormModal } from './HrFormModal';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from './hrFormStyles';

const MAX_AVATAR_CHARS = 180_000;
const DOC_ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp,application/pdf';

const VERIFY_PILL = {
  pending: 'bg-amber-50 text-amber-900 border-amber-200',
  verified: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rejected: 'bg-red-50 text-red-800 border-red-200',
  expired: 'bg-slate-100 text-slate-600 border-slate-200',
};

function isExpired(iso) {
  if (!iso) return false;
  const t = Date.parse(String(iso).slice(0, 10));
  return Number.isFinite(t) && t < Date.now();
}

/**
 * @param {{
 *   userId: string;
 *   displayName?: string;
 *   avatarUrl?: string | null;
 *   canEdit?: boolean;
 *   canVerify?: boolean;
 *   onboardingChecklist?: { complete?: boolean; missingLabels?: string[] };
 *   onUpdated?: () => void;
 * }} props
 */
export function HrStaffDocumentsPanel({
  userId,
  displayName,
  avatarUrl,
  canEdit = false,
  canVerify = false,
  onboardingChecklist,
  onUpdated,
}) {
  const [documents, setDocuments] = useState([]);
  const [busyKind, setBusyKind] = useState('');
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [metaByKind, setMetaByKind] = useState({});
  const [verifyTarget, setVerifyTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [verifyBusy, setVerifyBusy] = useState(false);

  const { loading, reload } = useHrListLoad(async () => {
    const { ok, data } = await fetchHrStaffDocuments(userId);
    if (!ok || !data?.ok) {
      setDocuments([]);
      return { error: data?.error || 'Could not load documents.', hasData: false };
    }
    setDocuments(data.documents || []);
    return { hasData: true };
  }, [userId]);

  const docByKind = (kind) => documents.find((d) => d.docKind === kind);

  const compliance = useMemo(() => {
    const kinds = new Set(documents.map((d) => d.docKind));
    const uploaded = HR_STAFF_DOC_KINDS.filter((k) => kinds.has(k.value)).length;
    const verified = documents.filter((d) => d.verificationStatus === 'verified').length;
    const pending = documents.filter((d) => (d.verificationStatus || 'pending') === 'pending').length;
    const expired = documents.filter((d) => isExpired(d.expiryDateIso)).length;
    return { uploaded, total: HR_STAFF_DOC_KINDS.length, verified, pending, expired };
  }, [documents]);

  const notifyUpdated = useCallback(async () => {
    await reload();
    onUpdated?.();
  }, [reload, onUpdated]);

  const onDocFile = async (docKind, e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || !canEdit) return;
    setBusyKind(docKind);
    setError('');
    setMessage('');
    try {
      const dataUrl = await readFileAsDataUrl(f);
      const payload = dataUrlToUploadPayload(dataUrl, f.name);
      if (!payload) {
        setError('Could not read file.');
        return;
      }
      const meta = metaByKind[docKind] || {};
      const { ok, data } = await uploadHrStaffDocument(userId, {
        docKind,
        ...payload,
        ...(meta.expiryDateIso ? { expiry_date_iso: meta.expiryDateIso } : {}),
        ...(meta.issueDateIso ? { issue_date_iso: meta.issueDateIso } : {}),
        ...(meta.notes ? { notes: meta.notes } : {}),
      });
      if (!ok || !data?.ok) {
        setError(data?.error || 'Upload failed.');
        return;
      }
      setMessage(`${HR_STAFF_DOC_KINDS.find((d) => d.value === docKind)?.label || 'Document'} uploaded.`);
      await notifyUpdated();
    } catch (err) {
      setError(err?.message || 'Upload failed.');
    } finally {
      setBusyKind('');
    }
  };

  const onDeleteDoc = async (docId) => {
    if (!canEdit || !window.confirm('Remove this document from the employee file?')) return;
    const { ok, data } = await deleteHrStaffDocument(userId, docId);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not delete.');
      return;
    }
    setMessage('Document removed.');
    await notifyUpdated();
  };

  const submitVerify = async (action) => {
    if (!verifyTarget) return;
    setVerifyBusy(true);
    setError('');
    const { ok, data } = await verifyHrStaffDocument(userId, verifyTarget.id, {
      action,
      rejectionReason: action === 'reject' ? rejectReason : undefined,
    });
    setVerifyBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Verification failed.');
      return;
    }
    setMessage(action === 'verify' ? 'Document verified.' : 'Document rejected.');
    setVerifyTarget(null);
    setRejectReason('');
    await notifyUpdated();
  };

  const onPassportFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || !canEdit) return;
    if (!/^image\/(png|jpeg|jpg|webp)$/i.test(f.type)) {
      setError('Passport photo must be PNG, JPEG, or WebP.');
      return;
    }
    setAvatarBusy(true);
    setError('');
    try {
      const dataUrl = await readFileAsDataUrl(f);
      if (dataUrl.length > MAX_AVATAR_CHARS) {
        setError('Image is too large. Use a smaller passport photo.');
        return;
      }
      const { ok, data } = await uploadHrStaffPassportPhoto(userId, dataUrl);
      if (!ok || !data?.ok) {
        setError(data?.error || 'Could not save passport photo.');
        return;
      }
      setMessage('Passport photo saved — used as profile avatar.');
      await notifyUpdated();
    } catch (err) {
      setError(err?.message || 'Could not save passport photo.');
    } finally {
      setAvatarBusy(false);
    }
  };

  const showAvatar =
    avatarUrl && (avatarUrl.startsWith('https://') || avatarUrl.startsWith('data:image/'));

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Employee onboarding file for {displayName || 'this staff member'} — identity, passport photograph, and
        standard HR documents with verification status.
      </p>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Required uploaded', value: `${compliance.uploaded}/${compliance.total}`, tone: 'text-[#134e4a]' },
          { label: 'Verified', value: compliance.verified, tone: 'text-emerald-700' },
          { label: 'Pending review', value: compliance.pending, tone: 'text-amber-700' },
          { label: 'Expired', value: compliance.expired, tone: 'text-red-700' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className={`text-xl font-black tabular-nums ${s.tone}`}>{s.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {onboardingChecklist && !onboardingChecklist.complete ? (
        <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">File incomplete</p>
          <p className="mt-1 text-xs">
            Still needed: {(onboardingChecklist.missingLabels || []).join(' · ') || 'See checklist below'}
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</div>
      ) : null}

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-[#134e4a]">Passport photograph</h3>
        <p className="mt-1 text-xs text-slate-500">Used as the staff member&apos;s avatar across the app and ID cards.</p>
        <div className="mt-4 flex flex-wrap items-start gap-4">
          {showAvatar ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-20 w-20 rounded-2xl border border-slate-200 object-cover bg-slate-100"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-[10px] text-slate-400 text-center px-1">
              No photo
            </div>
          )}
          {canEdit ? (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#134e4a]/30 bg-[#134e4a]/5 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-[#134e4a] hover:bg-[#134e4a]/10">
              <Upload size={14} aria-hidden />
              {avatarBusy ? 'Uploading…' : 'Upload passport photo'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                disabled={avatarBusy}
                onChange={onPassportFile}
              />
            </label>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Required documents</h3>
        {loading ? <p className="text-sm text-slate-500">Loading documents…</p> : null}
        <ul className="space-y-2">
          {HR_STAFF_DOC_KINDS.map((kind) => {
            const doc = docByKind(kind.value);
            const isBusy = busyKind === kind.value;
            const status = doc && isExpired(doc.expiryDateIso) ? 'expired' : doc?.verificationStatus || 'pending';
            return (
              <li
                key={kind.value}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800">{kind.label}</p>
                    {doc ? (
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${VERIFY_PILL[status] || VERIFY_PILL.pending}`}>
                        {status}
                      </span>
                    ) : (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                        Missing
                      </span>
                    )}
                  </div>
                  {doc ? (
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {doc.fileName}
                      {doc.uploadedAtIso ? ` · uploaded ${doc.uploadedAtIso.slice(0, 10)}` : ''}
                      {doc.issueDateIso ? ` · issued ${doc.issueDateIso.slice(0, 10)}` : ''}
                      {doc.expiryDateIso ? ` · expires ${doc.expiryDateIso.slice(0, 10)}` : ''}
                      {doc.rejectionReason ? ` · rejected: ${doc.rejectionReason}` : ''}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-700 font-medium mt-0.5">Not uploaded</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {doc ? (
                    <>
                      <a
                        href={hrStaffDocumentDownloadUrl(userId, doc.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase text-[#134e4a]"
                      >
                        <Download size={12} aria-hidden /> View
                      </a>
                      {canVerify && status === 'pending' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => { setVerifyTarget(doc); setRejectReason(''); }}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase text-emerald-800"
                          >
                            <CheckCircle2 size={12} aria-hidden /> Verify
                          </button>
                          <button
                            type="button"
                            onClick={() => { setVerifyTarget({ ...doc, rejectMode: true }); setRejectReason(''); }}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-[10px] font-bold uppercase text-red-800"
                          >
                            <XCircle size={12} aria-hidden /> Reject
                          </button>
                        </>
                      ) : null}
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => onDeleteDoc(doc.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-[10px] font-bold uppercase text-red-800"
                        >
                          <Trash2 size={12} aria-hidden /> Remove
                        </button>
                      ) : null}
                    </>
                  ) : null}
                  {canEdit && kind.value === 'guarantor_form' ? (
                    <a
                      href={GUARANTOR_FORM_TEMPLATE_URL}
                      download="Zarewa-Guarantor-Form.txt"
                      className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-[10px] font-bold uppercase text-violet-800"
                    >
                      <Download size={12} aria-hidden /> Download blank form
                    </a>
                  ) : null}
                  {canEdit ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                        Issue
                        <input
                          type="date"
                          value={metaByKind[kind.value]?.issueDateIso || ''}
                          onChange={(e) =>
                            setMetaByKind((prev) => ({
                              ...prev,
                              [kind.value]: { ...prev[kind.value], issueDateIso: e.target.value },
                            }))
                          }
                          className="ml-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-mono"
                        />
                      </label>
                      <label className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                        Expiry
                        <input
                          type="date"
                          value={metaByKind[kind.value]?.expiryDateIso || ''}
                          onChange={(e) =>
                            setMetaByKind((prev) => ({
                              ...prev,
                              [kind.value]: { ...prev[kind.value], expiryDateIso: e.target.value },
                            }))
                          }
                          className="ml-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-mono"
                        />
                      </label>
                      <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-[#134e4a] px-3 py-1.5 text-[10px] font-bold uppercase text-white">
                        <Upload size={12} aria-hidden />
                        {isBusy ? '…' : doc ? 'Replace' : 'Upload'}
                        <input
                          type="file"
                          accept={DOC_ACCEPT}
                          className="hidden"
                          disabled={isBusy}
                          onChange={(e) => onDocFile(kind.value, e)}
                        />
                      </label>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <HrFormModal
        isOpen={Boolean(verifyTarget)}
        onClose={() => { setVerifyTarget(null); setRejectReason(''); }}
        title={verifyTarget?.rejectMode ? 'Reject document' : 'Verify document'}
        size="sm"
      >
        {verifyTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {verifyTarget.rejectMode
                ? `Provide a reason for rejecting ${verifyTarget.fileName || 'this document'}.`
                : `Confirm that ${verifyTarget.fileName || 'this document'} meets HR requirements.`}
            </p>
            {verifyTarget.rejectMode ? (
              <label className="block text-xs font-semibold text-slate-600">
                Rejection reason
                <textarea
                  className={`${HR_FIELD_CLASS} mt-1 min-h-[80px]`}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  required
                />
              </label>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                <ShieldAlert size={16} aria-hidden />
                Verification is recorded in the audit trail.
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setVerifyTarget(null)} className={HR_BTN_SECONDARY}>
                Cancel
              </button>
              <button
                type="button"
                disabled={verifyBusy || (verifyTarget.rejectMode && !rejectReason.trim())}
                onClick={() => submitVerify(verifyTarget.rejectMode ? 'reject' : 'verify')}
                className={HR_BTN_PRIMARY}
              >
                {verifyBusy ? 'Saving…' : verifyTarget.rejectMode ? 'Reject document' : 'Mark verified'}
              </button>
            </div>
          </div>
        ) : null}
      </HrFormModal>
    </div>
  );
}
