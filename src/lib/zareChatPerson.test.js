import { describe, it, expect } from 'vitest';
import {
  ZARE_CHAT_ROOM_ID,
  ZARE_CHAT_USER_ID,
  buildZareChatRoom,
  injectZareChatRoom,
  injectZareDirectory,
  isZareChatRoomId,
  zareHelpHistoryFromMessages,
} from './zareChatPerson.js';
import { HELP_BOT_NAME } from './helpBotBrand.js';

describe('zareChatPerson', () => {
  it('injects Zare as the first DM room', () => {
    const rooms = injectZareChatRoom([{ id: 'r1', name: 'Ada' }]);
    expect(rooms[0].id).toBe(ZARE_CHAT_ROOM_ID);
    expect(rooms[0].name).toBe(HELP_BOT_NAME);
    expect(rooms[0].bot).toBe(true);
    expect(rooms[0].peerUserId).toBe(ZARE_CHAT_USER_ID);
    expect(rooms.map((r) => r.id)).toEqual([ZARE_CHAT_ROOM_ID, 'r1']);
  });

  it('does not duplicate Zare if already present', () => {
    const rooms = injectZareChatRoom([buildZareChatRoom(), { id: 'r1' }]);
    expect(rooms.filter((r) => isZareChatRoomId(r.id))).toHaveLength(1);
  });

  it('maps stored messages onto help-chat history roles', () => {
    const history = zareHelpHistoryFromMessages([
      { id: 'zare-intro', body: 'Hi', authorUserId: ZARE_CHAT_USER_ID },
      { id: 'u1', body: 'How do refunds work?', authorUserId: 'usr-1' },
      { id: 'a1', body: 'Open Sales → Refunds.', authorUserId: ZARE_CHAT_USER_ID },
    ]);
    expect(history).toEqual([
      { role: 'user', content: 'How do refunds work?' },
      { role: 'assistant', content: 'Open Sales → Refunds.' },
    ]);
  });

  it('puts Zare first in the people picker', () => {
    const dir = injectZareDirectory([{ id: 'usr-1', displayName: 'Ada' }]);
    expect(dir[0].id).toBe(ZARE_CHAT_USER_ID);
    expect(dir[1].id).toBe('usr-1');
  });
});
