import React, { useEffect, useState } from 'react';
import {
  Cpu,
  Sliders,
  Download,
  Upload,
  ShieldCheck,
  Wifi,
  UserRound,
  Settings2,
  Clock3
} from 'lucide-react';
import { ModelCheckpoint } from '../types/nexus';
import { useNexaSystem } from '../state/NexaSystemContext';

export type TabType =
  | 'core'
  | 'chat'
  | 'vision'
  | 'voice'
  | 'memory'
  | 'tools'
  | 'automation'
  | 'studio'
  | 'settings'
  | 'google';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  checkpoint: ModelCheckpoint;
  isTraining: boolean;
  onOpenExport: () => void;
  onOpenImport: () => void;
  onToggleParams: () => void;
  showParamsDrawer: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isTraining,
  onOpenExport,
  onOpenImport,
  onToggleParams,
  showParamsDrawer
}) => {
  const { uiState, statusLabel, telemetry, settings } = useNexaSystem();
  const [clock, setClock] = useState('');
  const [isOnline, setIsOnline] = useState<boolean | null>(telemetry.online);

  useEffect(() => {
    const tick = () => {
      const date = new Date();
      const pad = (value: number) => String(value).padStart(2, '0');
      setClock(`${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const update = () => setIsOnline(typeof navigator.onLine === 'boolean' ? navigator.onLine : null);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const providerLabel = settings.devMode && import.meta.env.GEMINI_API_KEY ? 'LOCAL + GEMINI' : 'LOCAL ENGINE';
  const coreDot = uiState === 'ERROR' || uiState === 'WARNING' ? 'warn' : uiState === 'OFFLINE' ? 'offline' : 'online';

  return (
    <header className="nexa-header sticky top-0 z-40 w-full px-4 py-2.5">
      <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-2">
        {/* Left — identity */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
          <div className="flex items-center gap-2.5">
            <span className="nexa-brand-mark" aria-label="NEXA autonomous core">
              <Cpu className="w-4 h-4" />
              <span className="nexa-dot-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="nexa-brand-name">NEXA</span>
                <span className="nexa-brand-tag">AUTONOMOUS CORE</span>
              </div>
              <p className="nexa-brand-subtext"><ShieldCheck className="w-3 h-3" /> MULTIMODAL INTELLIGENCE SYSTEM</p>
            </div>
          </div>

          {/* Center — system status */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/5 text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-200" aria-live="polite">
            <span className={`nexa-dot ${coreDot}`} />
            {statusLabel || 'SYSTEM ONLINE'}
          </div>
        </div>

        {/* Right — time / connection / provider / profile / actions */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className="nexa-header-chip" title="Local clock"><Clock3 className="w-3 h-3" />{clock}</span>
          <span className="nexa-header-chip" title="Connection state">
            <Wifi className="w-3 h-3" />
            {isOnline === null ? 'NET ?' : isOnline ? 'CONNECTED' : 'OFFLINE'}
          </span>
          <span className="nexa-header-chip text-cyan-200/90" title="Active AI engine">{providerLabel}</span>
          <span className="nexa-header-chip" title="Operator profile"><UserRound className="w-3 h-3" />OPERATOR</span>

          {activeTab === 'chat' && (
            <button id="btn-toggle-params" onClick={onToggleParams} className={`nexa-action-btn ${showParamsDrawer ? 'active' : ''}`} title="Tune Model Hyperparameters"><Sliders className="w-4 h-4" /><span className="hidden sm:inline">TUNE</span></button>
          )}
          {activeTab === 'studio' && isTraining && (
            <span className="nexa-header-chip text-amber-300 animate-pulse" title="Training in progress">TRAINING...</span>
          )}
          <button id="btn-export-weights" onClick={onOpenExport} className="nexa-action-btn" title="Export / Download Trained Model Checkpoint"><Download className="w-4 h-4" /><span className="hidden md:inline">EXPORT</span></button>
          <button id="btn-import-weights" onClick={onOpenImport} className="nexa-action-btn" title="Import Model Checkpoint JSON"><Upload className="w-4 h-4" /><span className="hidden md:inline">IMPORT</span></button>
          <button
            id="btn-open-settings"
            onClick={() => setActiveTab('settings')}
            className={`nexa-action-btn ${activeTab === 'settings' ? 'active' : ''}`}
            title="System settings"
            aria-label="Open settings"
          >
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">SETTINGS</span>
          </button>
        </div>
      </div>
    </header>
  );
};
