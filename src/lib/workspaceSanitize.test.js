import { describe, expect, it } from 'vitest';
import { sanitizeRunaPageContext } from './workspaceSanitize.js';
import { RESTRICTED_WORK_ITEM_PLACEHOLDER } from './workspaceConfidentialAccess.js';
import { normalizeWorkItem } from './workspaceWorkItemModel.js';

describe('workspaceSanitize frontend', () => {
  it('sanitizes confidential Runa page context', () => {
    const ctx = sanitizeRunaPageContext({
      selectedWorkItem: { id: '1', title: 'Payroll', confidentiality: 'confidential' },
    });
    expect(ctx.selectedWorkItem.title).toBe(RESTRICTED_WORK_ITEM_PLACEHOLDER.title);
  });
});

describe('normalizeWorkItem redaction', () => {
  it('shows placeholder when item is redacted', () => {
    const item = normalizeWorkItem({
      id: 'WI-1',
      title: 'Real title',
      redacted: true,
      confidentiality: 'confidential',
    });
    expect(item.title).toBe(RESTRICTED_WORK_ITEM_PLACEHOLDER.title);
  });

  it('shows full title for authorized confidential item', () => {
    const item = normalizeWorkItem({
      id: 'WI-2',
      title: 'Payroll adjustment',
      confidentiality: 'confidential',
    });
    expect(item.title).toBe('Payroll adjustment');
  });
});
