import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Send, 
  Square, 
  Paperclip, 
  Mic, 
  MicOff, 
  X, 
  FileText, 
  Sparkles, 
  Zap, 
  Radio, 
  RotateCcw,
  Check,
  AlertCircle,
  Volume2
} from 'lucide-react';
import { FileAttachment } from '../types/nexus';
import { dispatchNexaEvent } from '../state/nexaSystem';

interface ChatInputProps {
  onSendMessage: (prompt: string, attachments?: FileAttachment[]) => void;
  isGenerating: boolean;
  onStopGenerating: () => void;
  quickStarters?: { label: string; prompt: string; icon: any }[];
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isGenerating,
  onStopGenerating,
  quickStarters = []
}) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [autoTriggerModel, setAutoTriggerModel] = useState(true);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const speechRecognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const currentDictationRef = useRef<string>('');
  const autoTriggerRef = useRef<boolean>(true);
  const sendTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep refs in sync for asynchronous event handlers
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    autoTriggerRef.current = autoTriggerModel;
  }, [autoTriggerModel]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  // Initialize Web Speech API Recognition
  useEffect(() => {
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Automatically detects pause / speech end
      recognition.interimResults = true; // Provides real-time interim speech stream
      recognition.lang = navigator.language || 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
        setInterimTranscript('');
        dispatchNexaEvent('nexa:listening', { active: true });
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        if (interim) {
          setInterimTranscript(interim);
        }

        if (final) {
          const trimmedFinal = final.trim();
          setInterimTranscript('');
          currentDictationRef.current = trimmedFinal;
          setText(prev => (prev ? `${prev} ${trimmedFinal}` : trimmedFinal));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Web Speech Recognition error:', event.error);
        dispatchNexaEvent('nexa:listening', { active: false });
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone access was denied. Please allow microphone permission in browser settings.');
        } else if (event.error === 'no-speech') {
          setSpeechError('No speech was detected. Click Listen and try again.');
        } else if (event.error !== 'aborted') {
          setSpeechError(`Speech error: ${event.error}`);
        }
        setIsListening(false);
        setInterimTranscript('');
      };

      recognition.onend = () => {
        const wasActive = isListeningRef.current;
        setIsListening(false);
        setInterimTranscript('');
        dispatchNexaEvent('nexa:listening', { active: false });

        // If user was speaking and we have a dictation result, auto-trigger the local model!
        if (wasActive && autoTriggerRef.current) {
          const promptToSend = currentDictationRef.current || text.trim();
          if (promptToSend && !isGenerating) {
            // Small microtask delay to ensure UI state syncs smoothly
            sendTimerRef.current = setTimeout(() => {
              onSendMessage(promptToSend, attachments);
              setText('');
              setAttachments([]);
              currentDictationRef.current = '';
              if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
              }
            }, 300);
          }
        }
      };

      speechRecognitionRef.current = recognition;
    } catch (err) {
      console.warn('Failed to initialize Web Speech API:', err);
      setIsSpeechSupported(false);
    }

    return () => {
      if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [onSendMessage, isGenerating, attachments, text]);

  // Accept voice commands dispatched from the CORE voice control and send them.
  useEffect(() => {
    const handleVoiceCommand = (event: Event) => {
      const detail = (event as CustomEvent).detail as { text?: string } | undefined;
      const incoming = detail?.text?.trim();
      if (!incoming || isGenerating) return;
      const full = text.trim() ? `${text} ${incoming}` : incoming;
      setText('');
      onSendMessage(full, attachments);
    };
    window.addEventListener('nexa:voice-command', handleVoiceCommand);
    return () => window.removeEventListener('nexa:voice-command', handleVoiceCommand);
  }, [onSendMessage, text, attachments, isGenerating]);

  // Toggle Voice Dictation via 'Listen' Button
  const toggleListen = useCallback(() => {
    if (!isSpeechSupported || !speechRecognitionRef.current) {
      setSpeechError('Web Speech API is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isGenerating) {
      return;
    }

    if (isListening) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      setIsListening(false);
      setInterimTranscript('');
      dispatchNexaEvent('nexa:listening', { active: false });
    } else {
      setSpeechError(null);
      currentDictationRef.current = '';
      setInterimTranscript('');
      dispatchNexaEvent('nexa:listening', { active: true });
      try {
        speechRecognitionRef.current.start();
        setIsListening(true);
      } catch (err: any) {
        console.warn('Error starting speech recognition:', err);
        // If already started, try aborting and starting again
        try {
          speechRecognitionRef.current.abort();
          setTimeout(() => {
            speechRecognitionRef.current.start();
            setIsListening(true);
          }, 150);
        } catch (e) {
          setIsListening(false);
        }
      }
    }
  }, [isListening, isSpeechSupported, isGenerating]);

  // Immediate send from dictation banner
  const handleImmediateSendFromVoice = () => {
    if (speechRecognitionRef.current && isListening) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    const promptToSend = (interimTranscript ? `${text} ${interimTranscript}` : text).trim();
    if (promptToSend) {
      onSendMessage(promptToSend, attachments);
      setText('');
      setInterimTranscript('');
      setAttachments([]);
      currentDictationRef.current = '';
      setIsListening(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Keyboard shortcut Alt+L or Alt+V for Listen toggle
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'l' || e.key === 'L' || e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        toggleListen();
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [toggleListen]);

  const handleSend = () => {
    if ((!text.trim() && attachments.length === 0) || isGenerating) return;
    if (isListening && speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      setIsListening(false);
    }
    onSendMessage(text.trim(), attachments);
    setText('');
    setInterimTranscript('');
    setAttachments([]);
    currentDictationRef.current = '';
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    processFiles(Array.from(files));
  };

  const processFiles = (files: File[]) => {
    for (const file of files) {
      if (file.size > 1024 * 1024) {
        alert(`File ${file.name} is too large. Max allowed is 1MB.`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = event => {
        const content = event.target?.result as string;
        setAttachments(prev => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            type: file.type || 'text/plain',
            content
          }
        ]);
      };
      reader.readAsText(file);
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative w-full max-w-4xl mx-auto px-2 sm:px-4 py-2 transition-all ${
        isDragging ? 'scale-[1.01]' : ''
      }`}
    >
      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-20 bg-cyan-950/80 border-2 border-dashed border-cyan-400 rounded-3xl flex items-center justify-center backdrop-blur-sm pointer-events-none">
          <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
            <Paperclip className="w-5 h-5 animate-bounce" />
            <span>Drop code or documents here to attach</span>
          </div>
        </div>
      )}

      {/* Quick Starter Suggestions */}
      {quickStarters.length > 0 && !isListening && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-1 scrollbar-none">
          {quickStarters.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => onSendMessage(item.prompt)}
                disabled={isGenerating}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 text-xs font-medium transition-all shadow-sm active:scale-95 disabled:opacity-50"
              >
                <Icon className="w-3.5 h-3.5 text-cyan-400" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Active Voice Dictation HUD Banner */}
      {isListening && (
        <div 
          id="hud-voice-listening-banner"
          className="mb-2 p-3 rounded-2xl bg-gradient-to-r from-cyan-950/90 via-slate-900/95 to-purple-950/80 border border-cyan-500/60 shadow-xl shadow-cyan-950/40 animate-in fade-in slide-in-from-bottom-2 duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 backdrop-blur-md"
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Animated Equalizer Wave */}
            <div className="flex items-end gap-0.5 h-5 shrink-0 px-1 py-0.5 bg-cyan-950/80 border border-cyan-500/30 rounded-lg">
              <span className="w-1 bg-cyan-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-4" />
              <span className="w-1 bg-cyan-300 rounded-full animate-[pulse_0.9s_ease-in-out_infinite] h-2.5" />
              <span className="w-1 bg-emerald-400 rounded-full animate-[pulse_0.7s_ease-in-out_infinite] h-5" />
              <span className="w-1 bg-cyan-300 rounded-full animate-[pulse_0.8s_ease-in-out_infinite] h-3" />
              <span className="w-1 bg-cyan-400 rounded-full animate-[pulse_0.5s_ease-in-out_infinite] h-4.5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  Listening to prompt...
                </span>
                {autoTriggerModel ? (
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5" />
                    Auto-response on speech end
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-slate-400">
                    Manual send mode
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-200 truncate mt-0.5 font-medium">
                {interimTranscript || text ? (
                  <span className="italic text-cyan-100 font-sans">
                    "{interimTranscript || text}"
                  </span>
                ) : (
                  <span className="text-slate-400">
                    Speak clearly into your microphone...
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
            {(text || interimTranscript) && (
              <button
                type="button"
                id="btn-voice-send-now"
                onClick={handleImmediateSendFromVoice}
                className="px-3 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-950/40"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Now</span>
              </button>
            )}
            <button
              type="button"
              id="btn-voice-stop"
              onClick={toggleListen}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors"
            >
              Stop
            </button>
          </div>
        </div>
      )}

      {/* Speech Error Banner */}
      {speechError && (
        <div className="mb-2 p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{speechError}</span>
          </div>
          <button
            onClick={() => setSpeechError(null)}
            className="p-1 rounded hover:bg-rose-900/50 text-rose-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-2">
          {attachments.map((att, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/30 text-xs text-slate-200 shadow-md animate-in fade-in"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-medium truncate max-w-[150px]">{att.name}</span>
              <span className="text-[10px] text-slate-400">({Math.round(att.size / 1024)} KB)</span>
              <button
                onClick={() => removeAttachment(idx)}
                className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Box Card */}
      <div className={`nexa-chat-input-shell relative rounded-2xl sm:rounded-3xl overflow-hidden transition-all ${
        isListening 
          ? 'border-cyan-500/80 ring-2 ring-cyan-500/20' 
          : 'border-slate-800 focus-within:border-cyan-500/60'
      }`}>
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,.ts,.tsx,.js,.jsx,.py,.json,.csv,.md,.html,.css,.sql,.rs,.go"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex items-end px-3 py-2.5 gap-2">
          {/* File Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach file or code (or drag & drop)"
            className="p-2 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors shrink-0"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Multiline Expanding Textarea with Live Speech Stream */}
          <div className="flex-1 relative flex items-center">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isListening 
                  ? "🎙️ Listening... Speak your prompt and Nexus will auto-respond..." 
                  : "Message NEXA... (or click Listen to speak, Press Enter to send)"
              }
              rows={1}
              disabled={isGenerating}
              className="w-full bg-transparent border-0 text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none resize-none py-1 max-h-44 leading-relaxed font-sans"
            />
          </div>

          {/* Dedicated 'Listen' Button with Web Speech API */}
          <button
            type="button"
            id="btn-voice-listen"
            onClick={toggleListen}
            disabled={isGenerating || !isSpeechSupported}
            title={
              !isSpeechSupported
                ? 'Web Speech API not supported in this browser'
                : isListening
                ? 'Stop listening (Alt+L)'
                : 'Listen: Dictate prompt & auto-trigger response (Alt+L)'
            }
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 select-none ${
              isListening
                ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/60 shadow-lg shadow-rose-950/50 animate-pulse'
                : isSpeechSupported
                ? 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:border-cyan-500/60'
                : 'opacity-40 cursor-not-allowed text-slate-500 bg-slate-800/50 border border-slate-800'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
                <span className="hidden sm:inline">Listening</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Listen</span>
              </>
            )}
          </button>

          {/* Send / Stop Button */}
          {isGenerating ? (
            <button
              type="button"
              onClick={onStopGenerating}
              title="Stop generating"
              className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-md shrink-0 flex items-center justify-center cursor-pointer"
            >
              <Square className="w-4 h-4 fill-white" />
            </button>
          ) : (
            <button
              type="button"
              id="btn-send-message"
              onClick={handleSend}
              disabled={(!text.trim() && attachments.length === 0) || isListening}
              title="Send message (Enter)"
              className="p-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold transition-all shadow-md shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center justify-center cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status bar inside input with Auto-Trigger toggle & telemetry */}
        <div className="px-4 py-1.5 bg-slate-950/60 border-t border-slate-800/60 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-rose-400 animate-ping' : 'bg-cyan-400'}`} />
              <span className="font-medium text-slate-300">Nexus Neural v1.4</span>
              <span className="hidden sm:inline text-slate-500">• 100% On-Device</span>
            </div>

            {/* Auto-Trigger Response Toggle */}
            {isSpeechSupported && (
              <label 
                className="hidden sm:flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-400 hover:text-slate-200 select-none"
                title="When enabled, pausing speech will automatically submit your dictated prompt to the local model"
              >
                <input
                  type="checkbox"
                  checked={autoTriggerModel}
                  onChange={e => setAutoTriggerModel(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 w-3 h-3 accent-cyan-500"
                />
                <span>Auto-run on speech end</span>
              </label>
            )}
          </div>

          <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500">
            {isListening && (
              <span className="text-cyan-400 font-bold animate-pulse flex items-center gap-1">
                <Radio className="w-3 h-3" />
                Mic Active
              </span>
            )}
            <span>{text.length} chars</span>
          </div>
        </div>
      </div>
    </div>
  );
};

