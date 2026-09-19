/**
 * NEXA // SYSTEM CONTEXT
 * React adapter over the central `nexaSystem` singleton. Every HUD panel,
 * module and overlay reads live state and calls back through this provider.
 */

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  nexaSystem,
  type NexaEventItem,
  type NexaNotification,
  type NexaNotificationLevel,
  type NexaSecurityGateRequest,
  type NexaSettings,
  type NexaUiState,
  type NexaVoiceState,
  type UiSoundKind
} from './nexaSystem';
import type { NexaTelemetrySnapshot } from './telemetry';

export interface NexaSystemValue {
  uiState: NexaUiState;
  statusLabel: string;
  events: NexaEventItem[];
  notifications: NexaNotification[];
  telemetry: NexaTelemetrySnapshot;
  settings: NexaSettings;
  voice: NexaVoiceState;
  ttsSupported: boolean;
  booted: boolean;
  setUiState: (state: NexaUiState, label?: string) => void;
  resetToIdle: () => void;
  pushEvent: (source: string, message: string, kind?: NexaEventItem['kind']) => void;
  notify: (level: NexaNotificationLevel, title: string, message: string, detail?: string) => void;
  dismissNotification: (id: number) => void;
  setVoice: (patch: Partial<NexaVoiceState>) => void;
  speak: (text: string) => boolean;
  interruptSpeech: () => void;
  updateSettings: (patch: Partial<NexaSettings>) => void;
  requestGate: (request: { title: string; message: string; confirmLabel: string; cancelLabel?: string; callback: (authorized: boolean) => void }) => void;
  securityGate: NexaSecurityGateRequest | null;
  resolveGate: (authorized: boolean) => void;
  cancelGate: () => void;
  playUiSound: (kind: UiSoundKind) => void;
}

const NexaSystemContext = createContext<NexaSystemValue | null>(null);

export const NexaSystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [, setTick] = useState(0);

  useEffect(() => nexaSystem.subscribe(() => setTick(tick => tick + 1)), []);

  const value = useMemo<NexaSystemValue>(
    () => ({
      uiState: nexaSystem.uiState,
      statusLabel: nexaSystem.statusLabel,
      events: nexaSystem.events,
      notifications: nexaSystem.notifications,
      telemetry: nexaSystem.telemetry,
      settings: nexaSystem.settings,
      voice: nexaSystem.voice,
      ttsSupported: nexaSystem.ttsSupported,
      booted: nexaSystem.booted,
      setUiState: (state, label) => nexaSystem.setState(state, label),
      resetToIdle: () => nexaSystem.resetToIdle(),
      pushEvent: (source, message, kind) => nexaSystem.pushEvent(source, message, kind),
      notify: (level, title, message, detail) => nexaSystem.notify(level, title, message, detail),
      dismissNotification: id => nexaSystem.dismissNotification(id),
      setVoice: patch => nexaSystem.setVoice(patch),
      speak: text => nexaSystem.speak(text),
      interruptSpeech: () => nexaSystem.interruptSpeech(),
      updateSettings: patch => nexaSystem.updateSettings(patch),
      requestGate: request => nexaSystem.requestGate(request),
      securityGate: nexaSystem.securityGate,
      resolveGate: authorized => nexaSystem.resolveGate(authorized),
      cancelGate: () => nexaSystem.cancelGate(),
      playUiSound: kind => nexaSystem.playUiSound(kind)
    }),
    // subscribe() triggers setTick on every change
    [],
  );

  return <NexaSystemContext.Provider value={value}>{children}</NexaSystemContext.Provider>;
};

export function useNexaSystem(): NexaSystemValue {
  const value = useContext(NexaSystemContext);
  if (!value) throw new Error('useNexaSystem() must be used inside <NexaSystemProvider>.');
  return value;
}