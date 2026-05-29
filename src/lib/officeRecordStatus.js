/**
 * Professional office record status labels and badge tones (max 2 badges per row in UI).
 */

const STATUS_MAP = [
  { match: /^(draft|open)$/, label: 'Draft', tone: 'slate' },
  { match: /^submitted/, label: 'Submitted', tone: 'blue' },
  { match: /needs.?endorse|pending.?endorse/, label: 'Needs Endorsement', tone: 'amber' },
  { match: /^endorsed/, label: 'Endorsed', tone: 'blue' },
  { match: /under.?review|in.?review/, label: 'Under Review', tone: 'amber' },
  { match: /needs.?more|returned/, label: 'Needs More Info', tone: 'amber' },
  { match: /^approved/, label: 'Approved', tone: 'green' },
  { match: /^rejected/, label: 'Rejected', tone: 'red' },
  { match: /^converted/, label: 'Converted', tone: 'green' },
  { match: /expense/, label: 'Converted to Expense', tone: 'green' },
  { match: /procurement|material/, label: 'Converted to Procurement', tone: 'green' },
  { match: /^paid/, label: 'Paid', tone: 'green' },
  { match: /^filed/, label: 'Filed', tone: 'slate' },
  { match: /^(closed|completed|cancelled)$/, label: 'Closed', tone: 'slate' },
];

const TONE_CLASS = {
  green: 'text-emerald-800 bg-emerald-50 ring-emerald-100',
  amber: 'text-amber-900 bg-amber-50 ring-amber-100',
  red: 'text-rose-800 bg-rose-50 ring-rose-100',
  blue: 'text-sky-900 bg-sky-50 ring-sky-100',
  slate: 'text-slate-700 bg-slate-50 ring-slate-100',
};

/**
 * @param {object} item — work item or office record row
 * @returns {{ primary: { label: string; tone: string; className: string }; secondary: { label: string; tone: string; className: string } | null }}
 */
export function officeRecordStatusBadges(item) {
  const st = String(item?.status || 'open').trim().toLowerCase();
  const dt = String(item?.documentType || '').trim().toLowerCase();
  let primary = STATUS_MAP.find((m) => m.match.test(st)) || { label: 'Open', tone: 'slate' };

  if (st === 'converted' && dt.includes('payment')) {
    primary = { label: 'Converted to Expense', tone: 'green' };
  }

  let secondary = null;
  if (item?.slaState === 'overdue' || item?.overdue) {
    secondary = { label: 'Overdue', tone: 'red' };
  } else if (item?.requiresApproval) {
    secondary = { label: 'Approval required', tone: 'amber' };
  } else if (item?.requiresResponse) {
    secondary = { label: 'Response required', tone: 'amber' };
  }

  const wrap = (b) => ({
    label: b.label,
    tone: b.tone,
    className: `inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${TONE_CLASS[b.tone] || TONE_CLASS.slate}`,
  });

  return {
    primary: wrap(primary),
    secondary: secondary ? wrap(secondary) : null,
  };
}

/**
 * @param {object} item
 * @param {string} [nextActorName]
 */
export function officeRecordNextActorLabel(item, nextActorName) {
  if (nextActorName) return `Waiting on ${nextActorName}`;
  const office = String(item?.officeLabel || item?.responsibleOfficeKey || '').trim();
  if (office) return `Waiting on ${office}`;
  return 'Waiting on others';
}
