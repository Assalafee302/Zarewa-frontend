import { describe, it, expect } from 'vitest';
import { formatBootstrapConnectError, formatBootstrapNetworkError } from './bootstrapConnectError.js';

describe('bootstrapConnectError', () => {
  it('formats degraded startup 503 with boot hints', () => {
    const msg = formatBootstrapConnectError(503, {
      error: 'Server failed during startup.',
      bootError: 'ECONNREFUSED',
      mysqlTarget: '127.0.0.1:3306/zarewa_dev',
      fixHint: 'Run: npm run mysql:smoke',
    });
    expect(msg).toContain('Server failed during startup.');
    expect(msg).toContain('ECONNREFUSED');
    expect(msg).toContain('127.0.0.1:3306/zarewa_dev');
    expect(msg).toContain('npm run mysql:smoke');
  });

  it('formats fetch network errors for login screen', () => {
    expect(formatBootstrapNetworkError(new TypeError('Failed to fetch'))).toContain('Could not reach the API');
    expect(formatBootstrapNetworkError(new TypeError('Failed to fetch'))).toContain('erp.zarewaglobalservices.com');
  });

  it('includes bootstrap server detail on 500', () => {
    const msg = formatBootstrapConnectError(500, {
      error: 'Bootstrap failed',
      detail: 'Unknown column in field list',
    });
    expect(msg).toContain('Unknown column');
  });
});
