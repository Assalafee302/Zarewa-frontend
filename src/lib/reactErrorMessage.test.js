import { describe, expect, it } from 'vitest';
import { humanizeReactError } from './reactErrorMessage';

describe('humanizeReactError', () => {
  it('explains missing lazy chunk files after deploy', () => {
    const msg = humanizeReactError(
      new Error('Failed to fetch dynamically imported module: https://erp.example.com/assets/AccountingDesk-DZMIFbBN.js')
    );
    expect(msg).toContain('AccountingDesk-DZMIFbBN.js');
    expect(msg).toContain('dist/');
  });

  it('does not treat a Vite source-file import failure as a dist upload miss', () => {
    const msg = humanizeReactError(
      new Error(
        'Failed to fetch dynamically imported module: http://localhost:5173/src/pages/exec/ExecutiveCommandCentre.jsx?t=1787177893227'
      )
    );
    expect(msg).toContain('ExecutiveCommandCentre.jsx');
    expect(msg).toMatch(/syntax error/i);
    expect(msg).not.toMatch(/entire dist\/ folder in one step — all assets/);
  });

  it('explains minified is-not-a-function as likely stale app-shell', () => {
    const msg = humanizeReactError(new Error('s is not a function'));
    expect(msg).toContain('stale app-shell');
    expect(msg).toContain('Hard refresh');
  });
});
