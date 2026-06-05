import { useCallback, useState } from 'react';
import { apiFetch } from '../lib/apiBase';

/**
 * AP2b — preview and apply received-basis AP rebuild.
 */
export function useAp2ApRebuild() {
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState('');

  const loadPreview = useCallback(async (opts = {}) => {
    const { branchId = 'ALL', period = '', supplierId = '', status = '', logPreview = true } = opts;
    setPreviewLoading(true);
    setPreviewError('');
    const qs = new URLSearchParams();
    if (branchId && branchId !== 'ALL') qs.set('branchId', branchId);
    else qs.set('branchId', 'ALL');
    if (period) qs.set('period', period);
    if (supplierId) qs.set('supplierId', supplierId);
    if (status) qs.set('status', status);
    if (logPreview) qs.set('logPreview', '1');
    const { ok, data: d, status: httpStatus } = await apiFetch(
      `/api/finance/ap2-ap-rebuild-preview?${qs.toString()}`
    );
    setPreviewLoading(false);
    if (!ok || !d?.ok) {
      setPreview(null);
      setPreviewError(
        httpStatus === 403
          ? 'You do not have permission to preview AP rebuild.'
          : d?.error || 'Could not load AP rebuild preview.'
      );
      return null;
    }
    setPreview(d);
    return d;
  }, []);

  const applyRebuild = useCallback(
    async (body) => {
      setApplyLoading(true);
      setApplyError('');
      const { ok, data: d, status: httpStatus } = await apiFetch('/api/finance/ap2-ap-rebuild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setApplyLoading(false);
      if (!ok || !d?.ok) {
        setApplyError(
          httpStatus === 403
            ? 'You do not have permission to apply AP rebuild.'
            : d?.error || 'AP rebuild failed.'
        );
        return null;
      }
      return d;
    },
    []
  );

  return {
    preview,
    previewLoading,
    previewError,
    applyLoading,
    applyError,
    loadPreview,
    applyRebuild,
    clearPreview: () => setPreview(null),
  };
}
