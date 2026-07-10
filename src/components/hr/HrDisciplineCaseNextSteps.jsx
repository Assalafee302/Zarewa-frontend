import { HrButton, HrAddButton, HR_BTN_SECONDARY } from '../../components/hr/hrPageUi';
import { Link } from 'react-router-dom';
import { HR_BTN_PRIMARY } from './hrFormStyles';

/**
 * @param {{
 *   detail: object;
 *   blockers?: string[];
 *   canManage?: boolean;
 *   canApprove?: boolean;
 *   onGoToSanction?: () => void;
 *   onGoToClose?: () => void;
 * }} props
 */
export default function HrDisciplineCaseNextSteps({
  detail,
  blockers = [],
  canManage,
  canApprove,
  onGoToSanction,
  onGoToClose,
}) {
  const letters = Array.isArray(detail?.relatedLetters) ? detail.relatedLetters : [];
  const recoveryLetters = letters.filter((l) => l.letterKind === 'salary_recovery');
  const draftCount = recoveryLetters.filter((l) => ['draft', 'rejected'].includes(String(l.status))).length;
  const gmCount = recoveryLetters.filter((l) => ['submitted', 'gm_review', 'md_review'].includes(String(l.status))).length;
  const issuedCount = recoveryLetters.filter((l) => l.status === 'issued').length;
  const needsSanction = !detail?.decisionType && canManage;
  const needsLetters = recoveryLetters.length > 0 && issuedCount < recoveryLetters.length;

  const show =
    detail?.status !== 'closed' && (needsSanction || needsLetters || blockers.length > 0 || gmCount > 0);
  if (!show) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm space-y-2">
      <p className="font-semibold text-amber-950">Next action</p>
      {needsSanction ? (
        <p className="text-xs text-amber-900">Complete <strong>2. Investigate</strong>, then go to <strong>3. Sanction</strong> and click Apply sanction.</p>
      ) : null}
      {needsLetters ? (
        <p className="text-xs text-amber-900">
          Letters: {issuedCount}/{recoveryLetters.length} issued
          {draftCount ? ` · ${draftCount} still draft` : ''}
          {gmCount ? ` · ${gmCount} awaiting approval` : ''}
        </p>
      ) : null}
      {blockers.length ? (
        <ul className="text-xs text-amber-950 space-y-0.5">
          {blockers.slice(0, 4).map((b) => (
            <li key={b}>○ {b}</li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-2 pt-1">
        {needsSanction && onGoToSanction ? (
          <HrButton type="button" onClick={onGoToSanction}>
            Go to sanction
          </HrButton>
        ) : null}
        {(canManage || canApprove) && onGoToClose && (needsLetters || blockers.length) ? (
          <HrButton type="button" variant="secondary" onClick={onGoToClose}>
            Letters &amp; close
          </HrButton>
        ) : null}
        {canApprove && gmCount > 0 ? (
          <Link
            to="/hr/documents?tab=letters&filter=awaiting_approval"
            className={`inline-flex items-center rounded-lg px-3 py-2 text-xs font-semibold ${HR_BTN_SECONDARY}`}
          >
            Approve letters
          </Link>
        ) : null}
      </div>
    </div>
  );
}
