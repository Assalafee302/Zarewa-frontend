import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrStaffDocumentsPanel } from '../../components/hr/HrStaffDocumentsPanel';
import { HrPageBody, HrPageIntro } from '../../components/hr/hrPageUi';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { apiFetch } from '../../lib/apiBase';
import { fetchHrLetters } from '../../lib/hrExtended';
import {
  ProfileEmptyState,
  ProfileInlineAlert,
  ProfileOverviewSection,
} from '../../components/profile/profileOverviewUi';
import { ProfilePageAnchors } from '../../components/profile/profileFormUi';

const DOCUMENT_ANCHORS = [
  { id: 'uploads', label: 'Uploads' },
  { id: 'letters', label: 'Letters' },
];

export default function MyProfileDocuments() {
  const ws = useWorkspace();
  const userId = ws?.session?.user?.id;
  const [staff, setStaff] = React.useState(null);
  const [letters, setLetters] = React.useState([]);

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
      return { hasData: true };
    }
    setLetters(data.letters || []);
    return { hasData: true };
  }, []);

  if (!userId) return null;

  return (
    <HrPageBody>
      <HrPageIntro
        title="Documents"
        description="Upload certificates, IDs, and signed forms. HR uses these to verify your profile and approve requests like loans."
      />

      <ProfilePageAnchors items={DOCUMENT_ANCHORS} />

      <ProfileOverviewSection
        id="uploads"
        title="Uploads & checklist"
        subtitle="Required files for onboarding and loan applications"
      >
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
      </ProfileOverviewSection>

      <ProfileOverviewSection id="letters" title="Employment letters" subtitle="Official letters issued by HQ HR">
        {error ? <ProfileInlineAlert variant="error">{error}</ProfileInlineAlert> : null}
        {letters.map((l) => (
          <article key={l.id} className="mb-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 last:mb-0">
            <p className="text-[10px] font-black uppercase text-slate-400">
              {l.letterKind} · {l.issuedAtIso?.slice(0, 10)}
            </p>
            <pre className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{l.contentText}</pre>
          </article>
        ))}
        {!loading && !letters.length && !error ? (
          <ProfileEmptyState
            title="No employment letters yet"
            description="When HR issues an appointment or confirmation letter, it will appear here."
          />
        ) : null}
      </ProfileOverviewSection>
    </HrPageBody>
  );
}
