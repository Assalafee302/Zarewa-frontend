import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { KeyRound, Palette } from 'lucide-react';
import DesignSystemPanel from './DesignSystemPanel';
import { SettingsIntegrationApiPanel } from './SettingsIntegrationApiPanel';
import { PageTabs } from '../layout';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';

/** Design reference gallery + integration API keys. */
export default function SystemSettingsPanel({ showIntegrationApi = false }) {
  const { show: showToast } = useToast();
  const ws = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();

  const section = useMemo(() => {
    const raw = String(searchParams.get('section') || 'design').toLowerCase();
    if (raw === 'api' || raw === 'integration') return 'api';
    return 'design';
  }, [searchParams]);

  const tabs = useMemo(() => {
    const list = [{ id: 'design', label: 'Design system', icon: <Palette size={14} /> }];
    if (showIntegrationApi) {
      list.push({ id: 'api', label: 'Integration API', icon: <KeyRound size={14} /> });
    }
    return list;
  }, [showIntegrationApi]);

  const active = showIntegrationApi || section === 'design' ? section : 'design';

  return (
    <div className="space-y-5">
      {tabs.length > 1 ? (
        <PageTabs
          tabs={tabs}
          value={active}
          onChange={(id) => setSearchParams({ section: id }, { replace: true })}
          ariaLabel="System section"
        />
      ) : null}

      {active === 'api' && showIntegrationApi ? (
        <SettingsIntegrationApiPanel showToast={showToast} onRefresh={() => void ws?.refresh?.()} />
      ) : (
        <DesignSystemPanel />
      )}
    </div>
  );
}
