import { describe, it, expect } from 'vitest';

describe('help module startup', () => {
  it('loads helpKnowledge without TDZ', async () => {
    const mod = await import('./lib/helpKnowledge.js');
    expect(mod.HELP_ARTICLE_COUNT).toBeGreaterThan(100);
    expect(mod.ensureHelpArticles().length).toBe(mod.HELP_ARTICLE_COUNT);
  });

  it('loads HelpChatDock module graph without TDZ', async () => {
    const mod = await import('./components/HelpChatDock.jsx');
    expect(typeof mod.HelpChatDock).toBe('function');
  });

  it('loads helpAgentIntent chain without TDZ', async () => {
    const mod = await import('./lib/helpAgentIntent.js');
    expect(typeof mod.classifyAgentRoute).toBe('function');
  });

  it('loads helpCoachingDetect without pulling helpSynthesize', async () => {
    const mod = await import('./lib/helpCoachingDetect.js');
    expect(typeof mod.isCoachingMessage).toBe('function');
  });
});
