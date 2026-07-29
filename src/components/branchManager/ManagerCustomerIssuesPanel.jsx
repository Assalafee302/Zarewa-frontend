import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Link2,
  MessageSquareWarning,
  Play,
  UserPlus,
  X,
} from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { ModalFrame, FinanceSequencePanel } from '../layout';
import {
  DecisionActionTile,
  DecisionBand,
  DecisionChip,
  DecisionModalBody,
  DecisionModalHeader,
  DecisionStickyActions,
} from '../management/DecisionSurface.jsx';
import {
  PAC_INBOX_ROW_CLASS,
  PacEmptyState,
  PacKindPill,
  PacSlaChip,
} from './PacInboxChrome.jsx';
import {
  COMPLAINT_CATEGORY_LABELS,
  COMPLAINT_CHANNEL_LABELS,
  COMPLAINT_SEVERITY_LABELS,
  complaintLabel,
} from '../../shared/customerComplaints.js';
import { formatResolutionHours } from './ManagerDeskExtras.jsx';

/**
 * Manager glance + PAC — open customer complaints for this branch.
 */
export function ManagerCustomerIssuesPanel({ available = true }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [staff, setStaff] = useState([]);
  const [assignUserId, setAssignUserId] = useState('');
  const [resolveNote, setResolveNote] = useState('');
  const [relatedRefundId, setRelatedRefundId] = useState('');
  const [busy, setBusy] = useState(false);
  const [resolvedStats, setResolvedStats] = useState({ count: 0, avgHours: null });

  const load = useCallback(async () => {
    if (!available) {
      setLoading(false);
      setRows([]);
      return;
    }
    setLoading(true);
    setError('');
    const [openRes, allRes] = await Promise.all([
      apiFetch('/api/customer-complaints?openOnly=1').catch(() => ({ ok: false })),
      apiFetch('/api/customer-complaints').catch(() => ({ ok: false })),
    ]);
    setLoading(false);
    if (!openRes.ok) {
      setError(openRes.data?.error || 'Could not load complaints.');
      setRows([]);
      return;
    }
    setRows(Array.isArray(openRes.data?.complaints) ? openRes.data.complaints : []);
    const all = Array.isArray(allRes.data?.complaints) ? allRes.data.complaints : [];
    const hours = all
      .map((c) => formatResolutionHours(c.openedAtIso, c.resolvedAtIso))
      .filter((h) => h != null);
    setResolvedStats({
      count: hours.length,
      avgHours: hours.length
        ? Math.round((hours.reduce((s, h) => s + h, 0) / hours.length) * 10) / 10
        : null,
    });
  }, [available]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = useCallback(async (row) => {
    setSelected(row);
    setAssignUserId(row.assignedToUserId || '');
    setResolveNote(row.resolutionNote || '');
    setRelatedRefundId(row.relatedRefundId || '');
    const [detailRes, staffRes] = await Promise.all([
      apiFetch(`/api/customer-complaints/${encodeURIComponent(row.id)}`).catch(() => ({ ok: false })),
      apiFetch('/api/hr/staff').catch(() => ({ ok: false })),
    ]);
    if (detailRes.ok && detailRes.data?.complaint) {
      const c = detailRes.data.complaint;
      setSelected(c);
      setAssignUserId(c.assignedToUserId || '');
      setResolveNote(c.resolutionNote || '');
      setRelatedRefundId(c.relatedRefundId || '');
    }
    if (staffRes.ok) {
      setStaff(Array.isArray(staffRes.data?.staff) ? staffRes.data.staff : []);
    }
  }, []);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    const r = await fn();
    setBusy(false);
    if (!r?.ok || r.data?.ok === false) {
      setError(r?.data?.error || 'Action failed.');
      return false;
    }
    await load();
    if (r.data?.complaint) setSelected(r.data.complaint);
    return true;
  };

  const patch = (body) =>
    apiFetch(`/api/customer-complaints/${encodeURIComponent(selected.id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-zarewa-teal/15';

  const urgencyTone = (severity) => {
    const s = String(severity || '').toLowerCase();
    if (s === 'urgent') return 'urgent';
    if (s === 'high') return 'pending';
    return 'info';
  };

  const preview = useMemo(() => rows.slice(0, 8), [rows]);

  return (
    <FinanceSequencePanel className="!min-h-0 sm:!min-h-0 p-0 bg-white overflow-hidden">
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <h3 className="text-sm font-black text-zarewa-teal tracking-tight flex items-center gap-2">
            <MessageSquareWarning size={16} aria-hidden />
            Customer issues
            {rows.length > 0 ? (
              <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-ui-xs font-bold tabular-nums text-slate-600">
                {rows.length}
              </span>
            ) : null}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Open complaints for this branch
            {resolvedStats.avgHours != null
              ? ` · avg resolve ${resolvedStats.avgHours}h (${resolvedStats.count} closed)`
              : ''}
          </p>
        </div>
        {available ? (
          <Link
            to="/customers"
            className="text-ui-xs font-bold uppercase text-zarewa-teal no-underline hover:underline"
          >
            Customers →
          </Link>
        ) : null}
      </div>

      {error ? (
        <p className="m-3 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-semibold text-amber-950">
          {error}
        </p>
      ) : null}

      {!available ? (
        <div className="px-4 py-5">
          <p className="rounded-lg border border-amber-100 bg-amber-50/80 px-2.5 py-2 text-ui-xs text-amber-900">
            Sales / customers permission missing — complaints glance unavailable.
          </p>
        </div>
      ) : loading ? (
        <div className="space-y-2 p-3" aria-busy="true" aria-label="Loading complaints">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-11 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : preview.length === 0 ? (
        <PacEmptyState
          icon={<MessageSquareWarning size={36} className="mb-3 text-teal-600 opacity-25" />}
          title="No open complaints"
          detail="Queue clear — Sales logs complaints from the customer desk."
        />
      ) : (
        <div className="max-h-[22rem] overflow-y-auto">
          {preview.map((row) => {
            const urgent = String(row.severity || '').toLowerCase() === 'urgent';
            const statusLabel = String(row.status || 'open').replace(/_/g, ' ');
            return (
              <button
                key={row.id}
                type="button"
                data-pac-row="1"
                className={`${PAC_INBOX_ROW_CLASS} border-l-4 focus-visible:ring-zarewa-teal/25 ${
                  urgent
                    ? 'border-l-rose-500 hover:bg-rose-50/40'
                    : 'border-l-amber-400 hover:bg-amber-50/40'
                }`}
                onClick={() => void openDetail(row)}
              >
                <PacKindPill label="complaint" tone={urgencyTone(row.severity)} />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800">
                  <span className="font-mono font-bold text-zarewa-teal">{row.id}</span>
                  {' · '}
                  {row.customerName || row.customerId || 'Customer'}
                  {' · '}
                  {complaintLabel(COMPLAINT_CATEGORY_LABELS, row.category)}
                  {' · '}
                  <span className="capitalize text-slate-500">{statusLabel}</span>
                  {row.missingBranchManager || row.assignmentFallback ? (
                    <span className="ml-1 text-amber-700">· no BM</span>
                  ) : null}
                </span>
                <PacSlaChip kind="complaint" row={row} />
                <ChevronRight size={14} className="shrink-0 text-slate-300" />
              </button>
            );
          })}
          {rows.length > preview.length ? (
            <p className="px-3 py-2 text-ui-xs text-slate-500 border-t border-slate-100">
              +{rows.length - preview.length} more open — open a row to work the queue.
            </p>
          ) : null}
        </div>
      )}

      <ModalFrame isOpen={Boolean(selected)} onClose={() => setSelected(null)} closeDisabled={busy}>
        {selected ? (
          <div className="z-modal-panel flex max-h-[min(92vh,860px)] w-full max-w-3xl flex-col overflow-hidden p-0">
            <DecisionModalHeader
              title="Customer complaint"
              onClose={() => setSelected(null)}
              busy={busy}
              icon={MessageSquareWarning}
            />
            <DecisionModalBody>
              <DecisionBand
                tone={String(selected.severity || '').toLowerCase() === 'urgent' ? 'risk' : 'material'}
                eyebrow="Complaint case"
                title={selected.id}
                subtitle={selected.customerName || selected.customerId}
                meta={
                  <>
                    <DecisionChip
                      tone={
                        String(selected.severity || '').toLowerCase() === 'urgent'
                          ? 'rose'
                          : String(selected.severity || '').toLowerCase() === 'high'
                            ? 'amber'
                            : 'slate'
                      }
                    >
                      {complaintLabel(COMPLAINT_SEVERITY_LABELS, selected.severity)}
                    </DecisionChip>
                    <DecisionChip tone="slate">
                      {String(selected.status || 'open').replace(/_/g, ' ')}
                    </DecisionChip>
                    <DecisionChip tone="teal">
                      {complaintLabel(COMPLAINT_CHANNEL_LABELS, selected.channel)}
                    </DecisionChip>
                    {selected.missingBranchManager || selected.assignmentFallback ? (
                      <DecisionChip tone="amber">No Branch Manager — opener fallback</DecisionChip>
                    ) : null}
                  </>
                }
              />
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-xs">
                <p className="text-ui-xs font-bold uppercase text-slate-500">
                  {complaintLabel(COMPLAINT_CATEGORY_LABELS, selected.category)}
                </p>
                <p className="text-slate-800 whitespace-pre-wrap">{selected.description}</p>
                {selected.resolvedAtIso ? (
                  <p className="text-ui-xs font-bold text-emerald-800">
                    Resolution time:{' '}
                    {formatResolutionHours(selected.openedAtIso, selected.resolvedAtIso) ?? '—'}h
                    (opened {String(selected.openedAtIso).slice(0, 16).replace('T', ' ')} → resolved{' '}
                    {String(selected.resolvedAtIso).slice(0, 16).replace('T', ' ')})
                  </p>
                ) : null}
                {selected.linkedOrderId ? (
                  <p className="text-ui-xs text-slate-500">
                    Linked order: <span className="font-mono font-bold">{selected.linkedOrderId}</span>
                  </p>
                ) : null}
                <p className="text-ui-xs text-slate-500">
                  Opened by {selected.openedByName || selected.openedByUserId || '—'}
                  {selected.assignedToDisplayName
                    ? ` · Assigned to ${selected.assignedToDisplayName}`
                    : null}
                </p>

                <label className="block text-ui-xs font-bold uppercase text-slate-500">
                  Reassign to
                  <select
                    className={`mt-1 ${inputClass}`}
                    value={assignUserId}
                    onChange={(e) => setAssignUserId(e.target.value)}
                  >
                    <option value="">—</option>
                    {staff.map((s) => {
                      const id = String(s.userId || s.user_id || s.id || '').trim();
                      if (!id) return null;
                      const name = s.displayName || s.username || id;
                      return (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      );
                    })}
                  </select>
                </label>

                <label className="block text-ui-xs font-bold uppercase text-slate-500">
                  Linked refund ID (optional)
                  <input
                    className={`mt-1 ${inputClass} font-mono`}
                    value={relatedRefundId}
                    onChange={(e) => setRelatedRefundId(e.target.value)}
                    placeholder="REF-…"
                  />
                </label>

                <label className="block text-ui-xs font-bold uppercase text-slate-500">
                  Resolution note
                  <textarea
                    className={`mt-1 ${inputClass} min-h-[4rem]`}
                    value={resolveNote}
                    onChange={(e) => setResolveNote(e.target.value)}
                    placeholder="What was done for the customer…"
                  />
                </label>

                <p className="text-ui-xs text-slate-500 leading-relaxed">
                  Refunds and credit still go through Needs approval — linking a refund here does not approve
                  it.
                </p>
              </div>
            </DecisionModalBody>
            <DecisionStickyActions hint="Acknowledge, reassign ownership, or resolve with a note. Commercial exceptions stay in PAC.">
              <div className="flex flex-wrap gap-2">
                <DecisionActionTile
                  variant="secondary"
                  icon={X}
                  label="Close"
                  disabled={busy}
                  onClick={() => setSelected(null)}
                />
                <DecisionActionTile
                  variant="secondary"
                  icon={Link2}
                  label="Save refund link"
                  disabled={busy}
                  onClick={() =>
                    void run(() => patch({ relatedRefundId: relatedRefundId.trim() || null }))
                  }
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <DecisionActionTile
                  variant="neutral"
                  icon={ClipboardCheck}
                  label="Acknowledge"
                  disabled={busy || selected.status !== 'open'}
                  onClick={() => void run(() => patch({ action: 'acknowledge' }))}
                />
                <DecisionActionTile
                  variant="neutral"
                  icon={Play}
                  label="In progress"
                  disabled={busy || !['open', 'acknowledged'].includes(String(selected.status))}
                  onClick={() => void run(() => patch({ action: 'start' }))}
                />
                <DecisionActionTile
                  variant="approve"
                  icon={UserPlus}
                  label="Save assignee"
                  disabled={busy || !assignUserId || assignUserId === selected.assignedToUserId}
                  onClick={() => void run(() => patch({ assignedToUserId: assignUserId }))}
                />
                <DecisionActionTile
                  variant="brand"
                  icon={CheckCircle2}
                  label="Resolve"
                  disabled={busy || !resolveNote.trim()}
                  onClick={() =>
                    void run(() =>
                      patch({
                        action: 'resolve',
                        resolutionNote: resolveNote.trim(),
                        relatedRefundId: relatedRefundId.trim() || null,
                      }).then((r) => {
                        if (r.ok && r.data?.ok !== false) setSelected(null);
                        return r;
                      })
                    )
                  }
                />
              </div>
            </DecisionStickyActions>
          </div>
        ) : null}
      </ModalFrame>
    </FinanceSequencePanel>
  );
}
