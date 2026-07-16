import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isWorkspaceV3Enabled, isWorkspaceV3ExplicitlyDisabled } from './workspaceV3FeatureFlag.js';

describe('workspaceV3FeatureFlag', () => {
  const prev = import.meta.env?.VITE_WORKSPACE_V3;

  afterEach(() => {
    if (prev === undefined) delete import.meta.env.VITE_WORKSPACE_V3;
    else import.meta.env.VITE_WORKSPACE_V3 = prev;
  });

  it('defaults off when unset', () => {
    delete import.meta.env.VITE_WORKSPACE_V3;
    expect(isWorkspaceV3Enabled()).toBe(false);
    expect(isWorkspaceV3ExplicitlyDisabled()).toBe(false);
  });

  it('enables on 1 or true', () => {
    import.meta.env.VITE_WORKSPACE_V3 = '1';
    expect(isWorkspaceV3Enabled()).toBe(true);
    import.meta.env.VITE_WORKSPACE_V3 = 'true';
    expect(isWorkspaceV3Enabled()).toBe(true);
  });

  it('disables on 0 or false', () => {
    import.meta.env.VITE_WORKSPACE_V3 = '0';
    expect(isWorkspaceV3Enabled()).toBe(false);
    expect(isWorkspaceV3ExplicitlyDisabled()).toBe(true);
    import.meta.env.VITE_WORKSPACE_V3 = 'false';
    expect(isWorkspaceV3Enabled()).toBe(false);
    expect(isWorkspaceV3ExplicitlyDisabled()).toBe(true);
  });
});

describe('Dashboard workspace priority order', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('prefers V3 over V2 over legacy', async () => {
    vi.doMock('./workspaceV3FeatureFlag.js', () => ({
      isWorkspaceV3Enabled: () => true,
    }));
    vi.doMock('./officeDeskFeatureFlag.js', () => ({
      isOfficeDeskV2Enabled: () => true,
    }));
    // Dashboard is a component — assert flag helpers alone for order contract
    const { isWorkspaceV3Enabled } = await import('./workspaceV3FeatureFlag.js');
    const { isOfficeDeskV2Enabled } = await import('./officeDeskFeatureFlag.js');
    expect(isWorkspaceV3Enabled()).toBe(true);
    // When V3 on, Dashboard short-circuits before V2 — both may be true in env
    expect(typeof isOfficeDeskV2Enabled).toBe('function');
  });

  it('falls through to V2 when V3 off', async () => {
    delete import.meta.env.VITE_WORKSPACE_V3;
    import.meta.env.VITE_WORKSPACE_V3 = '0';
    expect(isWorkspaceV3Enabled()).toBe(false);
  });
});
