/**
 * Office record types for Create Office Record wizard (aligned with smartMemoComposer).
 */
import {
  SMART_MEMO_TYPES,
  SMART_MEMO_GUIDED_FIELDS,
  detectSmartMemoType,
  buildSmartMemoSuggestions,
} from './smartMemoComposer.js';

export const OFFICE_RECORD_TYPES = SMART_MEMO_TYPES;
export const OFFICE_RECORD_GUIDED_FIELDS = SMART_MEMO_GUIDED_FIELDS;
export const detectOfficeRecordType = detectSmartMemoType;
export const buildOfficeRecordSuggestions = buildSmartMemoSuggestions;

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
