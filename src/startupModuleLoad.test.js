import { describe, it, expect } from 'vitest';

describe('startup module graph', () => {
  it('loads App shell without TDZ', async () => {
    const mod = await import('./App.jsx');
    expect(typeof mod.default).toBe('function');
  }, 120_000);

  it('loads Dashboard router without TDZ', async () => {
    const mod = await import('./pages/workspace/Dashboard.jsx');
    expect(typeof mod.default).toBe('function');
  });

  it('loads WorkspaceShell without TDZ', async () => {
    const mod = await import('./pages/workspace/WorkspaceShell.jsx');
    expect(typeof mod.default).toBe('function');
  });

  it('loads WorkspaceDesk without TDZ', async () => {
    const mod = await import('./pages/workspace/WorkspaceDesk.jsx');
    expect(typeof mod.default).toBe('function');
  });

  it('loads ExecutiveCommandCentre without TDZ', async () => {
    const mod = await import('./pages/exec/ExecutiveCommandCentre.jsx');
    expect(typeof mod.default).toBe('function');
  });

  it('loads CommandCentreIntelligenceTab without TDZ', async () => {
    const mod = await import('./components/exec/CommandCentreIntelligenceTab.jsx');
    expect(typeof mod.default).toBe('function');
  });

  it('loads LegacyDashboard without TDZ', async () => {
    const mod = await import('./pages/workspace/LegacyDashboard.jsx');
    expect(typeof mod.default).toBe('function');
  });

  it('loads BusinessIntelligence redirect page without TDZ', async () => {
    const mod = await import('./pages/exec/BusinessIntelligence.jsx');
    expect(typeof mod.default).toBe('function');
  });

  it('loads HelpChatDockGate without TDZ', async () => {
    const mod = await import('./components/HelpChatDockGate.jsx');
    expect(typeof mod.HelpChatDockGate).toBe('function');
  });

  it('loads TeamChatDockGate without TDZ', async () => {
    const mod = await import('./components/TeamChatDockGate.jsx');
    expect(typeof mod.TeamChatDockGate).toBe('function');
  });
});
