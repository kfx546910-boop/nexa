/**
 * NEXA // AUTONOMOUS CORE — central system state
 *
 * A lightweight event-driven singleton that every HUD component, module and
 * overlay reads from and writes to. It holds the canonical UI state machine
 * (IDLE / LISTENING / THINKING / SPEAKING / EXECUTING / SUCCESS / WARNING /
 * ERROR / OFFLINE), the live event stream, notifications, real telemetry,
 * user settings and voice state.
 */

import { formatUptime, nexaTelemetryCache, readTelemetry, type NexaTelemetrySnapshot } from './telemetry';

export type NexaUiState =
  | 'IDLE'
  | 'LISTENING'
  | 'THINKING'
  | 'SPEAKING'
  | 'EXECUTING'
  | 'SUCCESS'
  | 'WARNING'
  | 'ERROR'
  | 'OFFLINE';

export type NexaEventKind =
  | 'system'
  | 'voice'
  | 'user'
  | 'ai'
  | 'tool'
  | 'memory'
  | 'vision'
  | 'nav'
  | 'error'
  | 'warning'
  | 'success';

export type NexaNotificationLevel = 'info' | 'success' | 'warning' | 'error';

export interface NexaEventItem {
  id: number;
  at: number;
  source: string;
  message: string;
  kind: NexaEventKind;
}

export interface NexaNotification {
  id: number;
  level: NexaNotificationLevel;
  title: string;
  message: string;
  detail?: string;
  createdAt: number;
}

export interface NexaSettings {
  animationIntensity: 'minimal' | 'standard' | 'cinematic';
  soundEnabled: boolean;
  reducedMotion: boolean;
  devMode: boolean;
  wakeWordEnabled: boolean;
  conversationFollowUp: boolean;
}

export interface NexaVoiceState {
  supported: boolean;
  active: boolean;
  speaking: boolean;
  transcript: string;
  error: string | null;
}

export interface NexaSecurityGateRequest {
  id: number;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  callback: (authorized: boolean) => void;
}

export type UiSoundKind = 'startup' | 'command' | 'success' | 'warning' | 'error';

const SETTINGS_KEY = 'nexa_settings_v1';
export const MAX_EVENTS = 120;
export const MAX_NOTIFICATIONS = 5;

const DEFAULT_SETTINGS: NexaSettings = {
  animationIntensity: 'standard',
  soundEnabled: true,
  reducedMotion: false,
  devMode: false,
  wakeWordEnabled: true,
  conversationFollowUp: true
};

function loadSettings(): NexaSettings {
  try {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_SETTINGS };
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(saved) as Partial<NexaSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function persistSettings(settings: NexaSettings) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable */
  }
}

function detectSpeechSupport(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      (!!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition)
    );
  } catch {
    return false;
  }
}

function detectTtsSupport(): boolean {
  try {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  } catch {
    return false;
  }
}

function now(): number {
  return Date.now();
}

class NexaSystem {
  private listeners = new Set<() => void>();
  private idCounter = 1;

  uiState: NexaUiState = 'IDLE';
  statusLabel = 'READY';
  events: NexaEventItem[] = [];
  notifications: NexaNotification[] = [];
  telemetry: NexaTelemetrySnapshot = { ...nexaTelemetryCache };
  settings: NexaSettings = loadSettings();
  voice: NexaVoiceState = {
    supported: detectSpeechSupport(),
    active: false,
    speaking: false,
    transcript: '',
    error: null
  };
  ttsSupported: boolean = detectTtsSupport();
  booted = false;
  securityGate: NexaSecurityGateRequest | null = null;
  sessionStartedAt: number = now();

  private telemetryTimer: number | null = null;
  private audioContext: AudioContext | null = null;
  private audioReady = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Refresh telemetry periodically so uptime / heap / battery stay live.
      this.telemetryTimer = window.setInterval(() => {
        const next = readTelemetry();
        // Merge async battery patches from the cache.
        next.batteryLevelPct = nexaTelemetryCache.batteryLevelPct;
        next.batteryCharging = nexaTelemetryCache.batteryCharging;
        this.telemetry = next;
        this.bump();
      }, 2000);
    }
  }

  /* ---------------- pub/sub ---------------- */

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  bump(): void {
    for (const listener of this.listeners) listener();
  }

  /* ---------------- state machine ---------------- */

  setState(state: NexaUiState, label?: string): void {
    this.uiState = state;
    if (label) this.statusLabel = label;
    this.bump();
  }

  /** Return to idle unless an active task overrides it. */
  resetToIdle(): void {
    if (this.voice.active) {
      this.setState('LISTENING', 'LISTENING...');
      return;
    }
    if (this.voice.speaking) {
      this.setState('SPEAKING', 'SPEAKING...');
      return;
    }
    this.setState('IDLE', 'READY');
  }

  /* ---------------- event stream ---------------- */

  pushEvent(source: string, message: string, kind: NexaEventKind = 'system'): void {
    this.events.unshift({ id: this.idCounter++, at: now(), source, message, kind });
    if (this.events.length > MAX_EVENTS) this.events.length = MAX_EVENTS;
    this.bump();
  }

  /* ---------------- notifications ---------------- */

  notify(level: NexaNotificationLevel, title: string, message: string, detail?: string): void {
    this.notifications.unshift({
      id: this.idCounter++,
      level,
      title,
      message,
      detail,
      createdAt: now()
    });
    if (this.notifications.length > MAX_NOTIFICATIONS) this.notifications.length = MAX_NOTIFICATIONS;
    this.bump();
  }

  dismissNotification(id: number): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.bump();
  }

  /* ---------------- voice ---------------- */

  setVoice(patch: Partial<NexaVoiceState>): void {
    this.voice = { ...this.voice, ...patch };
    this.bump();
  }

  /** Speak text through the real OS TTS layer. */
  speak(text: string): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.setVoice({ speaking: false });
      this.pushEvent('VOICE', 'Speech synthesis unavailable on this device.', 'error');
      return false;
    }
    try {
      const clean = text
        .replace(/```[\s\S]*?```/g, 'Code block omitted.')
        .replace(/[*_#`>~]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!clean) return false;

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      const finish = () => {
        this.setVoice({ speaking: false });
        this.pushEvent('VOICE', 'Voice response complete.', 'voice');
        this.resetToIdle();
      };
      utterance.onend = finish;
      utterance.onerror = finish;

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      this.setVoice({ speaking: true });
      this.setState('SPEAKING', 'SPEAKING...');
      return true;
    } catch (error) {
      this.setVoice({ speaking: false });
      this.pushEvent('VOICE', 'Speech synthesis failed: ' + (error instanceof Error ? error.message : 'unknown'), 'error');
      return false;
    }
  }

  /** Interrupt any active AI speech and stop listening. */
  interruptSpeech(): void {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      /* ignore */
    }
    this.setVoice({ speaking: false, active: false });
    this.resetToIdle();
  }

  /* ---------------- security gate ---------------- */

  requestGate(request: Omit<NexaSecurityGateRequest, 'id'>): void {
    this.securityGate = { ...request, id: this.idCounter++ };
    this.bump();
  }

  resolveGate(authorized: boolean): void {
    const gate = this.securityGate;
    this.securityGate = null;
    if (gate) gate.callback(authorized);
    this.bump();
  }

  cancelGate(): void {
    this.securityGate = null;
    this.bump();
  }

  /* ---------------- settings ---------------- */

  updateSettings(patch: Partial<NexaSettings>): void {
    this.settings = { ...this.settings, ...patch };
    persistSettings(this.settings);
    this.bump();
  }

  /* ---------------- boot ---------------- */

  completeBoot(): void {
    this.booted = true;
    this.bump();
  }

/* ---------------- audible feedback (subtle UI sounds) ---------------- */

  private ensureAudio(): AudioContext | null {
    if (this.audioReady && this.audioContext) return this.audioContext;
    try {
      if (typeof AudioContext === 'undefined') return null;
      if (!this.audioContext) this.audioContext = new AudioContext();
      if (this.audioContext.state === 'suspended') void this.audioContext.resume();
      this.audioReady = true;
      return this.audioContext;
    } catch {
      return null;
    }
  }

  private tone(frequency: number, startSeconds: number, durationSeconds: number, volume: number): void {
    const audio = this.ensureAudio();
    if (!audio) return;
    try {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const amplitude = Math.max(0.01, Math.min(0.08, volume));
      oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      const startAt = audio.currentTime + startSeconds;
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(amplitude, startAt + 0.008);
      gain.gain.linearRampToValueAtTime(0, startAt + durationSeconds - 0.02);
      oscillator.start(startAt);
      oscillator.stop(startAt + durationSeconds);
    } catch {
      /* audio unavailable */
    }
  }

  playUiSound(kind: UiSoundKind): void {
    if (!this.settings.soundEnabled || this.settings.reducedMotion) return;
    try {
      switch (kind) {
        case 'startup':
          this.tone(340, 0, 0.24, 0.05);
          this.tone(510, 0.22, 0.28, 0.05);
          break;
        case 'command':
          this.tone(720, 0, 0.12, 0.045);
          break;
        case 'success':
          this.tone(640, 0, 0.1, 0.045);
          this.tone(860, 0.1, 0.14, 0.045);
          break;
        case 'warning':
          this.tone(300, 0, 0.16, 0.05);
          this.tone(240, 0.16, 0.18, 0.05);
          break;
        case 'error':
          this.tone(180, 0, 0.22, 0.06);
          break;
      }
    } catch {
      /* ignore audio errors */
    }
  }
}

/** Single shared application instance. */
export const nexaSystem = new NexaSystem();

/** Format a timestamp for the event terminal. */
export function formatEventTime(at: number): string {
  const date = new Date(at);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export { formatUptime };

/* ---------------- imperative bridge helpers ----------------
 * Components far from the React provider can emit state changes without
 * importing context (e.g. inside async callbacks).
 */

export function emitState(state: NexaUiState, label?: string): void {
  nexaSystem.setState(state, label);
}

export function emitEvent(source: string, message: string, kind: NexaEventKind = 'system'): void {
  nexaSystem.pushEvent(source, message, kind);
}

export function emitNotify(level: NexaNotificationLevel, title: string, message: string, detail?: string): void {
  nexaSystem.notify(level, title, message, detail);
}

/** Dispatch a window event that other components can react to. */
export function dispatchNexaEvent(name: string, detail: Record<string, unknown>): void {
  try {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(name, { detail }));
  } catch {
    /* ignore */
  }
}

const SPEECH_WINDOW: any = typeof window !== 'undefined' ? window : null;

/** Start the platform speech recognizer (real Web Speech API). */
export function startSpeechRecognition(): any | null {
  try {
    const SpeechRecognition = SPEECH_WINDOW?.SpeechRecognition || SPEECH_WINDOW?.webkitSpeechRecognition;
    return SpeechRecognition ? new SpeechRecognition() : null;
  } catch {
    return null;
  }
}

/** True when the platform exposes TTS synthesis. */
export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}