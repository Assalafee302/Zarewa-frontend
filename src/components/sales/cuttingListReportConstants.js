/**
 * Print preset: named page `cutting-list-a4-landscape` (A4 landscape, tight margins in `index.css`).
 * Rows-per-page was used when the report split across multiple sheets; the factory pack is now a
 * single page — this value remains for any tooling that still imports the symbol.
 */
export const CUTTING_LIST_A4_LANDSCAPE_ROWS_PER_PAGE = 24;

/** Alias for older imports; same value as {@link CUTTING_LIST_A4_LANDSCAPE_ROWS_PER_PAGE}. */
export const CUTTING_LIST_REPORT_ROWS_PER_PAGE = CUTTING_LIST_A4_LANDSCAPE_ROWS_PER_PAGE;
