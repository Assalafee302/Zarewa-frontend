import { normalizeJobStatus } from './productionJobPick.js';

/**
 * Five distinct chip palettes for production-line queue status (Sales cutting list + Operations queue).
 * Waiting = not sent to production; Pushed = registered (planned or job still syncing); In production; Produced; Cancelled.
 *
 * @param {Record<string, unknown>} cl cutting list snapshot row
 * @param {Record<string, unknown> | null | undefined} job production job from pickProductionJobForCuttingList
 * @returns {{ label: string; chipClass: string }}
 */
export function productionQueueLineStatusPresentation(cl, job) {
  const jobSt = job != null ? normalizeJobStatus(job.status) : '';
  const clSt = String(cl?.status ?? '').trim();
  if (jobSt === 'Cancelled') {
    return { label: 'Cancelled', chipClass: 'border-rose-500 bg-rose-50 text-rose-950' };
  }
  if (jobSt === 'Completed' || clSt === 'Finished') {
    return { label: 'Produced', chipClass: 'border-emerald-600 bg-emerald-50 text-emerald-950' };
  }
  if (jobSt === 'Running' || clSt === 'In production') {
    return { label: 'In production', chipClass: 'border-cyan-500 bg-cyan-50 text-cyan-950' };
  }
  if (cl?.productionRegistered && (job == null || jobSt === 'Planned')) {
    return { label: 'Pushed', chipClass: 'border-violet-500 bg-violet-50 text-violet-950' };
  }
  return { label: 'Waiting', chipClass: 'border-orange-500 bg-orange-50 text-orange-950' };
}
