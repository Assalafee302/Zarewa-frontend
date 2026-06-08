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
});
