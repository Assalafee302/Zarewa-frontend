import { LINE_STATUS, QUERY_REASONS } from '../../../lib/stockRegisterLineClearance.js';

export { QUERY_REASONS };

export const STATUS_STEPS = [
  { key: 'draft', label: 'Draft' },
  { key: 'printed', label: 'Printed' },
  { key: 'store_confirmed', label: 'With manager' },
  { key: 'bm_approved', label: 'BM OK' },
  { key: 'procurement_costed', label: 'Costed' },
  { key: 'md_approved', label: 'MD OK' },
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
