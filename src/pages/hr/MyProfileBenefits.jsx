import React from 'react';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { useWorkspace } from '../../context/WorkspaceContext';
import { fetchHrBeneficiaries } from '../../lib/hrExtended';
import { canViewOrgSensitiveHr } from '../../lib/hrAccess';
import { formatNgn } from '../../lib/hrFormat';
import { HrSensitiveGate } from '../../components/hr/HrSensitiveGate';
import { ProfilePageBody, ProfilePageIntro } from '../../components/profile/profilePageUi';
import {
  ProfileEmptyState,
  ProfileInlineAlert,
  ProfileMetricSkeleton,
  ProfileOverviewSection,
} from '../../components/profile/profileOverviewUi';
import { ProfileListRow } from '../../components/profile/profileDesign';

export default function MyProfileBenefits() {
  const ws = useWorkspace();
  const showSensitiveInline = canViewOrgSensitiveHr(ws?.permissions);
  const [items, setItems] = React.useState([]);

  const { loading, error } = useHrListLoad(async () => {
    const { ok, data } = await fetchHrBeneficiaries(true);
    if (!ok || !data?.ok) {
      setItems([]);
      return { hasData: true };
    }
    setItems(data.beneficiaries || []);
    return { hasData: true };
  }, []);

  const list = (
    <ul className="space-y-1.5">
      {items.map((b) => (
        <li key={b.id}>
          <ProfileListRow>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-900">{b.displayName}</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{b.beneficiaryType}</span>
            </span>
            <span className="shrink-0 text-sm font-black tabular-nums text-[#134e4a]">
              {formatNgn(b.monthlyAmountNgn)}/mo
            </span>
          </ProfileListRow>
        </li>
      ))}
    </ul>
  );

  return (
    <ProfilePageBody>
      <ProfilePageIntro
        title="Benefits"
        description="Allowances and benefits linked to your staff record. Amounts may require unlocking sensitive data."
      />

      {error ? <ProfileInlineAlert variant="error">{error}</ProfileInlineAlert> : null}

      <ProfileOverviewSection title="Your benefits" subtitle="Monthly allowances on your HR file">
        {loading ? <ProfileMetricSkeleton count={1} /> : null}
        {!loading && !items.length ? (
          <ProfileEmptyState
            title="No benefits on file"
            description="If you expect housing, transport, or other allowances, contact HR to confirm your record."
          />
        ) : null}
        {!loading && items.length > 0 ? (
          showSensitiveInline ? (
            list
          ) : (
            <HrSensitiveGate scope="compensation" label="View benefit amounts">
              {list}
            </HrSensitiveGate>
          )
        ) : null}
      </ProfileOverviewSection>
    </ProfilePageBody>
  );
}
