import { describe, it, expect } from 'vitest';
import { wsPriorityBadge, wsStatusBadge, wsBadge } from './workspaceUiTokens.js';

describe('workspaceUiTokens SLA palette', () => {
  it('uses green/amber/red/slate classes only for status and priority', () => {
    expect(wsPriorityBadge('urgent')).toMatch(/red/);
    expect(wsPriorityBadge('high')).toMatch(/amber/);
    expect(wsPriorityBadge('normal')).toMatch(/slate/);
    expect(wsStatusBadge('overdue')).toMatch(/red/);
    expect(wsStatusBadge('pending')).toMatch(/amber/);
    expect(wsStatusBadge('approved')).toMatch(/green/);
    expect(wsBadge('rose')).toMatch(/red/);
    expect(wsBadge('emerald')).toMatch(/green/);
    expect(wsBadge('rose')).not.toMatch(/rose-\d/);
    expect(wsBadge('emerald')).not.toMatch(/emerald-\d/);
  });
});
