/**
 * Office record types for Create Office Record wizard (aligned with smartMemoComposer).
 */
export {
  SMART_MEMO_TYPES as OFFICE_RECORD_TYPES,
  SMART_MEMO_GUIDED_FIELDS as OFFICE_RECORD_GUIDED_FIELDS,
  detectSmartMemoType as detectOfficeRecordType,
  buildSmartMemoSuggestions as buildOfficeRecordSuggestions,
} from './smartMemoComposer.js';

/** Display order for record type picker */
export const OFFICE_RECORD_TYPE_ORDER = [
  'maintenance_repairs',
  'fuel_diesel',
  'expense_support',
  'procurement_request',
  'operations_incident',
  'production_issue',
  'finance_payment',
  'hr_admin',
  'management_approval',
  'general_internal',
];
