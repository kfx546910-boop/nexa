/**
 * NEXA // VOICE CENTER
 * Dedicated voice module: click-to-talk, wake word state, TTS engine state
 * and a real "test voice" action.
 */

import React from 'react';
import { Mic, AudioLines, Volume2, Radio, ShieldCheck } from 'lucide-react';
import { useNexaSystem } from '../state/NexaSystemContext';
import { NexaVoiceControl } from './NexaVoiceControl';
import { DEFAULT_VOICE_CONFIG } from '../voice/voicePipeline';

export const NexaVoiceCenter: React.FC = () => {
  const { voice, ttsSupported, speak, pushEvent, settings } = useNexaSystem();

  const testVoice = () => {
    pushEvent('VOICE', 'Speech synthesis test requested.', 'voice');
    speak('NEXA voice channel online. All systems operational.');
  };

  return (
    <section className="nexa-module-surface">
      <div className="nexa-module-header">
        <div className="nexa-module-title">
          <Mic className="w-5 h-5" />
          <div>
            <h2>VOICE INTERFACE</h2>
            <p>Real speech recognition and synthesis — no simulated audio</p>
          </div>
        </div>
      </div>

      <div className="nexa-voice-big-console">
        <NexaVoiceControl />
      </div>

      <div className="nexa-voice-stats">
        <div className="nexa-voice-stat">
          <span className="nexa-voice-stat-label"><AudioLines className="w-3 h-3" /> SPEECH RECOGNITION</span>
          <span className={`nexa-voice-stat-value ${voice.supported ? 'ok' : 'warn'}`}>{voice.supported ? 'AVAILABLE' : 'N/A'}</span>
        </div>
        <div className="nexa-voice-stat">
          <span className="nexa-voice-stat-label"><Volume2 className="w-3 h-3" /> SPEECH SYNTHESIS</span>
          <span className={`nexa-voice-stat-value ${ttsSupported ? 'ok' : 'warn'}`}>{ttsSupported ? 'AVAILABLE' : 'N/A'}</span>
        </div>
        <div className="nexa-voice-stat">
          <span className="nexa-voice-stat-label"><Radio className="w-3 h-3" /> WAKE WORD</span>
          <span className={`nexa-voice-stat-value ${settings.wakeWordEnabled ? 'ok' : 'warn'}`}>
            {settings.wakeWordEnabled ? DEFAULT_VOICE_CONFIG.wakeWord.primary : 'DISABLED'}
          </span>
        </div>
        <div className="nexa-voice-stat">
          <span className="nexa-voice-stat-label">MICROPHONE</span>
          <span className={`nexa-voice-stat-value ${voice.active ? 'ok' : ''}`}>{voice.active ? 'ACTIVE' : 'STANDBY'}</span>
        </div>
      </div>

      <div className="nexa-voice-actions-panel">
        <button type="button" onClick={testVoice} className="nexa-action-btn" disabled={!ttsSupported}>
          <Volume2 className="w-4 h-4" />
          <span>TEST VOICE OUTPUT</span>
        </button>
        <p className="nexa-voice-privacy">
          <ShieldCheck className="w-3 h-3" />
          Audio is processed locally by the browser. No audio stream leaves this device.
        </p>
      </div>
    </section>
  );
};