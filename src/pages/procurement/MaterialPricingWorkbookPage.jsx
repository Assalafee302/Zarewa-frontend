import React, { useMemo } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';

const ALLOWED_MATERIAL_KEYS = new Set([
  'alu',
  'aluzinc',
  'stone-coated',
  'stone-flatsheet',
  'ridge-flashing',
  'accessories',
]);

/** Deep links land on Procurement → Pricing workbook so there is one desk, not a second page. */
export default function MaterialPricingWorkbookPage() {
  const [params] = useSearchParams();
  const material = useMemo(() => {
    const raw = String(params.get('material') || params.get('tab') || '')
      .trim()
      .toLowerCase();
    return ALLOWED_MATERIAL_KEYS.has(raw) ? raw : '';
  }, [params]);

  return (
    <Navigate
      to={material ? `/procurement?material=${encodeURIComponent(material)}` : '/procurement'}
      state={{ focusTab: 'conversion' }}
      replace
    />
  );
}
