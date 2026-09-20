import { describe, it, expect } from 'vitest';
import { accountingZonesForActor, defaultAccountingTab, LOCAL_GL_DESK_TABS } from './accountingDeskNav';

describe('accountingDeskNav local GL split', () => {
  it('hides statutory tabs and keeps registers when local GL is off', () => {
    const zones = accountingZonesForActor({ glPostingEnabled: false });
    const tabs = zones.flatMap((z) => z.tabs);
    expect(tabs).toContain('creditors');
    expect(tabs).toContain('debtors');
    expect(tabs).toContain('reconciliation');
    expect(tabs).toContain('payroll');
    for (const id of LOCAL_GL_DESK_TABS) {
      expect(tabs).not.toContain(id);
    }
    expect(zones.some((z) => z.id === 'home')).toBe(false);
    expect(zones.some((z) => z.id === 'close')).toBe(false);
    expect(zones.find((z) => z.id === 'registers')?.tabs).toContain('reconciliation');
    expect(defaultAccountingTab({ glPostingEnabled: false })).toBe('creditors');
  });
});
