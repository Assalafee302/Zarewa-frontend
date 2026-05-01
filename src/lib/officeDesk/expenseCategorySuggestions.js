/**
 * Heuristic expense category hints for Office Desk conversion (client-side).
 * @param {{ subject?: string, body?: string, description?: string }} input
 * @returns {{ category: string | null, reasons: string[] }}
 */
export function suggestExpenseCategoryFromMemoText(input) {
  const raw = [input?.subject, input?.body, input?.description].filter(Boolean).join('\n');
  const text = String(raw || '').toLowerCase();
  const reasons = [];

  const pick = (category, code) => {
    reasons.push(code);
    return category;
  };

  if (/\bgenerator\b/i.test(text)) {
    return { category: pick('Generator', 'generator_keywords'), reasons };
  }
  if (/(diesel|fuel|haulage|logistics|transport|delivery\s*truck|vehicle)/i.test(text)) {
    return { category: pick('Truck & mining', 'logistics_keywords'), reasons };
  }
  if (/(phcn|utility|repair|maintenance|plant|machine|equipment)/i.test(text)) {
    return { category: pick('Maintenance', 'maintenance_keywords'), reasons };
  }
  if (/(rent|utilities|electric|water\s*bill|office\s*rent)/i.test(text)) {
    return { category: pick('Rent & utilities', 'operational_rent'), reasons };
  }
  if (/(raw\s*material|coil|sheet|consumable|supply|stock)/i.test(text)) {
    return { category: pick('Purchases', 'cogs_materials'), reasons };
  }
  if (/(payroll|salary|pension|statutory|nhis)/i.test(text)) {
    return { category: pick('Admin salary', 'payroll_keywords'), reasons };
  }
  if (/(welfare|training|staff\s*meal)/i.test(text)) {
    return { category: pick('Welfare', 'welfare_keywords'), reasons };
  }
  if (/(legal|lawyer|audit\s*fee|professional)/i.test(text)) {
    return { category: pick('Professional fees', 'professional_keywords'), reasons };
  }
  if (/(marketing|advert|branding|event)/i.test(text)) {
    return { category: pick('Marketing & advertising', 'marketing_keywords'), reasons };
  }
  if (/(bank\s*charge|transfer\s*fee)/i.test(text)) {
    return { category: pick('Bank charges', 'bank_keywords'), reasons };
  }
  if (/(licen[cs]e|tax\s*bill|permit)/i.test(text)) {
    return { category: pick('Tax', 'tax_licence_keywords'), reasons };
  }
  if (/(staff\s*loan|loan\s*disburse)/i.test(text)) {
    return { category: pick('Staff loan', 'staff_loan_keywords'), reasons };
  }

  return { category: null, reasons: [] };
}
