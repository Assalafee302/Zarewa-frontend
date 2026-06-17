import { useOutletContext } from 'react-router-dom';

/** @returns {{ cohort?: string }} */
export function useMyProfileCohort() {
  return useOutletContext() || {};
}
