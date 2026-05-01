/**
 * Physical stock register shape from your real count sheets (thin-gauge qty + kg coil book).
 *
 * Grand total from last count sheet: **97,827 kg** (aluminium by gauge + aluzinc thin + kg register blocks).
 * Next physical coil tag to assign after the highest **C/NO** in this register: **1968** (max observed **1967**).
 */

/** @typedef {{ sn: number, colour: string, coilNo: string, quantity: number }} ThinGaugeRow */
/** @typedef {{ gauge: string, subtotal: number, rows: ThinGaugeRow[] }} ThinGaugeGroup */

/** Longspan / thin gauge — grouped by gauge; grand total matches your sheet. */
export const REFERENCE_THIN_GAUGE_GROUPS = [
  {
    gauge: '0.24',
    subtotal: 23754,
    rows: [
      { sn: 36, colour: 'IV', coilNo: '1930', quantity: 2761 },
      { sn: 37, colour: 'IV', coilNo: '1888', quantity: 387 },
      { sn: 38, colour: 'IV', coilNo: '1924', quantity: 228 },
      { sn: 39, colour: 'IV', coilNo: '1577', quantity: 90 },
      { sn: 40, colour: 'GB', coilNo: '1958', quantity: 3463 },
      { sn: 41, colour: 'GB', coilNo: '1926', quantity: 3009 },
      { sn: 42, colour: 'GB', coilNo: '1928', quantity: 841 },
      { sn: 43, colour: 'GB', coilNo: '1939', quantity: 150 },
      { sn: 44, colour: 'NB', coilNo: '1954', quantity: 3060 },
      { sn: 45, colour: 'NB', coilNo: '1921', quantity: 111 },
      { sn: 46, colour: 'BG', coilNo: '1925', quantity: 858 },
      { sn: 47, colour: 'BG', coilNo: '1875', quantity: 258 },
      { sn: 48, colour: 'HMB', coilNo: '1882', quantity: 3297 },
      { sn: 49, colour: 'HMB', coilNo: '1516', quantity: 952 },
      { sn: 50, colour: 'HMB', coilNo: '1544', quantity: 262 },
      { sn: 51, colour: 'TB', coilNo: '1953', quantity: 2814 },
      { sn: 52, colour: 'TB', coilNo: '1849', quantity: 99 },
      { sn: 53, colour: 'PR', coilNo: '1890', quantity: 1114 },
    ],
  },
  {
    gauge: '0.22',
    subtotal: 5549,
    rows: [
      { sn: 54, colour: 'GB', coilNo: '1935', quantity: 1063 },
      { sn: 55, colour: 'GB', coilNo: '1806', quantity: 159 },
      { sn: 56, colour: 'IV', coilNo: '1920', quantity: 1319 },
      { sn: 57, colour: 'IV', coilNo: '1335', quantity: 95 },
      { sn: 58, colour: 'BG', coilNo: '1957', quantity: 2913 },
    ],
  },
  {
    gauge: '0.2',
    subtotal: 35133,
    rows: [
      { sn: 59, colour: 'IV', coilNo: '1961', quantity: 3331 },
      { sn: 60, colour: 'IV', coilNo: '1934', quantity: 3181 },
      { sn: 61, colour: 'IV', coilNo: '1938', quantity: 3296 },
      { sn: 62, colour: 'NB', coilNo: '1892', quantity: 2950 },
      { sn: 63, colour: 'GB', coilNo: '1960', quantity: 3304 },
      { sn: 64, colour: 'GB', coilNo: '1936', quantity: 3339 },
      { sn: 65, colour: 'GB', coilNo: '1884', quantity: 2764 },
      { sn: 66, colour: 'BG', coilNo: '1891', quantity: 2748 },
      { sn: 67, colour: 'BG', coilNo: '1883', quantity: 666 },
      { sn: 68, colour: 'TB', coilNo: '1935', quantity: 1835 },
      { sn: 69, colour: 'HMB', coilNo: '1846', quantity: 2038 },
      { sn: 70, colour: 'PG', coilNo: '1907', quantity: 2403 },
      { sn: 71, colour: 'PR', coilNo: '1962', quantity: 3278 },
    ],
  },
  {
    gauge: '0.18',
    subtotal: 8046,
    rows: [
      { sn: 72, colour: 'IV', coilNo: '1741', quantity: 156 },
      { sn: 73, colour: 'IV', coilNo: '1937', quantity: 2351 },
      { sn: 74, colour: 'GB', coilNo: '1934', quantity: 1742 },
      { sn: 75, colour: 'PR', coilNo: '1755', quantity: 1940 },
      { sn: 76, colour: 'BG', coilNo: '1819', quantity: 1283 },
      { sn: 77, colour: 'HMB', coilNo: '1731', quantity: 574 },
    ],
  },
];

export const REFERENCE_THIN_GAUGE_GRAND_TOTAL = 72482;

/** Coil register in kg (heavier lines + aluzinc book). */
export const REFERENCE_KG_REGISTER_GROUPS = [
  {
    gauge: '0.45',
    subtotalKg: 798,
    rows: [{ sn: 1, colour: 'GB', coilNo: '1399', kg: 798 }],
  },
  {
    gauge: '0.55',
    subtotalKg: 30,
    rows: [{ sn: 2, colour: 'GB', coilNo: '1441', kg: 30 }],
  },
  {
    gauge: 'F0.55',
    subtotalKg: 8344,
    rows: [
      { sn: 3, colour: 'PR', coilNo: '1963', kg: 1508 },
      { sn: 4, colour: 'PR', coilNo: '1964', kg: 1531 },
      { sn: 5, colour: 'PR', coilNo: '1965', kg: 1514 },
      { sn: 6, colour: 'PR', coilNo: '1966', kg: 526 },
      { sn: 7, colour: 'PR', coilNo: '1967', kg: 559 },
      { sn: 8, colour: 'PR', coilNo: '', kg: 758 },
      { sn: 9, colour: 'NB', coilNo: '', kg: 741 },
      { sn: 10, colour: 'NB', coilNo: '', kg: 389 },
      { sn: 11, colour: 'PR', coilNo: '1880', kg: 7 },
      { sn: 12, colour: 'BB', coilNo: '1577', kg: 8 },
      { sn: 13, colour: 'BG', coilNo: '1941', kg: 803 },
    ],
  },
  {
    gauge: '0.6',
    subtotalKg: 148,
    rows: [{ sn: 14, colour: 'IV', coilNo: '1455', kg: 148 }],
  },
  {
    gauge: '0.7',
    subtotalKg: 1004,
    rows: [
      { sn: 15, colour: 'GB', coilNo: '1866', kg: 225 },
      { sn: 16, colour: 'BG', coilNo: '1918', kg: 158 },
      { sn: 17, colour: 'IV', coilNo: '1597', kg: 101 },
      { sn: 18, colour: 'DG', coilNo: '1594', kg: 64 },
      { sn: 19, colour: 'PR', coilNo: '1552', kg: 55 },
      { sn: 20, colour: 'ST', coilNo: '1604', kg: 401 },
    ],
  },
  {
    gauge: '0.35',
    subtotalKg: 142,
    rows: [{ sn: 21, colour: 'GB', coilNo: '1896', kg: 142 }],
  },
  {
    gauge: '0.4',
    subtotalKg: 579,
    rows: [
      { sn: 22, colour: 'IV', coilNo: '1906', kg: 382 },
      { sn: 23, colour: 'DG', coilNo: '1901', kg: 197 },
    ],
  },
  {
    gauge: '0.28',
    subtotalKg: 14300,
    rows: [
      { sn: 24, colour: 'GB', coilNo: '1959', kg: 2949 },
      { sn: 25, colour: 'GB', coilNo: '1895', kg: 158 },
      { sn: 26, colour: 'GB', coilNo: '1946', kg: 176 },
      { sn: 27, colour: 'GB', coilNo: '1914', kg: 202 },
      { sn: 28, colour: 'GB', coilNo: '1619', kg: 100 },
      { sn: 29, colour: 'GB', coilNo: '1853', kg: 139 },
      { sn: 30, colour: 'IV', coilNo: '1923', kg: 4038 },
      { sn: 31, colour: 'IV', coilNo: '1929', kg: 1398 },
      { sn: 32, colour: 'IV', coilNo: '1613', kg: 110 },
      { sn: 33, colour: 'IV', coilNo: '1650', kg: 77 },
      { sn: 34, colour: 'IV', coilNo: '1893', kg: 69 },
      { sn: 35, colour: 'TB', coilNo: '1922', kg: 3169 },
      { sn: 36, colour: 'TB', coilNo: '1927', kg: 1508 },
      { sn: 37, colour: 'TB', coilNo: '1889', kg: 84 },
      { sn: 38, colour: 'BG', coilNo: '1824', kg: 123 },
    ],
  },
  {
    gauge: '0.24',
    subtotalKg: 23754,
    rows: [
      { sn: 39, colour: 'IV', coilNo: '1930', kg: 2761 },
      { sn: 40, colour: 'IV', coilNo: '1888', kg: 387 },
      { sn: 41, colour: 'IV', coilNo: '1924', kg: 228 },
      { sn: 42, colour: 'IV', coilNo: '1577', kg: 90 },
      { sn: 43, colour: 'GB', coilNo: '1958', kg: 3463 },
      { sn: 44, colour: 'GB', coilNo: '1926', kg: 3009 },
      { sn: 45, colour: 'GB', coilNo: '1928', kg: 841 },
      { sn: 46, colour: 'GB', coilNo: '1939', kg: 150 },
      { sn: 47, colour: 'NB', coilNo: '1954', kg: 3060 },
      { sn: 48, colour: 'NB', coilNo: '1921', kg: 111 },
      { sn: 49, colour: 'BG', coilNo: '1925', kg: 858 },
      { sn: 50, colour: 'BG', coilNo: '1875', kg: 258 },
      { sn: 51, colour: 'HMB', coilNo: '1882', kg: 3297 },
      { sn: 52, colour: 'HMB', coilNo: '1516', kg: 952 },
      { sn: 53, colour: 'HMB', coilNo: '1544', kg: 262 },
      { sn: 54, colour: 'TB', coilNo: '1953', kg: 2814 },
      { sn: 55, colour: 'TB', coilNo: '1849', kg: 99 },
      { sn: 56, colour: 'PR', coilNo: '1890', kg: 1114 },
    ],
  },
];

export const REFERENCE_ACCESSORIES = [
  { name: 'Nails', quantity: 10, unit: 'Cartons' },
  { name: 'Rivet', quantity: 12, unit: 'packs' },
  { name: 'Silicone', quantity: 20, unit: 'tubes' },
  { name: 'Washer', quantity: 1700, unit: 'packs' },
  { name: 'Felt', quantity: 1800, unit: 'packs' },
  { name: 'Tapping screw', quantity: 142, unit: 'cartons' },
];

export const REFERENCE_METRO_TILES = [
  { name: 'Milano C&B', detail: '27 Bundles & 8 pcs' },
  { name: 'Classic Black', detail: '70 Bundles & 18 pcs' },
  { name: 'Bond Black', detail: '82 Bundles & 9 pcs' },
  { name: 'Milano Black', detail: '53 Bundles & 10 pcs' },
  { name: 'Shingle', detail: '26 Bundles & 9 pcs' },
  { name: 'Nails', detail: '7 cartons & 4 packs' },
  { name: '1.4m Flat sheet C & B', detail: '26 pcs' },
];

/**
 * Rounded buckets for INVENTORY_PRODUCTS_MOCK (avoid double-counting thin qty vs same coils in kg book).
 * — longspanThinQty: aluzinc 0.24 + 0.22 + 0.2 + 0.18 (kg) from thin register.
 * — aluzinc028Kg: aluzinc 0.28 mm block only.
 * — heavyCoilKg: kg register excluding 0.28 & 0.24 (aluminium + aluzinc 0.35/0.4 + F0.55 finish block).
 * Sum of the three = physical grand total on the count sheet (97,827 kg).
 */
export const REFERENCE_PHYSICAL_STOCK_GRAND_TOTAL_KG = 97827;

/** Highest C/NO on the register is 1967 — use this as the next numeric coil tag when receiving. */
export const REFERENCE_NEXT_COIL_NO_AFTER_REGISTER = 1968;

export const REFERENCE_STOCK_CALIBRATION = {
  longspanThinQty: REFERENCE_THIN_GAUGE_GRAND_TOTAL,
  aluzinc028Kg: 14300,
  heavyCoilKg: 11045,
  tappingScrewCartons: 142,
};
