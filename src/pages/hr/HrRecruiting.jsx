import React, { useMemo, useState } from 'react';
import { ExternalLink, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { hrHasPermission } from '../../lib/hrAccess';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';
import {
  APPLICANT_STATUSES,
  createHrApplicant,
  createHrJob,
  fetchHrApplicants,
  fetchHrJobs,
  fetchInterviewCriteria,
  generateHrOfferLetter,
  patchHrApplicant,
  patchHrJob,
} from '../../lib/hrRecruiting';
import { HrAddFormButton, HrFormModal } from '../../components/hr/HrFormModal';
import { HrAlert, HrCard, HrEmptyState, HrListItemButton, HrPageBody, HrPageIntro, HrSplitWorkspace, HrStatusPill, HrButton, HrAddButton, HR_BTN_PRIMARY, HR_BTN_SECONDARY } from '../../components/hr/hrPageUi';
import { HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';

function countByStatus(applicants) {
  const counts = Object.fromEntries(APPLICANT_STATUSES.map((s) => [s.value, 0]));
  for (const a of applicants) counts[a.status] = (counts[a.status] || 0) + 1;
  return counts;
}

export default function HrRecruiting({ embedded = false } = {}) {
  const ws = useWorkspace();
  const navigate = useNavigate();
  const canManage = hrHasPermission(ws?.permissions, 'hr.staff.manage');
  const branches = useMemo(() => {
    const list = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
    return list.map((b) => ({ id: b.id, name: b.name || b.id }));
  }, [ws]);

  const [jobs, setJobs] = useState([]);
  const [jobSearch, setJobSearch] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [applicants, setApplicants] = useState([]);
  const [applicantFilter, setApplicantFilter] = useState('all');
  const [jobModal, setJobModal] = useState(false);
  const [appModal, setAppModal] = useState(false);
  const [jobForm, setJobForm] = useState({ title: '', branchId: '', department: '', description: '', openings: '1' });
  const [appForm, setAppForm] = useState({ fullName: '', email: '', phone: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [criteria, setCriteria] = useState([]);
  const [scoreModal, setScoreModal] = useState(null);
  const [scoreDraft, setScoreDraft] = useState({});
  const [offerModal, setOfferModal] = useState(null);
  const [offerForm, setOfferForm] = useState({ startDateIso: '', salaryNgn: '' });
  const [offerText, setOfferText] = useState('');

  const { reload: reloadJobs } = useHrListLoad(async () => {
    const { ok, data } = await fetchHrJobs();
    if (!ok || !data?.ok) {
      setJobs([]);
      return { error: data?.error || 'Could not load jobs.', hasData: false };
    }
    const list = data.jobs || [];
    setJobs(list);
    setSelectedJobId((prev) => prev || list[0]?.id || '');
    return { hasData: true };
  }, []);

  const loadApplicants = async (jobId) => {
    if (!jobId) {
      setApplicants([]);
      return;
    }
    const { ok, data } = await fetchHrApplicants(jobId);
    if (ok && data?.ok) setApplicants(data.applicants || []);
    else setApplicants([]);
  };

  useHrListLoad(async () => {
    await loadApplicants(selectedJobId);
    return { hasData: true };
  }, [selectedJobId]);

  useHrListLoad(async () => {
    const { ok, data } = await fetchInterviewCriteria();
    if (ok && data?.ok) setCriteria(data.criteria || []);
    return { hasData: true };
  }, []);

  const filteredJobs = useMemo(() => {
    const q = jobSearch.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter(
      (j) =>
        String(j.title || '').toLowerCase().includes(q) ||
        String(j.department || '').toLowerCase().includes(q) ||
        String(j.branchId || '').toLowerCase().includes(q)
    );
  }, [jobs, jobSearch]);

  const filteredApplicants = useMemo(() => {
    if (applicantFilter === 'all') return applicants;
    return applicants.filter((a) => a.status === applicantFilter);
  }, [applicants, applicantFilter]);

  const statusCounts = useMemo(() => countByStatus(applicants), [applicants]);

  const saveJob = async (e) => {
    e.preventDefault();
    if (!canManage) return;
    setBusy(true);
    const { ok, data } = await createHrJob({
      ...jobForm,
      status: 'open',
      openings: Number(jobForm.openings) || 1,
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setErr(data?.error || 'Could not create job.');
      return;
    }
    setJobModal(false);
    setJobForm({ title: '', branchId: '', department: '', description: '', openings: '1' });
    await reloadJobs();
  };

  const saveApplicant = async (e) => {
    e.preventDefault();
    if (!canManage || !selectedJobId) return;
    setBusy(true);
    const { ok, data } = await createHrApplicant({ jobId: selectedJobId, ...appForm });
    setBusy(false);
    if (!ok || !data?.ok) {
      setErr(data?.error || 'Could not add applicant.');
      return;
    }
    setAppModal(false);
    setAppForm({ fullName: '', email: '', phone: '', notes: '' });
    await loadApplicants(selectedJobId);
  };

  const setApplicantStatus = async (id, status) => {
    const { ok, data } = await patchHrApplicant(id, { status });
    if (ok && data?.ok) await loadApplicants(selectedJobId);
  };

  const hireApplicant = (applicantId) => {
    navigate(`${HR_EMPLOYEES}?tab=directory&register=1&applicantId=${encodeURIComponent(applicantId)}`);
  };

  const openScorecard = (applicant) => {
    const existing = applicant.interviewScores?.scores || {};
    const draft = {};
    for (const c of criteria.length ? criteria : [{ key: 'overall', label: 'Overall' }]) {
      draft[c.key] = existing[c.key] ?? '';
    }
    setScoreDraft(draft);
    setScoreModal(applicant);
  };

  const saveScorecard = async (e) => {
    e.preventDefault();
    if (!scoreModal) return;
    setBusy(true);
    const scores = {};
    for (const [k, v] of Object.entries(scoreDraft)) {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 1 && n <= 5) scores[k] = n;
    }
    const { ok, data } = await patchHrApplicant(scoreModal.id, {
      interviewScores: { scores, updatedAtIso: new Date().toISOString() },
      status: scoreModal.status === 'applied' || scoreModal.status === 'screening' ? 'interview' : scoreModal.status,
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setErr(data?.error || 'Could not save scorecard.');
      return;
    }
    setScoreModal(null);
    await loadApplicants(selectedJobId);
  };

  const openOfferLetter = (applicant) => {
    setOfferForm({ startDateIso: '', salaryNgn: '' });
    setOfferText(applicant.offerLetterText || '');
    setOfferModal(applicant);
  };

  const generateOffer = async (e) => {
    e.preventDefault();
    if (!offerModal) return;
    setBusy(true);
    const { ok, data } = await generateHrOfferLetter(offerModal.id, {
      startDateIso: offerForm.startDateIso || undefined,
      salaryNgn: offerForm.salaryNgn ? Number(offerForm.salaryNgn) : undefined,
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setErr(data?.error || 'Could not generate offer letter.');
      return;
    }
    setOfferText(data.offerLetterText || '');
    await loadApplicants(selectedJobId);
  };

  const selectedJob = jobs.find((j) => j.id === selectedJobId);
  const branchName = branches.find((b) => b.id === selectedJob?.branchId)?.name || selectedJob?.branchId || 'HQ';

  const inner = (
    <>
      {!embedded ? (
        <HrPageIntro
          actions={
            <>
              <a
                href="/careers"
                target="_blank"
                rel="noreferrer"
                className={`${HR_BTN_SECONDARY} inline-flex items-center gap-1.5`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Public careers
              </a>
              {canManage ? (
                <>
                  <HrAddFormButton onClick={() => setJobModal(true)}>New job</HrAddFormButton>
                  <button
                    type="button"
                    disabled={!selectedJobId}
                    onClick={() => setAppModal(true)}
                    className={`${HR_BTN_SECONDARY} inline-flex items-center gap-1.5 disabled:opacity-50`}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Add applicant
                  </button>
                </>
              ) : null}
            </>
          }
        />
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <a
            href="/careers"
            target="_blank"
            rel="noreferrer"
            className={`${HR_BTN_SECONDARY} inline-flex items-center gap-1.5`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Public careers
          </a>
          {canManage ? (
            <>
              <HrAddFormButton onClick={() => setJobModal(true)}>New job</HrAddFormButton>
              <button
                type="button"
                disabled={!selectedJobId}
                onClick={() => setAppModal(true)}
                className={`${HR_BTN_SECONDARY} inline-flex items-center gap-1.5 disabled:opacity-50`}
              >
                <UserPlus className="h-3.5 w-3.5" />
                Add applicant
              </button>
            </>
          ) : null}
        </div>
      )}

      {err ? <HrAlert>{err}</HrAlert> : null}

      <HrSplitWorkspace
        sidebar={
          <HrCard title="Job postings" subtitle={`${jobs.length} total`}>
            <input
              type="search"
              placeholder="Search roles…"
              value={jobSearch}
              onChange={(e) => setJobSearch(e.target.value)}
              className={`${HR_FIELD_CLASS} mb-3`}
            />
            <div className="max-h-[min(52vh,520px)] space-y-2 overflow-y-auto pr-1">
              {filteredJobs.length === 0 ? (
                <HrEmptyState title="No jobs found" description={canManage ? 'Create a new job posting to get started.' : undefined} />
              ) : (
                filteredJobs.map((j) => (
                  <HrListItemButton
                    key={j.id}
                    active={selectedJobId === j.id}
                    onClick={() => setSelectedJobId(j.id)}
                    title={j.title}
                    meta={`${j.department || '—'} · ${j.branchId || 'HQ'}`}
                    badge={<HrStatusPill status={j.status} />}
                  />
                ))
              )}
            </div>
          </HrCard>
        }
      >
        {!selectedJob ? (
          <HrEmptyState title="Select a job" description="Choose a role from the list or create a new posting." />
        ) : (
          <div className="space-y-4">
            <HrCard
              title={selectedJob.title}
              subtitle={`${selectedJob.department || '—'} · ${branchName} · ${selectedJob.openings ?? 1} opening(s)`}
              actions={
                canManage && selectedJob.status !== 'closed' ? (
                  <button
                    type="button"
                    onClick={async () => {
                      await patchHrJob(selectedJob.id, { status: 'closed' });
                      await reloadJobs();
                    }}
                    className={HR_BTN_SECONDARY}
                  >
                    Close posting
                  </button>
                ) : (
                  <HrStatusPill status={selectedJob.status} />
                )
              }
            >
              {selectedJob.description ? (
                <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{selectedJob.description}</p>
              ) : (
                <p className="text-sm text-slate-500">No description added.</p>
              )}
            </HrCard>

            <HrCard title="Applicant pipeline" subtitle={`${applicants.length} applicant(s)`}>
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setApplicantFilter('all')}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    applicantFilter === 'all' ? 'border-zarewa-teal bg-teal-50 text-zarewa-teal' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  All ({applicants.length})
                </button>
                {APPLICANT_STATUSES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setApplicantFilter(s.value)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      applicantFilter === s.value ? 'border-zarewa-teal bg-teal-50 text-zarewa-teal' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    {s.label} ({statusCounts[s.value] || 0})
                  </button>
                ))}
              </div>

              {filteredApplicants.length === 0 ? (
                <HrEmptyState
                  title="No applicants in this stage"
                  description={canManage ? 'Add an applicant manually or share the public careers link.' : undefined}
                  action={
                    canManage ? (
                      <button type="button" onClick={() => setAppModal(true)} className={HR_BTN_PRIMARY}>
                        Add applicant
                      </button>
                    ) : null
                  }
                />
              ) : (
                <ul className="space-y-3">
                  {filteredApplicants.map((a) => (
                    <li
                      key={a.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/40 p-4 transition hover:border-slate-200 hover:bg-white"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{a.fullName}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {[a.email, a.phone].filter(Boolean).join(' · ') || 'No contact details'}
                          </p>
                          {a.interviewScores?.scores ? (
                            <p className="mt-2 text-xs text-slate-600">
                              Scorecard:{' '}
                              {Object.entries(a.interviewScores.scores)
                                .map(([k, v]) => `${k} ${v}/5`)
                                .join(' · ')}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          {canManage ? (
                            <select
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700"
                              value={a.status}
                              onChange={(e) => setApplicantStatus(a.id, e.target.value)}
                            >
                              {APPLICANT_STATUSES.map((s) => (
                                <option key={s.value} value={s.value}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <HrStatusPill status={a.status} />
                          )}
                        </div>
                      </div>
                      {canManage ? (
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                          <button type="button" onClick={() => openScorecard(a)} className={HR_BTN_SECONDARY}>
                            Interview scorecard
                          </button>
                          <button type="button" onClick={() => openOfferLetter(a)} className={HR_BTN_SECONDARY}>
                            Offer letter
                          </button>
                          {a.status !== 'hired' ? (
                            <button type="button" onClick={() => hireApplicant(a.id)} className={HR_BTN_PRIMARY}>
                              Register as staff
                            </button>
                          ) : a.hiredUserId ? (
                            <Link to={`${HR_EMPLOYEES}/${a.hiredUserId}`} className={HR_BTN_SECONDARY}>
                              View staff profile
                            </Link>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </HrCard>
          </div>
        )}
      </HrSplitWorkspace>

      <HrFormModal isOpen={jobModal} onClose={() => setJobModal(false)} title="New job posting">
        <form onSubmit={saveJob} className="space-y-4">
          <label className="block text-xs font-semibold text-slate-600">
            Title
            <input className={HR_FIELD_CLASS} value={jobForm.title} onChange={(e) => setJobForm((f) => ({ ...f, title: e.target.value }))} required />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Branch
            <select className={HR_FIELD_CLASS} value={jobForm.branchId} onChange={(e) => setJobForm((f) => ({ ...f, branchId: e.target.value }))}>
              <option value="">—</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Department
            <input className={HR_FIELD_CLASS} value={jobForm.department} onChange={(e) => setJobForm((f) => ({ ...f, department: e.target.value }))} />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Description
            <textarea className={`${HR_FIELD_CLASS} min-h-[100px]`} value={jobForm.description} onChange={(e) => setJobForm((f) => ({ ...f, description: e.target.value }))} />
          </label>
          <HrButton type="submit" disabled={busy} >
            {busy ? 'Saving…' : 'Create & publish'}
          </HrButton>
        </form>
      </HrFormModal>

      <HrFormModal isOpen={Boolean(scoreModal)} onClose={() => setScoreModal(null)} title="Interview scorecard">
        {scoreModal ? (
          <form onSubmit={saveScorecard} className="space-y-4">
            <p className="text-sm font-semibold text-slate-800">{scoreModal.fullName}</p>
            <p className="text-xs text-slate-500">Rate each criterion from 1 (low) to 5 (excellent).</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(criteria.length ? criteria : [{ key: 'overall', label: 'Overall recommendation' }]).map((c) => (
                <label key={c.key} className="block text-xs font-semibold text-slate-600">
                  {c.label}
                  <input
                    type="number"
                    min={1}
                    max={5}
                    className={HR_FIELD_CLASS}
                    value={scoreDraft[c.key] ?? ''}
                    onChange={(e) => setScoreDraft((d) => ({ ...d, [c.key]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
            <HrButton type="submit" disabled={busy} >
              {busy ? 'Saving…' : 'Save scorecard'}
            </HrButton>
          </form>
        ) : null}
      </HrFormModal>

      <HrFormModal isOpen={Boolean(offerModal)} onClose={() => setOfferModal(null)} title="Offer letter">
        {offerModal ? (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-slate-800">{offerModal.fullName}</p>
            <form onSubmit={generateOffer} className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-slate-600">
                Proposed start date
                <input type="date" className={HR_FIELD_CLASS} value={offerForm.startDateIso} onChange={(e) => setOfferForm((f) => ({ ...f, startDateIso: e.target.value }))} />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Monthly gross (NGN)
                <input type="number" className={HR_FIELD_CLASS} value={offerForm.salaryNgn} onChange={(e) => setOfferForm((f) => ({ ...f, salaryNgn: e.target.value }))} />
              </label>
              <button type="submit" disabled={busy} className={`${HR_BTN_PRIMARY} sm:col-span-2`}>
                {busy ? 'Generating…' : 'Generate offer letter'}
              </button>
            </form>
            {offerText ? (
              <pre className="max-h-72 overflow-auto rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs leading-relaxed whitespace-pre-wrap">
                {offerText}
              </pre>
            ) : null}
          </div>
        ) : null}
      </HrFormModal>

      <HrFormModal isOpen={appModal} onClose={() => setAppModal(false)} title="Add applicant">
        <form onSubmit={saveApplicant} className="space-y-4">
          <label className="block text-xs font-semibold text-slate-600">
            Full name
            <input className={HR_FIELD_CLASS} value={appForm.fullName} onChange={(e) => setAppForm((f) => ({ ...f, fullName: e.target.value }))} required />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Email
            <input type="email" className={HR_FIELD_CLASS} value={appForm.email} onChange={(e) => setAppForm((f) => ({ ...f, email: e.target.value }))} />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Phone
            <input className={HR_FIELD_CLASS} value={appForm.phone} onChange={(e) => setAppForm((f) => ({ ...f, phone: e.target.value }))} />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Notes
            <textarea className={`${HR_FIELD_CLASS} min-h-[80px]`} value={appForm.notes} onChange={(e) => setAppForm((f) => ({ ...f, notes: e.target.value }))} />
          </label>
          <HrButton type="submit" disabled={busy} >
            {busy ? 'Saving…' : 'Add to pipeline'}
          </HrButton>
        </form>
      </HrFormModal>
    </>
  );

  return embedded ? inner : <HrPageBody>{inner}</HrPageBody>;
}
