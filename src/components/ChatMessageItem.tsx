import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Bot, 
  User, 
  Copy, 
  Check, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Sparkles, 
  PlusCircle, 
  ChevronDown, 
  ChevronUp, 
  BrainCircuit, 
  ThumbsUp, 
  ThumbsDown, 
  Edit3, 
  FileText, 
  Code, 
  Share2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { ChatMessage, ThoughtStep } from '../types/nexus';

interface ChatMessageItemProps {
  message: ChatMessage;
  isStreaming?: boolean;
  onCopy: (text: string) => void;
  onSpeak: (id: string, text: string) => void;
  isSpeaking: boolean;
  onRegenerate?: () => void;
  onEdit?: (newContent: string) => void;
  onAddToTraining?: (prompt: string, response: string) => void;
  userPromptForPair?: string;
  onSelectVariant?: (direction: 'prev' | 'next') => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  isStreaming = false,
  onCopy,
  onSpeak,
  isSpeaking,
  onRegenerate,
  onEdit,
  onAddToTraining,
  userPromptForPair,
  onSelectVariant
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);
  const [thoughtsExpanded, setThoughtsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(message.content);
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(message.feedback || null);

  const handleCopyMessage = () => {
    onCopy(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = (codeText: string, index: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  const handleSaveEdit = () => {
    if (editDraft.trim() && editDraft !== message.content) {
      onEdit?.(editDraft.trim());
    }
    setIsEditing(false);
  };

  const handleFeedback = (type: 'like' | 'dislike') => {
    setFeedback(prev => (prev === type ? null : type));
  };

  const isUser = message.role === 'user';
  const hasVariants = message.variants && message.variants.length > 1;
  const currentVariant = (message.activeVariantIndex ?? 0) + 1;
  const totalVariants = message.variants?.length || 1;

  return (
    <div
      id={`msg-container-${message.id}`}
      className={`group w-full py-4 px-3 sm:px-6 transition-colors ${
        isUser ? 'bg-transparent' : 'bg-slate-900/40 border-y border-slate-800/40'
      }`}
    >
      <div className="max-w-4xl mx-auto flex gap-3 sm:gap-4">
        {/* Avatar */}
        <div className="shrink-0 pt-0.5">
          {isUser ? (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-600 text-slate-100 flex items-center justify-center font-bold text-xs shadow-md border border-slate-600">
              <User className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-slate-950 flex items-center justify-center font-bold text-xs shadow-md shadow-cyan-500/20 border border-cyan-400/40">
              <Bot className="w-4 h-4 fill-slate-950" />
            </div>
          )}
        </div>

        {/* Message Body & Controls */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header info */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-200">
                {isUser ? 'You' : 'Nexus AI'}
              </span>
              {!isUser && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                  ON-DEVICE CORE
                </span>
              )}
              {message.metrics && !isUser && (
                <span className="text-[11px] text-slate-400 font-mono hidden sm:inline-block">
                  {message.metrics.latencyMs}ms • {message.metrics.tokensPerSec} t/s
                </span>
              )}
            </div>

            {/* Branch version switcher if edited/regenerated */}
            {hasVariants && (
              <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800 font-mono">
                <button
                  onClick={() => onSelectVariant?.('prev')}
                  disabled={currentVariant <= 1}
                  className="hover:text-cyan-400 disabled:opacity-30 p-0.5"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span>{currentVariant} / {totalVariants}</span>
                <button
                  onClick={() => onSelectVariant?.('next')}
                  disabled={currentVariant >= totalVariants}
                  className="hover:text-cyan-400 disabled:opacity-30 p-0.5"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Attachments (if user attached files) */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 py-1">
              {message.attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300"
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-medium truncate max-w-[180px]">{att.name}</span>
                  <span className="text-[10px] text-slate-400">({Math.round(att.size / 1024)} KB)</span>
                </div>
              ))}
            </div>
          )}

          {/* Inner Thought Steps Accordion (for Assistant) */}
          {!isUser && message.thoughtSteps && message.thoughtSteps.length > 0 && (
            <div className="rounded-xl bg-slate-950/80 border border-slate-800 overflow-hidden text-xs">
              <button
                onClick={() => setThoughtsExpanded(!thoughtsExpanded)}
                className="w-full px-3 py-2 flex items-center justify-between text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <BrainCircuit className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-mono text-[11px] font-semibold text-cyan-300">
                    Thought Trace ({message.thoughtSteps.length} steps)
                  </span>
                </div>
                {thoughtsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {thoughtsExpanded && (
                <div className="p-3 border-t border-slate-800 space-y-2 bg-slate-950/40">
                  {message.thoughtSteps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-[11px]">
                      <span className="w-4 h-4 rounded-full bg-slate-900 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-mono text-[9px] shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <div className="font-semibold text-slate-200">{step.title}</div>
                        <div className="text-slate-400">{step.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* User message edit mode */}
          {isUser && isEditing ? (
            <div className="space-y-2 pt-1">
              <textarea
                value={editDraft}
                onChange={e => setEditDraft(e.target.value)}
                rows={3}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-cyan-500/50 text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
                >
                  Save & Submit
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Main Content Rendering via Markdown */
            <div className="prose prose-invert prose-sm max-w-none text-slate-100 leading-relaxed break-words font-sans">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');
                    const isInline = !match && !codeString.includes('\n');

                    if (isInline) {
                      return (
                        <code className="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 font-mono text-cyan-300 text-[12px]" {...props}>
                          {children}
                        </code>
                      );
                    }

                    const lang = match ? match[1] : 'code';
                    const codeIndex = Math.floor(Math.random() * 100000);

                    return (
                      <div className="my-3 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 font-mono text-xs shadow-lg">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-slate-400 text-[11px]">
                          <span className="font-semibold text-cyan-400 lowercase">{lang}</span>
                          <button
                            onClick={() => handleCopyCode(codeString, codeIndex)}
                            className="flex items-center gap-1 hover:text-slate-200 text-slate-400 transition-colors"
                          >
                            {copiedCodeIndex === codeIndex ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy code</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="p-3 overflow-x-auto text-slate-200 bg-slate-950/90">
                          <pre className="m-0 p-0 font-mono text-xs leading-5">
                            <code>{codeString}</code>
                          </pre>
                        </div>
                      </div>
                    );
                  }
                }}
              >
                {message.content || (isStreaming ? 'Thinking...' : '')}
              </ReactMarkdown>
            </div>
          )}

          {/* Action Toolbar */}
          <div className="flex items-center gap-1 pt-1.5 text-slate-400 opacity-80 group-hover:opacity-100 transition-opacity">
            {/* Copy */}
            <button
              onClick={handleCopyMessage}
              title="Copy message"
              className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            {/* Read Aloud (TTS) */}
            <button
              onClick={() => onSpeak(message.id, message.content)}
              title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
              className={`p-1.5 rounded-lg transition-colors ${
                isSpeaking ? 'bg-cyan-950 text-cyan-400 border border-cyan-500/30' : 'hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            {/* User Edit */}
            {isUser && (
              <button
                onClick={() => setIsEditing(true)}
                title="Edit message"
                className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-slate-200 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Assistant Actions */}
            {!isUser && (
              <>
                {/* Regenerate */}
                {onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    title="Regenerate response"
                    className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-slate-200 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Thumbs Up */}
                <button
                  onClick={() => handleFeedback('like')}
                  title="Good response"
                  className={`p-1.5 rounded-lg transition-colors ${
                    feedback === 'like' ? 'text-emerald-400 bg-emerald-950/40' : 'hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>

                {/* Thumbs Down */}
                <button
                  onClick={() => handleFeedback('dislike')}
                  title="Poor response"
                  className={`p-1.5 rounded-lg transition-colors ${
                    feedback === 'dislike' ? 'text-rose-400 bg-rose-950/40' : 'hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>

                {/* Add to Dataset */}
                {onAddToTraining && userPromptForPair && (
                  <button
                    onClick={() => onAddToTraining(userPromptForPair, message.content)}
                    title="Fine-tune on this pair in Training Studio"
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-slate-800/80 hover:bg-cyan-950 hover:text-cyan-300 hover:border-cyan-500/40 border border-slate-700 text-slate-300 transition-all ml-1"
                  >
                    <PlusCircle className="w-3 h-3 text-cyan-400" />
                    <span>Add to Training Set</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
