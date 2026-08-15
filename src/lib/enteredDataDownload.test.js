import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { downloadEnteredDataWorkbook } from './enteredDataDownload.js';

describe('downloadEnteredDataWorkbook', () => {
  const originalFetch = globalThis.fetch;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:entered-data');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it('downloads the workbook and toasts success', async () => {
    const blob = new Blob(['xlsx'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      blob: async () => blob,
      headers: {
        get: (k) =>
          k === 'Content-Disposition' ? 'attachment; filename="zarewa-entered-data-ALL-2026-08-15.xlsx"' : null,
      },
    }));
    const click = vi.fn();
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') return { href: '', download: '', click };
      return origCreate(tag);
    });
    const showToast = vi.fn();
    const ok = await downloadEnteredDataWorkbook(showToast);
    expect(ok).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('All entered data downloaded.');
  });

  it('toasts API error JSON on failure', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: 'You do not have permission for this action.' }),
      text: async () => '',
    }));
    const showToast = vi.fn();
    const ok = await downloadEnteredDataWorkbook(showToast);
    expect(ok).toBe(false);
    expect(showToast).toHaveBeenCalledWith('You do not have permission for this action.', { variant: 'error' });
  });
});
