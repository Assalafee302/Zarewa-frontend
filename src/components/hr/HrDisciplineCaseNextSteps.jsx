import { Link } from 'react-router-dom';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY } from './hrFormStyles';

/**
 * @param {{
 *   detail: object;
 *   blockers?: string[];
 *   canManage?: boolean;
 *   canApprove?: boolean;
 *   onGoToClose?: () => void;
 * }} props
 */
export default function HrDisciplineCaseNextSteps({ detail, blockers = [], canManage, canApprove, onGoToClose }) {
  const letters = Array.isArray(detail?.relatedLetters) ? detail.relatedLetters : [];
  const recoveryLetters = letters.filter((l) => l.letterKind === 'salary_recovery');
  const draftCount = recoveryLetters.filter((l) => ['draft', 'rejected'].includes(String(l.status))).length;
  const submittedCount = recoveryLetters.filter((l) => l.status === 'submitted').length;
  const gmCount = recoveryLetters.filter((l) => l.status === 'gm_review').length;
  const mdCount = recoveryLetters.filter((l) => l.status === 'md_review').length;
  const approvedCount = recoveryLetters.filter((l) => l.status === 'approved').length;
  const issuedCount = recoveryLetters.filter((l) => l.status === 'issued').length;

  const show =
    detail?.status !== 'closed' &&
    (blockers.length > 0 || recoveryLetters.length > 0 || detail?.status === 'action_issued');
  if (!show) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm space-y-2">
      <p className="font-semibold text-amber-950">What to do next</p>
      <p className="text-xs text-amber-900/90">
        A discipline case is <strong>not</strong> submitted as one package. Each salary recovery letter goes through{' '}
        <strong>Submit → HR approve → GM approve → MD approve → Issue</strong>, then you can close the case.
      </p>
      {recoveryLetters.length ? (
        <p className="text-xs text-amber-900">
          Recovery letters: {issuedCount}/{recoveryLetters.length} issued
          {draftCount ? ` · ${draftCount} draft` : ''}
          {submittedCount ? ` · ${submittedCount} awaiting HR` : ''}
          {gmCount ? ` · ${gmCount} awaiting GM` : ''}
          {mdCount ? ` · ${mdCount} awaiting MD` : ''}
          {approvedCount ? ` · ${approvedCount} ready to issue` : ''}
        </p>
      ) : null}
      {blockers.length ? (
        <ul className="text-xs text-amber-950 space-y-0.5">
          {blockers.map((b) => (
            <li key={b}>○ {b}</li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-2 pt-1">
        {(canManage || canApprove) && onGoToClose ? (
          <button type="button" className={HR_BTN_PRIMARY} onClick={onGoToClose}>
            Open letters &amp; close (step 8)
          </button>
        ) : null}
        {canManage && draftCount > 0 ? (
          <button type="button" className={HR_BTN_SECONDARY} onClick={onGoToClose}>
            Submit recovery letters
          </button>
        ) : null}
        {canApprove && (gmCount > 0 || submittedCount > 0 || mdCount > 0) ? (
          <Link
            to="/hr/documents?tab=letters&filter=awaiting_approval"
            className={`inline-flex items-center rounded-lg px-3 py-2 text-xs font-semibold ${HR_BTN_SECONDARY}`}
          >
            GM / MD letter queue
          </Link>
        ) : null}
        <Link to="/hr/documents?tab=letters" className="text-xs font-semibold text-teal-800 hover:underline self-center">
          All HR letters →
        </Link>
      </div>
    </div>
  );
}
