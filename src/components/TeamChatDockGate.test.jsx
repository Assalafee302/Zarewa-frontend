import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TeamChatDockGate } from '../components/TeamChatDockGate';
import { TEAM_CHAT_OPEN_EVENT } from '../lib/teamChatEvents';

vi.mock('../context/WorkspaceContext', () => ({
  useWorkspace: () => ({
    session: { user: { id: 'u1', roleKey: 'sales', displayName: 'Sales' } },
    permissions: {},
  }),
}));

vi.mock('../context/AiAssistantContext', () => ({
  useAiAssistant: () => ({ available: false }),
}));

vi.mock('../lib/lazyWithRetry', () => ({
  lazyWithRetry: () => {
    function StubDock({ initialOpen }) {
      return <div data-testid="team-chat-dock">{initialOpen ? 'open' : 'closed'}</div>;
    }
    return StubDock;
  },
}));

describe('TeamChatDockGate', () => {
  it('shows FAB until first open, then mounts dock', async () => {
    render(<TeamChatDockGate />);
    expect(screen.queryByTestId('team-chat-dock')).toBeNull();
    const fab = screen.getByRole('button', { name: 'Chat' });
    fireEvent.click(fab);
    expect(await screen.findByTestId('team-chat-dock')).toHaveTextContent('open');
  });

  it('mounts dock when TEAM_CHAT_OPEN_EVENT fires', async () => {
    render(<TeamChatDockGate />);
    window.dispatchEvent(new CustomEvent(TEAM_CHAT_OPEN_EVENT, { detail: { roomId: 'r1' } }));
    expect(await screen.findByTestId('team-chat-dock')).toBeInTheDocument();
  });
});
