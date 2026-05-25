import { describe, it, expect } from 'vitest';
import {
  isConfidentialLevel,
  userCanSeeOfficeThreadRow,
  userIsWorkItemParticipant,
} from './workspaceConfidentialAccess.js';

describe('workspaceConfidentialAccess', () => {
  it('detects confidential level', () => {
    expect(isConfidentialLevel('confidential')).toBe(true);
    expect(isConfidentialLevel('internal')).toBe(false);
  });

  it('blocks MD HQ roll-up for confidential threads without distribution', () => {
    const row = {
      branch_id: 'BR-001',
      created_by_user_id: 'u1',
      to_user_ids_json: JSON.stringify(['u2']),
      payload_json: JSON.stringify({ confidentiality: 'confidential' }),
    };
    const md = { id: 'md1', roleKey: 'md', permissions: [] };
    expect(userCanSeeOfficeThreadRow({ viewAll: true, branchId: 'BR-001' }, md, row)).toBe(false);
    expect(userCanSeeOfficeThreadRow({ viewAll: true, branchId: 'BR-001' }, { id: 'u2', roleKey: 'sales_manager', permissions: [] }, row)).toBe(true);
  });

  it('identifies work item participants', () => {
    const row = { sender_user_id: 'u1', responsible_user_id: 'u2' };
    expect(userIsWorkItemParticipant({ id: 'u1' }, row, [])).toBe(true);
    expect(userIsWorkItemParticipant({ id: 'u3' }, row, [{ visibilityKind: 'user_id', visibilityValue: 'u3' }])).toBe(true);
    expect(userIsWorkItemParticipant({ id: 'u9' }, row, [])).toBe(false);
  });
});
