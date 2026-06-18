/** Four-phase accountability workflow (replaces the old 8-step bar). */
export const ACCOUNTABILITY_PHASES = [
  {
    id: 'intake',
    label: '1. Intake',
    hint: 'What happened — case is registered',
    summary: 'Review the incident summary. Move to Investigate when ready.',
  },
  {
    id: 'investigate',
    label: '2. Investigate',
    hint: 'Findings, evidence, who is responsible, asset/loss',
    summary: 'One screen: notes, proof, responsibility map, and asset link.',
  },
  {
    id: 'sanction',
    label: '3. Sanction',
    hint: 'Management decision, payroll recovery, letters',
    summary: 'Apply the sanction once — this creates recovery schedules and draft letters.',
  },
  {
    id: 'close',
    label: '4. Close',
    hint: 'Issue letters, settle recovery, close case',
    summary: 'Issue required letters, then close when the checklist is green.',
  },
];

/** @deprecated Use ACCOUNTABILITY_PHASES — kept for any stale imports */
export const ACCOUNTABILITY_STAGES = ACCOUNTABILITY_PHASES;
