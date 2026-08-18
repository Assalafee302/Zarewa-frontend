import { describe, it, expect } from 'vitest';
import { appFabRightClass, appFabSlots } from './appFabLayout.js';
import { TEAM_CHAT_OPEN_EVENT, openTeamChat } from './teamChatEvents.js';

describe('appFabLayout', () => {
  it('places chat left of Zare, and left of AI when that dock is on', () => {
    expect(appFabSlots({ aiDockVisible: false })).toEqual({ ai: 0, zare: 0, chat: 1 });
    expect(appFabSlots({ aiDockVisible: true })).toEqual({ ai: 0, zare: 1, chat: 2 });
    expect(appFabRightClass(0)).toContain('right-[max(1.25rem');
    expect(appFabRightClass(1)).toContain('+4.25rem');
    expect(appFabRightClass(2)).toContain('+8.5rem');
  });
});

describe('teamChatEvents', () => {
  it('dispatches open event with room id', () => {
    const seen = [];
    const onOpen = (ev) => seen.push(ev.detail);
    window.addEventListener(TEAM_CHAT_OPEN_EVENT, onOpen);
    openTeamChat({ roomId: 'room-1' });
    window.removeEventListener(TEAM_CHAT_OPEN_EVENT, onOpen);
    expect(seen).toEqual([{ roomId: 'room-1' }]);
  });
});
