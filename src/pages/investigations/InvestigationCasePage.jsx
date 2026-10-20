import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader, PageShell } from '../../components/layout';
import { UnderInvestigationBadge } from '../../components/investigations/UnderInvestigationBadge';
import { apiFetch } from '../../lib/apiBase';

function ngn(n) {
  return `₦${Math.round(Number(n) || 0).toLocaleString('en-NG')}`;
}

const RECORD_KINDS = [
  'customer',
  'quotation',
  'receipt',
  'production_job',
  'refund',
  'payout',
  'expense',
  'staff',
  'bank_line',
];

export default function InvestigationCasePage() {
  const { caseId } = useParams();
  const [pack, setPack] = useState(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [linkKind, setLinkKind] = useState('quotation');
  const [linkId, setLinkId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [officerId, setOfficerId] = useState('');
  const [decision, setDecision] = useState('');
  const [outcome, setOutcome] = useState('Cleared');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { ok, data } = await apiFetch(`/api/investigation-platform/cases/${encodeURIComponent(caseId)}`);
    if (!ok) {
      setPack(null);
      setError(data?.error || 'You cannot open this case.');
      return;
    }
    setError('');
    setPack(data);
  }, [caseId]);

  useEffect(() => {
    load();
  }, [load]);

  async function post(path, body) {
    setBusy(true);
    const { ok, data } = await apiFetch(path, { method: 'POST', body });
    setBusy(false);
    if (!ok) {
      setError(data?.error || 'Request failed.');
      return;
    }
    setError('');
    setPack(data);
  }

  const row = pack?.case;
  const money = row?.money || {};

  return (
    <PageShell className="p-4 sm:p-6">
      <PageHeader
        title={row ? row.id : 'Investigation'}
        subtitle={row?.title || ''}
        actions={
          <Link to="/investigations" className="text-sm font-semibold text-zarewa-teal">
            Register
          </Link>
        }
      />
      {error ? <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      {!row ? null : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold">{row.status}</span>
            {row.outcome ? <span>{row.outcome}</span> : null}
            <span>Officer: {row.caseOfficerName || row.caseOfficerUserId || '—'}</span>
            {row.holdActive ? <UnderInvestigationBadge caseId={row.id} /> : <span>Hold lifted</span>}
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            {[
              ['Goods released', money.goodsReleasedNgn],
              ['Money paid out', money.moneyPaidOutNgn],
              ['Recovered', money.recoveredNgn],
              ['Written off', money.writtenOffNgn],
            ].map(([label, amount]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
                <div className="mt-1 text-lg font-semibold">{ngn(amount)}</div>
              </div>
            ))}
          </div>
          <p className="text-sm font-semibold text-slate-800">
            Exposure {ngn(money.exposureNgn)} · Still at stake {ngn(money.stillAtStakeNgn)}
          </p>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Linked records</h2>
            <ul className="space-y-2">
              {(pack.links || []).map((link) => (
                <li key={link.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-mono">{link.recordId}</span>
                  <span className="text-slate-500">{link.recordKind}</span>
                  {row.holdActive ? (
                    <UnderInvestigationBadge caseId={row.id} />
                  ) : null}
                </li>
              ))}
            </ul>
            <form
              className="mt-4 flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                post(`/api/investigation-platform/cases/${encodeURIComponent(row.id)}/links`, {
                  recordKind: linkKind,
                  recordId: linkId,
                });
                setLinkId('');
              }}
            >
              <select value={linkKind} onChange={(e) => setLinkKind(e.target.value)} className="rounded-md border px-2 py-2">
                {RECORD_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
              <input
                value={linkId}
                onChange={(e) => setLinkId(e.target.value)}
                placeholder="Record id"
                required
                className="rounded-md border px-3 py-2"
              />
              <button type="submit" disabled={busy} className="rounded-md bg-slate-800 px-3 py-2 text-sm font-semibold text-white">
                Link
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Timeline</h2>
            <ol className="space-y-3">
              {(pack.notes || []).map((entry) => (
                <li key={entry.id} className="border-l-2 border-slate-200 pl-3">
                  <div className="text-xs text-slate-500">
                    {entry.author} · {String(entry.atISO || '').replace('T', ' ').slice(0, 16)}
                  </div>
                  <p className="text-sm text-slate-800">{entry.text}</p>
                </li>
              ))}
            </ol>
            <form
              className="mt-4 flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                post(`/api/investigation-platform/cases/${encodeURIComponent(row.id)}/notes`, { text: note });
                setNote('');
              }}
            >
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                required
                rows={3}
                placeholder="Add a note. Notes are not edited; a later note corrects an earlier one."
                className="rounded-md border px-3 py-2 text-sm"
              />
              <button type="submit" disabled={busy} className="self-start rounded-md bg-slate-800 px-3 py-2 text-sm font-semibold text-white">
                Add note
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">MD actions</h2>
            <p className="mb-3 text-sm text-slate-600">
              Members: {(pack.members || []).map((m) => m.name || m.userId).join(', ') || 'none'}
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                value={officerId}
                onChange={(e) => setOfficerId(e.target.value)}
                placeholder="Case officer user id"
                className="rounded-md border px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={busy}
                className="rounded-md border px-3 py-2 text-sm"
                onClick={() =>
                  post(`/api/investigation-platform/cases/${encodeURIComponent(row.id)}/officer`, { userId: officerId })
                }
              >
                Name officer
              </button>
              <input
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                placeholder="Member user id"
                className="rounded-md border px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={busy}
                className="rounded-md border px-3 py-2 text-sm"
                onClick={() =>
                  post(`/api/investigation-platform/cases/${encodeURIComponent(row.id)}/members`, { userId: memberId })
                }
              >
                Add member
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <textarea
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
                rows={2}
                placeholder="MD note (at least 10 characters) to lift the hold or close"
                className="rounded-md border px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  className="rounded-md bg-amber-700 px-3 py-2 text-sm font-semibold text-white"
                  onClick={() =>
                    post(`/api/investigation-platform/cases/${encodeURIComponent(row.id)}/lift`, { note: decision })
                  }
                >
                  Lift hold
                </button>
                <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className="rounded-md border px-2 py-2 text-sm">
                  <option>Recovered</option>
                  <option>Written off</option>
                  <option>Cleared</option>
                </select>
                <button
                  type="button"
                  disabled={busy}
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                  onClick={() =>
                    post(`/api/investigation-platform/cases/${encodeURIComponent(row.id)}/close`, {
                      outcome,
                      decisionNote: decision,
                    })
                  }
                >
                  Close case
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </PageShell>
  );
}
