/**
 * NEXA // SETTINGS CENTER — real config surface, persisted locally.
 */

import React, { useState } from 'react';
import {
  Settings2, Sparkles, Database, Boxes, FlaskConical, ShieldCheck, Eye, Mic,
  Sliders, Gauge, Code2, Info, Trash2
} from 'lucide-react';
import { useNexaSystem } from '../state/NexaSystemContext';
import { nexaSystem, formatUptime } from '../state/nexaSystem';
import { Capabilities } from '../components/Capabilities';
import { defaultMemoryStore } from '../engine/memoryStore';
import { defaultTokenizer } from '../engine/tokenizer';
import { defaultNexusNeuralCore } from '../engine/nexusNeuralCore';
import { NEXOUS_IDENTITY } from '../core/nexousCore';
import { useOwnerLock } from '../security/ownerLock';

type SettingsCategory =
  | 'general' | 'providers' | 'voice' | 'vision' | 'memory'
  | 'tools' | 'automation' | 'security' | 'appearance' | 'developer';

const CATEGORIES: { id: SettingsCategory; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'general', label: 'GENERAL', icon: Info },
  { id: 'providers', label: 'AI PROVIDERS', icon: Sparkles },
  { id: 'voice', label: 'VOICE', icon: Mic },
  { id: 'vision', label: 'VISION', icon: Eye },
  { id: 'memory', label: 'MEMORY', icon: Database },
  { id: 'tools', label: 'TOOLS', icon: Boxes },
  { id: 'automation', label: 'AUTOMATION', icon: FlaskConical },
  { id: 'security', label: 'SECURITY', icon: ShieldCheck },
  { id: 'appearance', label: 'APPEARANCE', icon: Sliders },
  { id: 'developer', label: 'DEVELOPER', icon: Code2 }
];

export const NexaSettings: React.FC = () => {
  const { settings, updateSettings, requestGate, pushEvent, notify } = useNexaSystem();
  const { lock, state } = useOwnerLock();
  const [category, setCategory] = useState<SettingsCategory>('general');

  const clearMemory = () => {
    requestGate({
      title: 'Purge all knowledge memory?',
      message: `This permanently deletes ${defaultMemoryStore.getAll().length} memory chunk(s) from local storage. This cannot be undone.`,
      confirmLabel: 'PURGE MEMORY',
      callback: authorized => {
        if (!authorized) {
          pushEvent('MEMORY', 'Memory purge cancelled by operator.', 'memory');
          return;
        }
        defaultMemoryStore.clear();
        pushEvent('MEMORY', 'All knowledge memory purged from local storage.', 'success');
        notify('success', 'Memory cleared', 'Knowledge store reset to empty.');
      }
    });
  };

  return (
    <section className="nexa-module-surface nexa-settings-surface">
      <div className="nexa-module-header">
        <div className="nexa-module-title">
          <Settings2 className="w-5 h-5" />
          <div>
            <h2>SYSTEM CONFIGURATION</h2>
            <p>Real settings, persisted locally on this device</p>
          </div>
        </div>
      </div>
      <div className="nexa-settings-layout">
        <nav className="nexa-settings-nav" aria-label="Settings categories" role="tablist">
          {CATEGORIES.map(({ id, label, icon: Icon }) => (
            <button key={id} role="tab" aria-selected={category === id} onClick={() => setCategory(id)}
              className={`nexa-settings-nav-item ${category === id ? 'active' : ''}`}>
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="nexa-settings-content">
          {category === 'general' && <GeneralSettings />}
          {category === 'providers' && <ProviderSettings />}
          {category === 'voice' && (
            <div className="nexa-settings-section">
              <h3 className="nexa-settings-h3">Voice & Speech</h3>
              <ToggleRow label="Wake word" checked={settings.wakeWordEnabled} onChange={value => updateSettings({ wakeWordEnabled: value })} />
              <ToggleRow label="Conversation follow-up" checked={settings.conversationFollowUp} onChange={value => updateSettings({ conversationFollowUp: value })} />
            </div>
          )}
          {category === 'vision' && <VisionSettings />}
          {category === 'memory' && (
            <div className="nexa-settings-section">
              <h3 className="nexa-settings-h3">Knowledge Memory</h3>
              <p className="nexa-settings-note">
                {defaultMemoryStore.getAll().length} chunk(s) stored in local browser storage. Vectors are computed on-device.
              </p>
              <button type="button" onClick={clearMemory} className="nexa-action-btn danger">
                <Trash2 className="w-3.5 h-3.5" />
                <span>PURGE ALL MEMORY</span>
              </button>
            </div>
          )}
          {category === 'tools' && <ToolsSettings />}
          {category === 'automation' && (
            <div className="nexa-settings-section">
              <h3 className="nexa-settings-h3">Automation</h3>
              <p className="nexa-settings-note">The automation engine runs fully on-device: training loops, gesture triggers and voice pipelines.</p>
            </div>
          )}
          {category === 'security' && (
            <div className="nexa-settings-section">
              <h3 className="nexa-settings-h3">Security & Privacy</h3>
              <p className="nexa-settings-note">Zero network telemetry. Prompts, weights, datasets and memory stay in local storage.</p>
              <p className="nexa-settings-note">Dangerous actions require operator confirmation through the security gate.</p>
              <p className="nexa-settings-note">Owner lock state: {state}. The lock protects private NEXA modules and expires after inactivity.</p>
              <button type="button" onClick={() => lock('manual')} className="nexa-action-btn danger">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>LOCK NEXA</span>
              </button>
            </div>
          )}
          {category === 'appearance' && <AppearanceSettings />}
          {category === 'developer' && <DeveloperSettings />}
        </div>
      </div>
    </section>
  );
};

/* ---------------- category views ---------------- */

function GeneralSettings() {
  const { telemetry } = useNexaSystem();
  const checkpoint = defaultNexusNeuralCore.getActiveCheckpoint();
  return (
    <div className="nexa-settings-section">
      <h3 className="nexa-settings-h3">General</h3>
      <InfoRow label="Identity" value={NEXOUS_IDENTITY.role} />
      <InfoRow label="Session uptime" value={formatUptime((Date.now() - nexaSystem.sessionStartedAt) / 1000)} />
      <InfoRow label="Active model" value={`${checkpoint.name} ${checkpoint.version}`} />
      <InfoRow label="Platform" value={telemetry.platform || 'N/A'} />
    </div>
  );
}

function ProviderSettings() {
  const geminiConfigured = Boolean(import.meta.env.GEMINI_API_KEY);
  const providers = [
    { name: 'LOCAL NEURAL ENGINE', state: 'ACTIVE', detail: 'On-device inference · always available', ok: true },
    { name: 'GEMINI', state: geminiConfigured ? 'CREDENTIALS PRESENT' : 'NOT CONFIGURED', detail: geminiConfigured ? 'API key detected in environment' : 'Set GEMINI_API_KEY to enable', ok: geminiConfigured },
    { name: 'CLAUDE', state: 'NOT CONFIGURED', detail: 'Requires provider credentials', ok: false },
    { name: 'OPENROUTER', state: 'NOT CONFIGURED', detail: 'Requires provider credentials', ok: false }
  ];
  return (
    <div className="nexa-settings-section">
      <h3 className="nexa-settings-h3">AI Providers</h3>
      <p className="nexa-settings-note">Real provider routing state. The local engine always remains available as fallback.</p>
      <div className="nexa-settings-provider-list">
        {providers.map(provider => (
          <div key={provider.name} className="nexa-settings-provider">
            <span className={`nexa-dot ${provider.ok ? 'online' : 'standby'}`} />
            <span className="nexa-settings-provider-name">{provider.name}</span>
            <span className={`nexa-settings-provider-state ${provider.ok ? '' : 'muted'}`}>{provider.state}</span>
            <span className="nexa-settings-provider-detail">{provider.detail}</span>
          </div>
        ))}
      </div>
      <Capabilities />
    </div>
  );
}

function VisionSettings() {
  return (
    <div className="nexa-settings-section">
      <h3 className="nexa-settings-h3">Vision</h3>
      <p className="nexa-settings-note">
        The vision pipeline (camera detection, object detection, OCR) is local-only by design.
        Enable the camera from the GESTURE CONTROL panel or the VISION module.
      </p>
    </div>
  );
}

function ToolsSettings() {
  return (
    <div className="nexa-settings-section">
      <h3 className="nexa-settings-h3">Tools</h3>
      <p className="nexa-settings-note">
        Files, camera, microphone, speech, knowledge, benchmarks and automation tools are all available.
        Permissions are granted per-action through the security gate.
      </p>
    </div>
  );
}

function AppearanceSettings() {
  const { settings, updateSettings, playUiSound } = useNexaSystem();
  const intensities = ['minimal', 'standard', 'cinematic'] as const;
  return (
    <div className="nexa-settings-section">
      <h3 className="nexa-settings-h3">Appearance</h3>
      <div className="nexa-settings-row">
        <span className="nexa-settings-label">Animation intensity</span>
        <div className="nexa-settings-seg">
          {intensities.map(option => (
            <button key={option} type="button"
              className={`nexa-settings-seg-btn ${settings.animationIntensity === option ? 'active' : ''}`}
              onClick={() => updateSettings({ animationIntensity: option })}>
              {option.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <ToggleRow label="Reduced motion" checked={settings.reducedMotion} onChange={value => updateSettings({ reducedMotion: value })} />
      <ToggleRow label="Interface sounds" checked={settings.soundEnabled} onChange={value => { updateSettings({ soundEnabled: value }); if (value) playUiSound('success'); }} />
    </div>
  );
}

function DeveloperSettings() {
  const { settings, updateSettings, telemetry, events } = useNexaSystem();
  const checkpoint = defaultNexusNeuralCore.getActiveCheckpoint();
  return (
    <div className="nexa-settings-section">
      <h3 className="nexa-settings-h3">Developer Diagnostics</h3>
      <ToggleRow label="Developer mode" checked={settings.devMode} onChange={value => updateSettings({ devMode: value })} />
      <div className="nexa-dev-grid">
        <InfoRow label="Params" value={checkpoint.parametersCount.toLocaleString()} />
        <InfoRow label="Vocab size" value={String(defaultTokenizer.getVocabSize())} />
        <InfoRow label="JS heap" value={telemetry.jsHeapMB !== null ? `${telemetry.jsHeapMB} MB` : 'N/A'} />
        <InfoRow label="Event count" value={String(events.length)} />
        <InfoRow label="RAM" value={telemetry.ramGB !== null ? `${telemetry.ramGB} GB` : 'N/A'} />
        <InfoRow label="Cores" value={telemetry.cpuCores !== null ? String(telemetry.cpuCores) : 'N/A'} />
      </div>
      <p className="nexa-settings-note">Developer mode reveals technical details in the interface. Raw stack traces are never shown to normal users.</p>
    </div>
  );
}

/* ---------------- primitives ---------------- */

function ToggleRow({ label, detail, checked, onChange }: { label: string; detail?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="nexa-settings-row">
      <span className="nexa-settings-label">
        {label}
        {detail && <span className="nexa-settings-sub">{detail}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`nexa-toggle ${checked ? 'on' : ''}`}
      >
        <span className="nexa-toggle-knob" />
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="nexa-info-row">
      <span>{label}</span>
      <span className="nexa-mono">{value}</span>
    </div>
  );
}