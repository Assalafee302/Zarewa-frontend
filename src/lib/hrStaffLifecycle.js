import { apiFetch } from './apiBase';

export const HR_ONBOARDING_TASKS = [
  { key: 'welcome_briefing', label: 'Welcome briefing completed', ownerRole: 'hr' },
  { key: 'it_access', label: 'IT / system access provisioned', ownerRole: 'it' },
  { key: 'bank_details', label: 'Bank details confirmed for payroll', ownerRole: 'hr' },
  { key: 'uniform_ppe', label: 'Uniform / PPE issued', ownerRole: 'hr' },
  { key: 'policy_ack', label: 'HR policies acknowledged', ownerRole: 'employee' },
  { key: 'probation_scheduled', label: 'Probation review date scheduled', ownerRole: 'manager' },
];

export const HR_OFFBOARDING_TASKS = [
  { key: 'separation_recorded', label: 'Separation details recorded', ownerRole: 'hr' },
  { key: 'handover', label: 'Handover completed', ownerRole: 'manager' },
  { key: 'asset_return', label: 'Company assets returned', ownerRole: 'hr' },
  { key: 'access_revoked', label: 'System access revoked', ownerRole: 'it' },
  { key: 'exit_interview', label: 'Exit interview completed', ownerRole: 'hr' },
  { key: 'final_pay', label: 'Final pay note recorded', ownerRole: 'hr' },
];

export const HR_SEPARATION_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'separating', label: 'Separating' },
  { value: 'separated', label: 'Separated' },
];

const OWNER_LABEL = { hr: 'HR', it: 'IT', manager: 'Manager', employee: 'Employee' };

export function hrLifecycleOwnerLabel(role) {
  return OWNER_LABEL[role] || role || '—';
}

export function fetchHrStaffLifecycle(userId) {
  return apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}/lifecycle`);
}

export function patchHrLifecycleTask(userId, body) {
  return apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}/lifecycle/tasks`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function patchHrStaffSeparation(userId, body) {
  return apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}/lifecycle/separation`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
