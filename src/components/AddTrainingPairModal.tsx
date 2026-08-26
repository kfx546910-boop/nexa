import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, Plus, Save, Wand2, Tag, Check, BrainCircuit, RefreshCw, HelpCircle, Layers } from 'lucide-react';
import { TrainingPair } from '../types/nexus';
import { analyzeTrainingPairContent, SemanticAnalysisResult, SupportedCategory } from '../engine/semanticCategorizer';

interface AddTrainingPairModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pair: TrainingPair) => void;
  initialPair?: TrainingPair | null;
}

export const AddTrainingPairModal: React.FC<AddTrainingPairModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialPair
}) => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [category, setCategory] = useState<SupportedCategory>('custom');
  const [intent, setIntent] = useState('');
  const [tags, setTags] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<SemanticAnalysisResult | null>(null);
  const [autoSuggestEnabled, setAutoSuggestEnabled] = useState(true);

  useEffect(() => {
    if (initialPair) {
      setPrompt(initialPair.prompt);
      setResponse(initialPair.response);
      setCategory(initialPair.category);
      setIntent(initialPair.intent);
      setTags(initialPair.tags?.join(', ') || '');
      setAnalysisResult(null);
    } else {
      setPrompt('');
      setResponse('');
      setCategory('custom');
      setIntent('');
      setTags('');
      setAnalysisResult(null);
    }
  }, [initialPair, isOpen]);

  // Run semantic analysis on demand or when requested
  const runSemanticAnalysis = (overridePrompt?: string, overrideResponse?: string) => {
    const currentP = (overridePrompt !== undefined ? overridePrompt : prompt).trim();
    const currentR = (overrideResponse !== undefined ? overrideResponse : response).trim();

    if (!currentP && !currentR) return;

    setIsAnalyzing(true);
    setTimeout(() => {
      const result = analyzeTrainingPairContent(currentP, currentR);
      setAnalysisResult(result);
      setIsAnalyzing(false);
    }, 180);
  };

  // Auto-apply entire AI recommendation (category, intent, tags)
  const handleApplyAllAI = () => {
    if (!prompt.trim() && !response.trim()) return;

    const result = analyzeTrainingPairContent(prompt, response);
    setAnalysisResult(result);
    setCategory(result.category);
    setIntent(result.intent);

    // Merge existing tags with new suggestions without duplicates
    const currentTagList = tags
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    const merged = Array.from(new Set([...currentTagList, ...result.suggestedTags]));
    setTags(merged.join(', '));
  };

  // Toggle or add individual suggested tag
  const handleToggleTag = (tagToAdd: string) => {
    const cleanTag = tagToAdd.trim().toLowerCase();
    const currentTagList = tags
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    let updated: string[];
    if (currentTagList.includes(cleanTag)) {
      updated = currentTagList.filter(t => t !== cleanTag);
    } else {
      updated = [...currentTagList, cleanTag];
    }
    setTags(updated.join(', '));
  };

  // Live auto-trigger when pasting or finishing typing prompt/response
  const handlePromptChange = (val: string) => {
    setPrompt(val);
    if (autoSuggestEnabled && (val.length > 15 || response.length > 15)) {
      const res = analyzeTrainingPairContent(val, response);
      setAnalysisResult(res);
    }
  };

  const handleResponseChange = (val: string) => {
    setResponse(val);
    if (autoSuggestEnabled && (prompt.length > 15 || val.length > 15)) {
      const res = analyzeTrainingPairContent(prompt, val);
      setAnalysisResult(res);
    }
  };

  const parsedCurrentTags = useMemo(() => {
    return tags
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);
  }, [tags]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !response.trim()) return;

    const parsedTags = tags
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    const pair: TrainingPair = {
      id: initialPair?.id || `pair-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      prompt: prompt.trim(),
      response: response.trim(),
      category,
      intent: intent.trim() || `custom_${Date.now().toString().slice(-4)}`,
      weight: initialPair?.weight || 1.0,
      tags: parsedTags,
      createdAt: initialPair?.createdAt || Date.now()
    };

    onSave(pair);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-cyan-500/40 shadow-2xl p-5 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-500/30">
              <BrainCircuit className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>{initialPair ? 'Edit Training Sample' : 'Create Fine-Tuning Sample'}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                  AI AUTO-TAG
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Define prompt/target weights with semantic auto-categorization and token routing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* AI Quick Auto-Categorize Banner */}
        <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-indigo-950/40 border border-cyan-500/30 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </span>
            <div className="text-xs">
              <span className="font-semibold text-slate-200">AI Semantic Auto-Categorizer</span>
              <p className="text-[11px] text-slate-400">
                Analyzes intent, syntax, and keywords to suggest domain categories and semantic tags
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-ai-auto-categorize"
              onClick={handleApplyAllAI}
              disabled={isAnalyzing || (!prompt.trim() && !response.trim())}
              className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-950/50 cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Auto-Categorize & Tag (AI)</span>
                </>
              )}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-semibold flex items-center gap-1">
                <span>User Input / Prompt</span>
                <span className="text-rose-400">*</span>
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                {prompt.length} chars
              </span>
            </div>
            <textarea
              id="input-pair-prompt"
              value={prompt}
              onChange={e => handlePromptChange(e.target.value)}
              placeholder="What question, query, instruction, or coding task will the user ask?"
              rows={3}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-cyan-500 font-sans transition-colors placeholder:text-slate-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-semibold flex items-center gap-1">
                <span>Nexus Target Response</span>
                <span className="text-rose-400">*</span>
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                {response.length} chars
              </span>
            </div>
            <textarea
              id="input-pair-response"
              value={response}
              onChange={e => handleResponseChange(e.target.value)}
              placeholder="How should Nexus AI respond? (Supports markdown, code blocks, step-by-step reasoning)"
              rows={5}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-cyan-500 font-sans transition-colors placeholder:text-slate-600 font-mono-code text-[11px]"
            />
          </div>

          {/* Semantic Analysis Live Card (if available) */}
          {analysisResult && (
            <div 
              id="box-semantic-analysis-preview"
              className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-2.5 animate-in fade-in"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-semibold text-slate-200 text-xs">AI Semantic Suggestions</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold">
                    {(analysisResult.confidence * 100).toFixed(0)}% Match
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCategory(analysisResult.category);
                      setIntent(analysisResult.intent);
                    }}
                    className="text-[11px] font-medium text-cyan-400 hover:text-cyan-300 underline"
                  >
                    Apply Category & Intent
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      const merged = Array.from(new Set([...parsedCurrentTags, ...analysisResult.suggestedTags]));
                      setTags(merged.join(', '));
                    }}
                    className="text-[11px] font-medium text-cyan-400 hover:text-cyan-300 underline"
                  >
                    Apply All Tags
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-slate-300 font-medium">Analysis Rationale: </span>
                {analysisResult.rationale}
              </div>

              {/* Tag suggestions chips */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-medium text-slate-400 block">
                  Suggested Tag Chips (Click to toggle):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {analysisResult.suggestedTags.map(suggested => {
                    const isSelected = parsedCurrentTags.includes(suggested.toLowerCase());
                    return (
                      <button
                        key={suggested}
                        type="button"
                        onClick={() => handleToggleTag(suggested)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono flex items-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                            : 'bg-slate-800/90 text-slate-300 border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800'
                        }`}
                      >
                        {isSelected ? <Check className="w-3 h-3 text-slate-950 stroke-[3]" /> : <Plus className="w-3 h-3 text-slate-400" />}
                        <span>#{suggested}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Form Fields: Category & Intent */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Domain Category
              </label>
              <select
                id="select-pair-category"
                value={category}
                onChange={e => setCategory(e.target.value as SupportedCategory)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
              >
                <option value="coding">Coding & Algorithms (coding)</option>
                <option value="reasoning">Logic & Mathematics (reasoning)</option>
                <option value="productivity">Productivity & Summary (productivity)</option>
                <option value="chat">Conversational Dialogue (chat)</option>
                <option value="core">Core Architecture & Identity (core)</option>
                <option value="custom">Custom Specialty (custom)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-semibold block">
                  Intent Slug Identifier
                </label>
                {analysisResult?.intent && intent !== analysisResult.intent && (
                  <button
                    type="button"
                    onClick={() => setIntent(analysisResult.intent)}
                    className="text-[10px] text-cyan-400 hover:underline font-mono"
                  >
                    Suggest: {analysisResult.intent}
                  </button>
                )}
              </div>
              <input
                id="input-pair-intent"
                type="text"
                value={intent}
                onChange={e => setIntent(e.target.value)}
                placeholder="e.g. coding_react_cleanup_effect"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono-code text-[11px]"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-cyan-400" />
                <span>Semantic Tags (Comma-separated)</span>
              </label>
              <span className="text-[10px] text-slate-500">
                Used for neuro-symbolic routing & RAG indexing
              </span>
            </div>
            <input
              id="input-pair-tags"
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="e.g. react, hooks, cleanup, frontend, state"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-[11px]"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-slate-400 hover:text-slate-300">
              <input
                type="checkbox"
                checked={autoSuggestEnabled}
                onChange={e => setAutoSuggestEnabled(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span>Live AI Tag suggestions while typing</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-save-training-pair"
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save & Compile to Neural Weights</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

