import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { canGenerateHrLetters } from '../../lib/hrAccess';
import { apiFetch } from '../../lib/apiBase';
import { downloadEmploymentLetterPdf, fetchHrLetters, generateHrLetter } from '../../lib/hrExtended';
import { HrAddFormButton, HrFormModal } from '../../components/hr/HrFormModal';
import { HR_BTN_PRIMARY, HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

export default function HrLetters() {
  const ws = useWorkspace();
  const canGenerate = canGenerateHrLetters(ws?.permissions);
  const [modalOpen, setModalOpen] = useState(false);
  const [staff, setStaff] = useState([]);
  const [letters, setLetters] = useState([]);
  const [userId, setUserId] = useState('');
  const [letterKind, setLetterKind] = useState('employment');
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [formErr, setFormErr] = useState('');

  useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/staff');
    if (ok && data?.ok) setStaff(data.staff || []);
    return { hasData: true };
  }, []);

  const { loading, error, reload } = useHrListLoad(async () => {
    const { ok, data } = await fetchHrLetters();
    if (!ok || !data?.ok) {
      setLetters([]);
      return { error: data?.error || 'Could not load letters.', hasData: false };
    }
    setLetters(data.letters || []);
    return { hasData: true };
  }, []);

  const onGenerate = async (e) => {
    e.preventDefault();
    if (!canGenerate || !userId) return;
    setBusy(true);
    setMessage('');
    setFormErr('');
    setPreview('');
    const { ok, data } = await generateHrLetter({ userId, letterKind });
    setBusy(false);
    if (!ok || !data?.ok) {
      setFormErr(data?.error || 'Could not generate letter.');
      return;
    }
    setPreview(data.contentText || '');
    setMessage('Letter generated and saved.');
    await reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-slate-600 max-w-2xl">
          Issue employment confirmation letters for staff. Letters are stored on the employee file and can be copied or
          downloaded as PDF.
        </p>
        {canGenerate ? <HrAddFormButton onClick={() => setModalOpen(true)}>Generate letter</HrAddFormButton> : null}
      </div>

      <HrFormModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setPreview('');
          setFormErr('');
        }}
        title="Generate employment letter"
        size="md"
      >
        <form onSubmit={onGenerate} className="space-y-3">
          {formErr ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">{formErr}</div>
          ) : null}
          {message ? <p className="text-sm text-emerald-800">{message}</p> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
              Staff member
              <select className={HR_FIELD_CLASS} value={userId} onChange={(e) => setUserId(e.target.value)} required>
                <option value="">Select…</option>
                {staff.map((s) => (
                  <option key={s.userId} value={s.userId}>
                    {s.displayName || s.username}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
              Letter type
              <select className={HR_FIELD_CLASS} value={letterKind} onChange={(e) => setLetterKind(e.target.value)}>
                <option value="employment">Employment confirmation</option>
                <option value="experience">Experience (template)</option>
              </select>
            </label>
          </div>
          <button type="submit" disabled={busy} className={HR_BTN_PRIMARY}>
            {busy ? 'Generating…' : 'Generate letter'}
          </button>
          {preview ? (
            <pre className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 max-h-48 overflow-y-auto">
              {preview}
            </pre>
          ) : null}
        </form>
      </HrFormModal>

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
      <AppTableWrap>
        <AppTable>
          <AppTableThead>
            <AppTableTr>
              <AppTableTh>Issued</AppTableTh>
              <AppTableTh>Staff</AppTableTh>
              <AppTableTh>Type</AppTableTh>
              <AppTableTh>Preview</AppTableTh>
              <AppTableTh />
            </AppTableTr>
          </AppTableThead>
          <AppTableBody>
            {loading && !letters.length ? (
              <AppTableTr>
                <AppTableTd colSpan={5}>
                  <span className="text-slate-500">Loading…</span>
                </AppTableTd>
              </AppTableTr>
            ) : null}
            {!loading && !letters.length ? (
              <AppTableTr>
                <AppTableTd colSpan={5}>
                  <span className="text-slate-500">No letters issued yet.</span>
                </AppTableTd>
              </AppTableTr>
            ) : null}
            {letters.map((l) => {
              const person = staff.find((s) => s.userId === l.userId);
              return (
                <AppTableTr key={l.id}>
                  <AppTableTd>{l.issuedAtIso?.slice(0, 10) || '—'}</AppTableTd>
                  <AppTableTd>
                    {person ? (
                      <Link to={`/hr/staff/${l.userId}`} className="font-semibold text-[#134e4a] hover:underline">
                        {person.displayName || l.userId}
                      </Link>
                    ) : (
                      l.userId
                    )}
                  </AppTableTd>
                  <AppTableTd>{l.letterKind}</AppTableTd>
                  <AppTableTd className="max-w-md truncate text-slate-600">{l.contentText?.slice(0, 80)}…</AppTableTd>
                  <AppTableTd>
                    <button
                      type="button"
                      className="text-xs font-bold text-[#134e4a] hover:underline"
                      onClick={() => downloadEmploymentLetterPdf(l.id)}
                    >
                      PDF
                    </button>
                  </AppTableTd>
                </AppTableTr>
              );
            })}
          </AppTableBody>
        </AppTable>
      </AppTableWrap>
    </div>
  );
}
