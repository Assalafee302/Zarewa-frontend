import { afterEach, describe, expect, it, vi } from 'vitest';
import { isAiAssistantEnabled, isTeamChatEnabled } from './deskOptionalFeatures.js';

describe('deskOptionalFeatures', () => {
  afterEach(() => {
    delete import.meta.env.VITE_TEAM_CHAT;
    delete import.meta.env.VITE_AI_ASSISTANT;
    delete import.meta.env.VITE_TEAM_CHAT_FORCE;
    delete import.meta.env.VITE_AI_ASSISTANT_FORCE;
    vi.unstubAllGlobals();
  });

  it('defaults team chat and AI assistant off', () => {
    delete import.meta.env.VITE_TEAM_CHAT;
    delete import.meta.env.VITE_AI_ASSISTANT;
    expect(isTeamChatEnabled()).toBe(false);
    expect(isAiAssistantEnabled()).toBe(false);
  });

  it('enables when env is 1/true on unconstrained links', () => {
    vi.stubGlobal('navigator', { connection: { effectiveType: '4g', saveData: false } });
    import.meta.env.VITE_TEAM_CHAT = '1';
    import.meta.env.VITE_AI_ASSISTANT = 'true';
    expect(isTeamChatEnabled()).toBe(true);
    expect(isAiAssistantEnabled()).toBe(true);
  });

  it('stays off on constrained links even when env is on', () => {
    vi.stubGlobal('navigator', { connection: { effectiveType: '2g', saveData: false } });
    import.meta.env.VITE_TEAM_CHAT = '1';
    import.meta.env.VITE_AI_ASSISTANT = '1';
    expect(isTeamChatEnabled()).toBe(false);
    expect(isAiAssistantEnabled()).toBe(false);
  });

  it('FORCE env overrides constrained network gate', () => {
    vi.stubGlobal('navigator', { connection: { effectiveType: '2g', saveData: true } });
    import.meta.env.VITE_TEAM_CHAT = '1';
    import.meta.env.VITE_TEAM_CHAT_FORCE = '1';
    import.meta.env.VITE_AI_ASSISTANT = '1';
    import.meta.env.VITE_AI_ASSISTANT_FORCE = '1';
    expect(isTeamChatEnabled()).toBe(true);
    expect(isAiAssistantEnabled()).toBe(true);
  });
});
