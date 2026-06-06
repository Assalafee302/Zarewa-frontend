import React, { useCallback, useState } from 'react';
import { Download, Trash2, Upload } from 'lucide-react';
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
} from '../../lib/hrStaffDocuments';
const MAX_AVATAR_CHARS = 180_000;
const DOC_ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp,application/pdf';

/**
 * @param {{
 *   userId: string;
 *   displayName?: string;
 *   avatarUrl?: string | null;
 *   canEdit?: boolean;
 *   onboardingChecklist?: { complete?: boolean; missingLabels?: string[] };
 *   onUpdated?: () => void;
 * }} props
 */
export function HrStaffDocumentsPanel({
  userId,
  displayName,
  avatarUrl,
  canEdit = false,
  onboardingChecklist,
  onUpdated,
}) {
  const [documents, setDocuments] = useState([]);
  const [busyKind, setBusyKind] = useState('');
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [expiryDates, setExpiryDates] = useState({});

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
      const expiryDateIso = expiryDates[docKind] || undefined;
      const { ok, data } = await uploadHrStaffDocument(userId, {
        docKind,
        ...payload,
        ...(expiryDateIso ? { expiry_date_iso: expiryDateIso } : {}),
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
        Employee onboarding file for {displayName || 'this staff member'} — identity details, passport photograph, and
        standard HR documents.
      </p>

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
        <p className="mt-1 text-xs text-slate-500">Used as the staff member&apos;s avatar across the app.</p>
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
            return (
              <li
                key={kind.value}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{kind.label}</p>
                  {doc ? (
                    <p className="text-xs text-slate-500 truncate">
                      {doc.fileName}
                      {doc.uploadedAtIso ? ` · uploaded ${doc.uploadedAtIso.slice(0, 10)}` : ''}
                      {doc.expiryDateIso || doc.expiry_date_iso ? ` · expires ${(doc.expiryDateIso || doc.expiry_date_iso).slice(0, 10)}` : ''}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-700 font-medium">Not uploaded</p>
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
                  {canEdit ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                        Expiry date
                        <input
                          type="date"
                          value={expiryDates[kind.value] || ''}
                          onChange={(e) => setExpiryDates((prev) => ({ ...prev, [kind.value]: e.target.value }))}
                          className="ml-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-mono"
                          aria-label={`Expiry date for ${kind.label}`}
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
    </div>
  );
}
