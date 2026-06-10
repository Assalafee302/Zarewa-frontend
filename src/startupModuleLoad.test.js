import { describe, it, expect } from 'vitest';

describe('startup module graph', () => {
  it('loads App shell without TDZ', async () => {
    const mod = await import('./App.jsx');
    expect(typeof mod.default).toBe('function');
  }, 120_000);

  it('loads Dashboard router without TDZ', async () => {
    const mod = await import('./pages/Dashboard.jsx');
    expect(typeof mod.default).toBe('function');
  });

  it('loads WorkspaceDesk without TDZ', async () => {
    const mod = await import('./pages/WorkspaceDesk.jsx');
    expect(typeof mod.default).toBe('function');
  });

  it('loads ExecutiveCommandCentre without TDZ', async () => {
    const mod = await import('./pages/ExecutiveCommandCentre.jsx');
    expect(typeof mod.default).toBe('function');
  });

  it('loads CommandCentreIntelligenceTab without TDZ', async () => {
    const mod = await import('./components/exec/CommandCentreIntelligenceTab.jsx');
    expect(typeof mod.default).toBe('function');
  });

  it('loads LegacyDashboard without TDZ', async () => {
    const mod = await import('./pages/LegacyDashboard.jsx');
    expect(typeof mod.default).toBe('function');
  });

  it('loads BusinessIntelligence redirect page without TDZ', async () => {
    const mod = await import('./pages/BusinessIntelligence.jsx');
    expect(typeof mod.default).toBe('function');
  });

  it('loads HelpChatDockGate without TDZ', async () => {
    const mod = await import('./components/HelpChatDockGate.jsx');
    expect(typeof mod.HelpChatDockGate).toBe('function');
  });
});
