/**
 * Approximate mill-card hex for Zarewa coil catalogue colours.
 * Keys are `normalizeColourKey` results (grey spelling, no spaces).
 */
import { COLOUR_ALIAS_BY_KEY, normalizeColourKey } from './colourCanonicalization.js';

export const MILL_COLOUR_HEX_BY_KEY = {
  hmblue: '#1b4f8a',
  ivorybeige: '#e6d7b8',
  greybeige: '#c4b49a',
  trafficblack: '#1c1c1c',
  bushgreen: '#2f5d32',
  tcred: '#c0122c',
  pred: '#a11b2a',
  palegreen: '#8fb58a',
  nutbrown: '#5a3a24',
  nationalgreen: '#0e5c3c',
  cobaltblue: '#1a4f9c',
  canaryyellow: '#e6c200',
  zincgrey: '#8b9298',
  vandalgrey: '#5e646a',
  darkgrey: '#3a3a3a',
  winered: '#6e2a32',
  stucco: '#d8cbb0',
};

/** Catalogue names used as a visual strip (login, empty mill identity). */
export const MILL_COLOUR_STRIP_NAMES = [
  'HM Blue',
  'Ivory Beige',
  'Bush Green',
  'Nut Brown',
  'TC Red',
  'Canary Yellow',
  'Traffic Black',
  'National Green',
];

/**
 * @param {string} [rawColour]
 * @returns {string} hex or '' when unknown
 */
export function millColourHex(rawColour) {
  const key = normalizeColourKey(rawColour);
  if (!key) return '';
  if (MILL_COLOUR_HEX_BY_KEY[key]) return MILL_COLOUR_HEX_BY_KEY[key];
  const aliased = COLOUR_ALIAS_BY_KEY[key];
  if (aliased) {
    const aliasKey = normalizeColourKey(aliased);
    if (MILL_COLOUR_HEX_BY_KEY[aliasKey]) return MILL_COLOUR_HEX_BY_KEY[aliasKey];
  }
  return '';
}

/**
 * @param {string} hex
 * @returns {boolean} true when chip needs a dark border for contrast on paper
 */
export function millColourNeedsInkBorder(hex) {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return true;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.72;
}
