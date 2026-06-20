import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useUserProfile } from '../../context/UserProfileContext';
import { HrStaffDocumentsPanel } from '../../components/hr/HrStaffDocumentsPanel';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { apiFetch } from '../../lib/apiBase';
import { fetchHrLetters } from '../../lib/hrExtended';
import { ProfileOnboardingWizard } from '../../components/profile/ProfileOnboardingWizard';
import { ProfilePageBody, ProfilePageIntro } from '../../components/profile/profilePageUi';
import {
  ProfileEmptyState,
  ProfileInlineAlert,
  ProfileOverviewSection,
} from '../../components/profile/profileOverviewUi';
import { ProfilePageAnchors } from '../../components/profile/profileFormUi';
import { ProfileListRow, ProfileStatusChip } from '../../components/profile/profileDesign';

const DOCUMENT_ANCHORS = [
  { id: 'uploads', label: 'Uploads' },
  { id: 'letters', label: 'Letters' },
];

export default function MyProfileDocuments() {
  const ws = useWorkspace();
  const { onboardingChecklist, reload } = useUserProfile();
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

  const checklist = staff?.onboardingChecklist || onboardingChecklist;
  const docMissing = (checklist?.missing || []).filter((m) => String(m).startsWith('doc:')).length;

  return (
    <ProfilePageBody>
      <ProfilePageIntro
        description="Upload certificates, IDs, and signed forms. HR uses these to verify your profile and approve requests like loans."
        actions={
          docMissing > 0 ? (
            <ProfileStatusChip variant="pending">{docMissing} upload(s) needed</ProfileStatusChip>
          ) : checklist?.complete ? (
            <ProfileStatusChip variant="approved">Checklist complete</ProfileStatusChip>
          ) : null
        }
      />

      <ProfileOnboardingWizard />

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
          onboardingChecklist={checklist}
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
            await reload?.();
          }}
        />
      </ProfileOverviewSection>

      <ProfileOverviewSection id="letters" title="Employment letters" subtitle="Official letters issued by HQ HR">
        {error ? <ProfileInlineAlert variant="error">{error}</ProfileInlineAlert> : null}
        {loading ? <p className="z-meta-text">Loading letters…</p> : null}
        {!loading && !letters.length ? (
          <ProfileEmptyState
            title="No letters on file"
            description="Appointment or confirmation letters will appear here once HR issues them."
          />
        ) : null}
        {!loading && letters.length > 0 ? (
          <ul className="space-y-1.5">
            {letters.map((letter) => (
              <li key={letter.id}>
                <ProfileListRow>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">{letter.title || letter.kind}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      {letter.issuedAtIso ? String(letter.issuedAtIso).slice(0, 10) : '—'}
                    </span>
                  </span>
                  <ProfileStatusChip variant={letter.status === 'issued' ? 'approved' : 'pending'}>
                    {letter.status || 'issued'}
                  </ProfileStatusChip>
                </ProfileListRow>
              </li>
            ))}
          </ul>
        ) : null}
      </ProfileOverviewSection>
    </ProfilePageBody>
  );
}
