import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
import { ModalFrame } from './layout/ModalFrame';
import { useTrackedUnsavedForm } from '../hooks/useTrackedUnsavedForm';
import { useCustomers } from '../context/CustomersContext';
import { bankAccountsForCustomerPayment, treasuryAccountsFromSnapshot } from '../lib/treasuryAccountsStore';
import { compareGaugeLabels, compareSelectLabels } from '../lib/selectOptionSort';
import { colourSelectOptionsFromRows } from '../lib/colourCanonicalization.js';
import {
  STONE_METER_INVENTORY_MODEL,
  STONE_PROFILE_FALLBACK,
  STONE_DEFAULT_COLOUR_KEYS,
  QUOTATION_MATERIAL_RULES_CODE,
  applyStoneMeterMaterialChangeCleanup,
  accessoryLineAllowedForStone,
  normQuoteItemKey,
  normalizeStoneFlatsheetLengthM,
  resolveStoneFlatsheetLengthM,
  productLineAllowedForStone,
  productLineKey,
  quotationHasFlatSheetLine,
} from '../lib/stoneCoatedQuotationPolicy';
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
import { apiFetch } from '../lib/apiBase';
import { guidanceForLedgerPostFailure, isVoucherDateInLockedPeriod } from '../lib/ledgerPostingGuidance';
import { EditSecondApprovalInline } from './EditSecondApprovalInline';
import QuotationPrintView from './QuotationPrintView';

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
  'Crimp',
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

/** Map master material type row → `price_list_items.material_type_key` from workbook sync. */
function priceListMaterialKeyFromMeta(meta) {
  const id = String(meta?.id || '').trim();
  if (id === 'MAT-001') return 'alu';
  if (id === 'MAT-002') return 'aluzinc';
  if (id === 'MAT-005') return 'stone-coated';
  const n = pricingNormKey(meta?.name || '');
  if (n.includes('aluzinc')) return 'aluzinc';
  if (n.includes('alumin')) return 'alu';
  if (n.includes('stone')) return 'stone-coated';
  return '';
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
  return { id: newLineId(), name: '', qty: '', unitPrice: '', customLine: false, stoneFlatsheetLengthM: '' };
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

/** Stable key for which quotation record we're editing — excludes customers/treasury epoch churn. */
function quotationHydrateSignature(editData) {
  const q = editData?.quotationLines;
  let linesKey = '';
  if (q && typeof q === 'object') {
    try {
      linesKey = JSON.stringify({
        products: q.products,
        accessories: q.accessories,
        services: q.services,
      });
    } catch {
      linesKey = '';
    }
  }
  return [
    editData?.id ?? '',
    editData?.customerID ?? '',
    editData?.dateISO ?? '',
    editData?.materialTypeId ?? '',
    editData?.materialGauge ?? '',
    editData?.materialColor ?? '',
    editData?.materialDesign ?? '',
    editData?.projectName ?? '',
    linesKey,
  ].join('\u0000');
}

/** @param {unknown} raw */
function normalizeLoadedLines(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw.products;
  const a = raw.accessories;
  const s = raw.services;
  if (!Array.isArray(p) || !Array.isArray(a) || !Array.isArray(s)) return null;
  const mapRow = (r) => ({
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
  });
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

function quoteItemUnitIsArea(unit) {
  const s = String(unit || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
  return s === 'm2' || s === 'm²' || s === 'sqm' || s === 'sq.m' || s === 'm^2';
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
  showStoneFlatsheetLength = false,
}) {
  const addRow = () => setRows((prev) => [...prev, emptyOrderLine()]);
  const updateRow = (id, patch) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRow = (id) =>
    setRows((prev) => (prev.length <= 1 ? [emptyOrderLine()] : prev.filter((r) => r.id !== id)));
  const normalizedOptions = normalizeOptionItems(optionItems);

  return (
    <div className="mb-5">
      <div className="mb-2 px-0.5">
        <h3 className="text-[9px] font-semibold text-[#134e4a] uppercase tracking-widest">{title}</h3>
      </div>

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
                <span className="font-semibold text-[#134e4a]">
                  {row.name?.trim() || '—'}
                  {showStoneFlatsheetLength &&
                  productLineKey(row.name) === 'stone flatsheet' &&
                  resolveStoneFlatsheetLengthM(row) != null
                    ? ` · ${resolveStoneFlatsheetLengthM(row)} m`
                    : null}
                </span>
                <span className="tabular-nums text-slate-600">
                  {row.qty || '0'} × {formatNgn(parseLineNum(row.unitPrice))} ={' '}
                  <span className="font-bold text-[#134e4a]">{formatNgn(lineAmountNgn(row))}</span>
                </span>
              </li>
            ))}
            {!rows.some((r) => r.name?.trim()) ? (
              <li className="text-xs text-slate-400 italic">No line items</li>
            ) : null}
          </ul>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2 px-1 text-[8px] font-semibold text-slate-400 uppercase tracking-wider min-w-0">
              <div className="min-w-0 flex-1">Item</div>
              {showStoneFlatsheetLength && title === 'Products' ? (
                <div className="w-[4.25rem] shrink-0 text-center">Len</div>
              ) : null}
              <div className="w-14 sm:w-16 shrink-0 text-center">Qty</div>
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
                productLineKey(String(row.name || '')) === 'stone flatsheet';
              const needsStoneFlatsheetLengthPicker =
                isStoneFlatsheetRow && normQuoteItemKey(String(row.name || '')) === 'stone flatsheet';
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
                            updateRow(row.id, patch);
                          }}
                          placeholder="Custom name"
                          title="Custom line item"
                          className="min-w-0 flex-1 bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-[11px] font-semibold text-[#134e4a] outline-none focus:ring-2 focus:ring-[#134e4a]/10"
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
                          className="shrink-0 text-[9px] font-semibold text-[#134e4a] underline decoration-[#134e4a]/30 underline-offset-2 hover:text-[#0f3d39] whitespace-nowrap"
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
                              const suggestedPrice =
                                typeof resolveUnitPrice === 'function'
                                  ? resolveUnitPrice(option?.name || '', option || null)
                                  : option?.defaultUnitPriceNgn || 0;
                              const nextName = option?.name || '';
                              const lmPick = resolveStoneFlatsheetLengthM({ name: nextName });
                              const isSfLine = productLineKey(nextName) === 'stone flatsheet';
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
                                stoneFlatsheetLengthM: keepLen
                                  ? lmPick != null
                                    ? lmPick
                                    : normQuoteItemKey(nextName) === 'stone flatsheet'
                                      ? row.stoneFlatsheetLengthM
                                      : ''
                                  : '',
                              });
                            }}
                            className="w-full min-w-0 bg-white border border-slate-200 rounded-lg py-1.5 pl-2 pr-7 text-[11px] font-semibold text-[#134e4a] appearance-none outline-none focus:ring-2 focus:ring-[#134e4a]/15 cursor-pointer"
                          >
                            <option value="">Choose…</option>
                            {normalizedOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.name}
                              </option>
                            ))}
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
                          className="shrink-0 text-[9px] font-semibold text-[#134e4a] underline decoration-[#134e4a]/30 underline-offset-2 hover:text-[#0f3d39] whitespace-nowrap"
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
                            if (
                              len !== '' &&
                              normQuoteItemKey(String(row.name || '')) === 'stone flatsheet'
                            ) {
                              patch.name = `Stone flatsheet ${len}`;
                            }
                            updateRow(row.id, patch);
                          }}
                          className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-1 pr-1 text-[10px] font-semibold text-[#134e4a] outline-none focus:ring-2 focus:ring-[#134e4a]/15"
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
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    title={
                      quoteItemUnitIsArea(matchedOption?.unit)
                        ? 'Quantity in square metres (m²) for this price-list item'
                        : undefined
                    }
                    value={row.qty}
                    onChange={(e) => updateRow(row.id, { qty: e.target.value })}
                    className="w-14 sm:w-16 shrink-0 bg-white border border-slate-200 py-1.5 px-1 rounded-lg text-[11px] text-center font-semibold text-[#134e4a] outline-none tabular-nums"
                  />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={row.unitPrice}
                    onChange={(e) => updateRow(row.id, { unitPrice: e.target.value })}
                    className="w-[4.25rem] sm:w-24 shrink-0 bg-white border border-slate-200 py-1.5 px-1 rounded-lg text-[11px] text-center font-semibold text-[#134e4a] outline-none tabular-nums"
                  />
                  <div className="w-[5.25rem] sm:w-28 shrink-0 text-right pr-0.5 sm:pr-1 text-[10px] sm:text-[11px] font-bold text-[#134e4a] tabular-nums leading-tight">
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
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#134e4a]/25 bg-teal-50/80 text-[#134e4a] hover:bg-teal-100 transition-colors"
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
  const [quoteDate, setQuoteDate] = useState(() => new Date().toISOString().slice(0, 10));
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
  const priceListItems = useMemo(
    () => (Array.isArray(ws?.snapshot?.priceListItems) ? ws.snapshot.priceListItems : []),
    [ws?.snapshot?.priceListItems]
  );
  const lastQuotationHydrateSigRef = useRef('');
  const prevMaterialTypeIdForStoneRef = useRef(null);

  const quotationHydrateSig = useMemo(
    () => (isOpen ? quotationHydrateSignature(editData) : ''),
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
  const handleClose = () => wrapClose(() => onClose());

  const treasuryPayAccountsLive = useMemo(() => {
    const raw = bankAccountsForCustomerPayment(treasuryAccountsFromSnapshot(ws?.snapshot));
    return [...raw].sort((a, b) =>
      compareSelectLabels(
        `${String(a.bankName || '').trim() || String(a.name || '').trim()} · ${String(a.accNo || '')}`,
        `${String(b.bankName || '').trim() || String(b.name || '').trim()} · ${String(b.accNo || '')}`
      )
    );
  }, [
    /** Epoch ties treasury list to intentional workspace refresh, not silent snapshot churn. */
    ws?.refreshEpoch,
    ws?.hasWorkspaceData,
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
    if (inv !== 'stone_meter' || !materialTypeId) return base;

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
    editData?.branchId,
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

  const productOptions = useMemo(() => {
    const fromMasterOnly = mergeQuoteLineOptions('product', []);
    if (!isStoneMeter) {
      return fromMasterOnly.length > 0
        ? fromMasterOnly
        : mergeQuoteLineOptions('product', DEFAULT_PRODUCT_ITEMS);
    }
    const base = mergeQuoteLineOptions('product', DEFAULT_PRODUCT_ITEMS);
    const hasFlat = quotationHasFlatSheetLine(productRows);
    return base.filter((row) => productLineAllowedForStone(row.name, hasFlat));
  }, [mergeQuoteLineOptions, isStoneMeter, productRows]);
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
  const selectedProfileMeta = useMemo(
    () => liveMasterData?.profiles?.find((row) => row.name === materialDesign) || null,
    [liveMasterData?.profiles, materialDesign]
  );
  const selectedMaterialTypeMeta = useMemo(
    () => liveMasterData?.materialTypes?.find((row) => row.id === materialTypeId) || null,
    [liveMasterData?.materialTypes, materialTypeId]
  );

  const resolveUnitPrice = useCallback(
    (itemName, option) => {
      const itemLc = String(itemName || '').trim().toLowerCase();
      const usesWorkbookFloor = itemLc === 'roofing sheet' || itemLc === 'flat sheet';

      let workbookN = 0;
      if (usesWorkbookFloor && priceListItems.length > 0) {
        const gaugeK = gaugeMmKeyFromQuotationGauge(materialGauge);
        const designK = pricingNormKey(materialDesign);
        const mtKey = priceListMaterialKeyFromMeta(selectedMaterialTypeMeta);
        const branchId = String(editData?.branchId ?? '').trim();

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

          if (rmt && mtKey) {
            if (rmt !== mtKey && !mtKey.includes(rmt) && !rmt.includes(mtKey)) continue;
          } else if (rmt && !mtKey) {
            continue;
          }

          const n = Math.round(Number(row.unitPricePerMeterNgn) || 0);
          if (n <= 0) continue;

          let score = 0;
          if (gaugeK && rg === gaugeK) score += 4;
          if (designK && rd === designK) score += 4;
          if (rmt && mtKey) score += 2;
          if (rb && branchId) score += 1;
          if (score > bestScore) {
            bestScore = score;
            bestN = n;
          }
        }
        workbookN = bestScore > 0 ? bestN : 0;
      }

      const matches = priceListRows
        .filter((row) => {
          const sameItem =
            (option?.id && row.quoteItemId === option.id) ||
            String(row.itemName || '').trim().toLowerCase() === String(itemName || '').trim().toLowerCase();
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
      const setupN = matches[0]?.unitPriceNgn || option?.defaultUnitPriceNgn || 0;

      if (workbookN > 0) return workbookN;
      return setupN;
    },
    [
      priceListItems,
      priceListRows,
      materialGauge,
      materialDesign,
      editData?.branchId,
      selectedGaugeMeta,
      selectedColourMeta,
      selectedProfileMeta,
      selectedMaterialTypeMeta,
    ]
  );

  useEffect(() => {
    if (!isOpen) {
      lastQuotationHydrateSigRef.current = '';
      prevMaterialTypeIdForStoneRef.current = null;
      return;
    }
    if (lastQuotationHydrateSigRef.current === quotationHydrateSig) return;
    lastQuotationHydrateSigRef.current = quotationHydrateSig;

    prevMaterialTypeIdForStoneRef.current = String(editData?.materialTypeId ?? '').trim();

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
    setTreasuryPayAccounts(list);
    setPaymentAccountId((prev) => {
      const ok = list.some((a) => String(a.id) === String(prev));
      if (ok) return prev;
      return list[0] ? String(list[0].id) : '';
    });
    setQuoteDate(editData?.dateISO ?? new Date().toISOString().slice(0, 10));
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
  }, [isOpen, quotationHydrateSig, customers, treasuryPayAccountsLive, editData?.materialTypeId]);

  /** Stone-coated: strip incompatible lines / reset header when material type changes. */
  useEffect(() => {
    if (!isOpen || readOnly) return;
    const prev = prevMaterialTypeIdForStoneRef.current;
    const next = String(materialTypeId ?? '').trim();
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
        products: productRows,
        accessories: accessoryRows,
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
    productRows,
    accessoryRows,
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
    setTreasuryPayAccounts(list);
    setPaymentAccountId((prev) => {
      const ok = list.some((a) => String(a.id) === String(prev));
      if (ok) return prev;
      return list[0] ? String(list[0].id) : '';
    });
  }, [isOpen, treasuryPayAccountsLive]);

  useEffect(() => {
    if (!materialDesign) return;
    const ok = profileOptions.some((p) => p.value === materialDesign);
    if (!ok) setMaterialDesign('');
  }, [materialTypeId, profileOptions, materialDesign]);

  useEffect(() => {
    if (!materialGauge) return;
    if (!gaugeOptions.length) return;
    const ok = gaugeOptions.some((g) => String(g.value) === String(materialGauge));
    if (!ok) setMaterialGauge('');
  }, [materialTypeId, gaugeOptions, materialGauge]);

  useEffect(() => {
    if (!materialColor) return;
    if (!colourOptions.length) return;
    const ok = colourOptions.some((c) => String(c.value) === String(materialColor));
    if (!ok) setMaterialColor('');
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
    () => String(editData?.dateISO || new Date().toISOString().slice(0, 10)),
    [editData?.dateISO]
  );
  const periodLocks = ws?.snapshot?.periodLocks ?? [];
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

  const filteredCustomers = useMemo(() => {
    const raw = customerQuery.trim().toLowerCase();
    if (!raw) return customers.slice(0, 40);
    const digits = raw.replace(/\D/g, '');
    return customers.filter((c) => {
      const name = (c.name || '').toLowerCase();
      const phone = String(c.phoneNumber || '').toLowerCase().replace(/\s/g, '');
      if (name.includes(raw)) return true;
      if (digits.length >= 3 && phone.replace(/\D/g, '').includes(digits)) return true;
      return phone.includes(raw.replace(/\s/g, ''));
    });
  }, [customers, customerQuery]);

  const grandTotalNgn = useMemo(
    () => sumRowsNgn(productRows) + sumRowsNgn(accessoryRows) + sumRowsNgn(serviceRows),
    [productRows, accessoryRows, serviceRows]
  );

  const pricingViolationsList = useMemo(
    () => (Array.isArray(editData?.pricingViolations) ? editData.pricingViolations : []),
    [editData?.pricingViolations, editData?.id]
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
    ws?.refreshEpoch,
  ]);
  const quotationBalanceAfterPaidNgn = Math.max(0, grandTotalNgn - quotationPaidNgn);

  const quoteDueNgn = useMemo(() => {
    if (!editData?.id) return 0;
    return Math.max(0, Math.round(grandTotalNgn) - quotationPaidNgn);
  }, [editData?.id, grandTotalNgn, quotationPaidNgn]);

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
    setSelectedCustomerId(c.customerID);
    setCustomerQuery(`${c.name} · ${c.phoneNumber}`);
    setCustomerListOpen(false);
    setPickedCustomerInline({
      customerID: c.customerID,
      name: c.name,
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
      products: productRows.map((row) => ({
        id: row.id,
        name: row.name,
        qty: row.qty,
        unitPrice: row.unitPrice,
        customLine: lineCustom(row, productOptions),
        gauge: materialGauge,
        colour: materialColor,
        design: materialDesign,
        profile: materialDesign,
        ...(productLineKey(row.name) === 'stone flatsheet' &&
        resolveStoneFlatsheetLengthM(row) != null
          ? { stoneFlatsheetLengthM: resolveStoneFlatsheetLengthM(row) }
          : {}),
      })),
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
    if (!String(materialTypeId ?? '').trim() || !String(materialGauge ?? '').trim() || !String(materialColor ?? '').trim()) {
      showToast('Select material type, gauge, and colour — required on every quotation.', { variant: 'error' });
      return;
    }
    if (useQuotationApi) {
      setSaving(true);
      try {
        const body = {
          customerID: selectedCustomer.customerID,
          projectName: projectName.trim(),
          dateISO: quoteDate,
          lines: buildLinesPayload(),
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
            showToast(quotationRulesErrorMessage(data) || data?.error || 'Could not update quotation.', {
              variant: 'error',
            });
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
          const { ok, data } = await apiFetch('/api/quotations', {
            method: 'POST',
            body: JSON.stringify(body),
          });
          if (!ok || !data?.ok) {
            showToast(quotationRulesErrorMessage(data) || data?.error || 'Could not create quotation.', {
              variant: 'error',
            });
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
    if (!String(materialTypeId ?? '').trim() || !String(materialGauge ?? '').trim() || !String(materialColor ?? '').trim()) {
      showToast('Select material type, gauge, and colour — all are required.', { variant: 'error' });
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
    if (!ws?.hasPermission?.('md.price_exception.approve')) {
      showToast('Only the Managing Director (or delegated role) can record this approval.', { variant: 'error' });
      return;
    }
    if (!window.confirm('Record Managing Director approval for this below-policy quotation? Production may then start.'))
      return;
    setMdApproving(true);
    try {
      const { ok, data } = await apiFetch(
        `/api/quotations/${encodeURIComponent(editData.id)}/md-price-exception`,
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
      showToast('MD price exception recorded for this quotation.');
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
            <div className="w-10 h-10 bg-[#134e4a] rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0">
              Q
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 gap-y-1">
                <h2 className="text-base font-bold text-[#134e4a] tracking-tight">Quotation</h2>
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                    readOnly
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-teal-100 text-[#134e4a] ring-1 ring-[#134e4a]/20'
                  }`}
                >
                  {readOnly ? 'View' : 'Edit'}
                </span>
              </div>
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest truncate mt-0.5">
                {editData?.id ? `${editData.id}` : 'New quote'}
                {readOnly ? ' · read-only' : editData?.id ? ' · amending' : ''}
              </p>
              <p className="text-[9px] font-medium text-slate-500 mt-1">
                Prepared by: <span className="font-semibold text-[#134e4a]">{preparedByLabel}</span>
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
              <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wide">
                Archived quotation ({String(editData.status)})
              </p>
              <p className="text-[10px] text-amber-950/90 leading-snug">
                {editData.lifecycleNote
                  ? String(editData.lifecycleNote)
                  : 'Valid for 10 days from quote date, or voided after a master price change. Revive to continue this record as Pending, or create a new quotation.'}
              </p>
              {useQuotationApi && ws?.canMutate && ws?.hasPermission?.('quotations.manage') ? (
                <button
                  type="button"
                  onClick={onReviveArchived}
                  disabled={reviving}
                  className="inline-flex items-center justify-center rounded-lg bg-[#134e4a] px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-[#0f3d39] disabled:opacity-40"
                >
                  {reviving ? 'Reviving…' : 'Revive as Pending'}
                </button>
              ) : (
                <p className="text-[9px] text-amber-900/80">
                  Sign in with quotation edit permission to revive this record.
                </p>
              )}
            </div>
          ) : null}
          {pricingViolationsList.length > 0 ? (
            <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50/95 px-4 py-3 space-y-2">
              <p className="text-[10px] font-black text-amber-950 uppercase tracking-wide">Pricing policy</p>
              <p className="text-[10px] text-amber-950/90 leading-relaxed">
                {editData?.mdPriceExceptionApprovedAtISO
                  ? 'MD price exception is on file — production may proceed if other gates are satisfied.'
                  : 'One or more lines are below the published floor or the automatic trading band. Production stays blocked until the Managing Director records a price exception.'}
              </p>
              <ul className="text-[10px] text-amber-950 space-y-1.5 list-disc pl-4">
                {pricingViolationsList.map((v, i) => (
                  <li key={i}>
                    <span className="font-semibold capitalize">{v.lineCategory || 'line'}</span> #{Number(v.lineIndex) + 1}:{' '}
                    {v.code === 'below_floor' ? 'Below list floor' : 'Below allowed band (quoted deeper than recommended − trading band)'} — quoted{' '}
                    {formatNgn(v.quotedPerMeter)}/m; minimum without MD{' '}
                    {formatNgn(v.minAllowedPerMeter ?? v.floorPerMeter)}/m (floor {formatNgn(v.floorPerMeter)}/m, trading band ₦
                    {v.bandNgn ?? '—'}).
                  </li>
                ))}
              </ul>
              {useQuotationApi &&
              ws?.canMutate &&
              ws?.hasPermission?.('md.price_exception.approve') &&
              editData?.id &&
              !editData?.mdPriceExceptionApprovedAtISO ? (
                <button
                  type="button"
                  onClick={onMdPriceExceptionApprove}
                  disabled={mdApproving}
                  className="inline-flex items-center justify-center rounded-lg bg-amber-800 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-amber-900 disabled:opacity-40"
                >
                  {mdApproving ? 'Recording…' : 'Record MD price exception approval'}
                </button>
              ) : null}
            </div>
          ) : null}
          {readOnly ? (
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-medium text-slate-600">
              {archivedLifecycle
                ? 'Archived — use Revive above to unlock editing.'
                : allowMaterialSpecCorrectionInView
                  ? 'View only — line items and pricing are locked. You can still correct material type, gauge, colour, and profile below; totals and payments stay the same.'
                  : 'View only — fields are locked. Editing may require branch manager approval when the quote is fully paid.'}
            </div>
          ) : null}

          {editData?.id ? (
            <div className="mb-5 p-4 rounded-xl border border-slate-200 bg-slate-50/80">
              <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-3">
                Quotation status
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide ml-0.5 mb-1 block">
                    Quotation ID
                  </label>
                  <input
                    readOnly
                    value={editData.id}
                    className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm font-semibold text-[#134e4a] opacity-90"
                  />
                </div>
                <div className="relative">
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide ml-0.5 mb-1 block">
                    Status
                  </label>
                  <select
                    disabled={readOnly}
                    defaultValue={editData.status}
                    className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm font-semibold text-[#134e4a] appearance-none outline-none focus:ring-2 focus:ring-[#134e4a]/10 cursor-pointer disabled:cursor-not-allowed"
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
                    <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide ml-0.5 mb-1 block">
                      Edit type (why this change)
                    </label>
                    <select
                      value={quotationEditType}
                      onChange={(e) => setQuotationEditType(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-[#134e4a] appearance-none outline-none focus:ring-2 focus:ring-[#134e4a]/10 cursor-pointer"
                    >
                      <option value="">Select edit type…</option>
                      {QUOTATION_EDIT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <p className="text-[9px] text-slate-500 mt-1 leading-snug">
                      Audit trail — required when amending an existing quotation.
                    </p>
                  </div>
                ) : null}
                <div className="sm:col-span-2">
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide ml-0.5 mb-1 block">
                    Customer feedback
                  </label>
                  <textarea
                    readOnly={readOnly}
                    rows={2}
                    defaultValue={editData.customerFeedback ?? ''}
                    placeholder="Notes…"
                    className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#134e4a]/10 resize-none"
                  />
                </div>
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-slate-200/90 p-4 mb-5 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <div>
            <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-2 block">
              Customer — search by name or phone
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
                placeholder="Type name or phone — list updates as you type…"
                autoComplete="off"
                aria-expanded={customerListOpen}
                aria-controls="quotation-customer-suggestions"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-[#134e4a]/10"
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
                        <span className="font-semibold text-[#134e4a]">{c.name}</span>
                        <span className="text-[10px] text-slate-500">{c.phoneNumber}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            {selectedCustomerId ? (
              <p className="mt-2 text-[10px] font-medium text-emerald-800">
                Selected: <span className="font-mono">{selectedCustomerId}</span>
              </p>
            ) : null}
            {!readOnly && customerQuery.trim().length >= 2 && filteredCustomers.length === 0 ? (
              <p className="mt-2 text-[10px] text-amber-700 font-medium">
                No match — use New customer to register without leaving this quote.
              </p>
            ) : null}
            {!readOnly ? (
              <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={openFullCustomerForm}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[#134e4a]/40 bg-teal-50/50 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-[#134e4a] hover:bg-teal-50"
                >
                  <UserPlus size={14} />
                  New customer
                </button>
                <span className="text-[9px] text-slate-400">Opens on top — quotation stays open</span>
              </div>
            ) : null}
              </div>

              <div>
            <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-2 block">
              Project / site <span className="text-rose-600 normal-case font-bold">(required)</span>
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              readOnly={readOnly}
              required={!readOnly}
              placeholder="e.g. Site address, estate, or job reference"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-xs font-semibold text-[#134e4a] outline-none focus:ring-2 focus:ring-[#134e4a]/10 disabled:opacity-60"
            />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <div className="relative">
              <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">
                Material type
              </label>
              <select
                value={materialTypeId}
                onChange={(e) => setMaterialTypeId(e.target.value)}
                disabled={materialFieldsLocked}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-[#134e4a] appearance-none outline-none disabled:opacity-60"
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
              <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">
                Material gauge
              </label>
              <select
                value={materialGauge}
                onChange={(e) => setMaterialGauge(e.target.value)}
                disabled={materialFieldsLocked}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-[#134e4a] appearance-none outline-none disabled:opacity-60"
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
              <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">
                Colour
              </label>
              <select
                value={materialColor}
                onChange={(e) => setMaterialColor(e.target.value)}
                disabled={materialFieldsLocked}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-[#134e4a] appearance-none outline-none disabled:opacity-60"
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
              <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">
                Profile
              </label>
              <select
                value={materialDesign}
                onChange={(e) => setMaterialDesign(e.target.value)}
                disabled={materialFieldsLocked}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-[#134e4a] appearance-none outline-none disabled:opacity-60"
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
              <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">
                Quote date
              </label>
              <input
                type="date"
                value={quoteDate}
                onChange={(e) => setQuoteDate(e.target.value)}
                readOnly={readOnly}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-[#134e4a] outline-none disabled:opacity-60"
              />
              <Calendar size={12} className="absolute right-2 bottom-2.5 text-slate-300 pointer-events-none" />
            </div>
          </div>

          {allowMaterialSpecCorrectionInView ? (
            <div className="rounded-xl border border-teal-200/90 bg-teal-50/50 p-4 mb-5">
              <p className="text-[10px] font-semibold text-[#134e4a] uppercase tracking-widest mb-1">
                Material correction (no price change)
              </p>
              <p className="text-[10px] text-slate-700 leading-snug mb-3">
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
                  />
                  <button
                    type="button"
                    disabled={savingMaterial}
                    onClick={() => void onSaveMaterialSpecOnly()}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#134e4a] px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-[#0f3d39] disabled:opacity-40"
                  >
                    <Save size={14} />
                    {savingMaterial ? 'Saving…' : 'Save material correction'}
                  </button>
                </div>
              ) : (
                <p className="text-[9px] text-slate-500 italic">Adjust the fields above, then save here.</p>
              )}
            </div>
          ) : null}

          <div className="rounded-xl border border-slate-200/90 p-4 mb-5 bg-slate-50/50">
            <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Landmark size={12} className="text-[#134e4a]" />
              Pay into (shows on printed quotation)
            </label>
            {treasuryPayAccounts.length === 0 ? (
              <p className="text-[10px] font-medium text-amber-800 leading-snug">
                No bank accounts with a valid account number in Treasury. Add a bank account under Finance → Treasury,
                including bank name and number.
              </p>
            ) : (
              <select
                value={paymentAccountId}
                onChange={(e) => setPaymentAccountId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-[#134e4a] appearance-none outline-none focus:ring-2 focus:ring-[#134e4a]/10"
              >
                {treasuryPayAccounts.map((a) => (
                  <option key={a.id} value={String(a.id)}>
                    {(a.bankName?.trim() || a.name) + ' · ' + a.accNo}
                  </option>
                ))}
              </select>
            )}
            {selectedPayTreasuryAccount ? (
              <p className="text-[9px] text-slate-500 mt-2 leading-snug">
                Customer sees: {(selectedPayTreasuryAccount.bankName?.trim() || selectedPayTreasuryAccount.name)},{' '}
                {selectedPayTreasuryAccount.accNo}, {ZAREWA_COMPANY_ACCOUNT_NAME}
              </p>
            ) : null}
          </div>

          {editData?.id && selectedCustomerId && !readOnly ? (
            <div className="rounded-xl border border-amber-200/90 bg-amber-50/50 p-4 mb-5">
              <p className="text-[9px] font-semibold text-amber-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Wallet size={14} className="text-amber-700" />
                Apply customer advance
              </p>
              <p className="text-[10px] text-amber-900/80 leading-relaxed mb-3">
                Customer has <strong>{formatNgn(advanceBal)}</strong> on deposit. Remaining due on this quote (after
                mock paid + ledger){' '}
                <strong>{formatNgn(quoteDueNgn)}</strong>. Applying advance is not revenue — it reduces what they owe.
              </p>
              {useLedgerApi && applyAdvanceDateLocked ? (
                <div className="mb-3 rounded-lg border border-amber-300 bg-amber-100/80 px-3 py-2 text-[10px] text-amber-950">
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
                <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] text-rose-950 space-y-1">
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
                <p className="text-[10px] font-medium text-slate-500">No advance balance — record an advance in Sales first.</p>
              ) : quoteDueNgn <= 0 ? (
                <p className="text-[10px] font-medium text-emerald-700">This quotation has no remaining balance in the ledger view.</p>
              ) : (
                <form onSubmit={submitApplyAdvance} className="flex flex-col sm:flex-row sm:items-end gap-2">
                  <div className="flex-1 min-w-0">
                    <label className="text-[9px] font-semibold text-slate-500 uppercase ml-0.5 mb-1 block">
                      Amount to apply (max {formatNgn(maxApplyAdvance)})
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={maxApplyAdvance}
                      value={applyAdvanceAmount}
                      onChange={(e) => setApplyAdvanceAmount(e.target.value)}
                      placeholder={String(maxApplyAdvance)}
                      className="w-full bg-white border border-amber-200 rounded-lg py-2 px-3 text-sm font-bold text-[#134e4a] tabular-nums outline-none focus:ring-2 focus:ring-amber-400/30"
                    />
                  </div>
                  <button
                    type="submit"
                    className="shrink-0 rounded-lg bg-amber-600 text-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide hover:bg-amber-700"
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
            showStoneFlatsheetLength={isStoneMeter}
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
            />
          </div>
        ) : null}
        {!ws?.canMutate ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-semibold text-amber-900">
            System offline (read-only). Reconnect and refresh before saving or printing.
          </div>
        ) : null}

        <div className="px-5 py-4 bg-[#134e4a] flex justify-between items-center text-white shrink-0 flex-wrap gap-3">
          <div>
            <p className="text-[9px] font-semibold text-white/50 uppercase tracking-widest mb-0.5">Total</p>
            <p className="text-2xl font-bold text-white tabular-nums">{formatNgn(grandTotalNgn)}</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <button
              type="button"
              disabled={readOnly || saving || savingMaterial}
              onClick={() => void onSaveDraft()}
              className="bg-white/10 px-4 py-2.5 rounded-lg text-[9px] font-semibold uppercase tracking-wide border border-white/15 hover:bg-white/20 disabled:opacity-40"
            >
              <Save size={14} className="inline mr-1.5" /> {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => openPrintPreview('quotation')}
              className="bg-white text-[#134e4a] px-3 py-2.5 rounded-lg text-[9px] font-semibold uppercase tracking-wide shadow-sm inline-flex items-center gap-1.5"
            >
              <Printer size={14} /> Quote
            </button>
            <button
              type="button"
              onClick={() => openPrintPreview('invoice')}
              className="bg-white text-[#134e4a] px-3 py-2.5 rounded-lg text-[9px] font-semibold uppercase tracking-wide shadow-sm inline-flex items-center gap-1.5"
            >
              <Printer size={14} /> Invoice
            </button>
            <button
              type="button"
              onClick={() => openPrintPreview('receipt')}
              className="bg-white text-[#134e4a] px-3 py-2.5 rounded-lg text-[9px] font-semibold uppercase tracking-wide shadow-sm inline-flex items-center gap-1.5"
            >
              <Printer size={14} /> Receipt
            </button>
          </div>
        </div>
      </div>

      {showPrint &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <button
              type="button"
              aria-label="Close print preview"
              className="no-print fixed inset-0 z-[11060] bg-black/50"
              onClick={() => setShowPrint(false)}
            />
            <div
              className="print-portal-scroll fixed inset-0 z-[11070] overflow-y-auto overscroll-y-contain p-4 sm:p-8"
              onClick={() => setShowPrint(false)}
            >
              <div className="mx-auto max-w-[210mm] pb-16 print:m-0 print:max-w-none print:pb-0" onClick={(e) => e.stopPropagation()}>
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
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="rounded-lg bg-[#134e4a] px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-lg"
                  >
                    Print / Save as PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPrint(false)}
                    className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
    </ModalFrame>
  );
};

export default QuotationModal;
