/**
 * NEXA // VOICE CONTROL
 * Real speech interaction using the platform Web Speech API (same engine as
 * the rest of the app). Click-to-talk, live interim transcript, listening
 * state on the core, and speech interruption are all wired to real state.
 */

import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Square, Volume2, VolumeX, Radio } from 'lucide-react';
import { useNexaSystem } from '../state/NexaSystemContext';
import { dispatchNexaEvent, startSpeechRecognition } from '../state/nexaSystem';

interface NexaVoiceControlProps {
  onCommand?: (transcript: string) => void;
}

export const NexaVoiceControl: React.FC<NexaVoiceControlProps> = ({ onCommand }) => {
  const { voice, uiState, setVoice, interruptSpeech, pushEvent, resetToIdle } = useNexaSystem();
  const recognitionRef = useRef<any>(null);
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;
  const activeRef = useRef(false);

  const finishListening = (finalText?: string) => {
    activeRef.current = false;
    setVoice({ active: false, transcript: '' });
    if (finalText) {
      if (typeof onCommandRef.current === 'function') onCommandRef.current(finalText);
      else dispatchNexaEvent('nexa:voice-command', { text: finalText });
    }
    pushEvent('VOICE', finalText ? 'Command received by voice.' : 'Microphone released.', 'voice');
    resetToIdle();
  };

  const beginListening = () => {
    const SpeechRecognition = startSpeechRecognition();
    if (!SpeechRecognition) {
      pushEvent('VOICE', 'Speech recognition is not available in this browser.', 'error');
      setVoice({ supported: false, error: 'Speech recognition unsupported.' });
      return;
    }
    try {
      SpeechRecognition.continuous = false;
      SpeechRecognition.interimResults = true;
      SpeechRecognition.lang = navigator.language || 'en-US';
      SpeechRecognition.maxAlternatives = 1;

      SpeechRecognition.onstart = () => {
        activeRef.current = true;
        setVoice({ active: true, transcript: '', error: null });
        pushEvent('VOICE', 'Microphone active — speaking to NEXA.', 'voice');
      };
      SpeechRecognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) final += transcript;
          else interim += transcript;
        }
        if (interim) setVoice({ transcript: interim });
        if (final) {
          const trimmed = final.trim();
          setVoice({ transcript: '' });
          dispatchNexaEvent('nexa:listening-transcript', { text: trimmed });
          finishListening(trimmed);
        }
      };
      SpeechRecognition.onerror = (event: any) => {
        setVoice({ error: String(event?.error || 'unknown') });
        finishListening();
      };

      recognitionRef.current = SpeechRecognition;
      SpeechRecognition.start();
    } catch (error) {
      setVoice({ error: error instanceof Error ? error.message : 'Speech start failed.' });
      pushEvent('VOICE', 'Speech recognition failed to start.', 'error');
    }
  };

  const toggleListening = () => {
    const isActive = activeRef.current || voice.active;
    if (isActive) {
      try {
        recognitionRef.current?.stop?.();
        recognitionRef.current = null;
      } catch {
        /* ignore */
      }
      finishListening();
    } else {
      beginListening();
    }
  };

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && activeRef.current) {
        try {
          recognitionRef.current?.stop?.();
        } catch {
          /* ignore */
        }
        finishListening();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      try {
        recognitionRef.current?.stop?.();
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isActive = voice.active;

  return (
    <div className={`nexa-voice-console ${uiState === 'LISTENING' ? 'listening' : ''}`}>
      <div className="nexa-voice-heading">
        <Radio className="w-3.5 h-3.5" />
        <span>VOICE CHANNEL</span>
        <span className="nexa-voice-link">{voice.supported ? 'LINK ACTIVE' : 'STT UNAVAILABLE'}</span>
      </div>

      <button
        type="button"
        onClick={toggleListening}
        aria-pressed={isActive}
        aria-label={isActive ? 'Stop speaking to NEXA' : 'Hold or click to talk to NEXA'}
        className={`nexa-voice-talk ${isActive ? 'active' : ''}`}
        title={isActive ? 'Stop listening' : 'Hold / Click to talk'}
      >
        {isActive ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        <span className="nexa-voice-talk-caption">{isActive ? 'LISTENING...' : 'HOLD / CLICK TO TALK'}</span>
        <span className="nexa-voice-talk-hint">
          {voice.supported
            ? (isActive ? 'Speak now — NEXA is listening' : 'Voice input is live on this device')
            : 'Speech recognition not supported here'}
        </span>
      </button>

      {isActive && (
        <div className="nexa-voice-transcript" aria-live="polite">
          <span className="nexa-voice-transcript-caret" />
          {voice.transcript || 'Listening...'}
        </div>
      )}

      {voice.error && !isActive && (
        <div className="nexa-voice-error" role="alert">
          <Square className="w-3 h-3" />
          {voice.error}
        </div>
      )}

      <div className="nexa-voice-actions">
        {voice.speaking && (
          <button type="button" onClick={interruptSpeech} className="nexa-voice-stop-speech">
            <VolumeX className="w-3.5 h-3.5" />
            <span>STOP SPEECH</span>
          </button>
        )}
        {voice.speaking && (
          <span className="nexa-voice-now-speaking" aria-live="polite">
            <Volume2 className="w-3 h-3" />
            NEXA SPEAKING
          </span>
        )}
      </div>
    </div>
  );
};

/** Route a transcript to any listening chat input. */
export function handleVoiceCommandText(text: string): void {
  dispatchNexaEvent('nexa:voice-command', { text });
}

/** Attach a handler for `nexa:voice-command` window events. */
export function onVoiceCommand(handler: (text: string) => void): () => void {
  const listener = (event: Event) => {
    const text = (event as CustomEvent).detail?.text as string;
    if (text && text.trim()) handler(text.trim());
  };
  window.addEventListener('nexa:voice-command', listener);
  return () => window.removeEventListener('nexa:voice-command', listener);
}