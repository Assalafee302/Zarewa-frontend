import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { hrHasPermission } from '../../lib/hrAccess';
import {
  APPLICANT_STATUSES,
  createHrApplicant,
  createHrJob,
  fetchHrApplicants,
  fetchHrJobs,
  patchHrApplicant,
  patchHrJob,
} from '../../lib/hrRecruiting';
import { HrAddFormButton, HrFormModal } from '../../components/hr/HrFormModal';
import { HR_BTN_PRIMARY, HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

export default function HrRecruiting() {
  const ws = useWorkspace();
  const navigate = useNavigate();
  const canManage = hrHasPermission(ws?.permissions, 'hr.staff.manage');
  const branches = useMemo(() => {
    const list = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
    return list.map((b) => ({ id: b.id, name: b.name || b.id }));
  }, [ws]);

  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [applicants, setApplicants] = useState([]);
  const [jobModal, setJobModal] = useState(false);
  const [appModal, setAppModal] = useState(false);
  const [jobForm, setJobForm] = useState({ title: '', branchId: '', department: '', description: '', openings: '1' });
  const [appForm, setAppForm] = useState({ fullName: '', email: '', phone: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

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
    navigate(`/hr/staff/register?applicantId=${encodeURIComponent(applicantId)}`);
  };

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">Job postings, applicant pipeline, and hire-to-register workflow.</p>
      {err ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</div>
      ) : null}
      {canManage ? (
        <div className="flex flex-wrap gap-2">
          <HrAddFormButton onClick={() => setJobModal(true)}>New job</HrAddFormButton>
          <HrAddFormButton onClick={() => setAppModal(true)} disabled={!selectedJobId}>
            Add applicant
          </HrAddFormButton>
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Open roles</p>
          {jobs.map((j) => (
            <button
              key={j.id}
              type="button"
              onClick={() => setSelectedJobId(j.id)}
              className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                selectedJobId === j.id ? 'border-[#134e4a] bg-teal-50/50' : 'border-slate-100 bg-white'
              }`}
            >
              <span className="font-semibold">{j.title}</span>
              <span className="ml-2 text-[10px] uppercase text-slate-500">{j.status}</span>
            </button>
          ))}
        </div>
        <div>
          {selectedJob ? (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-[#134e4a]">{selectedJob.title}</h3>
                  <p className="text-xs text-slate-500">{selectedJob.department || '—'} · {selectedJob.branchId || 'HQ'}</p>
                </div>
                {canManage && selectedJob.status !== 'closed' ? (
                  <button
                    type="button"
                    onClick={async () => {
                      await patchHrJob(selectedJob.id, { status: 'closed' });
                      await reloadJobs();
                    }}
                    className="text-[10px] font-bold uppercase text-slate-600"
                  >
                    Close posting
                  </button>
                ) : null}
              </div>
              <AppTableWrap>
                <AppTable>
                  <AppTableThead>
                    <AppTableTh>Name</AppTableTh>
                    <AppTableTh>Contact</AppTableTh>
                    <AppTableTh>Status</AppTableTh>
                    <AppTableTh />
                  </AppTableThead>
                  <AppTableBody>
                    {applicants.length === 0 ? (
                      <AppTableTr>
                        <AppTableTd colSpan={4} align="center">
                          <span className="text-slate-500 py-4 block">No applicants yet.</span>
                        </AppTableTd>
                      </AppTableTr>
                    ) : (
                      applicants.map((a) => (
                        <AppTableTr key={a.id}>
                          <AppTableTd>{a.fullName}</AppTableTd>
                          <AppTableTd>
                            <span className="text-xs">{a.email || '—'}</span>
                            {a.phone ? <span className="block text-xs text-slate-500">{a.phone}</span> : null}
                          </AppTableTd>
                          <AppTableTd>
                            {canManage ? (
                              <select
                                className="rounded-lg border border-slate-200 text-xs px-2 py-1"
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
                              a.status
                            )}
                          </AppTableTd>
                          <AppTableTd>
                            {canManage && a.status !== 'hired' ? (
                              <button
                                type="button"
                                onClick={() => hireApplicant(a.id)}
                                className="text-[10px] font-bold uppercase text-[#134e4a]"
                              >
                                Register staff
                              </button>
                            ) : a.hiredUserId ? (
                              <Link to={`/hr/staff/${a.hiredUserId}`} className="text-[10px] font-bold uppercase text-[#134e4a]">
                                View profile
                              </Link>
                            ) : null}
                          </AppTableTd>
                        </AppTableTr>
                      ))
                    )}
                  </AppTableBody>
                </AppTable>
              </AppTableWrap>
            </>
          ) : (
            <p className="text-sm text-slate-600">Select or create a job posting.</p>
          )}
        </div>
      </div>

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
            <textarea className={`${HR_FIELD_CLASS} min-h-[80px]`} value={jobForm.description} onChange={(e) => setJobForm((f) => ({ ...f, description: e.target.value }))} />
          </label>
          <button type="submit" disabled={busy} className={HR_BTN_PRIMARY}>
            {busy ? 'Saving…' : 'Create & open'}
          </button>
        </form>
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
          <button type="submit" disabled={busy} className={HR_BTN_PRIMARY}>
            {busy ? 'Saving…' : 'Add applicant'}
          </button>
        </form>
      </HrFormModal>
    </div>
  );
}
