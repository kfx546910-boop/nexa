import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  Wand2, 
  BrainCircuit, 
  RefreshCw, 
  Layers, 
  Tag, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Filter,
  Sliders
} from 'lucide-react';
import { TrainingPair } from '../types/nexus';
import { analyzeTrainingPairContent, SemanticAnalysisResult, SupportedCategory } from '../engine/semanticCategorizer';

interface BatchAutoCategorizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasets: TrainingPair[];
  selectedPairIds: Set<string>;
  onApplyBatchUpdates: (updatedPairs: TrainingPair[]) => void;
}

interface AnalyzedPairRow {
  pair: TrainingPair;
  analysis: SemanticAnalysisResult;
  selected: boolean;
  updateCategory: boolean;
  updateTags: boolean;
  updateIntent: boolean;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  coding: { bg: 'bg-emerald-950/60', text: 'text-emerald-300', border: 'border-emerald-500/40' },
  reasoning: { bg: 'bg-indigo-950/60', text: 'text-indigo-300', border: 'border-indigo-500/40' },
  productivity: { bg: 'bg-amber-950/60', text: 'text-amber-300', border: 'border-amber-500/40' },
  chat: { bg: 'bg-purple-950/60', text: 'text-purple-300', border: 'border-purple-500/40' },
  core: { bg: 'bg-cyan-950/60', text: 'text-cyan-300', border: 'border-cyan-500/40' },
  custom: { bg: 'bg-slate-900', text: 'text-slate-300', border: 'border-slate-700' }
};

export const BatchAutoCategorizeModal: React.FC<BatchAutoCategorizeModalProps> = ({
  isOpen,
  onClose,
  datasets,
  selectedPairIds,
  onApplyBatchUpdates
}) => {
  const [scope, setScope] = useState<'selected' | 'untagged' | 'all'>(
    selectedPairIds.size > 0 ? 'selected' : 'all'
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [analyzedRows, setAnalyzedRows] = useState<AnalyzedPairRow[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [hasRunAnalysis, setHasRunAnalysis] = useState(false);

  // Initialize or re-run analysis when modal opens or scope changes
  useEffect(() => {
    if (!isOpen) {
      setHasRunAnalysis(false);
      setAnalyzedRows([]);
      return;
    }

    // Determine candidate pairs based on scope
    let targetPairs: TrainingPair[] = [];
    if (scope === 'selected' && selectedPairIds.size > 0) {
      targetPairs = datasets.filter(p => selectedPairIds.has(p.id));
    } else if (scope === 'untagged') {
      targetPairs = datasets.filter(p => !p.tags || p.tags.length === 0 || p.category === 'custom');
    } else {
      targetPairs = [...datasets];
    }

    if (targetPairs.length === 0 && datasets.length > 0) {
      targetPairs = [...datasets];
      setScope('all');
    }

    setIsProcessing(true);
    setTimeout(() => {
      const rows: AnalyzedPairRow[] = targetPairs.map(p => {
        const analysis = analyzeTrainingPairContent(p.prompt, p.response);
        const isDifferentCategory = p.category !== analysis.category;
        const hasNewTags = analysis.suggestedTags.some(t => !p.tags?.includes(t));

        return {
          pair: p,
          analysis,
          selected: isDifferentCategory || hasNewTags || p.category === 'custom',
          updateCategory: isDifferentCategory,
          updateTags: true,
          updateIntent: p.intent.startsWith('custom_') || p.intent.startsWith('user_')
        };
      });

      setAnalyzedRows(rows);
      setIsProcessing(false);
      setHasRunAnalysis(true);
    }, 200);
  }, [isOpen, scope, datasets, selectedPairIds]);

  if (!isOpen) return null;

  const handleToggleSelectAll = (checked: boolean) => {
    setAnalyzedRows(prev => prev.map(r => ({ ...r, selected: checked })));
  };

  const handleToggleRow = (pairId: string) => {
    setAnalyzedRows(prev => prev.map(r => (r.pair.id === pairId ? { ...r, selected: !r.selected } : r)));
  };

  const handleApplyBatch = () => {
    const selectedRows = analyzedRows.filter(r => r.selected);
    if (selectedRows.length === 0) return;

    const updatedPairs: TrainingPair[] = datasets.map(original => {
      const match = selectedRows.find(r => r.pair.id === original.id);
      if (!match) return original;

      const mergedTags = Array.from(
        new Set([...(original.tags || []), ...match.analysis.suggestedTags])
      );

      return {
        ...original,
        category: match.updateCategory ? match.analysis.category : original.category,
        tags: match.updateTags ? mergedTags : original.tags,
        intent: match.updateIntent ? match.analysis.intent : original.intent
      };
    });

    onApplyBatchUpdates(updatedPairs);
    onClose();
  };

  const filteredRows = analyzedRows.filter(r => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      r.pair.prompt.toLowerCase().includes(q) ||
      r.analysis.category.toLowerCase().includes(q) ||
      r.analysis.suggestedTags.some(t => t.toLowerCase().includes(q))
    );
  });

  const selectedCount = analyzedRows.filter(r => r.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-4xl rounded-2xl bg-slate-900 border border-cyan-500/40 shadow-2xl p-5 space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-500/30">
              <BrainCircuit className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>AI Batch Auto-Categorization & Tagging</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/30 text-cyan-300">
                  SEMANTIC ENGINE
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Automatically classify training samples into domains, generate intent slugs, and extract relevant tags
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

        {/* Controls & Scope Selector */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              Target Scope:
            </span>
            <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
              {selectedPairIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => setScope('selected')}
                  className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all ${
                    scope === 'selected'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Selected Pairs ({selectedPairIds.size})
                </button>
              )}
              <button
                type="button"
                onClick={() => setScope('untagged')}
                className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all ${
                  scope === 'untagged'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Untagged / Custom
              </button>
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all ${
                  scope === 'all'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Entire Dataset ({datasets.length})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder="Search analyzed pairs..."
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 w-44"
            />
          </div>
        </div>

        {/* Diff Table List */}
        <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60 divide-y divide-slate-850">
          {isProcessing ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-7 h-7 text-cyan-400 animate-spin" />
              <span className="text-xs font-medium">Running semantic feature extraction & neural scoring...</span>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              No training pairs matched the current criteria.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider font-mono z-10">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={analyzedRows.length > 0 && analyzedRows.every(r => r.selected)}
                      onChange={e => handleToggleSelectAll(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
                    />
                  </th>
                  <th className="p-3 w-1/3">Prompt Preview</th>
                  <th className="p-3 w-28">Current Category</th>
                  <th className="p-3 w-1/3">AI Suggested Category & Tags</th>
                  <th className="p-3 w-20 text-right">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {filteredRows.map(row => {
                  const currColor = CATEGORY_COLORS[row.pair.category] || CATEGORY_COLORS.custom;
                  const aiColor = CATEGORY_COLORS[row.analysis.category] || CATEGORY_COLORS.custom;
                  const isChanged = row.pair.category !== row.analysis.category;

                  return (
                    <tr
                      key={row.pair.id}
                      className={`hover:bg-slate-900/70 transition-colors ${
                        row.selected ? 'bg-cyan-950/20' : ''
                      }`}
                    >
                      <td className="p-3 text-center align-top">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={() => handleToggleRow(row.pair.id)}
                          className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      <td className="p-3 align-top font-sans">
                        <div className="font-medium text-slate-200 line-clamp-2" title={row.pair.prompt}>
                          {row.pair.prompt}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-1">
                          Intent: {row.pair.intent}
                        </div>
                      </td>

                      <td className="p-3 align-top">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-mono capitalize border ${currColor.bg} ${currColor.text} ${currColor.border}`}>
                          {row.pair.category}
                        </span>
                      </td>

                      <td className="p-3 align-top space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-mono capitalize border font-bold ${aiColor.bg} ${aiColor.text} ${aiColor.border}`}>
                            {row.analysis.category}
                          </span>
                          {isChanged && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                              NEW
                            </span>
                          )}
                        </div>

                        {/* Suggested Tag Pills */}
                        <div className="flex flex-wrap gap-1">
                          {row.analysis.suggestedTags.map(tag => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-cyan-300"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="p-3 align-top text-right font-mono text-xs">
                        <span className="font-bold text-cyan-300">
                          {(row.analysis.confidence * 100).toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0">
          <div className="text-xs text-slate-400">
            <strong className="text-cyan-300">{selectedCount}</strong> of{' '}
            <span className="text-slate-200">{analyzedRows.length}</span> samples selected for auto-update
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              id="btn-apply-batch-auto-categorize"
              onClick={handleApplyBatch}
              disabled={selectedCount === 0 || isProcessing}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Apply AI Categorization ({selectedCount} Pairs)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
