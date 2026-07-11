import { LINE_STATUS, QUERY_REASONS } from '../../../lib/stockRegisterLineClearance.js';

export { QUERY_REASONS };

/** Ceremony steps — no MD gate; costing → capture & lock. */
export const STATUS_STEPS = [
  { key: 'draft', label: 'Open' },
  { key: 'printed', label: 'Counting' },
  { key: 'store_confirmed', label: 'With manager' },
  { key: 'bm_approved', label: 'Manager OK' },
  { key: 'procurement_costed', label: 'Costed' },
  { key: 'locked', label: 'Locked' },
];

export const LINE_STATUS_LABELS = {
  [LINE_STATUS.PENDING]: 'Pending',
  [LINE_STATUS.CLEARED]: 'OK',
  [LINE_STATUS.ADJUSTED]: 'Adjusted',
  [LINE_STATUS.QUERY]: 'Query',
};

export const STORE_CHECKLIST_ITEMS = [
  { key: 'coilsCounted', label: 'Active coils counted on floor' },
  { key: 'finishedVerified', label: 'Finished coils verified (consumed this period)' },
  { key: 'stoneCounted', label: 'Stone-coated metres counted' },
  { key: 'accessoriesCounted', label: 'Accessories counted' },
  { key: 'inTransitReviewed', label: 'In-transit loads reviewed' },
];

export const BM_TABS = [
  { key: 'active', label: 'Active coils' },
  { key: 'finished', label: 'Finished' },
  { key: 'stone', label: 'Stone' },
  { key: 'accessories', label: 'Accessories' },
  { key: 'intransit', label: 'In-transit' },
];

export const BM_STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'cleared', label: 'OK' },
  { key: 'adjusted', label: 'Adjusted' },
  { key: 'query', label: 'Query' },
];
