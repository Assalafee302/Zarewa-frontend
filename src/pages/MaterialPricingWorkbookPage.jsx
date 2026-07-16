import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MaterialPricingWorkbook } from '../components/procurement/MaterialPricingWorkbookModal.jsx';

const ALLOWED_MATERIAL_KEYS = new Set([
  'alu',
  'aluzinc',
  'stone-coated',
  'stone-flatsheet',
  'ridge-flashing',
  'accessories',
]);

export default function MaterialPricingWorkbookPage() {
  const [params] = useSearchParams();
  const initialMaterialKey = useMemo(() => {
    const raw = String(params.get('material') || params.get('tab') || 'alu')
      .trim()
      .toLowerCase();
    return ALLOWED_MATERIAL_KEYS.has(raw) ? raw : 'alu';
  }, [params]);

  return <MaterialPricingWorkbook mode="page" initialMaterialKey={initialMaterialKey} />;
}
