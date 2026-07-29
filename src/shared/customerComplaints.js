/**
 * Customer complaint enums (mirror of server/customerComplaintsOps.js).
 */

export const COMPLAINT_CHANNELS = Object.freeze(['phone', 'whatsapp', 'in_person', 'email']);
export const COMPLAINT_CATEGORIES = Object.freeze([
  'product_quality',
  'delivery_delay',
  'billing_dispute',
  'service',
  'other',
]);
export const COMPLAINT_SEVERITIES = Object.freeze(['low', 'high', 'urgent']);
export const COMPLAINT_STATUSES = Object.freeze([
  'open',
  'acknowledged',
  'in_progress',
  'resolved',
  'closed',
]);

export const COMPLAINT_CHANNEL_LABELS = Object.freeze({
  phone: 'Phone',
  whatsapp: 'WhatsApp',
  in_person: 'In person',
  email: 'Email',
});

export const COMPLAINT_CATEGORY_LABELS = Object.freeze({
  product_quality: 'Product quality',
  delivery_delay: 'Delivery delay',
  billing_dispute: 'Billing dispute',
  service: 'Service',
  other: 'Other',
});

export const COMPLAINT_SEVERITY_LABELS = Object.freeze({
  low: 'Low',
  high: 'High',
  urgent: 'Urgent',
});

export function complaintLabel(map, value) {
  const key = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  return map[key] || String(value || '').replace(/_/g, ' ') || '—';
}
