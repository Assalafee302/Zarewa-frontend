import React from 'react';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { useWorkspace } from '../../context/WorkspaceContext';
import { fetchHrBeneficiaries } from '../../lib/hrExtended';
import { canViewOrgSensitiveHr } from '../../lib/hrAccess';
import { formatNgn } from '../../lib/hrFormat';
import { HrSensitiveGate } from '../../components/hr/HrSensitiveGate';
import { HrPageBody, HrPageIntro } from '../../components/hr/hrPageUi';
import {
  ProfileEmptyState,
  ProfileInlineAlert,
  ProfileMetricSkeleton,
  ProfileOverviewSection,
} from '../../components/profile/profileOverviewUi';

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
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white text-sm">
      {items.map((b) => (
        <li key={b.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:justify-between sm:gap-3">
          <span>
            <span className="font-semibold">{b.displayName}</span>
            <span className="text-slate-500"> · {b.beneficiaryType}</span>
          </span>
          <span className="shrink-0 font-semibold tabular-nums">{formatNgn(b.monthlyAmountNgn)}/mo</span>
        </li>
      ))}
    </ul>
  );

  return (
    <HrPageBody>
      <HrPageIntro
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
    </HrPageBody>
  );
}
