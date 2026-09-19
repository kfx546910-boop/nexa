/**
 * NEXA // SYSTEM TELEMETRY PANEL
 * Left HUD panel. Every value is real browser/platform data sourced from the
 * shared telemetry snapshot. Metrics the platform cannot expose render as N/A.
 */

import React from 'react';
import { Cpu, MemoryStick, Gauge, Wifi, Clock3, BatteryCharging } from 'lucide-react';
import { useNexaSystem } from '../state/NexaSystemContext';
import { formatUptime } from '../state/nexaSystem';

function valueOrNa(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return 'N/A';
  const text = String(value);
  return text.trim() ? text : 'N/A';
}

export const NexaTelemetryPanel: React.FC = () => {
  const { telemetry } = useNexaSystem();
  const t = telemetry;

  return (
    <aside className="nexa-panel nexa-panel-left" aria-label="System telemetry">
      <div className="nexa-panel-title">
        <span className="nexa-panel-glyph">◢</span>
        SYSTEM TELEMETRY
      </div>

      <div className="nexa-tele-row">
        <span className="nexa-tele-label"><Cpu className="w-3 h-3" /> CPU</span>
        <span className="nexa-tele-value">{valueOrNa(t.cpuCores ? `${t.cpuCores} CORE${t.cpuCores > 1 ? 'S' : ''}` : null)}</span>
      </div>
      <div className="nexa-tele-row">
        <span className="nexa-tele-label">CPU LOAD</span>
        <span className="nexa-tele-value">{valueOrNa(t.cpuLoadPct !== null ? `${t.cpuLoadPct}%` : null)}</span>
      </div>
      <div className="nexa-tele-row">
        <span className="nexa-tele-label"><MemoryStick className="w-3 h-3" /> DEVICE RAM</span>
        <span className="nexa-tele-value">{valueOrNa(t.ramGB !== null ? `${t.ramGB} GB` : null)}</span>
      </div>
      <div className="nexa-tele-row">
        <span className="nexa-tele-label">JS HEAP</span>
        <span className="nexa-tele-value">{valueOrNa(t.jsHeapMB !== null ? `${t.jsHeapMB} MB` : null)}</span>
      </div>
      <div className="nexa-tele-row">
        <span className="nexa-tele-label"><Gauge className="w-3 h-3" /> GPU</span>
        <span className="nexa-tele-value nexa-tele-value-tight">{valueOrNa(t.gpuRenderer)}</span>
      </div>
      <div className="nexa-tele-row">
        <span className="nexa-tele-label"><Wifi className="w-3 h-3" /> NETWORK</span>
        <span className="nexa-tele-value">
          {t.online === null ? 'N/A' : t.online ? 'CONNECTED' : 'OFFLINE'}
          {t.networkType ? ` · ${t.networkType}` : ''}
        </span>
      </div>
      <div className="nexa-tele-row">
        <span className="nexa-tele-label">LATENCY</span>
        <span className="nexa-tele-value">{valueOrNa(t.latencyMs !== null ? `${t.latencyMs} ms` : null)}</span>
      </div>
      <div className="nexa-tele-row">
        <span className="nexa-tele-label"><Clock3 className="w-3 h-3" /> UPTIME</span>
        <span className="nexa-tele-value">{formatUptime(t.uptimeSeconds)}</span>
      </div>
      <div className="nexa-tele-row">
        <span className="nexa-tele-label"><BatteryCharging className="w-3 h-3" /> BATTERY</span>
        <span className="nexa-tele-value">
          {t.batteryLevelPct === null
            ? 'N/A'
            : `${t.batteryLevelPct}%${t.batteryCharging ? ' · CHARGING' : ''}`}
        </span>
      </div>
      <div className="nexa-tele-row">
        <span className="nexa-tele-label">PLATFORM</span>
        <span className="nexa-tele-value nexa-tele-value-tight">{valueOrNa(t.platform)}</span>
      </div>

      <div className="nexa-tele-note">
        <span className="nexa-tele-note-dot" />
        LIVE DEVICE DATA — UNAVAILABLE METRICS SHOWN AS N/A
      </div>
    </aside>
  );
};