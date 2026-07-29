import { describe, expect, it } from 'vitest';
import {
  ACCOUNTING_ASSET_CATEGORY_LABELS,
  ACCOUNTING_ASSET_CATEGORY_OPTIONS,
  accountingAssetCategoryLabel,
} from './accountingAssetCategories.js';

describe('accountingAssetCategories', () => {
  it('keeps filter and detail labels aligned', () => {
    for (const opt of ACCOUNTING_ASSET_CATEGORY_OPTIONS) {
      if (opt.id === 'all') continue;
      expect(opt.label).toBe(ACCOUNTING_ASSET_CATEGORY_LABELS[opt.id]);
    }
    expect(accountingAssetCategoryLabel('plant')).toBe('Plant & machinery');
    expect(accountingAssetCategoryLabel('it')).toBe('IT equipment');
  });
});
