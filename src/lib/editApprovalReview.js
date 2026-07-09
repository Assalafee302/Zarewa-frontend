/** Human labels for edit-approval entity kinds (Management → Edit OKs popup). */
export function editApprovalEntityLabel(entityKind) {
  const ek = String(entityKind || '').trim().toLowerCase();
  const map = {
    quotation: 'Quotation',
    purchase_order: 'Purchase order',
    production_job: 'Production job',
    sales_receipt: 'Sales receipt',
    cutting_list: 'Cutting list',
    user: 'User account',
    supplier: 'Supplier',
    transport_agent: 'Transport agent',
    manager_targets: 'Manager targets',
    treasury_accounts: 'Treasury accounts',
    coil_request: 'Material request',
    expense: 'Expense / payment',
    ledger_movement: 'Ledger movement',
  };
  return map[ek] || ek.replace(/_/g, ' ') || 'Record';
}

/**
 * @param {unknown} raw
 * @returns {{ label: string; from?: string; to?: string }[]}
 */
export function normalizeEditApprovalChangeDetails(raw) {
  if (!raw) return [];
  let arr = raw;
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const label = String(row.label ?? row.field ?? row.key ?? '').trim();
      if (!label) return null;
      const from = row.from != null ? String(row.from) : row.before != null ? String(row.before) : '';
      const to = row.to != null ? String(row.to) : row.after != null ? String(row.after) : '';
      return { label, from, to };
    })
    .filter(Boolean);
}

export function formatEditApprovalFieldValue(value) {
  if (value == null || value === '') return '—';
  return String(value);
}
