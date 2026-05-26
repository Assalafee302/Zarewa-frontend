import { describe, expect, it } from 'vitest';
import { formatActorAttribution, formatStageActor } from './actorAttribution';

describe('actorAttribution', () => {
  it('formats name and timestamp', () => {
    expect(formatActorAttribution('mary okafor', '2026-05-20T14:30:00.000Z')).toBe(
      'Mary Okafor · 2026-05-20 14:30'
    );
  });

  it('returns null when name missing', () => {
    expect(formatActorAttribution('', '2026-05-20')).toBeNull();
  });

  it('prefixes stage label', () => {
    expect(
      formatStageActor({
        label: 'Quoted / prepared',
        by: 'Auwal Idris',
        atIso: '2026-05-01',
      })
    ).toBe('Quoted / prepared: Auwal Idris · 2026-05-01');
  });
});
