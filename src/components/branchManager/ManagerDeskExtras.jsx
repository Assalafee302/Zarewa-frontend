import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  ClipboardList,
  FileWarning,
  Megaphone,
  Scale,
  TimerReset,
  UserRoundSearch,
  Wrench,
} from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../lib/formatNgn';
import { FinanceSequencePanel } from '../layout';
import { quotationPipelineStage } from '../../lib/salesStatusUi';
import { COMPLAINT_CATEGORY_LABELS, complaintLabel } from '../../shared/customerComplaints.js';

function Panel({ title, subtitle, icon: Icon, children, linkTo, linkLabel }) {
  return (
    <FinanceSequencePanel className="!min-h-0 sm:!min-h-0 p-0 bg-white overflow-hidden">
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <h3 className="text-sm font-black text-zarewa-teal tracking-tight flex items-center gap-2">
            {Icon ? <Icon size={16} aria-hidden /> : null}
            {title}
          </h3>
          {subtitle ? <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p> : null}
        </div>
        {linkTo ? (
          <Link to={linkTo} className="text-ui-xs font-bold uppercase text-zarewa-teal no-underline hover:underline">
            {linkLabel || 'Open →'}
          </Link>
        ) : null}
      </div>
      <div className="px-4 py-3">{children}</div>
    </FinanceSequencePanel>
  );
}

function Empty({ text }) {
  return <p className="text-ui-xs text-slate-500 py-2">{text}</p>;
}

function belowFloorSum(quotation) {
  const snapshot = quotation?.mdPriceException || quotation?.mdPriceExceptionSnapshot || quotation?.md_price_exception_snapshot || {};
  const direct = Number(snapshot.totalBelowFloorPerMeterNgn ?? quotation?.totalBelowFloorPerMeterNgn);
  if (Number.isFinite(direct)) return direct;
  const lines = snapshot.lines || quotation?.lines || [];
  const total = lines.reduce((sum, line) => sum + (Number(line.belowFloorPerMeterNgn ?? line.belowFloorNgn ?? 0) || 0), 0);
  return total > 0 ? total : null;
}

/** Read-only overdue / aging receivables for BM. */
export function ManagerReceivablesPanel({ available = true }) {
  const [aging, setAging] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!available) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await apiFetch('/api/sales/dashboard/receivables-aging').catch(() => ({ ok: false }));
      if (!cancelled) {
        setAging(res.ok ? res.data : null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [available]);

  const buckets = useMemo(() => {
    const b = aging?.buckets || aging?.aging || {};
    return [
      { key: '0_30', label: '0–30d', v: Number(b['0_30'] ?? b.d0_30 ?? 0) || 0 },
      { key: '31_60', label: '31–60d', v: Number(b['31_60'] ?? b.d31_60 ?? 0) || 0 },
      { key: '61_90', label: '61–90d', v: Number(b['61_90'] ?? b.d61_90 ?? 0) || 0 },
      { key: 'over_90', label: '90d+', v: Number(b.over_90 ?? b.d90_plus ?? 0) || 0 },
    ];
  }, [aging]);

  const total = buckets.reduce((s, r) => s + r.v, 0);
  const overdueRows = Array.isArray(aging?.overdue) ? aging.overdue : Array.isArray(aging?.rows) ? aging.rows : [];

  return (
    <Panel
      title="Overdue receivables"
      subtitle="Read-only aging — Accounting remains the edit desk"
      icon={Scale}
      linkTo="/sales"
      linkLabel="Sales →"
    >
      {!available ? (
        <Empty text="Sales permission required." />
      ) : loading ? (
        <Empty text="Loading aging…" />
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2">
            {buckets.map((b) => (
              <div key={b.key} className="rounded-lg bg-slate-50 px-2 py-2 text-center">
                <p className="text-ui-xs font-bold uppercase text-slate-500">{b.label}</p>
                <p className="text-xs font-black tabular-nums text-zarewa-teal">{formatNgn(b.v)}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-ui-xs text-slate-500">
            Total aged: <span className="font-bold tabular-nums text-slate-700">{formatNgn(total)}</span>
            {overdueRows.length ? ` · ${overdueRows.length} listed` : ''}
          </p>
          {overdueRows.slice(0, 5).map((r) => (
            <div key={r.quotationRef || r.id || r.customerName} className="mt-1.5 border-t border-slate-100 pt-1.5">
              <p className="text-xs font-semibold text-slate-800 truncate">
                {r.customerName || r.customerId || 'Customer'} · {r.quotationRef || r.id || '—'}
              </p>
              <p className="text-ui-xs text-slate-500 tabular-nums">
                Due {String(r.dueDateIso || r.due_date_iso || '—').slice(0, 10)} ·{' '}
                {formatNgn(r.balanceDueNgn ?? r.amountDueNgn ?? r.balance ?? 0)}
              </p>
            </div>
          ))}
        </>
      )}
    </Panel>
  );
}

/** Official notices on BM desk. */
export function ManagerAnnouncementsPanel() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch('/api/official-notices').catch(() => ({ ok: false }));
    setLoading(false);
    setNotices(Array.isArray(res.data?.notices) ? res.data.notices : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const ack = async (id) => {
    setBusyId(id);
    await apiFetch(`/api/official-notices/${encodeURIComponent(id)}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({}),
    }).catch(() => null);
    setBusyId('');
    await load();
  };

  const open = notices.filter((n) => !n.acknowledgedAtIso && !n.acknowledged);
  const show = (open.length ? open : notices).slice(0, 5);

  return (
    <Panel title="Announcements" subtitle="Official notices — acknowledge here" icon={Megaphone} linkTo="/workspace">
      {loading ? (
        <Empty text="Loading notices…" />
      ) : show.length === 0 ? (
        <Empty text="No company notices right now." />
      ) : (
        show.map((n) => (
          <div key={n.id} className="mb-2 rounded-lg border border-slate-100 px-2.5 py-2 last:mb-0">
            <p className="text-xs font-bold text-slate-900">{n.title || 'Notice'}</p>
            <p className="mt-0.5 text-ui-xs text-slate-500 line-clamp-2">{n.body || n.summary || ''}</p>
            {!n.acknowledgedAtIso && !n.acknowledged ? (
              <button
                type="button"
                disabled={busyId === n.id}
                onClick={() => void ack(n.id)}
                className="mt-1.5 text-ui-xs font-bold uppercase text-zarewa-teal disabled:opacity-50"
              >
                {busyId === n.id ? 'Saving…' : 'Acknowledge'}
              </button>
            ) : (
              <p className="mt-1 text-ui-xs font-bold uppercase text-emerald-700">Acknowledged</p>
            )}
          </div>
        ))
      )}
    </Panel>
  );
}

/** Branch-scoped decision trail from audit_log + approval_actions. */
export function ManagerAuditTrailPanel() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await apiFetch('/api/audit-log?limit=80').catch(() => ({ ok: false }));
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setError(res.data?.error || 'Could not load decision trail.');
        return;
      }
      const audit = (res.data?.auditLog || []).map((a) => ({
        id: `a-${a.id}`,
        at: a.occurredAtISO,
        who: a.actorName || a.actorUserId,
        title: a.action,
        detail: a.note || `${a.entityKind} ${a.entityId}`.trim(),
      }));
      const approvals = (res.data?.approvalActions || []).map((a) => ({
        id: `p-${a.id}`,
        at: a.actedAtISO,
        who: a.actedByName || a.actedByUserId,
        title: `${a.action} · ${a.status}`,
        detail: a.note || `${a.entityKind} ${a.entityId}`.trim(),
      }));
      setRows(
        [...audit, ...approvals]
          .sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')))
          .slice(0, 12)
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Panel title="Decision trail" subtitle="Filtered audit + approvals — no new logging" icon={ClipboardList}>
      {error ? <Empty text={error} /> : null}
      {loading ? <Empty text="Loading trail…" /> : null}
      {!loading && !error && rows.length === 0 ? <Empty text="No recent decisions in scope." /> : null}
      {rows.map((r) => (
        <div key={r.id} className="border-b border-slate-50 py-1.5 last:border-0">
          <p className="text-xs font-semibold text-slate-800 truncate">{r.title}</p>
          <p className="text-ui-xs text-slate-500 truncate">
            {String(r.at || '').slice(0, 16).replace('T', ' ')} · {r.who || '—'} · {r.detail}
          </p>
        </div>
      ))}
    </Panel>
  );
}

/** MD price exceptions on quotations — structured list. */
export function ManagerPriceExceptionsPanel({ quotations = [] }) {
  const rows = useMemo(() => {
    const list = Array.isArray(quotations) ? quotations : [];
    return list
      .filter(
        (q) =>
          q.mdPriceExceptionApprovedAtISO ||
          q.priceExceptionMdReviewRequired ||
          q.md_price_exception_approved_at_iso
      )
      .map((q) => ({
        id: q.quotationID || q.quotationRef || q.id,
        customer: q.customerName || q.customerID,
        approvedAt: q.mdPriceExceptionApprovedAtISO || q.md_price_exception_approved_at_iso || '',
        pending: Boolean(q.priceExceptionMdReviewRequired) && !q.mdPriceExceptionApprovedAtISO,
        total: q.grandTotalNgn ?? q.totalNgn,
        belowFloor: belowFloorSum(q),
      }))
      .sort((a, b) => String(b.approvedAt || '').localeCompare(String(a.approvedAt || '')))
      .slice(0, 8);
  }, [quotations]);

  return (
    <Panel
      title="Price exceptions"
      subtitle="MD floor-exception approvals on quotes"
      icon={FileWarning}
      linkTo="/sales"
    >
      {rows.length === 0 ? (
        <Empty text="No MD price exceptions on quotations in scope." />
      ) : (
        rows.map((r) => (
          <div key={r.id} className="border-b border-slate-50 py-1.5 last:border-0">
            <p className="text-xs font-mono font-bold text-zarewa-teal">{r.id}</p>
            <p className="text-ui-xs text-slate-600">
              {r.customer || '—'}
              {r.total != null ? ` · ${formatNgn(r.total)}` : ''}
              {r.belowFloor != null ? ` · ${formatNgn(r.belowFloor)} below floor` : ''}
              {r.pending ? ' · awaiting MD' : r.approvedAt ? ` · approved ${String(r.approvedAt).slice(0, 10)}` : ''}
            </p>
          </div>
        ))
      )}
    </Panel>
  );
}

/** Open recruiting roles for this branch. */
export function ManagerVacanciesPanel({ available = true }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!available) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await apiFetch('/api/hr/recruiting/jobs?status=open').catch(() => ({ ok: false }));
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setError(res.data?.error || 'Could not load open roles.');
        setJobs([]);
        return;
      }
      setJobs(Array.isArray(res.data?.jobs) ? res.data.jobs : []);
    })();
    return () => {
      cancelled = true;
    };
  }, [available]);

  const openings = jobs.reduce((s, j) => s + (Number(j.openings) || 1), 0);

  return (
    <Panel
      title="Open roles"
      subtitle={openings ? `${openings} opening(s) on this branch` : 'Recruiting vacancies for this branch'}
      icon={UserRoundSearch}
      linkTo="/team-hr"
    >
      {!available ? <Empty text="Team HR permission required." /> : null}
      {error ? <Empty text={error} /> : null}
      {loading ? <Empty text="Loading…" /> : null}
      {!loading && !error && jobs.length === 0 ? <Empty text="No open roles posted for this branch." /> : null}
      {jobs.slice(0, 6).map((j) => (
        <div key={j.id} className="border-b border-slate-50 py-1.5 last:border-0">
          <p className="text-xs font-semibold text-slate-800">{j.title}</p>
          <p className="text-ui-xs text-slate-500">
            {j.department || '—'} · {Number(j.openings) || 1} opening(s) · {j.status}
          </p>
        </div>
      ))}
    </Panel>
  );
}

/** PM due this week / overdue from maintenance_plans. */
export function ManagerPmDuePanel() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await apiFetch('/api/maintenance/plans').catch(() => ({ ok: false }));
      if (!cancelled) {
        setPlans(Array.isArray(res.data?.plans) ? res.data.plans : []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const due = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return plans
      .filter((p) => String(p.status || '').toLowerCase() === 'active' || !p.status)
      .map((p) => {
        const dueIso = String(p.nextDueDateIso || p.next_due_date_iso || '').slice(0, 10);
        const dueDate = dueIso ? new Date(`${dueIso}T12:00:00`) : null;
        let tone = '';
        if (dueDate && !Number.isNaN(dueDate.getTime())) {
          if (dueDate < today) tone = 'overdue';
          else if (dueDate <= weekEnd) tone = 'due_week';
        }
        return { ...p, dueIso, tone };
      })
      .filter((p) => p.tone)
      .sort((a, b) => String(a.dueIso).localeCompare(String(b.dueIso)));
  }, [plans]);

  return (
    <Panel title="Preventive maintenance due" subtitle="From plan next_due_date — not a full scheduler" icon={Wrench}>
      {loading ? <Empty text="Loading plans…" /> : null}
      {!loading && due.length === 0 ? <Empty text="Nothing due this week or overdue." /> : null}
      {due.slice(0, 8).map((p) => (
        <div key={p.id} className="border-b border-slate-50 py-1.5 last:border-0 flex justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">
              {p.machineName || p.machineId || p.title || p.id}
            </p>
            <p className="text-ui-xs text-slate-500">{p.planKind || 'preventive'} · due {p.dueIso}</p>
          </div>
          <span
            className={`shrink-0 rounded-md border px-1.5 py-0.5 text-ui-xs font-black uppercase ${
              p.tone === 'overdue'
                ? 'border-rose-200 bg-rose-50 text-rose-900'
                : 'border-amber-200 bg-amber-50 text-amber-900'
            }`}
          >
            {p.tone === 'overdue' ? 'Overdue' : 'This week'}
          </span>
        </div>
      ))}
    </Panel>
  );
}

/** Links into existing Help / AIC / notices — not a new library. */
export function ManagerSopLinksPanel() {
  return (
    <Panel title="SOP quick reference" subtitle="Links to content already in the system" icon={BookOpen}>
      <div className="flex flex-col gap-2">
        <Link to="/workspace" className="text-xs font-bold text-zarewa-teal no-underline hover:underline">
          Official notices (Workspace)
        </Link>
        <p className="text-ui-xs text-slate-500">
          Use the Zare Help dock for operational SOP topics. Knowledge Center SOP articles live under Settings →
          Knowledge (admin-managed).
        </p>
        <Link to="/settings" className="text-xs font-bold text-slate-600 no-underline hover:underline">
          Settings / Knowledge Center →
        </Link>
      </div>
    </Panel>
  );
}

/** Fulfillment stage counts — honest labeling (not CRM won/lost). */
export function ManagerFulfillmentPipelinePanel({ quotations = [] }) {
  const counts = useMemo(() => {
    const map = { pending: 0, approved: 0, payment: 0, paid: 0 };
    for (const q of Array.isArray(quotations) ? quotations : []) {
      if (q.archived) continue;
      const stage = quotationPipelineStage(q.status, q.paymentStatus || q.payment_status);
      const s = String(stage?.stage || '').toLowerCase();
      if (s.includes('paid') || s.includes('ready')) map.paid += 1;
      else if (s.includes('payment') || s.includes('partial')) map.payment += 1;
      else if (s.includes('approved')) map.approved += 1;
      else map.pending += 1;
    }
    return map;
  }, [quotations]);

  return (
    <Panel
      title="Quotation fulfillment pipeline"
      subtitle="Draft → Approved → Payment → Ready — not a sales won/lost funnel"
      icon={TimerReset}
      linkTo="/sales"
    >
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          ['Pending', counts.pending],
          ['Approved', counts.approved],
          ['Payment', counts.payment],
          ['Paid/Ready', counts.paid],
        ].map(([label, n]) => (
          <div key={label} className="rounded-lg bg-slate-50 px-2 py-2">
            <p className="text-ui-xs font-bold uppercase text-slate-500">{label}</p>
            <p className="text-sm font-black tabular-nums text-zarewa-teal">{n}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/** Delivery complaints = category filter on customer_complaints. */
export function ManagerDeliveryComplaintsPanel({ available = true }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!available) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await apiFetch('/api/customer-complaints?openOnly=1').catch(() => ({ ok: false }));
      if (cancelled) return;
      const all = Array.isArray(res.data?.complaints) ? res.data.complaints : [];
      setRows(all.filter((c) => String(c.category || '').toLowerCase() === 'delivery_delay'));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [available]);

  return (
    <Panel
      title="Delivery complaints"
      subtitle={`Folded into complaints · ${complaintLabel(COMPLAINT_CATEGORY_LABELS, 'delivery_delay')}`}
      icon={FileWarning}
    >
      {loading ? <Empty text="Loading…" /> : null}
      {!loading && rows.length === 0 ? <Empty text="No open delivery-delay complaints." /> : null}
      {rows.slice(0, 6).map((r) => (
        <div key={r.id} className="border-b border-slate-50 py-1.5 last:border-0">
          <p className="text-xs font-mono font-bold text-zarewa-teal">{r.id}</p>
          <p className="text-ui-xs text-slate-600 truncate">
            {r.customerName || r.customerId} · {r.status}
          </p>
        </div>
      ))}
    </Panel>
  );
}

export function formatResolutionHours(openedAtIso, resolvedAtIso) {
  if (!openedAtIso || !resolvedAtIso) return null;
  const a = new Date(openedAtIso).getTime();
  const b = new Date(resolvedAtIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
  return Math.round(((b - a) / 36e5) * 10) / 10;
}
