import { describe, expect, it, afterEach } from 'vitest';
import { isAiAssistantEnabled, isTeamChatEnabled } from './deskOptionalFeatures.js';

describe('deskOptionalFeatures', () => {
  afterEach(() => {
    delete import.meta.env.VITE_TEAM_CHAT;
    delete import.meta.env.VITE_AI_ASSISTANT;
  });

  it('defaults team chat and AI assistant off', () => {
    delete import.meta.env.VITE_TEAM_CHAT;
    delete import.meta.env.VITE_AI_ASSISTANT;
    expect(isTeamChatEnabled()).toBe(false);
    expect(isAiAssistantEnabled()).toBe(false);
  });

  it('enables when env is 1/true', () => {
    import.meta.env.VITE_TEAM_CHAT = '1';
    import.meta.env.VITE_AI_ASSISTANT = 'true';
    expect(isTeamChatEnabled()).toBe(true);
    expect(isAiAssistantEnabled()).toBe(true);
  });
});
