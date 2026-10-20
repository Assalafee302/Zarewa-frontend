import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, PageShell } from '../../components/layout';
import { apiFetch } from '../../lib/apiBase';

function ngn(n) {
  return `₦${Math.round(Number(n) || 0).toLocaleString('en-NG')}`;
}

function day(iso) {
  return String(iso || '').slice(0, 10) || '—';
}

export default function InvestigationRegisterPage() {
  const [cases, setCases] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [officerId, setOfficerId] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { ok, data } = await apiFetch('/api/investigation-platform/cases');
    setLoading(false);
    if (!ok) {
      setError(data?.error || 'Could not load the case register.');
      return;
    }
    setError('');
    setCases(Array.isArray(data?.cases) ? data.cases : []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function openCase(event) {
    event.preventDefault();
    setBusy(true);
    const { ok, data } = await apiFetch('/api/investigation-platform/cases', {
      method: 'POST',
      body: {
        title,
        status: 'Reported',
        caseOfficerUserId: officerId || undefined,
        branchId: 'BR-KD',
      },
    });
    setBusy(false);
    if (!ok) {
      setError(data?.error || 'Could not open the case.');
      return;
    }
    setTitle('');
    setOfficerId('');
    await load();
  }

  return (
    <PageShell className="p-4 sm:p-6">
      <PageHeader
        title="Investigation register"
        subtitle="Cases the MD, the case officer, and named members can open. Money stays frozen while a hold is active."
      />
      {error ? <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      <form onSubmit={openCase} className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-sm font-medium text-slate-700">
          New case title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex w-56 flex-col gap-1 text-sm font-medium text-slate-700">
          Case officer user id
          <input
            value={officerId}
            onChange={(e) => setOfficerId(e.target.value)}
            placeholder="Leave blank to assign yourself"
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-zarewa-teal px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Open report
        </button>
      </form>
      {loading ? <p className="text-sm text-slate-500">Loading cases…</p> : null}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Case</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Officer</th>
              <th className="px-3 py-2">Opened</th>
              <th className="px-3 py-2">Age</th>
              <th className="px-3 py-2">At stake</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-3 py-2">
                  <Link to={`/investigations/${encodeURIComponent(row.id)}`} className="font-semibold text-zarewa-teal">
                    {row.id}
                  </Link>
                  <div className="text-slate-600">{row.title}</div>
                </td>
                <td className="px-3 py-2">
                  {row.status}
                  {row.outcome ? <div className="text-xs text-slate-500">{row.outcome}</div> : null}
                  {row.holdActive ? <div className="text-xs font-semibold text-red-700">Hold active</div> : null}
                </td>
                <td className="px-3 py-2">{row.caseOfficerName || row.caseOfficerUserId || '—'}</td>
                <td className="px-3 py-2">{day(row.openedAtISO)}</td>
                <td className="px-3 py-2">{row.ageDays}d</td>
                <td className="px-3 py-2 font-medium">{ngn(row.money?.stillAtStakeNgn)}</td>
              </tr>
            ))}
            {!loading && cases.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-slate-500">
                  No cases you can open.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
