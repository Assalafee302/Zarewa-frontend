import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, MapPin } from 'lucide-react';
import { apiUrl } from '../lib/apiBase';
import { ZAREWA_LOGO_SRC } from '../Data/companyQuotation';
import { HR_BTN_PRIMARY, HR_FIELD_CLASS } from '../components/hr/hrFormStyles';

async function fetchPublicJobs() {
  const r = await fetch(apiUrl('/api/public/careers/jobs'));
  const data = await r.json().catch(() => null);
  return { ok: r.ok, data };
}

async function submitApplication(jobId, body) {
  const r = await fetch(apiUrl(`/api/public/careers/jobs/${encodeURIComponent(jobId)}/apply`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => null);
  return { ok: r.ok, data };
}

export default function Careers() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', coverNote: '' });
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { ok, data } = await fetchPublicJobs();
      if (cancelled) return;
      setLoading(false);
      if (!ok || !data?.ok) {
        setErr(data?.error || 'Could not load open positions.');
        setJobs([]);
        return;
      }
      const list = data.jobs || [];
      setJobs(list);
      setSelectedId((prev) => prev || list[0]?.id || '');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = jobs.find((j) => j.id === selectedId);

  const onApply = async (e) => {
    e.preventDefault();
    if (!selectedId) return;
    setBusy(true);
    setErr('');
    const { ok, data } = await submitApplication(selectedId, form);
    setBusy(false);
    if (!ok || !data?.ok) {
      setErr(data?.error || 'Application could not be submitted.');
      return;
    }
    setSubmitted(true);
    setForm({ fullName: '', email: '', phone: '', coverNote: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/30 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 rounded-2xl border border-white/80 bg-white/90 px-6 py-8 text-center shadow-sm">
          <img src={ZAREWA_LOGO_SRC} alt="Zarewa" className="mx-auto h-12 w-auto object-contain" />
          <h1 className="mt-4 text-2xl font-black tracking-tight text-[#134e4a] sm:text-3xl">Careers at Zarewa</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-600">
            Join our team across branches in Nigeria. Browse open roles and apply in minutes — no staff account needed.
          </p>
          <Link
            to="/"
            className="mt-4 inline-block rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#134e4a] hover:bg-slate-50"
          >
            Staff sign in
          </Link>
        </header>

        {loading ? (
          <p className="text-center text-sm text-slate-600">Loading open positions…</p>
        ) : null}
        {err ? (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</div>
        ) : null}

        {!loading && jobs.length === 0 && !err ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
            <Briefcase className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">No open positions right now</p>
            <p className="mt-1 text-xs text-slate-500">Please check back later or contact HR directly.</p>
          </div>
        ) : null}

        {jobs.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
            <aside className="space-y-2">
              <p className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Open roles</p>
              <div className="max-h-[min(70vh,640px)] space-y-2 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
                {jobs.map((j) => (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(j.id);
                      setSubmitted(false);
                    }}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                      selectedId === j.id
                        ? 'border-[#134e4a]/40 bg-teal-50/70 shadow-sm'
                        : 'border-transparent hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-sm font-semibold text-slate-900">{j.title}</span>
                    {j.department ? <span className="mt-1 block text-xs text-slate-500">{j.department}</span> : null}
                  </button>
                ))}
              </div>
            </aside>

            {selected ? (
              <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="border-b border-slate-50 px-6 py-5">
                  <h2 className="text-xl font-bold text-[#134e4a]">{selected.title}</h2>
                  <p className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {selected.branchId || 'Location TBC'}
                    </span>
                    <span>{selected.department || 'Department TBC'}</span>
                    <span>{selected.openings ?? 1} opening(s)</span>
                  </p>
                  {selected.description ? (
                    <p className="mt-4 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{selected.description}</p>
                  ) : null}
                </div>

                <div className="px-6 py-5">
                  {submitted ? (
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
                      <p className="font-semibold">Application received</p>
                      <p className="mt-1 text-emerald-800/90">
                        Thank you. Our HR team will review your application and contact you if you are shortlisted.
                      </p>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-sm font-bold text-slate-800">Apply for this role</h3>
                      <form onSubmit={onApply} className="mt-4 grid gap-4 sm:grid-cols-2">
                        <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
                          Full name *
                          <input
                            className={HR_FIELD_CLASS}
                            value={form.fullName}
                            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                            required
                          />
                        </label>
                        <label className="block text-xs font-semibold text-slate-600">
                          Email
                          <input
                            type="email"
                            className={HR_FIELD_CLASS}
                            value={form.email}
                            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                          />
                        </label>
                        <label className="block text-xs font-semibold text-slate-600">
                          Phone
                          <input
                            className={HR_FIELD_CLASS}
                            value={form.phone}
                            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                          />
                        </label>
                        <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
                          Cover note
                          <textarea
                            className={`${HR_FIELD_CLASS} min-h-[100px]`}
                            value={form.coverNote}
                            onChange={(e) => setForm((f) => ({ ...f, coverNote: e.target.value }))}
                            placeholder="Brief summary of your experience and why you are interested…"
                          />
                        </label>
                        <div className="sm:col-span-2">
                          <button type="submit" disabled={busy} className={HR_BTN_PRIMARY}>
                            {busy ? 'Submitting…' : 'Submit application'}
                          </button>
                        </div>
                      </form>
                    </>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
