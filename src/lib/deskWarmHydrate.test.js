import { describe, expect, it } from 'vitest';
import {
  createDeskWarmController,
  deskRowId,
  flattenWarmPlan,
  mergeDeskRows,
  preserveWarmWindow,
  rowsFromListPayload,
} from './deskWarmHydrate';

describe('deskWarmHydrate', () => {
  it('plans the background pages and skips a list that did not fill its first page', () => {
    const pages = flattenWarmPlan({
      enabled: true,
      warmCap: 500,
      resources: [
        {
          key: 'receipts',
          pages: [
            { href: '/api/receipts?limit=100&offset=150', limit: 100 },
            { href: '/api/receipts?limit=50&offset=450', limit: 50 },
          ],
        },
        { key: 'customers' },
      ],
    });
    expect(pages.map((page) => page.href)).toEqual([
      '/api/receipts?limit=100&offset=150',
      '/api/receipts?limit=50&offset=450',
    ]);
  });

  it('keeps a warmed list when the next snapshot repeats the same first page', () => {
    const warmed = [{ id: 'R1' }, { id: 'R2' }, { id: 'R3' }];
    expect(preserveWarmWindow(warmed, [{ id: 'R1' }, { id: 'R2' }])).toBe(warmed);
    expect(preserveWarmWindow(warmed, [{ id: 'R9' }, { id: 'R1' }]).map((row) => row.id)).toEqual([
      'R9',
      'R1',
    ]);
  });

  it('appends unseen rows and keeps the first copy of an id', () => {
    expect(deskRowId({ expenseID: 'EXP-1' })).toBe('EXP-1');
    const merged = mergeDeskRows(
      [{ id: 'R1' }, { id: 'R2' }],
      [{ id: 'R2', amount: 9 }, { id: 'R3' }]
    );
    expect(merged.map((row) => row.id)).toEqual(['R1', 'R2', 'R3']);
    expect(merged[1].amount).toBeUndefined();
  });

  it('reads ledger pages from the entries key', () => {
    expect(rowsFromListPayload({ ok: true, entries: [{ id: 'L1' }] }, 'ledgerEntries')).toEqual([
      { id: 'L1' },
    ]);
  });

  it('loads the next chunks until the warm cap and stops when a page comes back short', async () => {
    const appended = [];
    const fetched = [];
    const controller = createDeskWarmController();
    controller.begin(
      {
        enabled: true,
        warmCap: 500,
        resources: [
          {
            key: 'receipts',
            warmCap: 4,
            pages: [
              { href: '/api/receipts?limit=2&offset=2', limit: 2 },
              { href: '/api/receipts?limit=2&offset=4', limit: 2 },
            ],
          },
        ],
      },
      {
        seedRows: () => [{ id: 'R1' }, { id: 'R2' }],
        fetchPage: async (href) => {
          fetched.push(href);
          if (href.includes('offset=2')) return { ok: true, receipts: [{ id: 'R3' }] };
          return { ok: true, receipts: [{ id: 'R4' }, { id: 'R5' }] };
        },
        appendRows: (key, _rows, _cap, merged) => {
          appended.push(merged.map((row) => row.id));
        },
        pause: async () => {},
      }
    );
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(fetched).toEqual(['/api/receipts?limit=2&offset=2']);
    expect(appended).toEqual([['R1', 'R2', 'R3']]);
  });
});
