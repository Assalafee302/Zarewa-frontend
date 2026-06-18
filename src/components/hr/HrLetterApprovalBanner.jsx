import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { fetchHrLetters } from '../../lib/hrExtended';

const AWAITING_STATUSES = new Set(['submitted', 'hr_review', 'gm_review', 'md_review']);

export default function HrLetterApprovalBanner({ canApprove }) {
  const [pendingCount, setPendingCount] = useState(0);

  useHrListLoad(async () => {
    if (!canApprove) {
      setPendingCount(0);
      return { hasData: true };
    }
    const { ok, data } = await fetchHrLetters();
    if (!ok || !data?.ok) return { hasData: false };
    const count = (data.letters || []).filter((l) => AWAITING_STATUSES.has(String(l.status || ''))).length;
    setPendingCount(count);
    return { hasData: true };
  }, [canApprove]);

  if (!canApprove) return null;

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/80 px-4 py-3 text-sm">
      <p className="font-semibold text-violet-950">GM / MD letter approvals</p>
      <p className="mt-1 text-xs text-violet-900/90">
        Discipline recovery letters are approved here — not on the case submit button. Open a case under{' '}
        <strong>Cases</strong> to see letters for that incident, or use the letter queue below.
        {pendingCount > 0 ? (
          <>
            {' '}
            <strong>{pendingCount}</strong> letter{pendingCount === 1 ? '' : 's'} awaiting your action.
          </>
        ) : null}
      </p>
      <Link
        to="/hr/documents?tab=letters&filter=awaiting_approval"
        className="mt-2 inline-flex rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-violet-900 hover:bg-violet-50"
      >
        Open letter approval queue →
      </Link>
    </div>
  );
}
