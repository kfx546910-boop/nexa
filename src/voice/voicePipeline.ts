export type VoiceRisk = 'low' | 'medium' | 'high';

export type VoiceIntent =
  | 'unknown'
  | 'open_application'
  | 'close_application'
  | 'system_status'
  | 'file_search'
  | 'vision_query'
  | 'volume_up'
  | 'volume_down'
  | 'mute'
  | 'unmute'
  | 'stop_current_operation'
  | 'cancel_current_operation'
  | 'identity_query'
  | 'local_time_query'
  | 'confirm_action'
  | 'cancel_action';

export interface VoiceCommandDescriptor {
  raw: string;
  normalized: string;
  intent: VoiceIntent;
  target?: string;
  risk: VoiceRisk;
  requiresConfirmation: boolean;
  confidence: number;
  wakeWordDetected: boolean;
}

export const DEFAULT_VOICE_CONFIG = {
  enabled: true,
  wakeWord: {
    enabled: true,
    primary: 'NEXA',
    alternatives: ['Hey NEXA', 'NEXOUS', 'Hey NEXOUS']
  },
  stt: {
    enabled: true,
    engine: 'local',
    languageMode: 'auto'
  },
  tts: {
    enabled: true,
    engine: 'local',
    voice: 'default',
    speed: 1.0,
    pitch: 1.0,
    volume: 1.0
  },
  conversation: {
    followUpEnabled: true,
    timeoutSeconds: 8
  },
  privacy: {
    localProcessingPreferred: true,
    storeAudio: false
  }
};

export class WakeWordDetector {
  enabled = DEFAULT_VOICE_CONFIG.wakeWord.enabled;
  primary = DEFAULT_VOICE_CONFIG.wakeWord.primary;
  alternatives = DEFAULT_VOICE_CONFIG.wakeWord.alternatives;

  matches(input: string): boolean {
    const normalized = this.normalize(input);
    if (!normalized) return false;
    const variants = [this.primary.toLowerCase(), ...this.alternatives.map(item => item.toLowerCase())];
    return variants.some(variant => normalized.includes(this.normalize(variant)));
  }

  normalize(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export class VoiceCommandNormalizer {
  static isWakeWord(input: string): boolean {
    return new WakeWordDetector().matches(input);
  }

  static isConfirmation(input: string): boolean {
    const normalized = input.toLowerCase().trim();
    return /(yes|haan|हाँ|confirm|proceed|kar do|continue|do it|sure|go ahead)/i.test(normalized);
  }

  static isCancellation(input: string): boolean {
    const normalized = input.toLowerCase().trim();
    return /(cancel|no|nahi|nahin|stop|ruko|bas|abort|never mind)/i.test(normalized);
  }

  static isVoiceCommand(input: string): boolean {
    const match = new VoiceIntentRouter().route(input);
    return match.intent !== 'unknown';
  }

  normalize(raw: string): VoiceCommandDescriptor {
    const base = raw.trim();
    if (!base) {
      return {
        raw: '',
        normalized: '',
        intent: 'unknown',
        risk: 'low',
        requiresConfirmation: false,
        confidence: 0.0,
        wakeWordDetected: false
      };
    }

    const wakeWordDetected = new WakeWordDetector().matches(base);
    const withoutWakeWord = wakeWordDetected ? base.replace(/^(?:hey\s+)?nexous\s*/i, '').trim() : base;
    const normalized = withoutWakeWord
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const lower = normalized.toLowerCase();

    if (!normalized) {
      return {
        raw: base,
        normalized: '',
        intent: 'unknown',
        risk: 'low',
        requiresConfirmation: false,
        confidence: 0.0,
        wakeWordDetected
      };
    }

    const match = this.matchIntent(lower);
    return {
      raw: base,
      normalized,
      ...match,
      wakeWordDetected
    };
  }

  private matchIntent(lower: string): Omit<VoiceCommandDescriptor, 'raw' | 'normalized' | 'wakeWordDetected'> {
    if (/(^|\s)(stop|cancel|bas|ruko|halt|abort)(\s|$)/i.test(lower)) {
      return { intent: 'stop_current_operation', risk: 'low', requiresConfirmation: false, confidence: 0.97 };
    }

    if (/(^|\s)(volume\s+(up|badhao|increase|badhai)|increase volume|louder)(\s|$)/i.test(lower)) {
      return { intent: 'volume_up', risk: 'low', requiresConfirmation: false, confidence: 0.94 };
    }

    if (/(^|\s)(volume\s+(down|kam|decrease|ghatao)|decrease volume|lower volume|mute|unmute)(\s|$)/i.test(lower)) {
      return { intent: lower.includes('mute') ? 'mute' : lower.includes('unmute') ? 'unmute' : 'volume_down', risk: 'low', requiresConfirmation: false, confidence: 0.94 };
    }

    if (/(^|\s)(system status|mera system status|system ka status|status batao|cpu kitna use|ram kitni available|memory status)(\s|$)/i.test(lower)) {
      return { intent: 'system_status', risk: 'low', requiresConfirmation: false, confidence: 0.95 };
    }

    if (/(what do you see|what is in front of me|what is this|read this|read the screen|what does this document say|describe the scene|look at this|find my phone|where is my phone|is there a person here|how many people are there)/i.test(lower)) {
      return { intent: 'vision_query', risk: 'low', requiresConfirmation: false, confidence: 0.95 };
    }

    if (/(who am i|mera naam kya hai|main kaun hoon|who are you|who made you|what can you do|what time is it|kitna time hua|current time|current date)/i.test(lower)) {
      return { intent: /who am i|mera naam kya hai|main kaun hoon/i.test(lower) ? 'identity_query' : /what time is it|kitna time hua|current time|current date/i.test(lower) ? 'local_time_query' : 'unknown', risk: 'low', requiresConfirmation: false, confidence: 0.9 };
    }

    if (/(delete|remove|destroy|wipe|format|uninstall|shutdown|restart|kill|rm -rf|delete.*folder|delete.*file)/i.test(lower)) {
      return { intent: 'unknown', risk: 'high', requiresConfirmation: true, confidence: 0.87 };
    }

    if (/(chrome|browser|google)(.*(khol|open|launch)|\s+(open|khol|launch))/i.test(lower) || /open chrome|chrome kholo|chrome open karo|browser kholo|launch chrome/i.test(lower)) {
      return { intent: 'open_application', target: 'chrome', risk: 'low', requiresConfirmation: false, confidence: 0.95 };
    }

    if (/(notepad|text editor)(.*(khol|open|launch)|\s+(open|khol|launch))/i.test(lower) || /notepad kholo|notepad open karo|open notepad/i.test(lower)) {
      return { intent: 'open_application', target: 'notepad', risk: 'low', requiresConfirmation: false, confidence: 0.93 };
    }

    if (/(notepad|text editor).*(band|close|close karo|close kar do|khatam)/i.test(lower) || /notepad band karo|close notepad/i.test(lower)) {
      return { intent: 'close_application', target: 'notepad', risk: 'medium', requiresConfirmation: false, confidence: 0.92 };
    }

    if (/(downloads|download folder).*(pdf|search|dhundo|find|file search|search karo)/i.test(lower) || /downloads.*pdf.*dhundo|pdf.*downloads.*search/i.test(lower)) {
      return { intent: 'file_search', target: 'downloads_pdf', risk: 'low', requiresConfirmation: false, confidence: 0.92 };
    }

    if (/(search|dhundo|find).*(pdf|file)/i.test(lower)) {
      return { intent: 'file_search', target: 'pdf', risk: 'low', requiresConfirmation: false, confidence: 0.9 };
    }

    if (/confirm|proceed|continue|kar do|haan|हाँ|yes/i.test(lower)) {
      return { intent: 'confirm_action', risk: 'low', requiresConfirmation: false, confidence: 0.91 };
    }

    if (/cancel|no|nahi|nahin|ruko|bas/i.test(lower)) {
      return { intent: 'cancel_action', risk: 'low', requiresConfirmation: false, confidence: 0.9 };
    }

    return { intent: 'unknown', risk: 'low', requiresConfirmation: false, confidence: 0.35 };
  }
}

export class VoiceIntentRouter {
  route(input: string): VoiceCommandDescriptor {
    return new VoiceCommandNormalizer().normalize(input);
  }
}

export class VoiceConversationManager {
  private followUpEnabled = true;
  private timeoutSeconds = 8;
  private lastActivityAt = 0;

  constructor(config: { followUpEnabled?: boolean; timeoutSeconds?: number } = {}) {
    this.followUpEnabled = config.followUpEnabled ?? DEFAULT_VOICE_CONFIG.conversation.followUpEnabled;
    this.timeoutSeconds = config.timeoutSeconds ?? DEFAULT_VOICE_CONFIG.conversation.timeoutSeconds;
    this.lastActivityAt = Date.now();
  }

  touch(): void {
    this.lastActivityAt = Date.now();
  }

  isActive(): boolean {
    return this.followUpEnabled && Date.now() - this.lastActivityAt <= this.timeoutSeconds * 1000;
  }

  reset(): void {
    this.lastActivityAt = 0;
  }
}

export class SpeechSynthesizer {
  speak(text: string): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = DEFAULT_VOICE_CONFIG.tts.speed;
    utterance.pitch = DEFAULT_VOICE_CONFIG.tts.pitch;
    utterance.volume = DEFAULT_VOICE_CONFIG.tts.volume;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    return true;
  }

  cancel(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
  }
}

export class VoiceInterruptController {
  interrupt(): boolean {
    const synth = new SpeechSynthesizer();
    synth.cancel();
    return true;
  }
}

export class VoiceManager {
  public config = DEFAULT_VOICE_CONFIG;
  private wakeWordDetector = new WakeWordDetector();
  private conversationManager = new VoiceConversationManager();
  private synthesizer = new SpeechSynthesizer();
  private interruptController = new VoiceInterruptController();

  isWakeWord(input: string): boolean {
    return this.wakeWordDetector.matches(input);
  }

  isConversationActive(): boolean {
    return this.conversationManager.isActive();
  }

  touchConversation(): void {
    this.conversationManager.touch();
  }

  speak(text: string): boolean {
    return this.synthesizer.speak(text);
  }

  interrupt(): boolean {
    return this.interruptController.interrupt();
  }
}
