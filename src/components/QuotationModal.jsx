import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PrintModalPortal } from './layout/PrintModalPortal';
import { Link } from 'react-router-dom';
import {
  X,
  Search,
  Plus,
  Trash2,
  Printer,
  ChevronDown,
  Save,
  Calendar,
  UserPlus,
  Landmark,
  Wallet,
} from 'lucide-react';
import { StaffPurchaseCreditQuotationPanel } from './sales/StaffPurchaseCreditQuotationPanel';
import { ModalFrame } from './layout/ModalFrame';
import { ModalDeskFooter, DeskFooterButton } from './layout/ModalDeskFooter';
import { Button } from './ui/button';
import { QuotationPipelineStepper } from './sales/QuotationPipelineStepper';
import { useTrackedUnsavedForm } from '../hooks/useTrackedUnsavedForm';
import { useCustomers } from '../context/CustomersContext';
import { treasuryAccountDisplayName, treasuryAccountsForWorkspace } from '../lib/treasuryAccountsStore';
import { compareGaugeLabels, compareSelectLabels } from '../lib/selectOptionSort';
import { colourSelectOptionsFromRows, PREFERRED_COIL_COLOUR_IDS } from '../lib/colourCanonicalization.js';
import {
  STONE_METER_INVENTORY_MODEL,
  STONE_PROFILE_FALLBACK,
  STONE_DEFAULT_COLOUR_KEYS,
  QUOTATION_MATERIAL_RULES_CODE,
  QUOTATION_LINE_INTEGRITY_CODE,
  applyStoneMeterMaterialChangeCleanup,
  accessoryLineAllowedForStone,
  isStoneFlatsheetQuotationLine,
  normQuoteItemKey,
  quotationLineQtyPriceEnabled,
  resolveStoneFlatsheetLengthM,
  validateQuotationLineIntegrity,
  productLineAllowedForStone,
  productLineKey,
  quotationHasFlatSheetLine,
} from '../lib/stoneCoatedQuotationPolicy';
import {
  QUOTATION_MATERIAL_HEADER_CODE,
  quotationMaterialHeaderErrorMessage,
} from '../lib/quotationMaterialHeader';
import { ZAREWA_COMPANY_ACCOUNT_NAME } from '../Data/companyQuotation';
import { formatNgn } from '../Data/mockData';
import { useToast } from '../context/ToastContext';
import { useWorkspace } from '../context/WorkspaceContext';
import {
  advanceBalanceNgn,
  loadLedgerEntries,
  recordAdvanceAppliedToQuotation,
} from '../lib/customerLedgerStore';
import { bookedPaidNgnForQuotationFromMirrors } from '../lib/liveAnalytics';
import {
  accountingPolicyV1LabelsEnabled,
} from '../lib/accountingPolicyFlags.js';
import {
  policyBalanceLabelText,
  quotationPaymentPolicySnapshot,
} from '../lib/accountingPolicyV1.js';
import { apiFetch } from '../lib/apiBase';
import { appConfirm } from '../lib/appConfirm';
import {
  isMeterSheetProductLine,
  materialKeyFromMaterialTypeRow,
  resolveMaterialWorkbookPriceFromRows,
} from '../lib/materialWorkbookQuotationPrice';
import { selectPriceListRowsAsOf, localCalendarDateIso } from '../lib/pricingAsOf';
import {
  defaultGirthMmForTrimProduct,
  isQuotationTrimProductLine,
  normQuoteProductLineName,
  quotationLineKindForProductName,
  TRIM_GIRTH_OPTIONS_MM,
} from '../lib/cuttingListBlankConsumption';
import { resolveTrimListPricePerMeterFromWorkbook } from '../lib/materialWorkbookTrimPrice';
import {
  applyWorkbookPricesToProductRows,
  productUsesWorkbookAutoPrice,
} from '../lib/quotationWorkbookPriceApply.js';
import {
  quotationBelowFloorExceptionApproved,
  quotationBelowFloorPendingMdApproval,
} from '../lib/quotationPriceException';
import { guidanceForLedgerPostFailure, isVoucherDateInLockedPeriod } from '../lib/ledgerPostingGuidance';
import { EditSecondApprovalInline } from './EditSecondApprovalInline';
import { quotationEditNeedsSecondApprovalClient } from '../lib/editApprovalUi';
import QuotationPrintView from './QuotationPrintView';
import OffcutAvailabilityPanel from './material/OffcutAvailabilityPanel';
import {
  customerPickerPrimaryLabel,
  customerPickerSubline,
  filterCustomersForPicker,
  isStaffLinkedCustomer,
} from '../lib/customerPickerSearch';

/** Master material types used on roofing quotes: coil stock + stone meter stock (not finished-good SKUs / consumables). */
const QUOTATION_MATERIAL_INVENTORY_MODELS = new Set(['coil_kg', 'stone_meter']);

const DEFAULT_PROFILES = [
  'Longspan (Indus6)',
  'Longspan (Metra)',
  'Metcoppo',
  'Stone coated',
  'Flat sheet',
  'Offcut',
  'Steptile',
  'Capping',
  'Ridge Cap',
  'Bond',
  'Milano',
  'Classic',
  'Single',
  'Shingle',
  'Roman',
  'Crimp curve',
];
const DEFAULT_GAUGES = ['0.70mm', '0.55mm', '0.45mm', '0.40mm', '0.30mm', '0.24mm'];
const DEFAULT_COLOURS = [
  'HM Blue',
  'Traffic Black',
  'TC Red',
  'Bush Green',
  'Gray Beige',
  'Ivory Beige',
  'P Red',
  'Pale Green',
  'Nut Brown',
  'Stucco',
  'National Green',
  'Cobalt Blue',
  'Canary Yellow',
  'Coloured',
  'Zinc Grey',
  'Wine Red',
  'Vandal Grey',
];
const DEFAULT_PRODUCT_ITEMS = [
  'Roofing Sheet',
  'Bargeboard',
  'Top End',
  'Gutter',
  'Eaves angle',
  'Wall Flashing',
  'Ridge Cap',
  'Capping',
  'Bottom eaves',
  'Fascia',
  'Cladding',
  'Flat sheet',
  'Stone flatsheet 1.4',
  'Stone flatsheet 1.5',
  'Stone flatsheet 2',
  'Offcut',
  'Wall eaves',
  'Coil',
];
const DEFAULT_ACCESSORY_ITEMS = [
  'Concrete nail',
  'Drive screw nail',
  'Stone nail',
  'Rivet pins',
  'Copper nail',
  'Silicone tube',
  'Tapping Screw',
  'Flash band',
  'Felt',
  'Washer',
  'Repair Kit',
  'Strapping nail',
  'Spool',
  'Hooks and bolts',
];
const DEFAULT_SERVICE_ITEMS = ['Commission', 'Transportation', 'Installation', 'Corrugation', 'Bending'];

/** Same normalization as server `pricingPolicyResolve.normKey` (used for price_list_items keys). */
function pricingNormKey(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** First numeric gauge token from quotation UI (e.g. "0.45mm" → "0.45") to match workbook `gauge_key`. */
function gaugeMmKeyFromQuotationGauge(label) {
  const s = String(label ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  const m = s.match(/^(\d+(?:\.\d+)?)/);
  return m ? m[1] : pricingNormKey(s);
}

/** Map master material type row → workbook `material_key`. */
function priceListMaterialKeyFromMeta(meta) {
  return materialKeyFromMaterialTypeRow(meta);
}

const QUOTATION_EDIT_TYPES = Object.freeze(
  [
    'Correction (typo / clerical)',
    'Customer / billing change',
    'Line items or pricing',
    'Terms, dates, or delivery',
    'Other',
  ].sort((a, b) => compareSelectLabels(a, b))
);

function formatDisplayDate(iso) {
  if (!iso || typeof iso !== 'string') return '—';
  const [y, m, d] = iso.split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

function newLineId() {
  return `L${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyOrderLine() {
  return {
    id: newLineId(),
    name: '',
    qty: '',
    unitPrice: '',
    customLine: false,
    stoneFlatsheetLengthM: '',
    girthMm: '',
    lineKind: '',
  };
}

function trimFieldsForProductName(name) {
  if (!isQuotationTrimProductLine(name)) {
    return { lineKind: '', girthMm: '' };
  }
  return {
    lineKind: quotationLineKindForProductName(name),
    girthMm: String(defaultGirthMmForTrimProduct(name)),
  };
}

function parseLineNum(s) {
  const n = Number(String(s ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function lineAmountNgn(row) {
  return parseLineNum(row.qty) * parseLineNum(row.unitPrice);
}

/** @param {{ id: string; name: string; qty: string; unitPrice: string }[]} rows */
function sumRowsNgn(rows) {
  return rows.reduce((s, r) => s + lineAmountNgn(r), 0);
}

/** Stable key for which quotation record we're editing — excludes line JSON so in-progress edits are not reset on poll. */
function quotationHydrateSignature(editData) {
  return [
    editData?.id ?? '',
    editData?.customerID ?? '',
    editData?.dateISO ?? '',
    editData?.materialTypeId ?? '',
    editData?.materialGauge ?? '',
    editData?.materialColor ?? '',
    editData?.materialDesign ?? '',
    editData?.projectName ?? '',
  ].join('\u0000');
}

function treasuryAccountListSame(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (String(a[i]?.id ?? '') !== String(b[i]?.id ?? '')) return false;
  }
  return true;
}

/** @param {unknown} raw */
function normalizeLoadedLines(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw.products;
  const a = raw.accessories;
  const s = raw.services;
  if (!Array.isArray(p) || !Array.isArray(a) || !Array.isArray(s)) return null;
  const mapRow = (r) => {
    const x = {
      id: r.id && String(r.id),
      name: String(r.name ?? ''),
      qty: r.qty != null ? String(r.qty) : '',
      unitPrice: r.unitPrice != null ? String(r.unitPrice) : '',
      customLine: r.customLine === true,
      gauge: r.gauge != null ? String(r.gauge) : '',
      colour: r.colour != null || r.color != null ? String(r.colour ?? r.color ?? '') : '',
      design: r.design != null ? String(r.design) : '',
      profile: r.profile != null ? String(r.profile) : '',
      recommendedPricePerMeter: r.recommendedPricePerMeter,
      floorPricePerMeter: r.floorPricePerMeter,
      lineKind: r.lineKind,
      girthMm: r.girthMm != null ? String(r.girthMm) : '',
      stoneFlatsheetLengthM:
        r.stoneFlatsheetLengthM != null && r.stoneFlatsheetLengthM !== ''
          ? r.stoneFlatsheetLengthM
          : '',
    };
    if (isQuotationTrimProductLine(x.name)) {
      if (!x.girthMm) x.girthMm = String(defaultGirthMmForTrimProduct(x.name));
      if (!x.lineKind) x.lineKind = quotationLineKindForProductName(x.name);
    }
    return x;
  };
  const withIds = (arr) =>
    arr.map((r) => {
      const x = mapRow(r);
      return { ...x, id: x.id || newLineId() };
    });
  return {
    products: withIds(p),
    accessories: withIds(a),
    services: withIds(s),
  };
}

function rowsForPrint(rows, placeholderWhenEmpty = true) {
  const filled = rows.filter((r) => String(r.name ?? '').trim());
  if (filled.length === 0) {
    return placeholderWhenEmpty ? [{ name: '—', qty: 0, unitPrice: 0, value: 0 }] : [];
  }
  return filled.map((r) => {
    const qty = parseLineNum(r.qty);
    const unitPrice = parseLineNum(r.unitPrice);
    const value = qty * unitPrice;
    return { name: String(r.name).trim(), qty, unitPrice, value };
  });
}

function quotationRulesErrorMessage(data) {
  if (data?.code === QUOTATION_MATERIAL_HEADER_CODE) {
    return quotationMaterialHeaderErrorMessage(data);
  }
  if (data?.code === QUOTATION_LINE_INTEGRITY_CODE) {
    return data.error || 'Complete every line item (select product before quantity and price).';
  }
  if (!data || data.code !== QUOTATION_MATERIAL_RULES_CODE) return data?.error || '';
  const d = data.details || {};
  const bits = [data.error].filter(Boolean);
  if (d.invalidHeader?.profile) bits.push('(Profile invalid)');
  if (d.invalidHeader?.gauge) bits.push('(Gauge invalid)');
  if (d.invalidHeader?.colour) bits.push('(Colour invalid)');
  if (Array.isArray(d.stoneFlatsheetLengthMissing) && d.stoneFlatsheetLengthMissing.length) {
    bits.push('(Stone flatsheet: choose 1.4 m, 1.5 m, or 2 m — product name or length per line)');
  }
  return bits.join(' ');
}

function materialHeaderIncompleteMessage(materialTypeId, materialGauge, materialColor, materialDesign) {
  if (!String(materialTypeId ?? '').trim()) return 'Select material type — required on every quotation.';
  if (!String(materialGauge ?? '').trim()) return 'Select gauge — required on every quotation.';
  if (!String(materialColor ?? '').trim()) return 'Select colour — required on every quotation.';
  if (!String(materialDesign ?? '').trim()) return 'Select profile — required on every quotation.';
  return '';
}

function quoteItemUnitIsArea(unit) {
  const s = String(unit || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
  return s === 'm2' || s === 'm²' || s === 'sqm' || s === 'sq.m' || s === 'm^2';
}

function stoneQuoteProductOptionLabel(name) {
  const n = String(name || '').trim();
  if (!n) return n;
  if (isStoneFlatsheetQuotationLine(n)) return n;
  const key = productLineKey(n);
  if (key === 'flat sheet' || key === 'roofing sheet') return `${n} (metres)`;
  return n;
}

/** @param {ReturnType<typeof normalizeOptionItems>} options */
function groupStoneQuoteProductOptions(options) {
  const flatsheet = [];
  const metres = [];
  for (const opt of options) {
    if (isStoneFlatsheetQuotationLine(opt.name)) flatsheet.push(opt);
    else metres.push(opt);
  }
  return { flatsheet, metres };
}

function normalizeOptionItems(optionItems) {
  return (optionItems || []).map((item) => {
    if (typeof item === 'string') {
      return {
        id: item,
        name: item,
        defaultUnitPriceNgn: 0,
        unit: '',
      };
    }
    return {
      id: item.id || item.name,
      name: item.name || '',
      defaultUnitPriceNgn: Number(item.defaultUnitPriceNgn) || 0,
      unit: String(item.unit || '').trim(),
    };
  });
}

function OrderLinesSection({
  title,
  optionItems,
  rows,
  setRows,
  readOnly,
  resolveUnitPrice,
  resolveWorkbookLineMeta,
  showStoneFlatsheetLength = false,
  stoneProductOptgroups = false,
  stoneFlatsheetIssueLines = [],
}) {
  const addRow = () => setRows((prev) => [...prev, emptyOrderLine()]);
  const updateRow = (id, patch) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRow = (id) =>
    setRows((prev) => (prev.length <= 1 ? [emptyOrderLine()] : prev.filter((r) => r.id !== id)));
  const normalizedOptions = normalizeOptionItems(optionItems);
  const stoneOptionGroups = stoneProductOptgroups ? groupStoneQuoteProductOptions(normalizedOptions) : null;
  const anyStoneFlatsheetRow =
    showStoneFlatsheetLength &&
    title === 'Products' &&
    rows.some((r) => isStoneFlatsheetQuotationLine(String(r?.name || '')));
  const anyTrimRow =
    title === 'Products' && rows.some((r) => isQuotationTrimProductLine(String(r?.name || '')));

  return (
    <div className="mb-5">
      <div className="mb-2 px-0.5">
        <h3 className="text-ui-xs font-semibold text-zarewa-teal uppercase tracking-widest">{title}</h3>
      </div>

      {stoneFlatsheetIssueLines.length > 0 ? (
        <div className="mb-2 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-2 text-ui-xs text-amber-950">
          <p className="font-bold uppercase tracking-wide">Stone flatsheet — fix before production</p>
          <ul className="mt-1 list-disc pl-4 space-y-0.5">
            {stoneFlatsheetIssueLines.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="bg-slate-50/80 rounded-xl p-3 sm:p-4 border border-slate-200/90">
        {readOnly ? (
          <ul className="space-y-2">
            {(rows.some((r) => r.name?.trim())
              ? rows.filter((r) => r.name?.trim())
              : []
            ).map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100/90 pb-2 text-xs last:border-0"
              >
                <span className="font-semibold text-zarewa-teal">
                  {row.name?.trim() || '—'}
                  {showStoneFlatsheetLength &&
                  isStoneFlatsheetQuotationLine(row.name) &&
                  resolveStoneFlatsheetLengthM(row) != null
                    ? ` · ${resolveStoneFlatsheetLengthM(row)} m`
                    : null}
                  {title === 'Products' && isQuotationTrimProductLine(row.name) && row.girthMm
                    ? ` · ${row.girthMm} mm`
                    : null}
                </span>
                <span className="tabular-nums text-slate-600">
                  {row.qty || '0'} × {formatNgn(parseLineNum(row.unitPrice))} ={' '}
                  <span className="font-bold text-zarewa-teal">{formatNgn(lineAmountNgn(row))}</span>
                </span>
              </li>
            ))}
            {!rows.some((r) => r.name?.trim()) ? (
              <li className="text-xs text-slate-400 italic">No line items</li>
            ) : null}
          </ul>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2 px-1 text-ui-xs font-semibold text-slate-400 uppercase tracking-wider min-w-0">
              <div className="min-w-0 flex-1">Item</div>
              {showStoneFlatsheetLength && title === 'Products' ? (
                <div className="w-[4.25rem] shrink-0 text-center">Len</div>
              ) : null}
              {anyTrimRow ? <div className="w-[3.75rem] shrink-0 text-center">Width</div> : null}
              <div className="w-14 sm:w-16 shrink-0 text-center">{anyStoneFlatsheetRow ? 'Qty m²' : 'Qty'}</div>
              <div className="w-[4.25rem] sm:w-24 shrink-0 text-center">Unit ₦</div>
              <div className="w-[5.25rem] sm:w-28 shrink-0 text-right tabular-nums">Amount</div>
              <div className="w-[4.5rem] shrink-0" aria-hidden />
            </div>

            {rows.map((row, idx) => {
              const isLast = idx === rows.length - 1;
              const amt = lineAmountNgn(row);
              const matchedOption =
                normalizedOptions.find((option) => option.name === row.name) || null;
              const isCustomLine =
                row.customLine === true ||
                (Boolean(String(row.name || '').trim()) && !matchedOption);
              const isStoneFlatsheetRow =
                showStoneFlatsheetLength &&
                title === 'Products' &&
                isStoneFlatsheetQuotationLine(String(row.name || ''));
              const needsStoneFlatsheetLengthPicker =
                isStoneFlatsheetRow && normQuoteItemKey(String(row.name || '')) === 'stone flatsheet';
              const isTrimRow = title === 'Products' && isQuotationTrimProductLine(String(row.name || ''));
              const qtyPriceEnabled = quotationLineQtyPriceEnabled(row, {
                requireStoneLength: showStoneFlatsheetLength && title === 'Products',
              });
              return (
                <div
                  key={row.id}
                  className="flex items-center gap-2 mb-2 last:mb-0 border-b border-slate-100/80 pb-2 last:border-0 last:pb-0 min-w-0"
                >
                  <div className="min-w-0 flex-1 flex items-center gap-1.5">
                    {isCustomLine ? (
                      <>
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => {
                            const nm = e.target.value;
                            const patch = { name: nm, customLine: true };
                            if (
                              showStoneFlatsheetLength &&
                              title === 'Products' &&
                              productLineKey(nm) !== 'stone flatsheet'
                            ) {
                              patch.stoneFlatsheetLengthM = '';
                            }
                            if (title === 'Products') {
                              Object.assign(patch, trimFieldsForProductName(nm));
                            }
                            updateRow(row.id, patch);
                          }}
                          placeholder="Custom name"
                          title="Custom line item"
                          className="min-w-0 flex-1 bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs font-semibold text-zarewa-teal outline-none focus:ring-2 focus:ring-zarewa-teal/10"
                        />
                        <button
                          type="button"
                          title="Choose from price list"
                          onClick={() =>
                            updateRow(row.id, {
                              customLine: false,
                              name: matchedOption ? row.name : '',
                              stoneFlatsheetLengthM: '',
                            })
                          }
                          className="shrink-0 text-ui-xs font-semibold text-zarewa-teal underline decoration-zarewa-teal/30 underline-offset-2 hover:text-[#0f3d39] whitespace-nowrap"
                        >
                          List
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="relative min-w-0 flex-1">
                          <select
                            value={matchedOption?.id || ''}
                            onChange={(e) => {
                              const option = normalizedOptions.find((item) => item.id === e.target.value);
                              const nextName = option?.name || '';
                              const trimMeta =
                                title === 'Products' ? trimFieldsForProductName(nextName) : { girthMm: '' };
                              const suggestedPrice =
                                typeof resolveUnitPrice === 'function'
                                  ? resolveUnitPrice(nextName, option || null, { girthMm: trimMeta.girthMm })
                                  : option?.defaultUnitPriceNgn || 0;
                              const wbMeta =
                                typeof resolveWorkbookLineMeta === 'function'
                                  ? resolveWorkbookLineMeta(nextName)
                                  : null;
                              const lmPick = resolveStoneFlatsheetLengthM({ name: nextName });
                              const isSfLine = isStoneFlatsheetQuotationLine(nextName);
                              const keepLen =
                                showStoneFlatsheetLength && title === 'Products' && isSfLine;
                              updateRow(row.id, {
                                customLine: false,
                                name: nextName,
                                unitPrice:
                                  suggestedPrice > 0
                                    ? String(suggestedPrice)
                                    : option?.defaultUnitPriceNgn > 0
                                      ? String(option.defaultUnitPriceNgn)
                                      : row.unitPrice,
                                ...(wbMeta?.floorPerMeter
                                  ? { floorPricePerMeter: wbMeta.floorPerMeter }
                                  : {}),
                                ...(wbMeta?.suggestedListPerMeter
                                  ? { recommendedPricePerMeter: wbMeta.suggestedListPerMeter }
                                  : {}),
                                stoneFlatsheetLengthM: keepLen
                                  ? lmPick != null
                                    ? lmPick
                                    : normQuoteItemKey(nextName) === 'stone flatsheet'
                                      ? row.stoneFlatsheetLengthM
                                      : ''
                                  : '',
                                ...(title === 'Products' ? trimMeta : {}),
                              });
                            }}
                            className="w-full min-w-0 bg-white border border-slate-200 rounded-lg py-1.5 pl-2 pr-7 text-xs font-semibold text-zarewa-teal appearance-none outline-none focus:ring-2 focus:ring-zarewa-teal/15 cursor-pointer"
                          >
                            <option value="">Choose…</option>
                            {stoneOptionGroups ? (
                              <>
                                {stoneOptionGroups.flatsheet.length ? (
                                  <optgroup label="Stone flatsheet (m²)">
                                    {stoneOptionGroups.flatsheet.map((option) => (
                                      <option key={option.id} value={option.id}>
                                        {option.name}
                                      </option>
                                    ))}
                                  </optgroup>
                                ) : null}
                                {stoneOptionGroups.metres.length ? (
                                  <optgroup label="Stone trim & roofing (metres) — not stone flatsheet">
                                    {stoneOptionGroups.metres.map((option) => (
                                      <option key={option.id} value={option.id}>
                                        {stoneQuoteProductOptionLabel(option.name)}
                                      </option>
                                    ))}
                                  </optgroup>
                                ) : null}
                              </>
                            ) : (
                              normalizedOptions.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.name}
                                </option>
                              ))
                            )}
                          </select>
                          <ChevronDown
                            size={12}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"
                          />
                        </div>
                        <button
                          type="button"
                          title="Type a custom line item"
                          onClick={() => updateRow(row.id, { customLine: true })}
                          className="shrink-0 text-ui-xs font-semibold text-zarewa-teal underline decoration-zarewa-teal/30 underline-offset-2 hover:text-[#0f3d39] whitespace-nowrap"
                        >
                          Custom
                        </button>
                      </>
                    )}
                  </div>
                  {showStoneFlatsheetLength && title === 'Products' ? (
                    <div className="w-[4.25rem] shrink-0">
                      {needsStoneFlatsheetLengthPicker ? (
                        <select
                          aria-label="Stone flatsheet length"
                          value={
                            row.stoneFlatsheetLengthM === 1.4 || row.stoneFlatsheetLengthM === '1.4'
                              ? '1.4'
                              : row.stoneFlatsheetLengthM === 1.5 || row.stoneFlatsheetLengthM === '1.5'
                                ? '1.5'
                                : row.stoneFlatsheetLengthM === 2 ||
                                    row.stoneFlatsheetLengthM === '2' ||
                                    row.stoneFlatsheetLengthM === '2.0'
                                  ? '2'
                                  : ''
                          }
                          onChange={(e) => {
                            const v = e.target.value;
                            const len =
                              v === '1.4' ? 1.4 : v === '1.5' ? 1.5 : v === '2' ? 2 : '';
                            const patch = {
                              stoneFlatsheetLengthM: len === '' ? '' : len,
                            };
                            if (len !== '' && normQuoteItemKey(String(row.name || '')) === 'stone flatsheet') {
                              patch.name = `Stone flatsheet ${len}`;
                            }
                            updateRow(row.id, patch);
                          }}
                          className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-1 pr-1 text-ui-xs font-semibold text-zarewa-teal outline-none focus:ring-2 focus:ring-zarewa-teal/15"
                        >
                          <option value="">—</option>
                          <option value="1.4">1.4 m</option>
                          <option value="1.5">1.5 m</option>
                          <option value="2">2 m</option>
                        </select>
                      ) : (
                        <div className="h-8" aria-hidden />
                      )}
                    </div>
                  ) : null}
                  {anyTrimRow ? (
                    <div className="w-[3.75rem] shrink-0">
                      {isTrimRow ? (
                        <select
                          aria-label="Trim strip width mm"
                          title="Strip width on 1200 mm coil blank"
                          value={row.girthMm || String(defaultGirthMmForTrimProduct(row.name))}
                          onChange={(e) => {
                            const girthMm = e.target.value;
                            const suggestedPrice =
                              typeof resolveUnitPrice === 'function'
                                ? resolveUnitPrice(row.name, matchedOption, { girthMm })
                                : 0;
                            updateRow(row.id, {
                              girthMm,
                              ...(suggestedPrice > 0 ? { unitPrice: String(suggestedPrice) } : {}),
                            });
                          }}
                          className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-1 pr-1 text-ui-xs font-semibold text-zarewa-teal outline-none focus:ring-2 focus:ring-zarewa-teal/15"
                        >
                          {TRIM_GIRTH_OPTIONS_MM.map((mm) => (
                            <option key={mm} value={String(mm)}>
                              {mm}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="h-8" aria-hidden />
                      )}
                    </div>
                  ) : null}
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    disabled={!qtyPriceEnabled}
                    title={
                      !qtyPriceEnabled
                        ? needsStoneFlatsheetLengthPicker
                          ? 'Select stone flatsheet product and length before entering m²'
                          : 'Select a product before entering quantity'
                        : isStoneFlatsheetRow
                          ? 'Quantity in square metres (m²) for stone flatsheet'
                          : quoteItemUnitIsArea(matchedOption?.unit)
                            ? 'Quantity in square metres (m²) for this price-list item'
                            : undefined
                    }
                    value={row.qty}
                    onChange={(e) => updateRow(row.id, { qty: e.target.value })}
                    className={`w-14 sm:w-16 shrink-0 border py-1.5 px-1 rounded-lg text-xs text-center font-semibold outline-none tabular-nums ${
                      qtyPriceEnabled
                        ? 'bg-white border-slate-200 text-zarewa-teal'
                        : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                    placeholder={isStoneFlatsheetRow ? 'm²' : '0'}
                  />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    disabled={!qtyPriceEnabled}
                    title={(() => {
                      if (!qtyPriceEnabled) {
                        return needsStoneFlatsheetLengthPicker
                          ? 'Select stone flatsheet product and length before entering unit price'
                          : 'Select a product before entering unit price';
                      }
                      const wb =
                        typeof resolveWorkbookLineMeta === 'function'
                          ? resolveWorkbookLineMeta(row.name)
                          : null;
                      if (!wb?.floorPerMeter) return undefined;
                      return `Workbook floor ${formatNgn(wb.floorPerMeter)}/m · suggested list ${formatNgn(wb.suggestedListPerMeter)}/m (floor + commission)`;
                    })()}
                    value={row.unitPrice}
                    onChange={(e) => updateRow(row.id, { unitPrice: e.target.value })}
                    className={`w-[4.25rem] sm:w-24 shrink-0 border py-1.5 px-1 rounded-lg text-xs text-center font-semibold outline-none tabular-nums ${
                      qtyPriceEnabled
                        ? 'bg-white border-slate-200 text-zarewa-teal'
                        : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  />
                  <div className="w-[5.25rem] sm:w-28 shrink-0 text-right pr-0.5 sm:pr-1 text-ui-xs sm:text-xs font-bold text-zarewa-teal tabular-nums leading-tight">
                    {formatNgn(amt)}
                  </div>
                  <div className="w-[4.5rem] shrink-0 flex justify-end items-center gap-0.5">
                    <button
                      type="button"
                      title="Remove line"
                      onClick={() => removeRow(row.id)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                    {isLast ? (
                      <button
                        type="button"
                        title={`Add ${title.endsWith('s') ? title.slice(0, -1) : title}`}
                        onClick={addRow}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zarewa-teal/25 bg-teal-50/80 text-zarewa-teal hover:bg-teal-100 transition-colors"
                      >
                        <Plus size={16} strokeWidth={2.5} />
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * @param {object} props
 * @param {'view' | 'edit'} [props.accessMode]
 * @param {string} [props.quotedByStaff] — workspace staff label for new quotations (print + audit)
 * @param {boolean} [props.useQuotationApi] — persist create/update to SQLite via POST/PATCH /api/quotations
 * @param {(quotation: object) => void} [props.onQuotationRevived] — after POST /api/quotations/:id/revive
 * @param {() => void} [props.onRequestNewCustomer] — open stacked new-customer form without leaving the quote
 * @param {{ customerID: string; name: string; phoneNumber: string } | null} [props.externalCustomerPick]
 * @param {() => void} [props.onConsumeExternalCustomerPick]
 */
const QuotationModal = ({
  isOpen,
  onClose,
  editData,
  accessMode = 'edit',
  onLedgerChange,
  onQuotationRevived,
  useLedgerApi = false,
  useQuotationApi = false,
  quotedByStaff = 'Sales',
  onRequestNewCustomer,
  externalCustomerPick = null,
  onConsumeExternalCustomerPick,
}) => {
  const { customers } = useCustomers();
  const { show: showToast } = useToast();
  const ws = useWorkspace();
  const wsHasPermission = ws?.hasPermission;
  const archivedLifecycle =
    Boolean(editData?.id) && ['Expired', 'Void'].includes(String(editData?.status || '').trim());
  const readOnly = accessMode === 'view' || archivedLifecycle;
  /** View mode: allow fixing material lines in JSON without resending `lines` (totals / payments unchanged). */
  const allowMaterialSpecCorrectionInView =
    readOnly &&
    accessMode === 'view' &&
    !archivedLifecycle &&
    Boolean(editData?.id) &&
    useQuotationApi &&
    Boolean(ws?.canMutate);
  const materialFieldsLocked = readOnly && !allowMaterialSpecCorrectionInView;

  const [customerQuery, setCustomerQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [pickedCustomerInline, setPickedCustomerInline] = useState(null);
  const [customerListOpen, setCustomerListOpen] = useState(false);
  const customerBlurTimer = useRef(null);

  const [productRows, setProductRows] = useState(() => [emptyOrderLine()]);
  const [accessoryRows, setAccessoryRows] = useState(() => [emptyOrderLine()]);
  const [serviceRows, setServiceRows] = useState(() => [emptyOrderLine()]);

  const [quotationEditType, setQuotationEditType] = useState('');
  const [treasuryPayAccounts, setTreasuryPayAccounts] = useState([]);
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [materialTypeId, setMaterialTypeId] = useState('');
  const [materialGauge, setMaterialGauge] = useState('');
  const [materialColor, setMaterialColor] = useState('');
  const [materialDesign, setMaterialDesign] = useState('');
  const [quoteDate, setQuoteDate] = useState(() => localCalendarDateIso());
  const [projectName, setProjectName] = useState('');
  const [showPrint, setShowPrint] = useState(false);
  const [printDocumentKind, setPrintDocumentKind] = useState('quotation');
  const [applyAdvanceAmount, setApplyAdvanceAmount] = useState('');
  const [applyAdvanceHint, setApplyAdvanceHint] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savingMaterial, setSavingMaterial] = useState(false);
  const [reviving, setReviving] = useState(false);
  const [mdApproving, setMdApproving] = useState(false);
  const [quotationEditApprovalId, setQuotationEditApprovalId] = useState('');
  const liveMasterData = ws?.snapshot?.masterData ?? null;
  const priceListItemsAll = useMemo(
    () => (Array.isArray(ws?.snapshot?.priceListItems) ? ws.snapshot.priceListItems : []),
    [ws?.snapshot?.priceListItems]
  );
  /** Published list as-of quote date (matches server gates / refunds). */
  const priceListItems = useMemo(
    () => selectPriceListRowsAsOf(priceListItemsAll, quoteDate),
    [priceListItemsAll, quoteDate]
  );
  const materialPricingRows = useMemo(
    () => (Array.isArray(ws?.snapshot?.materialPricingRows) ? ws.snapshot.materialPricingRows : []),
    [ws?.snapshot?.materialPricingRows]
  );
  const pricingRidgeAddOns = useMemo(
    () => (Array.isArray(ws?.snapshot?.pricingRidgeAddOns) ? ws.snapshot.pricingRidgeAddOns : []),
    [ws?.snapshot?.pricingRidgeAddOns]
  );
  const quotationBranchId = useMemo(
    () =>
      String(
        editData?.branchId ?? ws?.session?.currentBranchId ?? ws?.session?.branchId ?? ''
      ).trim(),
    [editData?.branchId, ws?.session?.currentBranchId, ws?.session?.branchId]
  );
  const [ridgeAddOnsFallback, setRidgeAddOnsFallback] = useState([]);
  const ridgeAddOnsEffective = useMemo(
    () => (pricingRidgeAddOns.length ? pricingRidgeAddOns : ridgeAddOnsFallback),
    [pricingRidgeAddOns, ridgeAddOnsFallback]
  );
  const lastQuotationHydrateSigRef = useRef('');
  const prevMaterialTypeIdForStoneRef = useRef(null);
  const skipWorkbookPriceRefreshRef = useRef(true);

  const quotationHydrateSig = useMemo(
    () =>
      isOpen
        ? quotationHydrateSignature({
            id: editData?.id,
            customerID: editData?.customerID,
            dateISO: editData?.dateISO,
            materialTypeId: editData?.materialTypeId,
            materialGauge: editData?.materialGauge,
            materialColor: editData?.materialColor,
            materialDesign: editData?.materialDesign,
            projectName: editData?.projectName,
            quotationLines: editData?.quotationLines,
          })
        : '',
    [
      isOpen,
      editData?.id,
      editData?.customerID,
      editData?.dateISO,
      editData?.materialTypeId,
      editData?.materialGauge,
      editData?.materialColor,
      editData?.materialDesign,
      editData?.projectName,
      editData?.quotationLines,
    ]
  );

  const { captureEdited, wrapClose, abandonUnsavedAndRun } = useTrackedUnsavedForm('modal-quotation', {
    isOpen,
    blockTracking: materialFieldsLocked,
    hydrateKey: quotationHydrateSig,
  });
  const handleClose = wrapClose(() => onClose());

  const treasuryPayAccountsLive = useMemo(() => {
    const raw =
      treasuryAccountsForWorkspace(ws?.snapshot, ws?.session, {
        branchScope: ws?.branchScope,
        viewAllBranches: ws?.viewAllBranches,
      }) || [];
    return [...raw].sort((a, b) =>
      compareSelectLabels(treasuryAccountDisplayName(a), treasuryAccountDisplayName(b))
    );
  }, [
    ws?.branchScope,
    ws?.viewAllBranches,
    ws?.snapshot,
    ws?.session,
  ]);

  const materialTypeOptions = useMemo(() => {
    const rows = (liveMasterData?.materialTypes || [])
      .filter((row) => row.active)
      .filter((row) => QUOTATION_MATERIAL_INVENTORY_MODELS.has(String(row.inventoryModel || 'coil_kg').trim()));
    return rows
      .map((row) => ({ value: row.id, label: row.name, inventoryModel: row.inventoryModel || '' }))
      .sort((a, b) => compareSelectLabels(a.label, b.label));
  }, [liveMasterData?.materialTypes]);

  const isStoneMeter = useMemo(() => {
    const inv = String(
      liveMasterData?.materialTypes?.find((row) => row.id === materialTypeId)?.inventoryModel || ''
    ).trim();
    return inv === STONE_METER_INVENTORY_MODEL;
  }, [liveMasterData?.materialTypes, materialTypeId]);

  /** Filter profiles by selected material type (stone vs coil). */
  const profileOptions = useMemo(() => {
    const stoneAllowKeys = new Set(STONE_PROFILE_FALLBACK.map(normQuoteItemKey));
    const fromMaster = (liveMasterData?.profiles || []).filter((row) => row.active);
    const filtered = materialTypeId
      ? fromMaster.filter((row) => String(row.materialTypeId || '').trim() === materialTypeId)
      : fromMaster;
    const baseOpts = filtered
      .map((row) => ({ value: row.name, label: row.name }))
      .sort((a, b) => compareSelectLabels(a.label, b.label));

    if (isStoneMeter) {
      let opts = baseOpts.filter((o) => stoneAllowKeys.has(normQuoteItemKey(o.value)));
      const activePriceList = Array.isArray(liveMasterData?.priceList)
        ? liveMasterData.priceList.filter((row) => row.active)
        : [];
      const activeMaterialPl = materialTypeId
        ? activePriceList.filter((r) => String(r.materialTypeId || '').trim() === materialTypeId)
        : [];
      const profileIdSet = new Set(
        activeMaterialPl.map((r) => String(r.profileId || '').trim()).filter(Boolean)
      );
      if (profileIdSet.size > 0 && opts.length > 0) {
        const byId = new Map(
          (liveMasterData?.profiles || []).map((p) => [String(p.id || '').trim(), p.name])
        );
        const allowedFromPrice = new Set(
          [...profileIdSet].map((id) => normQuoteItemKey(byId.get(id))).filter(Boolean)
        );
        const narrowed = opts.filter((o) => allowedFromPrice.has(normQuoteItemKey(o.value)));
        if (narrowed.length) opts = narrowed;
      }
      if (!opts.length) {
        return [...STONE_PROFILE_FALLBACK]
          .sort((a, b) => compareSelectLabels(a, b))
          .map((name) => ({
            value: name,
            label: name,
          }));
      }
      return [...opts].sort((a, b) => compareSelectLabels(a.label, b.label));
    }

    if (baseOpts.length > 0) return baseOpts;
    return [...DEFAULT_PROFILES]
      .sort((a, b) => compareSelectLabels(a, b))
      .map((name) => ({
        value: name,
        label: name,
      }));
  }, [liveMasterData?.profiles, liveMasterData?.priceList, materialTypeId, isStoneMeter]);

  const gaugeOptions = useMemo(() => {
    const fromMaster = (liveMasterData?.gauges || [])
      .filter((row) => row.active)
      .map((row) => ({ value: row.label, label: row.label, id: row.id }))
      .sort((a, b) => compareGaugeLabels(a.label, b.label));
    const base =
      fromMaster.length > 0
        ? fromMaster
        : [...DEFAULT_GAUGES]
            .sort((a, b) => compareGaugeLabels(a, b))
            .map((label) => ({
              value: label,
              label,
              id: undefined,
            }));

    if (!isStoneMeter || !materialTypeId) return base;

    const activePriceList = Array.isArray(liveMasterData?.priceList)
      ? liveMasterData.priceList.filter((row) => row.active)
      : [];
    const gaugeIds = new Set(
      activePriceList
        .filter((r) => String(r.materialTypeId || '').trim() === materialTypeId)
        .map((r) => String(r.gaugeId || '').trim())
        .filter(Boolean)
    );
    if (!gaugeIds.size) return base;
    const narrowed = base.filter((g) => g.id && gaugeIds.has(String(g.id).trim()));
    return narrowed.length ? narrowed : base;
  }, [liveMasterData?.gauges, liveMasterData?.priceList, isStoneMeter, materialTypeId]);

  const colourOptions = useMemo(() => {
    const fromMaster = colourSelectOptionsFromRows(liveMasterData?.colours || [], liveMasterData).map(
      (row) => ({
        value: row.value,
        label: row.label,
        id: row.id,
      })
    );
    const base = (
      fromMaster.length > 0
        ? fromMaster
        : [...DEFAULT_COLOURS].sort((a, b) => compareSelectLabels(a, b)).map((name) => ({
            value: name,
            label: name,
            id: undefined,
          }))
    ).sort((a, b) => compareSelectLabels(a.label, b.label));
    const inv = String(
      liveMasterData?.materialTypes?.find((row) => row.id === materialTypeId)?.inventoryModel || ''
    ).trim();
    if (!materialTypeId) return base;

    if (inv === 'coil_kg') {
      const preferred = base.filter(
        (c) => c.id && PREFERRED_COIL_COLOUR_IDS.has(String(c.id).trim())
      );
      if (preferred.length) {
        return [...preferred].sort((a, b) => compareSelectLabels(a.label, b.label));
      }

      const activePriceList = Array.isArray(liveMasterData?.priceList)
        ? liveMasterData.priceList.filter((row) => row.active)
        : [];
      const colourIds = new Set(
        activePriceList
          .filter((r) => String(r.materialTypeId || '').trim() === materialTypeId)
          .map((r) => String(r.colourId || '').trim())
          .filter(Boolean)
      );
      if (colourIds.size) {
        const byPriceList = base.filter((c) => c.id && colourIds.has(String(c.id).trim()));
        if (byPriceList.length) {
          return [...byPriceList].sort((a, b) => compareSelectLabels(a.label, b.label));
        }
      }

      const coilOnly = base.filter((c) => !STONE_DEFAULT_COLOUR_KEYS.has(normQuoteItemKey(c.value)));
      return [...(coilOnly.length ? coilOnly : base)].sort((a, b) =>
        compareSelectLabels(a.label, b.label)
      );
    }

    if (inv !== STONE_METER_INVENTORY_MODEL) return base;

    const activePriceList = Array.isArray(liveMasterData?.priceList)
      ? liveMasterData.priceList.filter((row) => row.active)
      : [];
    const activeMaterialPl = activePriceList.filter(
      (r) => String(r.materialTypeId || '').trim() === materialTypeId
    );
    const ids = new Set(
      activeMaterialPl.map((r) => String(r.colourId || '').trim()).filter(Boolean)
    );

    const mtMeta = liveMasterData?.materialTypes?.find((row) => row.id === materialTypeId) || null;
    const mtKey = priceListMaterialKeyFromMeta(mtMeta);
    const workbookKeys = new Set();
    const branchId = String(editData?.branchId ?? '').trim();
    if (mtKey && priceListItems.length > 0) {
      for (const row of priceListItems) {
        const rmt = String(row.materialTypeKey ?? '').trim().toLowerCase();
        if (rmt && mtKey && rmt !== mtKey && !mtKey.includes(rmt) && !rmt.includes(mtKey)) continue;
        const rb = String(row.branchId ?? '').trim();
        if (rb && branchId && rb !== branchId) continue;
        const ck = String(row.colourKey ?? '').trim();
        if (!ck) continue;
        const n = Math.round(Number(row.unitPricePerMeterNgn) || 0);
        if (n <= 0) continue;
        workbookKeys.add(pricingNormKey(ck));
      }
    }

    const hasSetup = ids.size > 0;
    const hasWb = workbookKeys.size > 0;
    if (!hasSetup && !hasWb) {
      const narrowedDefault = base.filter((c) => STONE_DEFAULT_COLOUR_KEYS.has(normQuoteItemKey(c.value)));
      const use = narrowedDefault.length ? narrowedDefault : base;
      return [...use].sort((a, b) => compareSelectLabels(a.label, b.label));
    }

    const bySetup = (c) => Boolean(c.id) && ids.has(String(c.id).trim());
    const byWb = (c) => workbookKeys.has(pricingNormKey(c.value));
    let filtered;
    if (hasSetup && hasWb) filtered = base.filter((c) => bySetup(c) || byWb(c));
    else if (hasSetup) filtered = base.filter(bySetup);
    else filtered = base.filter(byWb);

    const narrowed = filtered.length ? filtered : base;
    return [...narrowed].sort((a, b) => compareSelectLabels(a.label, b.label));
  }, [
    liveMasterData?.colours,
    liveMasterData?.materialTypes,
    liveMasterData?.priceList,
    materialTypeId,
    priceListItems,
    quotationBranchId,
  ]);

  const quoteItemRowsActive = useMemo(
    () => (liveMasterData?.quoteItems || []).filter((row) => row.active),
    [liveMasterData?.quoteItems]
  );

  const mergeQuoteLineOptions = useCallback(
    (itemType, defaultNames) => {
      const fromMaster = quoteItemRowsActive
        .filter((row) => row.itemType === itemType)
        .map((row) => ({
          id: row.id,
          name: row.name,
          defaultUnitPriceNgn: row.defaultUnitPriceNgn,
          unit: String(row.unit || '').trim(),
        }));
      const seen = new Set(fromMaster.map((x) => x.name.trim().toLowerCase()));
      const slug = (s) =>
        String(s)
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
      const extras = defaultNames
        .filter((name) => !seen.has(name.trim().toLowerCase()))
        .map((name, idx) => ({
          id: `preset-${itemType}-${slug(name) || `n${idx}`}`,
          name,
          defaultUnitPriceNgn: 0,
          unit: '',
        }));
      return [...fromMaster, ...extras].sort((a, b) => compareSelectLabels(a.name, b.name));
    },
    [quoteItemRowsActive]
  );

  const hasFlatSheetLine = useMemo(
    () => (isStoneMeter ? quotationHasFlatSheetLine(productRows) : false),
    [isStoneMeter, productRows]
  );

  const productOptions = useMemo(() => {
    const fromMasterOnly = mergeQuoteLineOptions('product', []);
    if (!isStoneMeter) {
      return fromMasterOnly.length > 0
        ? fromMasterOnly
        : mergeQuoteLineOptions('product', DEFAULT_PRODUCT_ITEMS);
    }
    const base = mergeQuoteLineOptions('product', DEFAULT_PRODUCT_ITEMS);
    return base.filter((row) => productLineAllowedForStone(row.name, hasFlatSheetLine));
  }, [mergeQuoteLineOptions, isStoneMeter, hasFlatSheetLine]);
  const stoneFlatsheetQuotationIssues = useMemo(() => {
    if (!isStoneMeter) return [];
    const issues = [];
    for (const row of productRows) {
      const n = String(row?.name ?? '').trim();
      const qm = parseLineNum(row?.qty);
      if (!n || qm <= 0) continue;
      if (isStoneFlatsheetQuotationLine(n) && resolveStoneFlatsheetLengthM(row) == null) {
        issues.push(`${n}: choose length 1.4 m, 1.5 m, or 2 m`);
      }
    }
    return issues;
  }, [isStoneMeter, productRows]);
  const accessoryOptions = useMemo(() => {
    const fromMaster = mergeQuoteLineOptions('accessory', []);
    const base =
      fromMaster.length > 0 ? fromMaster : mergeQuoteLineOptions('accessory', DEFAULT_ACCESSORY_ITEMS);
    if (!isStoneMeter) return base;
    return base.filter((row) => accessoryLineAllowedForStone(row.name));
  }, [mergeQuoteLineOptions, isStoneMeter]);
  const serviceOptions = useMemo(() => {
    const fromMaster = mergeQuoteLineOptions('service', []);
    if (fromMaster.length > 0) return fromMaster;
    return mergeQuoteLineOptions('service', DEFAULT_SERVICE_ITEMS);
  }, [mergeQuoteLineOptions]);
  const priceListRows = useMemo(
    () => (liveMasterData?.priceList?.length ? liveMasterData.priceList.filter((row) => row.active) : []),
    [liveMasterData?.priceList]
  );
  const selectedGaugeMeta = useMemo(
    () => gaugeOptions.find((row) => row.value === materialGauge) || null,
    [gaugeOptions, materialGauge]
  );
  const selectedColourMeta = useMemo(
    () => colourOptions.find((row) => row.value === materialColor) || null,
    [colourOptions, materialColor]
  );

  const committedMaterialSpec = useMemo(
    () => ({
      materialTypeId: String(editData?.materialTypeId ?? '').trim(),
      materialGauge: String(editData?.materialGauge ?? '').trim(),
      materialColor: String(editData?.materialColor ?? '').trim(),
      materialDesign: String(editData?.materialDesign ?? '').trim(),
    }),
    [
      editData?.materialTypeId,
      editData?.materialGauge,
      editData?.materialColor,
      editData?.materialDesign,
    ]
  );

  const materialSpecDirty = useMemo(() => {
    if (!allowMaterialSpecCorrectionInView) return false;
    return (
      String(materialTypeId ?? '').trim() !== committedMaterialSpec.materialTypeId ||
      String(materialGauge ?? '').trim() !== committedMaterialSpec.materialGauge ||
      String(materialColor ?? '').trim() !== committedMaterialSpec.materialColor ||
      String(materialDesign ?? '').trim() !== committedMaterialSpec.materialDesign
    );
  }, [
    allowMaterialSpecCorrectionInView,
    committedMaterialSpec,
    materialTypeId,
    materialGauge,
    materialColor,
    materialDesign,
  ]);

  const quotationEditApprovalPayload = useMemo(() => {
    if (!editData?.id) return { changeSummary: '', changeDetails: [] };
    if (materialSpecDirty) {
      const details = [];
      if (String(materialTypeId ?? '').trim() !== committedMaterialSpec.materialTypeId) {
        details.push({
          label: 'Material type',
          from: committedMaterialSpec.materialTypeId || '—',
          to: materialTypeId || '—',
        });
      }
      if (String(materialGauge ?? '').trim() !== committedMaterialSpec.materialGauge) {
        details.push({
          label: 'Gauge',
          from: committedMaterialSpec.materialGauge || '—',
          to: materialGauge || '—',
        });
      }
      if (String(materialColor ?? '').trim() !== committedMaterialSpec.materialColor) {
        details.push({
          label: 'Colour',
          from: committedMaterialSpec.materialColor || '—',
          to: materialColor || '—',
        });
      }
      if (String(materialDesign ?? '').trim() !== committedMaterialSpec.materialDesign) {
        details.push({
          label: 'Profile / design',
          from: committedMaterialSpec.materialDesign || '—',
          to: materialDesign || '—',
        });
      }
      return {
        changeSummary: 'Material specification correction (quantities and prices unchanged)',
        changeDetails: details,
      };
    }
    return {
      changeSummary: 'Edit quotation lines, pricing, discounts, customer details, or payment allocation',
      changeDetails: [],
    };
  }, [
    editData?.id,
    materialSpecDirty,
    committedMaterialSpec,
    materialTypeId,
    materialGauge,
    materialColor,
    materialDesign,
  ]);
  const selectedProfileMeta = useMemo(
    () => liveMasterData?.profiles?.find((row) => row.name === materialDesign) || null,
    [liveMasterData?.profiles, materialDesign]
  );
  const selectedMaterialTypeMeta = useMemo(
    () => liveMasterData?.materialTypes?.find((row) => row.id === materialTypeId) || null,
    [liveMasterData?.materialTypes, materialTypeId]
  );

  const resolveWorkbookLineMeta = useCallback(
    (itemName) => {
      if (!productUsesWorkbookAutoPrice(itemName) || isQuotationTrimProductLine(itemName)) return null;
      const hit = resolveMaterialWorkbookPriceFromRows(materialPricingRows, {
        materialKey: priceListMaterialKeyFromMeta(selectedMaterialTypeMeta),
        gaugeMm: materialGauge,
        // Must match resolveUnitPrice — empty branchId makes workbook lookup always miss.
        branchId: quotationBranchId,
        designLabel: materialDesign,
      });
      if (!hit?.floorPerMeter) return null;
      return {
        floorPerMeter: hit.floorPerMeter,
        suggestedListPerMeter: hit.suggestedListPerMeter,
      };
    },
    [
      materialPricingRows,
      selectedMaterialTypeMeta,
      materialGauge,
      materialDesign,
      quotationBranchId,
    ]
  );

  const resolveUnitPrice = useCallback(
    (itemName, option, { girthMm: girthOverride } = {}) => {
      const name = String(itemName ?? '').trim();
      if (!name) return 0;

      const materialKey = priceListMaterialKeyFromMeta(selectedMaterialTypeMeta);
      const branchId = quotationBranchId;
      const wbCtx = {
        materialPricingRows,
        ridgeAddOns: ridgeAddOnsEffective,
        materialKey,
        gaugeLabel: materialGauge,
        branchId,
        designLabel: materialDesign,
      };

      if (isQuotationTrimProductLine(name)) {
        const girth =
          Number(girthOverride) > 0 ? Number(girthOverride) : defaultGirthMmForTrimProduct(name);
        const trimPrice = resolveTrimListPricePerMeterFromWorkbook({ ...wbCtx, girthMm: girth });
        if (trimPrice > 0) return trimPrice;
      }

      const usesWorkbook = productUsesWorkbookAutoPrice(name);

      // Prefer published price list (Publish path) over draft workbook suggested list.
      let publishedListN = 0;
      if (usesWorkbook && priceListItems.length > 0) {
        const gaugeK = gaugeMmKeyFromQuotationGauge(materialGauge);
        const designK = pricingNormKey(materialDesign);

        let bestScore = -1;
        let bestN = 0;
        for (const row of priceListItems) {
          const rg = String(row.gaugeKey ?? '').trim();
          const rd = pricingNormKey(row.designKey);
          const rmt = String(row.materialTypeKey ?? '').trim().toLowerCase();
          const rb = String(row.branchId ?? '').trim();

          if (rb && branchId && rb !== branchId) continue;
          if (gaugeK && rg && rg !== gaugeK) continue;
          if (designK && rd && rd !== designK) continue;
          if (rmt && materialKey) {
            if (rmt !== materialKey && !materialKey.includes(rmt) && !rmt.includes(materialKey)) continue;
          } else if (rmt && !materialKey) {
            continue;
          }

          const n = Math.round(Number(row.unitPricePerMeterNgn) || 0);
          if (n <= 0) continue;

          let score = 0;
          if (gaugeK && rg === gaugeK) score += 4;
          if (designK && rd === designK) score += 4;
          if (rmt && materialKey) score += 2;
          if (rb && branchId) score += 1;
          if (score > bestScore) {
            bestScore = score;
            bestN = n;
          }
        }
        publishedListN = bestScore > 0 ? bestN : 0;
      }

      if (publishedListN > 0) return publishedListN;

      // Fallback only when no published list row exists (legacy / unpublished branch).
      if (usesWorkbook) {
        const hit = resolveMaterialWorkbookPriceFromRows(materialPricingRows, {
          materialKey,
          gaugeMm: materialGauge,
          branchId,
          designLabel: materialDesign,
        });
        if (hit?.suggestedListPerMeter > 0) return hit.suggestedListPerMeter;
      }

      const matches = priceListRows
        .filter((row) => {
          const sameItem =
            (option?.id && row.quoteItemId === option.id) ||
            String(row.itemName || '').trim().toLowerCase() === name.toLowerCase();
          if (!sameItem) return false;
          if (row.gaugeId && row.gaugeId !== selectedGaugeMeta?.id) return false;
          if (row.colourId && row.colourId !== selectedColourMeta?.id) return false;
          if (row.profileId && row.profileId !== selectedProfileMeta?.id) return false;
          if (row.materialTypeId && row.materialTypeId !== selectedMaterialTypeMeta?.id) return false;
          return true;
        })
        .sort((a, b) => {
          const score = (row) =>
            [row.gaugeId, row.colourId, row.materialTypeId, row.profileId].filter(Boolean).length;
          return score(b) - score(a);
        });
      return matches[0]?.unitPriceNgn || option?.defaultUnitPriceNgn || 0;
    },
    [
      materialPricingRows,
      ridgeAddOnsEffective,
      priceListItems,
      priceListRows,
      materialGauge,
      materialDesign,
      quotationBranchId,
      selectedGaugeMeta,
      selectedColourMeta,
      selectedProfileMeta,
      selectedMaterialTypeMeta,
    ]
  );

  const materialHeaderReady = useMemo(
    () =>
      Boolean(
        String(materialTypeId ?? '').trim() &&
          String(materialGauge ?? '').trim() &&
          String(materialDesign ?? '').trim()
      ),
    [materialTypeId, materialGauge, materialDesign]
  );

  const productOptionsRef = useRef(productOptions);
  const resolveUnitPriceRef = useRef(resolveUnitPrice);
  const resolveWorkbookLineMetaRef = useRef(resolveWorkbookLineMeta);
  productOptionsRef.current = productOptions;
  resolveUnitPriceRef.current = resolveUnitPrice;
  resolveWorkbookLineMetaRef.current = resolveWorkbookLineMeta;

  /** Stable — must not recreate when productOptions changes after a line select (that was #185). */
  const refreshWorkbookProductPrices = useCallback(() => {
    setProductRows((prev) =>
      applyWorkbookPricesToProductRows(prev, {
        options: productOptionsRef.current,
        resolveUnitPrice: resolveUnitPriceRef.current,
        resolveWorkbookLineMeta: resolveWorkbookLineMetaRef.current,
      })
    );
  }, []);

  useEffect(() => {
    if (!isOpen || readOnly || !materialHeaderReady) return;
    if (skipWorkbookPriceRefreshRef.current) {
      skipWorkbookPriceRefreshRef.current = false;
      return;
    }
    refreshWorkbookProductPrices();
  }, [
    isOpen,
    readOnly,
    materialHeaderReady,
    materialTypeId,
    materialGauge,
    materialDesign,
    materialPricingRows,
    ridgeAddOnsEffective,
    quotationBranchId,
    quoteDate,
    priceListItems,
    refreshWorkbookProductPrices,
  ]);

  useEffect(() => {
    if (!isOpen || pricingRidgeAddOns.length) return;
    let cancelled = false;
    (async () => {
      const { ok, data } = await apiFetch('/api/pricing/policy');
      if (!cancelled && ok && Array.isArray(data?.ridgeAddOns)) {
        setRidgeAddOnsFallback(data.ridgeAddOns);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, pricingRidgeAddOns.length]);

  const canApproveMdPriceException = useMemo(() => {
    if (wsHasPermission?.('*')) return true;
    if (wsHasPermission?.('md.price_exception.approve')) return true;
    const rk = String(ws?.session?.user?.roleKey ?? '').trim().toLowerCase();
    return rk === 'md' || rk === 'admin';
  }, [ws?.session?.user?.roleKey, wsHasPermission]);

  const validateProductWorkbookFloors = useCallback(() => {
    if (quotationBelowFloorExceptionApproved(editData)) return null;
    const blocked = [];
    const branchId = quotationBranchId;
    if (!branchId) return null;
    for (const row of productRows) {
      // Include cladding + meter sheet; trims use separate list-basis checks on the server.
      if (!productUsesWorkbookAutoPrice(row.name) || isQuotationTrimProductLine(row.name)) continue;
      const hit = resolveMaterialWorkbookPriceFromRows(materialPricingRows, {
        materialKey: priceListMaterialKeyFromMeta(selectedMaterialTypeMeta),
        gaugeMm: materialGauge,
        branchId,
        designLabel: materialDesign,
      });
      const floor = hit?.floorPerMeter;
      if (!floor || floor <= 0) continue;
      const unit = parseLineNum(row.unitPrice);
      if (unit > 0 && unit + 0.0001 < floor) {
        blocked.push({ name: row.name, unit, floor });
      }
    }
    return blocked.length ? blocked : null;
  }, [
    editData,
    productRows,
    materialPricingRows,
    selectedMaterialTypeMeta,
    materialGauge,
    materialDesign,
    quotationBranchId,
  ]);

  useEffect(() => {
    if (!isOpen) {
      lastQuotationHydrateSigRef.current = '';
      prevMaterialTypeIdForStoneRef.current = null;
      return;
    }
    if (lastQuotationHydrateSigRef.current === quotationHydrateSig) return;
    lastQuotationHydrateSigRef.current = quotationHydrateSig;
    skipWorkbookPriceRefreshRef.current = true;
    prevMaterialTypeIdForStoneRef.current = null;

    setApplyAdvanceAmount('');
    setApplyAdvanceHint(null);
    setPickedCustomerInline(null);
    const cid = editData?.customerID ?? '';
    setSelectedCustomerId(cid);
    const match = customers.find((x) => x.customerID === cid);
    setCustomerQuery(match ? `${match.name} · ${match.phoneNumber}` : '');
    setCustomerListOpen(false);
    setQuotationEditType('');
    const list = treasuryPayAccountsLive;
    setTreasuryPayAccounts((prev) => (treasuryAccountListSame(prev, list) ? prev : list));
    setPaymentAccountId((prev) => {
      const ok = list.some((a) => String(a.id) === String(prev));
      if (ok) return prev;
      return list[0] ? String(list[0].id) : '';
    });
    setQuoteDate(editData?.dateISO ?? localCalendarDateIso());
    setMaterialTypeId(editData?.materialTypeId ?? '');
    setMaterialGauge(editData?.materialGauge ?? '');
    setMaterialColor(editData?.materialColor ?? '');
    setMaterialDesign(editData?.materialDesign ?? '');
    setProjectName(editData?.projectName ?? '');
    setShowPrint(false);

    const loaded = normalizeLoadedLines(editData?.quotationLines);
    if (loaded) {
      setProductRows(loaded.products.length ? loaded.products : [emptyOrderLine()]);
      setAccessoryRows(loaded.accessories.length ? loaded.accessories : [emptyOrderLine()]);
      setServiceRows(loaded.services.length ? loaded.services : [emptyOrderLine()]);
    } else {
      setProductRows([emptyOrderLine()]);
      setAccessoryRows([emptyOrderLine()]);
      setServiceRows([emptyOrderLine()]);
    }
  }, [isOpen, quotationHydrateSig, editData]);

  /** Stone-coated: strip incompatible lines / reset header when material type changes. */
  const productRowsRef = useRef(productRows);
  const accessoryRowsRef = useRef(accessoryRows);
  productRowsRef.current = productRows;
  accessoryRowsRef.current = accessoryRows;

  useEffect(() => {
    if (!isOpen || readOnly) return;
    const next = String(materialTypeId ?? '').trim();
    const prev = prevMaterialTypeIdForStoneRef.current;
    // First paint after hydrate/open: sync ref only — do not treat as a user material switch.
    if (prev == null) {
      prevMaterialTypeIdForStoneRef.current = next;
      return;
    }
    if (prev === next) return;

    const prevInv = String(
      liveMasterData?.materialTypes?.find((r) => r.id === prev)?.inventoryModel || ''
    ).trim();
    const nextInv = String(
      liveMasterData?.materialTypes?.find((r) => r.id === next)?.inventoryModel || ''
    ).trim();
    const fromStone = prevInv === STONE_METER_INVENTORY_MODEL;
    const toStone = nextInv === STONE_METER_INVENTORY_MODEL;
    const alerts = [];

    if (toStone) {
      const profRows = (liveMasterData?.profiles || []).filter(
        (r) => r.active && String(r.materialTypeId || '').trim() === next
      );
      const stoneAllow = new Set(STONE_PROFILE_FALLBACK.map(normQuoteItemKey));
      const fromDb = profRows.map((r) => normQuoteItemKey(r.name)).filter((k) => stoneAllow.has(k));
      const allowedProfileKeys = new Set(fromDb.length ? fromDb : [...stoneAllow]);
      const cleaned = applyStoneMeterMaterialChangeCleanup({
        toStoneMeter: true,
        products: productRowsRef.current,
        accessories: accessoryRowsRef.current,
        materialGauge,
        materialColor,
        materialDesign,
        allowedProfileKeys,
      });
      if (
        cleaned.removedProducts.length ||
        cleaned.removedAccessories.length ||
        cleaned.clearedHeader.profile
      ) {
        setProductRows(cleaned.products.length ? cleaned.products : [emptyOrderLine()]);
        setAccessoryRows(cleaned.accessories.length ? cleaned.accessories : [emptyOrderLine()]);
        setMaterialGauge(cleaned.materialGauge);
        setMaterialColor(cleaned.materialColor);
        setMaterialDesign(cleaned.materialDesign);
        captureEdited();
        if (cleaned.removedProducts.length) {
          alerts.push(`Removed product line(s): ${cleaned.removedProducts.join(', ')}.`);
        }
        if (cleaned.removedAccessories.length) {
          alerts.push(`Removed accessory line(s): ${cleaned.removedAccessories.join(', ')}.`);
        }
        if (cleaned.clearedHeader.profile) alerts.push('Profile reset for stone coated.');
      }
    }

    if (fromStone && !toStone) {
      let md = materialDesign;
      let mg = materialGauge;
      let mc = materialColor;
      let changed = false;
      if (md && !profileOptions.some((p) => String(p.value) === String(md))) {
        md = '';
        changed = true;
      }
      if (mg && !gaugeOptions.some((g) => String(g.value) === String(mg))) {
        mg = '';
        changed = true;
      }
      if (mc && !colourOptions.some((c) => String(c.value) === String(mc))) {
        mc = '';
        changed = true;
      }
      if (changed) {
        setMaterialDesign(md);
        setMaterialGauge(mg);
        setMaterialColor(mc);
        captureEdited();
        alerts.push('Material header fields were reset for the new material type.');
      }
    }

    if (alerts.length) {
      showToast(alerts.join(' '), { variant: 'warning' });
    }
    prevMaterialTypeIdForStoneRef.current = next;
  }, [
    isOpen,
    readOnly,
    materialTypeId,
    liveMasterData?.materialTypes,
    liveMasterData?.profiles,
    materialGauge,
    materialColor,
    materialDesign,
    profileOptions,
    gaugeOptions,
    colourOptions,
    showToast,
    captureEdited,
  ]);

  /** Late-loaded customer directory: fill picker label without re-hydrating line items. */
  useEffect(() => {
    if (!isOpen) return;
    const cid = String(editData?.customerID ?? selectedCustomerId ?? '').trim();
    if (!cid) return;
    const match = customers.find((x) => x.customerID === cid);
    if (!match) return;
    const label = `${match.name} · ${match.phoneNumber}`;
    setCustomerQuery((prev) => (String(prev).trim() ? prev : label));
  }, [isOpen, customers, editData?.customerID, selectedCustomerId]);

  /** Treasury accounts list refresh (workspace epoch): update accounts + payment id only. */
  useEffect(() => {
    if (!isOpen) return;
    const list = treasuryPayAccountsLive;
    setTreasuryPayAccounts((prev) => (treasuryAccountListSame(prev, list) ? prev : list));
    setPaymentAccountId((prev) => {
      const ok = list.some((a) => String(a.id) === String(prev));
      if (ok) return prev;
      return list[0] ? String(list[0].id) : '';
    });
  }, [isOpen, treasuryPayAccountsLive]);

  useEffect(() => {
    if (!materialDesign) return;
    const ok = profileOptions.some((p) => p.value === materialDesign);
    if (!ok) setMaterialDesign((prev) => (prev === '' ? prev : ''));
  }, [materialTypeId, profileOptions, materialDesign]);

  useEffect(() => {
    if (!materialGauge) return;
    if (!gaugeOptions.length) return;
    const ok = gaugeOptions.some((g) => String(g.value) === String(materialGauge));
    if (!ok) setMaterialGauge((prev) => (prev === '' ? prev : ''));
  }, [materialTypeId, gaugeOptions, materialGauge]);

  useEffect(() => {
    if (!materialColor) return;
    if (!colourOptions.length) return;
    const ok = colourOptions.some((c) => String(c.value) === String(materialColor));
    if (!ok) setMaterialColor((prev) => (prev === '' ? prev : ''));
  }, [materialTypeId, colourOptions, materialColor]);

  useEffect(() => {
    return () => {
      if (customerBlurTimer.current) window.clearTimeout(customerBlurTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) setShowPrint(false);
  }, [isOpen]);

  const advanceBal = useMemo(
    () => advanceBalanceNgn(selectedCustomerId),
    [selectedCustomerId]
  );

  const applyAdvanceDateISO = useMemo(
    () => String(editData?.dateISO || localCalendarDateIso()),
    [editData?.dateISO]
  );
  const periodLocks = useMemo(() => ws?.snapshot?.periodLocks ?? [], [ws?.snapshot?.periodLocks]);
  const applyAdvanceDateLocked = useMemo(
    () => Boolean(useLedgerApi && isVoucherDateInLockedPeriod(applyAdvanceDateISO, periodLocks)),
    [useLedgerApi, applyAdvanceDateISO, periodLocks]
  );

  const submitApplyAdvance = async (e) => {
    e.preventDefault();
    if (!editData?.id || !selectedCustomerId) return;
    const n = Number(String(applyAdvanceAmount).replace(/,/g, ''));
    if (Number.isNaN(n) || n <= 0) {
      showToast('Enter amount to apply.', { variant: 'error' });
      return;
    }
    if (n > advanceBal) {
      showToast('Amount exceeds customer advance balance.', { variant: 'error' });
      return;
    }
    if (n > quoteDueNgn) {
      showToast('Amount exceeds remaining balance on this quotation.', { variant: 'error' });
      return;
    }
    if (useLedgerApi) {
      const { ok, data } = await apiFetch('/api/ledger/apply-advance', {
        method: 'POST',
        body: JSON.stringify({
          customerID: selectedCustomerId,
          customerName: selectedCustomer?.name ?? '',
          quotationRef: editData.id,
          amountNgn: n,
          dateISO: applyAdvanceDateISO,
        }),
      });
      if (!ok || !data?.ok) {
        setApplyAdvanceHint(guidanceForLedgerPostFailure(data) || null);
        showToast(data?.error || 'Could not apply advance.', { variant: 'error' });
        return;
      }
      setApplyAdvanceHint(null);
    } else {
      const res = recordAdvanceAppliedToQuotation({
        customerID: selectedCustomerId,
        customerName: selectedCustomer?.name ?? '',
        quotationRef: editData.id,
        amountNgn: n,
      });
      if (!res.ok) {
        showToast(res.error, { variant: 'error' });
        return;
      }
    }
    showToast(`Applied ${formatNgn(n)} advance to ${editData.id}.`);
    setApplyAdvanceAmount('');
    await onLedgerChange?.();
  };

  const selectedCustomer =
    customers.find((x) => x.customerID === selectedCustomerId) ??
    (pickedCustomerInline?.customerID === selectedCustomerId ? pickedCustomerInline : null) ??
    (editData?.customer && String(editData.customerID) === String(selectedCustomerId)
      ? {
          customerID: editData.customerID,
          name: editData.customer,
          phoneNumber: '—',
        }
      : null);

  const selectedPayTreasuryAccount = useMemo(() => {
    const key = String(paymentAccountId ?? '').trim();
    if (!key) return null;
    return treasuryPayAccounts.find((a) => String(a.id) === key) ?? null;
  }, [treasuryPayAccounts, paymentAccountId]);

  const payAccountForPrint = useMemo(() => {
    if (!selectedPayTreasuryAccount) return null;
    const bn = selectedPayTreasuryAccount.bankName?.trim();
    return {
      bankName: bn || selectedPayTreasuryAccount.name,
      accNo: selectedPayTreasuryAccount.accNo,
      accountName: ZAREWA_COMPANY_ACCOUNT_NAME,
    };
  }, [selectedPayTreasuryAccount]);

  const filteredCustomers = useMemo(
    () => filterCustomersForPicker(customers, customerQuery, 40),
    [customers, customerQuery]
  );

  const grandTotalNgn = useMemo(
    () => sumRowsNgn(productRows) + sumRowsNgn(accessoryRows) + sumRowsNgn(serviceRows),
    [productRows, accessoryRows, serviceRows]
  );

  const pricingViolationsList = useMemo(
    () => (Array.isArray(editData?.pricingViolations) ? editData.pricingViolations : []),
    [editData?.pricingViolations]
  );

  const quotationPaidNgn = useMemo(() => {
    const id = editData?.id;
    if (!id || !ws?.hasWorkspaceData) return Math.round(Number(editData?.paidNgn) || 0);
    const receipts = Array.isArray(ws?.snapshot?.receipts) ? ws.snapshot.receipts : [];
    const ledgerSnap = Array.isArray(ws?.snapshot?.ledgerEntries) ? ws.snapshot.ledgerEntries : [];
    const ledger = ledgerSnap.length > 0 ? ledgerSnap : loadLedgerEntries();
    const rolled = bookedPaidNgnForQuotationFromMirrors(receipts, ledger, id);
    const liveRow = ws.snapshot.quotations?.find((q) => String(q.id) === String(id));
    const stored = Math.round(Number(liveRow?.paidNgn ?? editData?.paidNgn) || 0);
    if (rolled === 0 && stored > 0) return stored;
    return rolled;
  }, [
    editData?.id,
    editData?.paidNgn,
    ws?.hasWorkspaceData,
    ws?.snapshot?.quotations,
    ws?.snapshot?.receipts,
    ws?.snapshot?.ledgerEntries,
  ]);
  const quotationEditNeedsSecondApproval = useMemo(() => {
    const id = editData?.id;
    if (!id) return false;
    const receipts = Array.isArray(ws?.snapshot?.receipts) ? ws.snapshot.receipts : [];
    return quotationEditNeedsSecondApprovalClient(ws?.session?.user?.roleKey, receipts, id);
  }, [editData?.id, ws?.session?.user?.roleKey, ws?.snapshot?.receipts]);
  const quotationBalanceAfterPaidNgn = Math.max(0, grandTotalNgn - quotationPaidNgn);

  const quotationPayStatusLabel = useMemo(() => {
    if (!editData?.id) return 'Unpaid';
    if (grandTotalNgn > 0 && quotationPaidNgn >= Math.round(grandTotalNgn * 0.995)) return 'Paid';
    if (quotationPaidNgn > 0) return 'Partial';
    return String(editData.paymentStatus || 'Unpaid').trim() || 'Unpaid';
  }, [editData?.id, editData?.paymentStatus, grandTotalNgn, quotationPaidNgn]);

  const quoteDueNgn = useMemo(() => {
    if (!editData?.id) return 0;
    return Math.max(0, Math.round(grandTotalNgn) - quotationPaidNgn);
  }, [editData?.id, grandTotalNgn, quotationPaidNgn]);

  const quotePaymentPolicy = useMemo(() => {
    if (!editData?.id) return null;
    const jobs = Array.isArray(ws?.snapshot?.productionJobs) ? ws.snapshot.productionJobs : [];
    return quotationPaymentPolicySnapshot(
      { id: editData.id, totalNgn: grandTotalNgn, paidNgn: quotationPaidNgn },
      jobs
    );
  }, [editData?.id, grandTotalNgn, quotationPaidNgn, ws?.snapshot?.productionJobs]);

  const quoteBalancePolicyLabel = useMemo(() => {
    if (!accountingPolicyV1LabelsEnabled() || !quotePaymentPolicy) return null;
    return policyBalanceLabelText(quotePaymentPolicy.balanceLabel);
  }, [quotePaymentPolicy]);

  const maxApplyAdvance = useMemo(
    () => Math.max(0, Math.min(advanceBal, quoteDueNgn)),
    [advanceBal, quoteDueNgn]
  );

  const openPrintPreview = (kind) => {
    if (!ws?.canMutate) {
      showToast('System offline (read-only). Reconnect and refresh before printing.', { variant: 'error' });
      return;
    }
    if (!editData?.id) {
      showToast('Save quotation successfully before printing.', { variant: 'error' });
      return;
    }
    setPrintDocumentKind(kind);
    setShowPrint(true);
  };

  const printLinePayload = useMemo(
    () => ({
      products: rowsForPrint(productRows, true),
      accessories: rowsForPrint(accessoryRows, false),
      services: rowsForPrint(serviceRows, false),
    }),
    [productRows, accessoryRows, serviceRows]
  );

  const preparedByLabel = editData?.handledBy ?? quotedByStaff;

  const scheduleCustomerMenuClose = () => {
    if (customerBlurTimer.current) window.clearTimeout(customerBlurTimer.current);
    customerBlurTimer.current = window.setTimeout(() => setCustomerListOpen(false), 180);
  };

  const openFullCustomerForm = () => {
    if (onRequestNewCustomer) {
      onRequestNewCustomer();
      return;
    }
    showToast('Add customers from the Customers tab.', { variant: 'error' });
  };

  const pickCustomer = useCallback((c) => {
    const label = customerPickerPrimaryLabel(c);
    setSelectedCustomerId(c.customerID);
    setCustomerQuery(label);
    setCustomerListOpen(false);
    setPickedCustomerInline({
      customerID: c.customerID,
      name: label,
      phoneNumber: c.phoneNumber || '',
    });
  }, []);

  useEffect(() => {
    if (!isOpen || !externalCustomerPick?.customerID) return;
    pickCustomer({
      customerID: externalCustomerPick.customerID,
      name: externalCustomerPick.name,
      phoneNumber: externalCustomerPick.phoneNumber,
    });
    onConsumeExternalCustomerPick?.();
  }, [isOpen, externalCustomerPick, onConsumeExternalCustomerPick, pickCustomer]);

  const buildLinesPayload = () => {
    const lineCustom = (row, optionItems) => {
      const normalizedOptions = normalizeOptionItems(optionItems);
      const matchedOption = normalizedOptions.find((option) => option.name === row.name) || null;
      return (
        row.customLine === true || (Boolean(String(row.name || '').trim()) && !matchedOption)
      );
    };
    return {
      products: productRows.map((row) => {
        const trimKind = quotationLineKindForProductName(row.name);
        return {
          id: row.id,
          name: row.name,
          qty: row.qty,
          unitPrice: row.unitPrice,
          customLine: lineCustom(row, productOptions),
          gauge: materialGauge,
          colour: materialColor,
          design: materialDesign,
          profile: materialDesign,
          ...(trimKind ? { lineKind: trimKind } : row.lineKind ? { lineKind: row.lineKind } : {}),
          ...(isQuotationTrimProductLine(row.name)
            ? {
                girthMm:
                  Number(row.girthMm) > 0 ? Number(row.girthMm) : defaultGirthMmForTrimProduct(row.name),
              }
            : {}),
          ...(isStoneFlatsheetQuotationLine(row.name) &&
          resolveStoneFlatsheetLengthM(row) != null
            ? { stoneFlatsheetLengthM: resolveStoneFlatsheetLengthM(row) }
            : {}),
        };
      }),
      accessories: accessoryRows.map((row) => ({
        id: row.id,
        name: row.name,
        qty: row.qty,
        unitPrice: row.unitPrice,
        customLine: lineCustom(row, accessoryOptions),
      })),
      services: serviceRows.map((row) => ({
        id: row.id,
        name: row.name,
        qty: row.qty,
        unitPrice: row.unitPrice,
        customLine: lineCustom(row, serviceOptions),
        gauge: materialGauge,
        colour: materialColor,
        design: materialDesign,
        profile: materialDesign,
      })),
    };
  };

  const onSaveDraft = async () => {
    if (readOnly) return;
    if (!selectedCustomer?.customerID) {
      showToast('Select a customer before saving.', { variant: 'error' });
      return;
    }
    if (!projectName.trim()) {
      showToast('Enter project / site (required).', { variant: 'error' });
      return;
    }
    if (!String(materialTypeId ?? '').trim() || !String(materialGauge ?? '').trim() || !String(materialColor ?? '').trim() || !String(materialDesign ?? '').trim()) {
      showToast(materialHeaderIncompleteMessage(materialTypeId, materialGauge, materialColor, materialDesign) || 'Complete material type, gauge, colour, and profile.', { variant: 'error' });
      return;
    }
    const linesPayload = buildLinesPayload();
    const lineIntegrity = validateQuotationLineIntegrity({
      products: linesPayload.products,
      accessories: linesPayload.accessories,
      services: linesPayload.services,
    });
    if (!lineIntegrity.ok) {
      showToast(lineIntegrity.error, { variant: 'error' });
      return;
    }
    if (stoneFlatsheetQuotationIssues.length > 0) {
      showToast(stoneFlatsheetQuotationIssues[0], { variant: 'error' });
      return;
    }
    const belowFloor = validateProductWorkbookFloors();
    if (belowFloor) {
      const first = belowFloor[0];
      showToast(
        `${first.name}: unit price ${formatNgn(first.unit)} is below the workbook floor ${formatNgn(first.floor)}/m. Quotation will save — MD or administrator must approve before cutting list or production.`,
        { variant: 'warning', duration: 10_000 }
      );
    }
    if (useQuotationApi && !editData?.id && ws?.blocksBranchScopedCreate) {
      showToast(ws.branchScopedCreateMessage, { variant: 'error', duration: 12_000 });
      return;
    }
    if (useQuotationApi) {
      setSaving(true);
      try {
        const body = {
          customerID: selectedCustomer.customerID,
          projectName: projectName.trim(),
          dateISO: quoteDate,
          lines: linesPayload,
          materialTypeId,
          materialGauge,
          materialColor,
          materialDesign,
          handledBy: preparedByLabel,
          status: editData?.status || 'Pending',
          customerFeedback: editData?.customerFeedback,
          approvalDate: editData?.approvalDate,
        };
        /** New quotations only: server defaults paid to zero; booked paid later comes from receipts. */
        if (!editData?.id) {
          body.paidNgn = 0;
          body.paymentStatus = 'Unpaid';
        }
        if (editData?.id) {
          const { ok, data } = await apiFetch(`/api/quotations/${encodeURIComponent(editData.id)}`, {
            method: 'PATCH',
            body: JSON.stringify({
              ...body,
              ...(quotationEditApprovalId ? { editApprovalId: quotationEditApprovalId.trim() } : {}),
            }),
          });
          if (!ok || !data?.ok) {
            showToast(
              data?.code === 'PRICE_LIST_MD_APPROVAL_REQUIRED' || data?.code === 'BELOW_FLOOR_MD_APPROVAL_REQUIRED'
                ? data.error || 'Below workbook floor — MD price exception required.'
                : quotationRulesErrorMessage(data) || data?.error || 'Could not update quotation.',
              { variant: 'error' }
            );
            return;
          }
          if (data.quotation) ws.mergeQuotationIntoSnapshot(data.quotation);
          setQuotationEditApprovalId('');
          const applied = Number(data.autoOverpayAppliedNgn) || 0;
          let msg = `Quotation ${editData.id} saved to database.`;
          if (applied > 0) {
            msg += ` ${formatNgn(applied)} of this quotation's overpayment credit was re-applied after save (auto-reconcile; no new receipt).`;
          }
          showToast(msg);
        } else {
          const postQuotation = async (payload) =>
            apiFetch('/api/quotations', {
              method: 'POST',
              body: JSON.stringify(payload),
            });

          let { ok, data } = await postQuotation(body);
          if (!ok && data?.code === 'DUPLICATE_QUOTATION') {
            const detailMsg = Array.isArray(data.detail)
              ? data.detail.map((w) => w.message).filter(Boolean).join('\n')
              : '';
            const proceed = await appConfirm({
              title: 'Similar quotation found',
              message: [detailMsg || data.error || 'A similar quotation may already exist.', 'Save this quotation anyway?']
                .filter(Boolean)
                .join('\n\n'),
              confirmLabel: 'Save anyway',
              cancelLabel: 'Review first',
              variant: 'danger',
            });
            if (!proceed) return;
            ({ ok, data } = await postQuotation({ ...body, forceDuplicateCreate: true }));
          }
          if (!ok || !data?.ok) {
            showToast(
              data?.code === 'PRICE_LIST_MD_APPROVAL_REQUIRED' || data?.code === 'BELOW_FLOOR_MD_APPROVAL_REQUIRED'
                ? data.error || 'Below workbook floor — MD price exception required.'
                : quotationRulesErrorMessage(data) || data?.error || 'Could not create quotation.',
              { variant: 'error' }
            );
            return;
          }
          showToast(`Quotation ${data.quotationId} created.`);
          if (Array.isArray(data.duplicateWarnings) && data.duplicateWarnings.length > 0) {
            showToast(
              data.duplicateWarnings.map((w) => w.message).join(' '),
              { variant: 'info', duration: 12_000 }
            );
          }
        }
        await onLedgerChange?.();
        abandonUnsavedAndRun(() => onClose());
      } finally {
        setSaving(false);
      }
      return;
    }
    showToast(
      `Quotation not saved to the database. Start the API server to persist this record (${preparedByLabel}).`,
      { variant: 'error' }
    );
  };

  const onSaveMaterialSpecOnly = async () => {
    if (!allowMaterialSpecCorrectionInView || !editData?.id || !materialSpecDirty) return;
    if (!String(materialTypeId ?? '').trim() || !String(materialGauge ?? '').trim() || !String(materialColor ?? '').trim() || !String(materialDesign ?? '').trim()) {
      showToast(materialHeaderIncompleteMessage(materialTypeId, materialGauge, materialColor, materialDesign) || 'Complete material type, gauge, colour, and profile.', { variant: 'error' });
      return;
    }
    setSavingMaterial(true);
    try {
      const body = {
        materialTypeId,
        materialGauge,
        materialColor,
        materialDesign,
        ...(quotationEditApprovalId ? { editApprovalId: quotationEditApprovalId.trim() } : {}),
      };
      const { ok, data } = await apiFetch(`/api/quotations/${encodeURIComponent(editData.id)}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (!ok || !data?.ok) {
        showToast(quotationRulesErrorMessage(data) || data?.error || 'Could not update material details.', {
          variant: 'error',
        });
        return;
      }
      if (data.quotation) ws.mergeQuotationIntoSnapshot(data.quotation);
      setQuotationEditApprovalId('');
      showToast(`Material details updated on ${editData.id} (totals unchanged).`);
      await onLedgerChange?.();
      abandonUnsavedAndRun(() => onClose());
    } finally {
      setSavingMaterial(false);
    }
  };

  const onMdPriceExceptionApprove = async () => {
    if (!editData?.id || !useQuotationApi || !ws?.canMutate) return;
    if (!canApproveMdPriceException) {
      showToast('Only the Managing Director or an administrator may approve a below-floor price exception.', {
        variant: 'error',
      });
      return;
    }
    if (
      !(await appConfirm({
        message: 'Approve below-floor pricing for this quotation? Cutting lists and production may proceed after this step.',
      }))
    )
      return;
    setMdApproving(true);
    try {
      const { ok, data } = await apiFetch(
        `/api/quotations/${encodeURIComponent(editData.id)}/md-price-exception-approve`,
        {
          method: 'PATCH',
          body: JSON.stringify({}),
        }
      );
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not record MD approval.', { variant: 'error' });
        return;
      }
      if (data.quotation) ws.mergeQuotationIntoSnapshot(data.quotation);
      showToast('MD below-floor approval recorded.');
      await onLedgerChange?.();
      abandonUnsavedAndRun(() => onClose());
    } finally {
      setMdApproving(false);
    }
  };

  const onReviveArchived = async () => {
    if (!editData?.id || !useQuotationApi || !ws?.canMutate) return;
    setReviving(true);
    try {
      const { ok, data } = await apiFetch(`/api/quotations/${encodeURIComponent(editData.id)}/revive`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not revive quotation.', { variant: 'error' });
        return;
      }
      if (data.quotation) ws.mergeQuotationIntoSnapshot(data.quotation);
      showToast(`Quotation ${editData.id} revived — back in the active pipeline as Pending.`);
      await onLedgerChange?.();
      if (typeof ws?.refresh === 'function') await ws.refresh();
      if (data.quotation && typeof onQuotationRevived === 'function') onQuotationRevived(data.quotation);
    } finally {
      setReviving(false);
    }
  };

  return (
    <ModalFrame isOpen={isOpen} onClose={handleClose} modal={!showPrint}>
      <div
        className="z-modal-panel max-w-[min(100%,210mm)] w-full min-w-0 max-h-[min(92vh,820px)] flex flex-col"
        onInput={captureEdited}
        onChange={captureEdited}
      >
        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center shrink-0 bg-white gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-zarewa-teal rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0">
              Q
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 gap-y-1">
                <h2 className="text-base font-bold text-zarewa-teal tracking-tight">Quotation</h2>
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-ui-xs font-semibold uppercase tracking-wide ${
                    readOnly
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-teal-100 text-zarewa-teal ring-1 ring-zarewa-teal/20'
                  }`}
                >
                  {readOnly ? 'View' : 'Edit'}
                </span>
              </div>
              <p className="text-ui-xs font-semibold text-slate-400 uppercase tracking-widest truncate mt-0.5">
                {editData?.id ? `${editData.id}` : 'New quote'}
                {readOnly ? ' · read-only' : editData?.id ? ' · amending' : ''}
              </p>
              <p className="text-ui-xs font-medium text-slate-500 mt-1">
                Prepared by: <span className="font-semibold text-zarewa-teal">{preparedByLabel}</span>
                {!editData?.id ? <span className="text-slate-400"> · current workspace role</span> : null}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-colors shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-white">
          {archivedLifecycle ? (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2.5 space-y-2">
              <p className="text-ui-xs font-bold text-amber-900 uppercase tracking-wide">
                Archived quotation ({String(editData.status)})
              </p>
              <p className="text-ui-xs text-amber-950/90 leading-snug">
                {editData.lifecycleNote
                  ? String(editData.lifecycleNote)
                  : 'Valid for 10 days from quote date, or voided after a master price change. Revive to continue this record as Pending, or create a new quotation.'}
              </p>
              {useQuotationApi && ws?.canMutate && ws?.hasPermission?.('quotations.manage') ? (
                <button
                  type="button"
                  onClick={onReviveArchived}
                  disabled={reviving}
                  className="inline-flex items-center justify-center rounded-lg bg-zarewa-teal px-3 py-2 text-ui-xs font-bold uppercase tracking-wide text-white hover:bg-[#0f3d39] disabled:opacity-40"
                >
                  {reviving ? 'Reviving…' : 'Revive as Pending'}
                </button>
              ) : (
                <p className="text-ui-xs text-amber-900/80">
                  Sign in with quotation edit permission to revive this record.
                </p>
              )}
            </div>
          ) : null}
          {pricingViolationsList.length > 0 ? (
            <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50/95 px-4 py-3 space-y-2">
              <p className="text-ui-xs font-black text-amber-950 uppercase tracking-wide">Pricing policy</p>
              <p className="text-ui-xs text-amber-950/90 leading-relaxed">
                {quotationBelowFloorExceptionApproved(editData)
                  ? 'MD below-floor approval is on file — cutting lists and production may proceed if other gates are satisfied.'
                  : 'One or more lines are below the material pricing workbook floor (or the trading band on services). Cutting lists and production stay blocked until the Managing Director or an administrator approves a below-floor price exception.'}
              </p>
              <ul className="text-ui-xs text-amber-950 space-y-1.5 list-disc pl-4">
                {pricingViolationsList.map((v, i) => (
                  <li key={i}>
                    <span className="font-semibold capitalize">{v.lineCategory || 'line'}</span> #{Number(v.lineIndex) + 1}:{' '}
                    {v.code === 'below_floor'
                      ? v.trimWorkbook || v.priceBasis === 'published_list_plus_ridge'
                        ? 'Below trim list price'
                        : v.lineCategory === 'products'
                          ? 'Below workbook floor'
                          : 'Below list floor'
                      : 'Below allowed band (quoted deeper than recommended − trading band)'}{' '}
                    — quoted{' '}
                    {formatNgn(v.quotedPerMeter)}/m; minimum without exception{' '}
                    {formatNgn(v.minAllowedPerMeter ?? v.minimumPerMeter ?? v.floorPerMeter)}/m (floor {formatNgn(v.floorPerMeter)}/m, trading band ₦
                    {v.bandNgn ?? '—'}).
                  </li>
                ))}
              </ul>
              {useQuotationApi &&
              ws?.canMutate &&
              canApproveMdPriceException &&
              editData?.id &&
              !quotationBelowFloorExceptionApproved(editData) ? (
                <button
                  type="button"
                  onClick={onMdPriceExceptionApprove}
                  disabled={mdApproving}
                  className="inline-flex items-center justify-center rounded-lg bg-zarewa-teal px-3 py-2 text-ui-xs font-bold uppercase tracking-wide text-white hover:bg-[#0f3d39] disabled:opacity-40"
                >
                  {mdApproving ? 'Recording…' : 'MD: approve below-floor pricing'}
                </button>
              ) : null}
              {useQuotationApi &&
              editData?.id &&
              quotationBelowFloorPendingMdApproval(editData) &&
              !canApproveMdPriceException ? (
                <p className="text-ui-xs text-amber-900/85 mt-2">
                  Awaiting Managing Director or administrator approval before cutting list or production.
                </p>
              ) : null}
            </div>
          ) : null}
          {readOnly ? (
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-ui-xs font-medium text-slate-600">
              {archivedLifecycle
                ? 'Archived — use Revive above to unlock editing.'
                : allowMaterialSpecCorrectionInView
                  ? 'View only — line items and pricing are locked. You can still correct material type, gauge, colour, and profile below; totals and payments stay the same.'
                  : 'View only — fields are locked. Editing may require branch manager approval when the quote is fully paid.'}
            </div>
          ) : null}

          {editData?.id ? (
            <QuotationPipelineStepper
              status={editData.status}
              payStatus={quotationPayStatusLabel}
              quotationId={editData.id}
            />
          ) : (
            <QuotationPipelineStepper status="Pending" payStatus="Unpaid" quotationId="" />
          )}

          {editData?.id ? (
            <div className="mb-5 p-4 rounded-xl border border-slate-200 bg-slate-50/80">
              <p className="text-ui-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
                Quotation status
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-ui-xs font-semibold text-slate-400 uppercase tracking-wide ml-0.5 mb-1 block">
                    Quotation ID
                  </label>
                  <input
                    readOnly
                    value={editData.id}
                    className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm font-semibold text-zarewa-teal opacity-90"
                  />
                </div>
                <div className="relative">
                  <label className="text-ui-xs font-semibold text-slate-400 uppercase tracking-wide ml-0.5 mb-1 block">
                    Status
                  </label>
                  <select
                    disabled={readOnly}
                    defaultValue={editData.status}
                    className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm font-semibold text-zarewa-teal appearance-none outline-none focus:ring-2 focus:ring-zarewa-teal/10 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-3 bottom-2.5 text-slate-300 pointer-events-none"
                  />
                </div>
                {!readOnly ? (
                  <div className="sm:col-span-2">
                    <label className="text-ui-xs font-semibold text-slate-400 uppercase tracking-wide ml-0.5 mb-1 block">
                      Edit type (why this change)
                    </label>
                    <select
                      value={quotationEditType}
                      onChange={(e) => setQuotationEditType(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-zarewa-teal appearance-none outline-none focus:ring-2 focus:ring-zarewa-teal/10 cursor-pointer"
                    >
                      <option value="">Select edit type…</option>
                      {QUOTATION_EDIT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <p className="text-ui-xs text-slate-500 mt-1 leading-snug">
                      Audit trail — required when amending an existing quotation.
                    </p>
                  </div>
                ) : null}
                <div className="sm:col-span-2">
                  <label className="text-ui-xs font-semibold text-slate-400 uppercase tracking-wide ml-0.5 mb-1 block">
                    Customer feedback
                  </label>
                  <textarea
                    readOnly={readOnly}
                    rows={2}
                    defaultValue={editData.customerFeedback ?? ''}
                    placeholder="Notes…"
                    className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-zarewa-teal/10 resize-none"
                  />
                </div>
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-slate-200/90 p-4 mb-5 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <div>
            <label className="text-ui-xs font-semibold text-slate-500 uppercase tracking-widest mb-2 block">
              Customer — search by name, phone, staff ID (e.g. ZAPKD004), or tier
            </label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="search"
                value={customerQuery}
                onChange={(e) => {
                  setCustomerQuery(e.target.value);
                  setSelectedCustomerId('');
                  setPickedCustomerInline(null);
                  setCustomerListOpen(true);
                }}
                onFocus={() => {
                  if (readOnly) return;
                  if (customerBlurTimer.current) window.clearTimeout(customerBlurTimer.current);
                  setCustomerListOpen(true);
                }}
                onBlur={() => {
                  if (readOnly) return;
                  scheduleCustomerMenuClose();
                }}
                readOnly={readOnly}
                placeholder="Type name, phone, staff ID (ZAPKD004), or Staff tier…"
                autoComplete="off"
                aria-expanded={customerListOpen}
                aria-controls="quotation-customer-suggestions"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-zarewa-teal/10"
              />
              {!readOnly && customerListOpen && filteredCustomers.length > 0 ? (
                <ul
                  id="quotation-customer-suggestions"
                  role="listbox"
                  className="absolute left-0 right-0 top-full z-[60] mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {filteredCustomers.map((c) => (
                    <li key={c.customerID} role="option">
                      <button
                        type="button"
                        className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-xs hover:bg-teal-50"
                        onClick={() => pickCustomer(c)}
                      >
                        <span className="font-semibold text-zarewa-teal">{customerPickerPrimaryLabel(c)}</span>
                        <span className="text-ui-xs text-slate-500">{customerPickerSubline(c)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            {selectedCustomerId ? (
              <p className="mt-2 text-ui-xs font-medium text-emerald-800">
                Selected: <span className="font-mono">{selectedCustomerId}</span>
              </p>
            ) : null}
            {!readOnly && customerQuery.trim().length >= 2 && filteredCustomers.length === 0 ? (
              <p className="mt-2 text-ui-xs text-amber-700 font-medium">
                No match — use New customer to register without leaving this quote.
              </p>
            ) : null}
            {!readOnly ? (
              <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={openFullCustomerForm}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-zarewa-teal/40 bg-teal-50/50 px-3 py-1.5 text-ui-xs font-semibold uppercase tracking-wide text-zarewa-teal hover:bg-teal-50"
                >
                  <UserPlus size={14} />
                  New customer
                </button>
                <span className="text-ui-xs text-slate-400">Opens on top — quotation stays open</span>
              </div>
            ) : null}
              </div>

              {(selectedCustomerId && (editData?.id || isStaffLinkedCustomer(selectedCustomer))) ? (
                <div className="sm:col-span-2">
                  <StaffPurchaseCreditQuotationPanel
                    quotationRef={editData?.id || ''}
                    customerId={selectedCustomerId}
                    customer={selectedCustomer}
                    readOnly={readOnly}
                  />
                </div>
              ) : null}

              <div>
            <label className="text-ui-xs font-semibold text-slate-500 uppercase tracking-widest mb-2 block">
              Project / site <span className="text-rose-600 normal-case font-bold">(required)</span>
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              readOnly={readOnly}
              required={!readOnly}
              placeholder="e.g. Site address, estate, or job reference"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-xs font-semibold text-zarewa-teal outline-none focus:ring-2 focus:ring-zarewa-teal/10 disabled:opacity-60"
            />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <div className="relative">
              <label className="text-ui-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 block">
                Material type
              </label>
              <select
                value={materialTypeId}
                onChange={(e) => setMaterialTypeId(e.target.value)}
                disabled={materialFieldsLocked}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-zarewa-teal appearance-none outline-none disabled:opacity-60"
              >
                <option value="">Select material type…</option>
                {materialTypeOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 bottom-2.5 text-slate-300 pointer-events-none" />
            </div>
            <div className="relative">
              <label className="text-ui-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 block">
                Material gauge
              </label>
              <select
                value={materialGauge}
                onChange={(e) => setMaterialGauge(e.target.value)}
                disabled={materialFieldsLocked}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-zarewa-teal appearance-none outline-none disabled:opacity-60"
              >
                <option value="">Select gauge…</option>
                {gaugeOptions.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 bottom-2.5 text-slate-300 pointer-events-none" />
            </div>
            <div className="relative">
              <label className="text-ui-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 block">
                Colour
              </label>
              <select
                value={materialColor}
                onChange={(e) => setMaterialColor(e.target.value)}
                disabled={materialFieldsLocked}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-zarewa-teal appearance-none outline-none disabled:opacity-60"
              >
                <option value="">Select…</option>
                {colourOptions.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 bottom-2.5 text-slate-300 pointer-events-none" />
            </div>
            <div className="relative">
              <label className="text-ui-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 block">
                Profile
              </label>
              <select
                value={materialDesign}
                onChange={(e) => setMaterialDesign(e.target.value)}
                disabled={materialFieldsLocked}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-zarewa-teal appearance-none outline-none disabled:opacity-60"
              >
                <option value="">Select design…</option>
                {profileOptions.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 bottom-2.5 text-slate-300 pointer-events-none" />
            </div>
            <div className="relative">
              <label className="text-ui-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 block">
                Quote date
              </label>
              <input
                type="date"
                value={quoteDate}
                onChange={(e) => setQuoteDate(e.target.value)}
                readOnly={readOnly}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-zarewa-teal outline-none disabled:opacity-60"
              />
              <Calendar size={12} className="absolute right-2 bottom-2.5 text-slate-300 pointer-events-none" />
            </div>
          </div>
          {materialGauge && materialColor && !isStoneMeter ? (
            <OffcutAvailabilityPanel gaugeLabel={materialGauge} colour={materialColor} />
          ) : null}

          {allowMaterialSpecCorrectionInView ? (
            <div className="rounded-xl border border-teal-200/90 bg-teal-50/50 p-4 mb-5">
              <p className="text-ui-xs font-semibold text-zarewa-teal uppercase tracking-widest mb-1">
                Material correction (no price change)
              </p>
              <p className="text-ui-xs text-slate-700 leading-snug mb-3">
                Use this when colour, gauge, material type, or profile was entered wrong. The server keeps line items
                and totals as they are. To change quantities (including kg on product lines), open{' '}
                <strong>Edit</strong> from the quotation row menu if your role allows, or ask a branch manager. For kg
                received on a purchase order or coil GRN, use Procurement or Operations.
              </p>
              {materialSpecDirty ? (
                <div className="space-y-3">
                  <EditSecondApprovalInline
                    entityKind="quotation"
                    entityId={editData.id}
                    value={quotationEditApprovalId}
                    onChange={setQuotationEditApprovalId}
                    requiresSecondApproval={quotationEditNeedsSecondApproval}
                    changeSummary={quotationEditApprovalPayload.changeSummary}
                    changeDetails={quotationEditApprovalPayload.changeDetails}
                  />
                  <button
                    type="button"
                    disabled={savingMaterial}
                    onClick={() => void onSaveMaterialSpecOnly()}
                    className="inline-flex items-center gap-2 rounded-lg bg-zarewa-teal px-4 py-2.5 text-ui-xs font-bold uppercase tracking-wide text-white hover:bg-[#0f3d39] disabled:opacity-40"
                  >
                    <Save size={14} />
                    {savingMaterial ? 'Saving…' : 'Save material correction'}
                  </button>
                </div>
              ) : (
                <p className="text-ui-xs text-slate-500 italic">Adjust the fields above, then save here.</p>
              )}
            </div>
          ) : null}

          <div className="rounded-xl border border-slate-200/90 p-4 mb-5 bg-slate-50/50">
            <label className="text-ui-xs font-semibold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Landmark size={12} className="text-zarewa-teal" />
              Pay into (shows on printed quotation)
            </label>
            {treasuryPayAccounts.length === 0 ? (
              <p className="text-ui-xs font-medium text-amber-800 leading-snug">
                No treasury accounts on file. Add accounts under Finance → Treasury.
              </p>
            ) : (
              <select
                value={paymentAccountId}
                onChange={(e) => setPaymentAccountId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-zarewa-teal appearance-none outline-none focus:ring-2 focus:ring-zarewa-teal/10"
              >
                {treasuryPayAccounts.map((a) => (
                  <option key={a.id} value={String(a.id)}>
                    {treasuryAccountDisplayName(a)}
                    {a.accNo && a.accNo !== 'N/A' ? ` · ${a.accNo}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {editData?.id && selectedCustomerId && !readOnly ? (
            <div className="rounded-xl border border-amber-200/90 bg-amber-50/50 p-4 mb-5">
              <p className="text-ui-xs font-semibold text-amber-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Wallet size={14} className="text-amber-700" />
                Apply customer advance
              </p>
              <p className="text-ui-xs text-amber-900/80 leading-relaxed mb-3">
                Customer has <strong>{formatNgn(advanceBal)}</strong> on deposit.{' '}
                {quoteBalancePolicyLabel ? (
                  <>
                    <span className="font-bold text-amber-950">{quoteBalancePolicyLabel}:</span>{' '}
                    <strong>{formatNgn(quotePaymentPolicy?.depositPendingNgn ?? quoteDueNgn)}</strong>
                    {quotePaymentPolicy?.policyPhase === 'pre_production' ? (
                      <span className="block mt-1 text-amber-800/90">Not accounts receivable until production completes.</span>
                    ) : null}
                  </>
                ) : (
                  <>
                    Remaining due on this quote (after mock paid + ledger){' '}
                    <strong>{formatNgn(quoteDueNgn)}</strong>.
                  </>
                )}{' '}
                Applying advance is not revenue — it reduces what they owe.
              </p>
              {useLedgerApi && applyAdvanceDateLocked ? (
                <div className="mb-3 rounded-lg border border-amber-300 bg-amber-100/80 px-3 py-2 text-ui-xs text-amber-950">
                  <p className="font-bold">Quotation date month is locked</p>
                  <p className="mt-0.5 leading-snug">
                    Apply advance uses the quotation date ({applyAdvanceDateISO}) for the ledger period check.
                  </p>
                  <Link to="/settings/governance" className="mt-1 inline-block font-semibold underline underline-offset-2">
                    Period controls
                  </Link>
                </div>
              ) : null}
              {applyAdvanceHint ? (
                <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-ui-xs text-rose-950 space-y-1">
                  <p className="font-bold">{applyAdvanceHint.title}</p>
                  <p className="leading-snug">{applyAdvanceHint.detail}</p>
                  {applyAdvanceHint.links?.length ? (
                    <div className="flex flex-wrap gap-x-2">
                      {applyAdvanceHint.links.map((l) => (
                        <Link key={l.to} to={l.to} className="font-semibold underline underline-offset-2">
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {advanceBal <= 0 ? (
                <p className="text-ui-xs font-medium text-slate-500">No advance balance — record an advance in Sales first.</p>
              ) : quoteDueNgn <= 0 ? (
                <p className="text-ui-xs font-medium text-emerald-700">This quotation has no remaining balance in the ledger view.</p>
              ) : (
                <form onSubmit={submitApplyAdvance} className="flex flex-col sm:flex-row sm:items-end gap-2">
                  <div className="flex-1 min-w-0">
                    <label className="text-ui-xs font-semibold text-slate-500 uppercase ml-0.5 mb-1 block">
                      Amount to apply (max {formatNgn(maxApplyAdvance)})
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={maxApplyAdvance}
                      value={applyAdvanceAmount}
                      onChange={(e) => setApplyAdvanceAmount(e.target.value)}
                      placeholder={String(maxApplyAdvance)}
                      className="w-full bg-white border border-amber-200 rounded-lg py-2 px-3 text-sm font-bold text-zarewa-teal tabular-nums outline-none focus:ring-2 focus:ring-amber-400/30"
                    />
                  </div>
                  <button
                    type="submit"
                    className="shrink-0 rounded-lg bg-amber-600 text-white px-4 py-2.5 text-ui-xs font-semibold uppercase tracking-wide hover:bg-amber-700"
                  >
                    Apply to {editData.id}
                  </button>
                </form>
              )}
            </div>
          ) : null}

          <OrderLinesSection
            title="Products"
            optionItems={productOptions}
            rows={productRows}
            setRows={setProductRows}
            readOnly={readOnly}
            resolveUnitPrice={resolveUnitPrice}
            resolveWorkbookLineMeta={resolveWorkbookLineMeta}
            showStoneFlatsheetLength={isStoneMeter}
            stoneProductOptgroups={isStoneMeter}
            stoneFlatsheetIssueLines={stoneFlatsheetQuotationIssues}
          />
          <OrderLinesSection
            title="Accessories"
            optionItems={accessoryOptions}
            rows={accessoryRows}
            setRows={setAccessoryRows}
            readOnly={readOnly}
            resolveUnitPrice={resolveUnitPrice}
          />
          <OrderLinesSection
            title="Services"
            optionItems={serviceOptions}
            rows={serviceRows}
            setRows={setServiceRows}
            readOnly={readOnly}
            resolveUnitPrice={resolveUnitPrice}
          />
        </div>

        {useQuotationApi && editData?.id && !readOnly ? (
          <div className="px-5 py-3 border-t border-slate-200 bg-amber-50/40 shrink-0">
            <EditSecondApprovalInline
              entityKind="quotation"
              entityId={editData.id}
              value={quotationEditApprovalId}
              onChange={setQuotationEditApprovalId}
              requiresSecondApproval={quotationEditNeedsSecondApproval}
              changeSummary={quotationEditApprovalPayload.changeSummary}
              changeDetails={quotationEditApprovalPayload.changeDetails}
            />
          </div>
        ) : null}
        {!ws?.canMutate ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-ui-xs font-semibold text-amber-900">
            System offline (read-only). Reconnect and refresh before saving or printing.
          </div>
        ) : null}

        <ModalDeskFooter totalValue={formatNgn(grandTotalNgn)}>
          <DeskFooterButton
            type="button"
            disabled={readOnly || saving || savingMaterial}
            onClick={() => void onSaveDraft()}
          >
            <Save size={14} /> {saving ? 'Saving…' : 'Save'}
          </DeskFooterButton>
          <DeskFooterButton type="button" variant="primary" onClick={() => openPrintPreview('quotation')}>
            <Printer size={14} /> Quote
          </DeskFooterButton>
          <DeskFooterButton type="button" variant="primary" onClick={() => openPrintPreview('invoice')}>
            <Printer size={14} /> Invoice
          </DeskFooterButton>
          <DeskFooterButton type="button" variant="primary" onClick={() => openPrintPreview('receipt')}>
            <Printer size={14} /> Receipt
          </DeskFooterButton>
        </ModalDeskFooter>
      </div>

      <PrintModalPortal open={showPrint} onClose={() => setShowPrint(false)}>
              <div className="mx-auto max-w-[210mm] pb-16 print:m-0 print:max-w-none print:pb-0">
                <div className="quotation-print-root quotation-print-preview-mode rounded-lg border border-slate-200 bg-white shadow-2xl print:rounded-none print:border-0 print:shadow-none">
                  <QuotationPrintView
                    documentKind={printDocumentKind}
                    quotationId={editData?.id ?? 'Draft'}
                    dateStr={formatDisplayDate(quoteDate)}
                    customerName={selectedCustomer?.name ?? '—'}
                    customerPhone={selectedCustomer?.phoneNumber ?? '—'}
                    terms="100%"
                    gauge={materialGauge || '—'}
                    design={materialDesign || '—'}
                    color={materialColor || '—'}
                    payAccount={payAccountForPrint}
                    lines={printLinePayload}
                    salesperson={preparedByLabel}
                    projectName={projectName.trim() || '—'}
                    amountPaidNgn={quotationPaidNgn}
                    balanceDueNgn={quotationBalanceAfterPaidNgn}
                  />
                </div>
                <div className="no-print mt-4 flex flex-wrap justify-center gap-2">
                  <Button type="button" onClick={() => window.print()}>
                    Print / Save as PDF
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowPrint(false)}>
                    Close
                  </Button>
                </div>
              </div>
      </PrintModalPortal>
    </ModalFrame>
  );
};

export default QuotationModal;
