import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Bot, 
  Sparkles, 
  Sliders, 
  Share2, 
  Trash2, 
  Download, 
  PanelLeft, 
  ShieldCheck, 
  Cpu, 
  Code, 
  BrainCircuit, 
  Lightbulb, 
  Check, 
  Plus, 
  Zap, 
  Layers,
  ChevronDown
} from 'lucide-react';
import { ChatMessage, ChatSession, FileAttachment, GenerationConfig, GenerationMetrics, ModelMode } from '../types/nexus';
import { defaultNexusNeuralCore } from '../engine/nexusNeuralCore';
import { ChatSidebar } from './ChatSidebar';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatInput } from './ChatInput';

interface NexusChatProps {
  onAddDatasetPrompt: (prompt: string, response: string) => void;
  onNavigateToTraining: () => void;
  showParamsDrawer: boolean;
  setShowParamsDrawer: (show: boolean) => void;
}

const STORAGE_KEY_SESSIONS = 'nexus_chat_sessions_v2';
const STORAGE_KEY_ACTIVE_ID = 'nexus_active_session_id_v2';

export const NexusChat: React.FC<NexusChatProps> = ({
  onAddDatasetPrompt,
  onNavigateToTraining,
  showParamsDrawer,
  setShowParamsDrawer
}) => {
  // --- Sessions State ---
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SESSIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load chat sessions:', e);
    }
    // Default initial session
    const initialSession: ChatSession = {
      id: 'session-default',
      title: 'Welcome to Nexus AI',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      modelMode: 'nexus-4o',
      messages: [
        {
          id: 'msg-welcome',
          role: 'assistant',
          content: "Hello! I am **Nexus AI**, an autonomous, 100% on-device neural model created by **Suraj Jangid** and developed by **KingFX**. All tokenizer logic, self-attention, and reasoning pipelines run locally in your browser with zero calls to ChatGPT, Gemini, or external cloud servers.\n\nHow can I help you today? I can write code in TypeScript/Python/React, solve math & logic challenges, analyze attached files, or train on your custom datasets.",
          thoughts: "[Intent: greeting (99%)]\n[Creator: Suraj Jangid | Developer: KingFX]\n[On-Device Memory: Active]\n[Mode: 100% Private]",
          timestamp: Date.now(),
          metrics: {
            totalTokens: 46,
            latencyMs: 78,
            tokensPerSec: 59.1,
            matchedIntent: 'greeting',
            confidence: 0.99
          },
          thoughtSteps: [
            { stage: 'intent', title: 'Local Subword Tokenization', detail: 'Tokenized input with on-device vocabulary.', confidence: 0.99 },
            { stage: 'retrieval', title: 'Vector Memory Lookup', detail: 'Loaded system specifications from local device store.', confidence: 1.0 },
            { stage: 'reasoning', title: 'Intent Classification', detail: 'Identified greeting / system initialization intent.', confidence: 0.99 },
            { stage: 'complete', title: 'Inference Complete', detail: 'Model ready on client hardware.', confidence: 1.0 }
          ]
        }
      ]
    };
    return [initialSession];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const savedId = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
    return savedId || 'session-default';
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [showShareToast, setShowShareToast] = useState(false);

  // Active Session
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  // Hyperparameters
  const [config, setConfig] = useState<GenerationConfig>({
    temperature: 0.7,
    topK: 25,
    topP: 0.9,
    repetitionPenalty: 1.15,
    maxTokens: 400,
    systemPrompt: 'You are Nexus AI, a helpful, precise, and autonomous on-device model.',
    showThoughts: true,
    streamSpeedMs: 18
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<boolean>(false);

  // Auto-save sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
      localStorage.setItem(STORAGE_KEY_ACTIVE_ID, activeSessionId);
    } catch (e) {
      console.warn('Failed to save chat sessions to localStorage:', e);
    }
  }, [sessions, activeSessionId]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages, isGenerating, scrollToBottom]);

  // Handle New Chat
  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      modelMode: activeSession?.modelMode || 'nexus-4o',
      messages: [
        {
          id: `msg-welcome-${Date.now()}`,
          role: 'assistant',
          content: "Hello! How can I assist you with programming, logical reasoning, mathematics, or drafting today?",
          timestamp: Date.now()
        }
      ]
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  // Handle Delete Session
  const handleDeleteSession = (id: string) => {
    if (sessions.length <= 1) {
      // If last session, reset with new empty session
      handleNewChat();
      setSessions(prev => prev.filter(s => s.id !== id));
      return;
    }
    const filtered = sessions.filter(s => s.id !== id);
    setSessions(filtered);
    if (activeSessionId === id) {
      setActiveSessionId(filtered[0].id);
    }
  };

  // Handle Rename Session
  const handleRenameSession = (id: string, newTitle: string) => {
    setSessions(prev =>
      prev.map(s => (s.id === id ? { ...s, title: newTitle, updatedAt: Date.now() } : s))
    );
  };

  // Handle Pin Session
  const handlePinSession = (id: string) => {
    setSessions(prev =>
      prev.map(s => (s.id === id ? { ...s, isPinned: !s.isPinned, updatedAt: Date.now() } : s))
    );
  };

  // Handle Model Mode Switch
  const handleSetModelMode = (mode: ModelMode) => {
    setSessions(prev =>
      prev.map(s => (s.id === activeSessionId ? { ...s, modelMode: mode } : s))
    );
  };

  // Handle Export Session
  const handleExportSession = (session: ChatSession, format: 'md' | 'json') => {
    let content = '';
    let mimeType = 'text/plain';
    let ext = 'txt';

    if (format === 'json') {
      content = JSON.stringify(session, null, 2);
      mimeType = 'application/json';
      ext = 'json';
    } else {
      mimeType = 'text/markdown';
      ext = 'md';
      content = `# ${session.title}\n*Exported from Nexus AI on ${new Date().toLocaleString()}*\n\n---\n\n`;
      for (const msg of session.messages) {
        const sender = msg.role === 'user' ? '### 👤 User' : '### 🤖 Nexus AI';
        content += `${sender}\n\n${msg.content}\n\n---\n\n`;
      }
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Stop Generation
  const handleStopGenerating = () => {
    abortControllerRef.current = true;
    setIsGenerating(false);
  };

  // TTS Read Aloud
  const handleSpeak = (id: string, text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/```[\s\S]*?```/g, 'Code snippet omitted.').replace(/[\*\_#]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  // Send Message Flow
  const handleSendMessage = async (promptToSend: string, attachments?: FileAttachment[]) => {
    if ((!promptToSend.trim() && (!attachments || attachments.length === 0)) || isGenerating) return;

    abortControllerRef.current = false;
    setIsGenerating(true);

    // Format prompt with attachments if any
    let fullPrompt = promptToSend.trim();
    if (attachments && attachments.length > 0) {
      const fileContext = attachments
        .map(a => `[Attached File: ${a.name}]\n${a.content}`)
        .join('\n\n');
      fullPrompt = fullPrompt ? `${fileContext}\n\nUser Question: ${fullPrompt}` : fileContext;
    }

    const userMessageId = `msg-user-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: promptToSend.trim() || (attachments ? `Attached ${attachments.length} file(s)` : ''),
      attachments,
      timestamp: Date.now()
    };

    const assistantMsgId = `msg-asst-${Date.now()}`;
    const initialAssistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      thoughts: '',
      timestamp: Date.now(),
      thoughtSteps: []
    };

    // Auto generate session title from first user query if default title
    const isFirstUserQuery = activeSession.messages.filter(m => m.role === 'user').length === 0;
    let newSessionTitle = activeSession.title;
    if (isFirstUserQuery) {
      newSessionTitle = promptToSend.slice(0, 32) + (promptToSend.length > 32 ? '...' : '');
    }

    // Update active session messages
    setSessions(prev =>
      prev.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            title: isFirstUserQuery ? newSessionTitle : s.title,
            updatedAt: Date.now(),
            messages: [...s.messages, userMessage, initialAssistantMessage]
          };
        }
        return s;
      })
    );

    const historyPayload = activeSession.messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    try {
      const result = await defaultNexusNeuralCore.generateResponseStream(
        fullPrompt,
        historyPayload,
        config,
        (token, metrics) => {
          if (abortControllerRef.current) return;
          setSessions(prev =>
            prev.map(s => {
              if (s.id === activeSessionId) {
                return {
                  ...s,
                  messages: s.messages.map(m => {
                    if (m.id === assistantMsgId) {
                      return {
                        ...m,
                        content: m.content + token,
                        metrics
                      };
                    }
                    return m;
                  })
                };
              }
              return s;
            })
          );
        },
        step => {
          if (abortControllerRef.current) return;
          setSessions(prev =>
            prev.map(s => {
              if (s.id === activeSessionId) {
                return {
                  ...s,
                  messages: s.messages.map(m => {
                    if (m.id === assistantMsgId) {
                      const existingSteps = m.thoughtSteps || [];
                      return {
                        ...m,
                        thoughtSteps: [...existingSteps, step]
                      };
                    }
                    return m;
                  })
                };
              }
              return s;
            })
          );
        }
      );

      if (!abortControllerRef.current) {
        setSessions(prev =>
          prev.map(s => {
            if (s.id === activeSessionId) {
              return {
                ...s,
                messages: s.messages.map(m => {
                  if (m.id === assistantMsgId) {
                    return {
                      ...m,
                      content: result.fullText,
                      thoughts: result.thoughts,
                      metrics: result.metrics,
                      thoughtSteps: result.steps
                    };
                  }
                  return m;
                })
              };
            }
            return s;
          })
        );
      }
    } catch (error) {
      console.error('Inference error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Regenerate Assistant Response
  const handleRegenerate = async (msgId: string) => {
    const msgIndex = activeSession.messages.findIndex(m => m.id === msgId);
    if (msgIndex <= 0) return;

    const previousUserMsg = activeSession.messages[msgIndex - 1];
    if (!previousUserMsg || previousUserMsg.role !== 'user') return;

    setIsGenerating(true);
    abortControllerRef.current = false;

    const targetMsg = activeSession.messages[msgIndex];
    const oldContent = targetMsg.content;
    const variants = targetMsg.variants || [oldContent];

    try {
      const historyPayload = activeSession.messages
        .slice(0, msgIndex - 1)
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      // Clear current content for streaming
      setSessions(prev =>
        prev.map(s => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: s.messages.map((m, idx) =>
                idx === msgIndex ? { ...m, content: '', thoughtSteps: [] } : m
              )
            };
          }
          return s;
        })
      );

      const result = await defaultNexusNeuralCore.generateResponseStream(
        previousUserMsg.content,
        historyPayload,
        config,
        (token, metrics) => {
          if (abortControllerRef.current) return;
          setSessions(prev =>
            prev.map(s => {
              if (s.id === activeSessionId) {
                return {
                  ...s,
                  messages: s.messages.map((m, idx) =>
                    idx === msgIndex ? { ...m, content: m.content + token, metrics } : m
                  )
                };
              }
              return s;
            })
          );
        }
      );

      const updatedVariants = [...variants, result.fullText];
      setSessions(prev =>
        prev.map(s => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: s.messages.map((m, idx) =>
                idx === msgIndex
                  ? {
                      ...m,
                      content: result.fullText,
                      thoughts: result.thoughts,
                      metrics: result.metrics,
                      thoughtSteps: result.steps,
                      variants: updatedVariants,
                      activeVariantIndex: updatedVariants.length - 1
                    }
                  : m
              )
            };
          }
          return s;
        })
      );
    } catch (e) {
      console.error('Regenerate failed:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  // User Message Edit & Resubmit
  const handleEditUserMessage = (msgId: string, newContent: string) => {
    const msgIndex = activeSession.messages.findIndex(m => m.id === msgId);
    if (msgIndex < 0) return;

    // Truncate messages after this point and re-send
    const truncated = activeSession.messages.slice(0, msgIndex);
    setSessions(prev =>
      prev.map(s => (s.id === activeSessionId ? { ...s, messages: truncated } : s))
    );

    handleSendMessage(newContent);
  };

  // Branch Variant Navigation (< 1 / 2 >)
  const handleSelectVariant = (msgId: string, direction: 'prev' | 'next') => {
    setSessions(prev =>
      prev.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: s.messages.map(m => {
              if (m.id === msgId && m.variants && m.variants.length > 0) {
                const currentIdx = m.activeVariantIndex ?? m.variants.length - 1;
                const newIdx =
                  direction === 'prev'
                    ? Math.max(0, currentIdx - 1)
                    : Math.min(m.variants.length - 1, currentIdx + 1);
                return {
                  ...m,
                  content: m.variants[newIdx],
                  activeVariantIndex: newIdx
                };
              }
              return m;
            })
          };
        }
        return s;
      })
    );
  };

  // Clear current chat
  const handleClearChat = () => {
    if (confirm('Are you sure you want to clear this conversation?')) {
      setSessions(prev =>
        prev.map(s =>
          s.id === activeSessionId
            ? {
                ...s,
                messages: [
                  {
                    id: `msg-welcome-${Date.now()}`,
                    role: 'assistant',
                    content: "Conversation cleared. How can I help you next?",
                    timestamp: Date.now()
                  }
                ]
              }
            : s
        )
      );
    }
  };

  // Quick Starters
  const quickStarters = [
    { label: 'Debounce Function', prompt: 'Write a TypeScript function to debounce an event listener.', icon: Code },
    { label: 'CSS Center Div', prompt: 'How do I center a div in CSS using Flexbox and Grid?', icon: Layers },
    { label: 'Algebraic Solution', prompt: 'Solve for x: 3x + 15 = 45 and show the step-by-step reasoning.', icon: BrainCircuit },
    { label: 'Self-Attention Math', prompt: 'Explain how Self-Attention works in Transformers step by step.', icon: Sparkles }
  ];

  return (
    <div className="flex-1 flex h-full w-full overflow-hidden bg-slate-950">
      {/* ChatGPT-style Conversations Sidebar */}
      <ChatSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onPinSession={handlePinSession}
        onExportSession={handleExportSession}
        isOpen={isSidebarOpen}
        onToggleOpen={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Top Chat Bar with Model Selector & Quick Controls */}
        <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-md flex items-center justify-between gap-3 z-10">
          <div className="flex items-center gap-2">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                title="Open Sidebar"
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:text-cyan-300 text-slate-400"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}

            {/* Model Mode Dropdown */}
            <div className="relative flex items-center">
              <select
                value={activeSession.modelMode || 'nexus-4o'}
                onChange={e => handleSetModelMode(e.target.value as ModelMode)}
                className="appearance-none bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/40 text-slate-100 font-bold text-xs pl-3 pr-8 py-1.5 rounded-xl cursor-pointer focus:outline-none transition-all shadow-sm"
              >
                <option value="nexus-4o">Nexus-4o (Autonomous Omni Core)</option>
                <option value="nexus-coder">Nexus Coder Pro (TypeScript / Python)</option>
                <option value="nexus-reasoning">Nexus Deep Thinker (Math / Logic)</option>
                <option value="nexus-creative">Nexus Creative Studio (Prose / Brainstorm)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Privacy Badge */}
            <div className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium font-mono">
              <ShieldCheck className="w-3 h-3" />
              <span>100% On-Device</span>
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            {/* Temperature Preset Switcher */}
            <div className="hidden sm:flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
              <button
                onClick={() => setConfig(prev => ({ ...prev, temperature: 0.2 }))}
                className={`px-2 py-0.5 rounded font-medium transition-all ${
                  config.temperature <= 0.3 ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Precise
              </button>
              <button
                onClick={() => setConfig(prev => ({ ...prev, temperature: 0.7 }))}
                className={`px-2 py-0.5 rounded font-medium transition-all ${
                  config.temperature > 0.3 && config.temperature < 1.0 ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Balanced
              </button>
              <button
                onClick={() => setConfig(prev => ({ ...prev, temperature: 1.1 }))}
                className={`px-2 py-0.5 rounded font-medium transition-all ${
                  config.temperature >= 1.0 ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Creative
              </button>
            </div>

            {/* Hyperparameters Drawer Button */}
            <button
              onClick={() => setShowParamsDrawer(!showParamsDrawer)}
              title="Hyperparameter Tuner"
              className={`p-1.5 rounded-lg border transition-all ${
                showParamsDrawer
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50'
                  : 'bg-slate-900 border-slate-800 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>

            {/* Export Markdown */}
            <button
              onClick={() => handleExportSession(activeSession, 'md')}
              title="Export Conversation (.md)"
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:text-slate-200"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* Clear Chat */}
            <button
              onClick={handleClearChat}
              title="Clear Conversation"
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:text-rose-400"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Hyperparameters Drawer */}
        {showParamsDrawer && (
          <div className="p-4 bg-slate-900/95 border-b border-cyan-500/30 backdrop-blur-md shadow-2xl space-y-3 text-xs animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                <Sliders className="w-4 h-4" />
                <span>On-Device Neural Hyperparameter Tuner</span>
              </span>
              <button
                onClick={() => setShowParamsDrawer(false)}
                className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-white text-[11px]"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Temperature: <span className="text-cyan-400 font-mono">{config.temperature}</span>
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.5"
                  step="0.05"
                  value={config.temperature}
                  onChange={e => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Top-K Sampling: <span className="text-cyan-400 font-mono">{config.topK}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={config.topK}
                  onChange={e => setConfig({ ...config, topK: parseInt(e.target.value, 10) })}
                  className="w-full accent-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Max Tokens: <span className="text-cyan-400 font-mono">{config.maxTokens}</span>
                </label>
                <input
                  type="range"
                  min="50"
                  max="800"
                  step="25"
                  value={config.maxTokens}
                  onChange={e => setConfig({ ...config, maxTokens: parseInt(e.target.value, 10) })}
                  className="w-full accent-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Stream Speed (ms): <span className="text-cyan-400 font-mono">{config.streamSpeedMs}ms</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={config.streamSpeedMs}
                  onChange={e => setConfig({ ...config, streamSpeedMs: parseInt(e.target.value, 10) })}
                  className="w-full accent-cyan-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Message Feed Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {activeSession.messages.map((message, idx) => {
            // Find preceding user prompt for training pair feedback
            const prevUserPrompt =
              idx > 0 && activeSession.messages[idx - 1].role === 'user'
                ? activeSession.messages[idx - 1].content
                : undefined;

            return (
              <ChatMessageItem
                key={message.id}
                message={message}
                isStreaming={isGenerating && idx === activeSession.messages.length - 1}
                onCopy={text => navigator.clipboard.writeText(text)}
                onSpeak={handleSpeak}
                isSpeaking={speakingId === message.id}
                onRegenerate={
                  message.role === 'assistant' ? () => handleRegenerate(message.id) : undefined
                }
                onEdit={
                  message.role === 'user'
                    ? newText => handleEditUserMessage(message.id, newText)
                    : undefined
                }
                onAddToTraining={onAddDatasetPrompt}
                userPromptForPair={prevUserPrompt}
                onSelectVariant={dir => handleSelectVariant(message.id, dir)}
              />
            );
          })}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Floating Input Component */}
        <div className="shrink-0 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent pt-2 pb-2">
          <ChatInput
            onSendMessage={handleSendMessage}
            isGenerating={isGenerating}
            onStopGenerating={handleStopGenerating}
            quickStarters={activeSession.messages.length <= 1 ? quickStarters : []}
          />
        </div>
      </div>
    </div>
  );
};
