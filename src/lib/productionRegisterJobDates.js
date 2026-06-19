/** Derive editable production / completion dates from the selected job snapshot. */
export function productionDatesFromJob(selectedJob) {
  const started = String(selectedJob?.startDateISO || '').slice(0, 10);
  const completed = String(selectedJob?.completedAtISO || selectedJob?.endDateISO || '').slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  return {
    productionDateIso: started || today,
    completionDateIso: completed || started || today,
  };
}
