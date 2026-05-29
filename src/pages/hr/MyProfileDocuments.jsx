import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrStaffDocumentsPanel } from '../../components/hr/HrStaffDocumentsPanel';
import { HrLetterPrintModal } from '../../components/hr/HrLetterPrintModal';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { apiFetch } from '../../lib/apiBase';
import { downloadEmploymentLetterPdf, fetchHrLetters } from '../../lib/hrExtended';

export default function MyProfileDocuments() {
  const ws = useWorkspace();
  const userId = ws?.session?.user?.id;
  const [staff, setStaff] = useState(null);
  const [letters, setLetters] = useState([]);
  const [previewLetter, setPreviewLetter] = useState(null);

  useHrListLoad(async () => {
    if (!userId) return { hasData: true };
    const { ok, data } = await apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}`);
    if (ok && data?.ok) setStaff(data.staff);
    return { hasData: true };
  }, [userId]);

  const { loading, error } = useHrListLoad(async () => {
    const { ok, data } = await fetchHrLetters();
    if (!ok || !data?.ok) {
      setLetters([]);
      return { error: data?.error || 'Could not load documents.', hasData: false };
    }
    setLetters(data.letters || []);
    return { hasData: true };
  }, []);

  if (!userId) return null;

  return (
    <div className="space-y-10">
      <HrStaffDocumentsPanel
        userId={userId}
        displayName={ws?.session?.user?.displayName}
        avatarUrl={staff?.avatarUrl ?? ws?.session?.user?.avatarUrl}
        canEdit
        onboardingChecklist={staff?.onboardingChecklist}
        onUpdated={async () => {
          const { ok, data } = await apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}`);
          if (ok && data?.ok) {
            setStaff(data.staff);
            if (data.staff?.avatarUrl) {
              await ws?.updateProfile?.({ avatarUrl: data.staff.avatarUrl });
            } else {
              await ws?.refresh?.();
            }
          }
        }}
      />

      <HrLetterPrintModal
        isOpen={!!previewLetter}
        onClose={() => setPreviewLetter(null)}
        letter={previewLetter}
        staffDisplayName={ws?.session?.user?.displayName}
      />

      <section className="space-y-3">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Employment letters</h2>
        <p className="text-sm text-slate-600">Letters issued to you by HQ HR — preview, print, or download PDF.</p>
        {error ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
        {letters.map((l) => (
          <article key={l.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="text-[10px] font-black uppercase text-slate-400">
                {l.letterKind} · {l.issuedAtIso?.slice(0, 10)}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-[#134e4a] px-3 py-1.5 text-[10px] font-bold uppercase text-white"
                  onClick={() => setPreviewLetter(l)}
                >
                  Preview / print
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase text-[#134e4a]"
                  onClick={() => downloadEmploymentLetterPdf(l.id)}
                >
                  PDF
                </button>
              </div>
            </div>
            <pre className="mt-3 max-h-32 overflow-y-auto whitespace-pre-wrap text-sm text-slate-800">{l.contentText}</pre>
          </article>
        ))}
        {!loading && !letters.length ? <p className="text-sm text-slate-500">No letters on file.</p> : null}
      </section>
    </div>
  );
}
