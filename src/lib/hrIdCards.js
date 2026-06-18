import { apiFetch } from './apiBase';

function normalizeIdCardRequest(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id ?? row.userId,
    requestType: row.request_type ?? row.requestType ?? 'new',
    reason: row.reason ?? row.replacement_reason ?? row.replacementReason ?? '',
    replacementReason: row.replacement_reason ?? row.replacementReason ?? row.reason ?? '',
    status: row.status ?? 'pending',
    requestedAt: row.requested_at_iso ?? row.requestedAt ?? row.createdAt,
    createdAt: row.requested_at_iso ?? row.requestedAt ?? row.createdAt,
    processedAt: row.processed_at_iso ?? row.processedAt,
    collectedAt: row.collected_at_iso ?? row.collectedAt,
    notes: row.notes ?? '',
    bloodGroup: row.blood_group ?? row.bloodGroup ?? '',
    emergencyContact: row.emergency_contact ?? row.emergencyContact ?? '',
    lostDamaged: Boolean(row.lost_damaged_flag ?? row.lostDamaged),
    issueDateIso: row.issue_date_iso ?? row.issueDateIso ?? null,
    expiryDateIso: row.expiry_date_iso ?? row.expiryDateIso ?? null,
    approvedByUserId: row.approved_by_user_id ?? row.approvedByUserId ?? null,
    printedByUserId: row.printed_by_user_id ?? row.printedByUserId ?? null,
    tempCardIssued: Boolean(row.temp_card_issued ?? row.tempCardIssued),
    displayName: row.displayName ?? row.display_name,
    employeeNo: row.employeeNo ?? row.employee_no,
    jobTitle: row.jobTitle ?? row.job_title,
    department: row.department,
    branchId: row.branchId ?? row.branch_id,
    avatarUrl: row.avatarUrl ?? row.avatar_url,
  };
}

export async function fetchHrIdCards(userId) {
  const url = userId
    ? `/api/hr/id-cards?userId=${encodeURIComponent(String(userId))}`
    : '/api/hr/id-cards';
  const r = await apiFetch(url);
  if (!r.ok || r.data?.ok === false) return [];
  const rows = r.data?.requests;
  if (!Array.isArray(rows)) return [];
  return rows.map(normalizeIdCardRequest).filter(Boolean);
}

export async function createHrIdCardRequest(data) {
  return apiFetch('/api/hr/id-cards', { method: 'POST', body: JSON.stringify(data) });
}

export async function patchHrIdCardRequest(id, data) {
  return apiFetch(`/api/hr/id-cards/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export { normalizeIdCardRequest };
