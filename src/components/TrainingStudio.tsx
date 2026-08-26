import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Square, 
  Flame, 
  Plus, 
  Trash2, 
  Edit3, 
  Download, 
  Upload, 
  RotateCcw, 
  CheckCircle2, 
  TrendingDown, 
  Database, 
  Layers, 
  Cpu, 
  Search, 
  Filter, 
  Sparkles,
  Save,
  Clock,
  Zap,
  X,
  ChevronDown,
  Sliders,
  Keyboard,
  Command,
  Wand2,
  BrainCircuit,
  Tag,
  Undo2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  ModelCheckpoint, 
  TrainingLogEntry, 
  TrainingPair, 
  TrainingProgress 
} from '../types/nexus';
import { defaultNexusNeuralCore } from '../engine/nexusNeuralCore';
import { BulkWeightModal } from './BulkWeightModal';
import { DatasetSummaryCard } from './DatasetSummaryCard';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { BatchAutoCategorizeModal } from './BatchAutoCategorizeModal';
import { analyzeTrainingPairContent } from '../engine/semanticCategorizer';

interface TrainingStudioProps {
  checkpoint: ModelCheckpoint;
  onCheckpointUpdated: (checkpoint: ModelCheckpoint) => void;
  onOpenAddModal: () => void;
  onEditPair: (pair: TrainingPair) => void;
  onOpenImportDataset?: () => void;
  onOpenExportDataset?: () => void;
}

export interface UndoRecord {
  id: string;
  actionType: 'bulk_delete' | 'bulk_weight' | 'bulk_category' | 'single_delete' | 'auto_categorize';
  description: string;
  timestamp: number;
  previousDatasets: TrainingPair[];
  previousSelectedIds?: string[];
}

export const TrainingStudio: React.FC<TrainingStudioProps> = ({
  checkpoint,
  onCheckpointUpdated,
  onOpenAddModal,
  onEditPair,
  onOpenImportDataset,
  onOpenExportDataset
}) => {
  const [datasets, setDatasets] = useState<TrainingPair[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPairIds, setSelectedPairIds] = useState<Set<string>>(new Set());
  const [isBulkWeightModalOpen, setIsBulkWeightModalOpen] = useState<boolean>(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);
  const [isAutoCategorizeModalOpen, setIsAutoCategorizeModalOpen] = useState<boolean>(false);

  // Undo Stack state for reverting bulk operations (delete, weight, category)
  const [undoStack, setUndoStack] = useState<UndoRecord[]>([]);

  // Toast feedback state for keyboard shortcuts & action feedback
  const [toastMessage, setToastMessage] = useState<{ id: number; text: string; canUndo?: boolean } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (text: string, canUndo = false) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    const id = Date.now();
    setToastMessage({ id, text, canUndo });
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(prev => (prev?.id === id ? null : prev));
    }, canUndo ? 3600 : 2400);
  };

  const pushUndo = (
    actionType: UndoRecord['actionType'],
    description: string,
    snapshotDatasets: TrainingPair[],
    snapshotSelectedIds?: string[]
  ) => {
    const newRecord: UndoRecord = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      actionType,
      description,
      timestamp: Date.now(),
      previousDatasets: snapshotDatasets.map(d => ({ ...d, tags: d.tags ? [...d.tags] : undefined })),
      previousSelectedIds: snapshotSelectedIds ? [...snapshotSelectedIds] : undefined
    };
    setUndoStack(prev => [newRecord, ...prev.slice(0, 24)]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) {
      showToast('⚠️ No recent actions to undo');
      return;
    }

    const [lastAction, ...remainingStack] = undoStack;
    setUndoStack(remainingStack);

    // Revert datasets in state & core persistence
    setDatasets(lastAction.previousDatasets);
    defaultNexusNeuralCore.saveDatasets(lastAction.previousDatasets);

    // Revert selection state if recorded
    if (lastAction.previousSelectedIds) {
      setSelectedPairIds(new Set(lastAction.previousSelectedIds));
    }

    // Refresh model checkpoint dataset count
    const updatedCheckpoint = defaultNexusNeuralCore.getActiveCheckpoint();
    onCheckpointUpdated(updatedCheckpoint);

    showToast(`↩️ Reverted: ${lastAction.description}`, false);
  };

  // Hyperparameters for training
  const [epochs, setEpochs] = useState<number>(15);
  const [learningRate, setLearningRate] = useState<number>(0.005);
  const [batchSize, setBatchSize] = useState<number>(4);
  const [optimizer, setOptimizer] = useState<'adam' | 'sgd' | 'rmsprop'>('adam');

  // Training state
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [progress, setProgress] = useState<TrainingProgress>({
    isTraining: false,
    currentEpoch: 0,
    totalEpochs: 15,
    currentStep: 0,
    totalSteps: 0,
    currentLoss: checkpoint.finalLoss || 0.045,
    bestLoss: checkpoint.finalLoss || 0.045,
    perplexity: checkpoint.perplexity || 1.045,
    logs: [],
    etaSeconds: 0
  });

  const [checkpointNameInput, setCheckpointNameInput] = useState(checkpoint.name);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDatasets(defaultNexusNeuralCore.getDatasets());
  }, [checkpoint.datasetCount, checkpoint.updatedAt]);

  useEffect(() => {
    if (isTraining) {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [progress.logs, isTraining]);

  // Start Training
  const handleStartTraining = async () => {
    if (isTraining) return;
    setIsTraining(true);

    try {
      const result = await defaultNexusNeuralCore.trainModel(
        epochs,
        learningRate,
        batchSize,
        prog => {
          setProgress(prog);
        }
      );

      // Trigger Confetti!
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}

      const updated = defaultNexusNeuralCore.getActiveCheckpoint();
      onCheckpointUpdated(updated);
    } catch (e) {
      console.error('Training loop error:', e);
    } finally {
      setIsTraining(false);
    }
  };

  const handleStopTraining = () => {
    defaultNexusNeuralCore.stopTraining();
    setIsTraining(false);
  };

  const handleDeletePair = (id: string) => {
    const target = datasets.find(d => d.id === id);
    pushUndo('single_delete', `Deleted training pair "${target?.intent || id}"`, datasets, [id]);
    const updated = datasets.filter(d => d.id !== id);
    setDatasets(updated);
    defaultNexusNeuralCore.saveDatasets(updated);
    setSelectedPairIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    const updatedCheckpoint = defaultNexusNeuralCore.getActiveCheckpoint();
    onCheckpointUpdated(updatedCheckpoint);
    showToast(`🗑️ Deleted pair "${target?.intent || 'item'}"`, true);
  };

  const handleToggleSelectPair = (id: string) => {
    setSelectedPairIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredDatasets.map(d => d.id);
    const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedPairIds.has(id));

    setSelectedPairIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        allFilteredIds.forEach(id => next.delete(id));
      } else {
        allFilteredIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleDeleteSelected = () => {
    if (selectedPairIds.size === 0) return;
    const count = selectedPairIds.size;
    pushUndo(
      'bulk_delete',
      `Bulk deleted ${count} training pair${count > 1 ? 's' : ''}`,
      datasets,
      Array.from(selectedPairIds)
    );
    const updated = datasets.filter(d => !selectedPairIds.has(d.id));
    setDatasets(updated);
    defaultNexusNeuralCore.saveDatasets(updated);
    setSelectedPairIds(new Set());
    const updatedCheckpoint = defaultNexusNeuralCore.getActiveCheckpoint();
    onCheckpointUpdated(updatedCheckpoint);
    showToast(`🗑️ Bulk deleted ${count} training pair${count > 1 ? 's' : ''}`, true);
  };

  const handleQuickAutoTagRow = (pair: TrainingPair) => {
    const analysis = analyzeTrainingPairContent(pair.prompt, pair.response);
    const mergedTags = Array.from(new Set([...(pair.tags || []), ...analysis.suggestedTags]));
    const updatedPair: TrainingPair = {
      ...pair,
      category: analysis.category,
      tags: mergedTags,
      intent: pair.intent.startsWith('custom_') || pair.intent.startsWith('user_') ? analysis.intent : pair.intent
    };
    pushUndo(
      'auto_categorize',
      `Auto-categorized pair "${pair.intent}"`,
      datasets,
      [pair.id]
    );
    const updatedDatasets = datasets.map(p => (p.id === pair.id ? updatedPair : p));
    setDatasets(updatedDatasets);
    defaultNexusNeuralCore.saveDatasets(updatedDatasets);
    const updatedCheckpoint = defaultNexusNeuralCore.getActiveCheckpoint();
    onCheckpointUpdated(updatedCheckpoint);
    showToast(`✨ Auto-categorized as #${analysis.category} with ${analysis.suggestedTags.length} tags`, true);
  };

  const handleApplyBatchAutoCategorization = (updatedPairs: TrainingPair[]) => {
    pushUndo(
      'bulk_category',
      `Batch AI auto-categorization & tagging`,
      datasets,
      Array.from(selectedPairIds)
    );
    setDatasets(updatedPairs);
    defaultNexusNeuralCore.saveDatasets(updatedPairs);
    const updatedCheckpoint = defaultNexusNeuralCore.getActiveCheckpoint();
    onCheckpointUpdated(updatedCheckpoint);
    showToast(`✨ AI auto-categorization applied successfully!`, true);
  };

  const handleApplyBulkWeightMultiplier = (value: number, mode: 'multiply' | 'fixed') => {
    if (selectedPairIds.size === 0) return;
    const count = selectedPairIds.size;
    pushUndo(
      'bulk_weight',
      `Bulk weight adjustment (${mode === 'multiply' ? `${value}x` : `fixed ${value}`}) on ${count} pair${count > 1 ? 's' : ''}`,
      datasets,
      Array.from(selectedPairIds)
    );
    const updated = datasets.map(pair => {
      if (selectedPairIds.has(pair.id)) {
        const currentWeight = pair.weight ?? 1.0;
        const newWeight = mode === 'multiply'
          ? Math.min(10.0, Math.max(0.1, parseFloat((currentWeight * value).toFixed(2))))
          : Math.min(10.0, Math.max(0.1, parseFloat(value.toFixed(2))));
        return {
          ...pair,
          weight: newWeight
        };
      }
      return pair;
    });

    setDatasets(updated);
    defaultNexusNeuralCore.saveDatasets(updated);
    const updatedCheckpoint = defaultNexusNeuralCore.getActiveCheckpoint();
    onCheckpointUpdated(updatedCheckpoint);
    showToast(`⚖️ Applied bulk weight adjustment to ${count} pair${count > 1 ? 's' : ''}`, true);
  };

  const handleClearSelection = () => {
    setSelectedPairIds(new Set());
  };

  const handleSaveCheckpointName = () => {
    const updated = defaultNexusNeuralCore.saveCurrentCheckpoint(checkpointNameInput);
    onCheckpointUpdated(updated);
  };

  // Filter datasets
  const filteredDatasets = datasets.filter(d => {
    const matchesCategory = selectedCategory === 'all' || d.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesCategory;

    const matchesSearch = 
      d.prompt.toLowerCase().includes(query) ||
      d.response.toLowerCase().includes(query) ||
      d.intent.toLowerCase().includes(query) ||
      (d.tags && d.tags.some(tag => tag.toLowerCase().includes(query)));
    return matchesCategory && matchesSearch;
  });

  // Global Keyboard Shortcuts for Power Users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputFocused = 
        activeEl instanceof HTMLInputElement || 
        activeEl instanceof HTMLTextAreaElement || 
        activeEl instanceof HTMLSelectElement ||
        (activeEl as HTMLElement)?.isContentEditable;

      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const isMod = isMac ? e.metaKey : e.ctrlKey;

      // 1. Ctrl+S / Cmd+S: Save Checkpoint & Datasets
      if (isMod && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        const updated = defaultNexusNeuralCore.saveCurrentCheckpoint(checkpointNameInput);
        onCheckpointUpdated(updated);
        showToast('⚡ Checkpoint & dataset saved (Ctrl+S)');
        return;
      }

      // 2. Ctrl+Delete / Cmd+Delete OR Ctrl+Backspace / Cmd+Backspace / Bare Delete when idle
      if (
        (isMod && (e.key === 'Delete' || e.key === 'Backspace')) ||
        (!isInputFocused && (e.key === 'Delete' || e.key === 'Backspace'))
      ) {
        if (selectedPairIds.size > 0) {
          e.preventDefault();
          const count = selectedPairIds.size;
          handleDeleteSelected();
          showToast(`🗑️ Deleted ${count} selected training pair${count === 1 ? '' : 's'} (${isMod ? 'Ctrl+Del' : 'Del'})`);
          return;
        }
      }

      // 3. Ctrl+A / Cmd+A when NOT inside an input: Select all filtered pairs
      if (isMod && (e.key === 'a' || e.key === 'A') && !isInputFocused) {
        e.preventDefault();
        const allFilteredIds = filteredDatasets.map(d => d.id);
        const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedPairIds.has(id));
        handleSelectAllFiltered();
        showToast(
          !allSelected 
            ? `✨ Selected all ${allFilteredIds.length} filtered pairs (Ctrl+A)` 
            : `Deselected all filtered pairs (Ctrl+A)`
        );
        return;
      }

      // 4. Ctrl+F / Cmd+F OR "/" when not typing: Focus search input
      if ((isMod && (e.key === 'f' || e.key === 'F')) || (!isInputFocused && e.key === '/')) {
        e.preventDefault();
        const searchInput = document.getElementById('input-dataset-search') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
          showToast('🔍 Focused dataset search (Ctrl+F)');
        }
        return;
      }

      // 5. Alt+N / Ctrl+Alt+N OR "N" when idle: Open Add Pair modal
      if ((e.altKey && (e.key === 'n' || e.key === 'N')) || (!isInputFocused && !isMod && !e.altKey && (e.key === 'n' || e.key === 'N'))) {
        e.preventDefault();
        onOpenAddModal();
        showToast('➕ Opened Add Training Pair modal (N)');
        return;
      }

      // 6. Ctrl+W / Cmd+W (when pairs selected) OR "W" when idle and pairs selected: Open Bulk Weight modal
      if (
        (isMod && (e.key === 'w' || e.key === 'W') && selectedPairIds.size > 0) ||
        (!isInputFocused && !isMod && !e.altKey && (e.key === 'w' || e.key === 'W') && selectedPairIds.size > 0)
      ) {
        e.preventDefault();
        setIsBulkWeightModalOpen(true);
        showToast('⚖️ Opened Bulk Weight Multiplier modal (W)');
        return;
      }

      // 6b. Alt+C: Open Batch AI Auto-Categorize & Tagging modal
      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        setIsAutoCategorizeModalOpen(true);
        showToast('✨ Opened AI Auto-Categorization & Tagging (Alt+C)');
        return;
      }

      // 6c. Ctrl+Z / Cmd+Z: Undo last dataset modification or bulk action
      if (isMod && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        if (!isInputFocused) {
          e.preventDefault();
          handleUndo();
          return;
        }
      }

      // 7. Ctrl+Enter / Cmd+Enter: Start / Stop training
      if (isMod && e.key === 'Enter') {
        e.preventDefault();
        if (isTraining) {
          handleStopTraining();
          showToast('⏹️ Training loop stopped (Ctrl+Enter)');
        } else {
          handleStartTraining();
          showToast('🚀 Started on-device neural training (Ctrl+Enter)');
        }
        return;
      }

      // 8. Escape: Deselect all, close shortcuts modal, or blur inputs
      if (e.key === 'Escape') {
        if (isShortcutsModalOpen) {
          setIsShortcutsModalOpen(false);
          return;
        }
        if (isBulkWeightModalOpen) {
          setIsBulkWeightModalOpen(false);
          return;
        }
        if (selectedPairIds.size > 0) {
          handleClearSelection();
          showToast('Deselected all training pairs (Esc)');
          return;
        }
        if (isInputFocused && activeEl instanceof HTMLElement) {
          activeEl.blur();
        }
      }

      // 9. "?" or Shift+"/" when not typing in input: Toggle shortcuts modal
      if (!isInputFocused && (e.key === '?' || (e.shiftKey && e.key === '/'))) {
        e.preventDefault();
        setIsShortcutsModalOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    filteredDatasets, 
    selectedPairIds, 
    isTraining, 
    isShortcutsModalOpen, 
    isBulkWeightModalOpen, 
    checkpointNameInput, 
    epochs, 
    learningRate, 
    batchSize,
    undoStack,
    datasets
  ]);

  const categoryCounts = datasets.reduce((acc, d) => {
    acc[d.category] = (acc[d.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate Loss Curve Path for SVG
  const renderLossChart = () => {
    const logs = progress.logs.length > 0 ? progress.logs : [
      { step: 1, loss: 0.85 },
      { step: 10, loss: 0.42 },
      { step: 20, loss: 0.18 },
      { step: 30, loss: 0.08 },
      { step: 42, loss: checkpoint.finalLoss || 0.042 }
    ];

    const width = 600;
    const height = 160;
    const padding = 20;

    const maxLoss = Math.max(...logs.map(l => l.loss), 0.9);
    const minLoss = Math.min(...logs.map(l => l.loss), 0.01);

    const points = logs.map((log, index) => {
      const x = padding + (index / Math.max(1, logs.length - 1)) * (width - padding * 2);
      const y = height - padding - ((log.loss - minLoss) / Math.max(0.001, maxLoss - minLoss)) * (height - padding * 2);
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40 overflow-visible">
        <defs>
          <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#334155" strokeDasharray="3 3" opacity="0.4" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#334155" strokeDasharray="3 3" opacity="0.4" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#334155" opacity="0.6" />

        {/* Filled area under curve */}
        {logs.length > 1 && (
          <polygon
            points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
            fill="url(#lossGradient)"
          />
        )}

        {/* Loss Curve Line */}
        <polyline
          fill="none"
          stroke="#22d3ee"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />

        {/* Current Point */}
        {logs.length > 0 && (
          <circle
            cx={width - padding}
            cy={height - padding - ((logs[logs.length - 1].loss - minLoss) / Math.max(0.001, maxLoss - minLoss)) * (height - padding * 2)}
            r="4"
            fill="#38bdf8"
            className="animate-pulse"
          />
        )}
      </svg>
    );
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-2 sm:px-4 py-4 space-y-5">
      {/* Top Banner: Checkpoint Overview & Quick Action */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-500/30 text-cyan-400">
              <Flame className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Nexus On-Device Training Studio
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-400 font-mono-code">
                  100% CLIENT-SIDE BACKPROP
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Train, optimize, and fine-tune your autonomous model with zero cloud dependence.
              </p>
            </div>
          </div>
        </div>

        {/* Active Checkpoint quick edit & shortcuts */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            value={checkpointNameInput}
            onChange={e => setCheckpointNameInput(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-cyan-200 font-mono-code focus:outline-none focus:border-cyan-500 flex-1 md:flex-none"
            placeholder="Checkpoint Name"
          />
          <button
            onClick={handleSaveCheckpointName}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Save Checkpoint Name (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5 text-cyan-400" />
            <span>Save</span>
            <kbd className="hidden sm:inline px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-cyan-300 font-bold">
              Ctrl+S
            </kbd>
          </button>
          <button
            id="btn-open-shortcuts"
            onClick={() => setIsShortcutsModalOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-cyan-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
            title="View global keyboard shortcuts reference (?)"
          >
            <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Keys</span>
            <kbd className="px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-300 font-bold">
              ?
            </kbd>
          </button>
        </div>
      </div>

      {/* Dataset Analytics & Distribution Summary Card */}
      <DatasetSummaryCard
        datasets={datasets}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        isTraining={isTraining}
        trainingVelocity={progress.tokensPerSec || defaultNexusNeuralCore.getLastTrainingVelocity()}
        tokensProcessed={progress.tokensProcessed || 0}
        currentStep={progress.currentStep}
        totalSteps={progress.totalSteps}
      />

      {/* Main Grid: Left Controls & Charts, Right Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Hyperparameters & Live Visualizer (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Training Control Card */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                Training Hyperparameters
              </h3>
              <span className="text-[11px] font-mono-code text-cyan-400">
                Dataset: {datasets.length} QA pairs
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {/* Epochs */}
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400">Epochs</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={epochs}
                  disabled={isTraining}
                  onChange={e => setEpochs(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-cyan-300 font-mono-code"
                />
              </div>

              {/* Learning Rate */}
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400">Learning Rate (η)</span>
                <input
                  type="number"
                  step="0.001"
                  min="0.0001"
                  max="0.1"
                  value={learningRate}
                  disabled={isTraining}
                  onChange={e => setLearningRate(parseFloat(e.target.value) || 0.005)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-cyan-300 font-mono-code"
                />
              </div>

              {/* Batch Size */}
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400">Batch Size</span>
                <select
                  value={batchSize}
                  disabled={isTraining}
                  onChange={e => setBatchSize(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-cyan-300 font-mono-code text-xs"
                >
                  <option value={1}>1 (SGD)</option>
                  <option value={2}>2 (Mini-batch)</option>
                  <option value={4}>4 (Balanced)</option>
                  <option value={8}>8 (Fast)</option>
                </select>
              </div>

              {/* Optimizer */}
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400">Optimizer</span>
                <select
                  value={optimizer}
                  disabled={isTraining}
                  onChange={e => setOptimizer(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-cyan-300 font-mono-code text-xs"
                >
                  <option value="adam">Adam</option>
                  <option value="sgd">SGD + Mom</option>
                  <option value="rmsprop">RMSprop</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              {!isTraining ? (
                <button
                  id="btn-start-training"
                  onClick={handleStartTraining}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer transition-all"
                  title="Start On-Device Training (Ctrl+Enter)"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start On-Device Training</span>
                  <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-800 text-cyan-200 text-[10px] font-mono font-bold">
                    Ctrl+Enter
                  </kbd>
                </button>
              ) : (
                <button
                  id="btn-stop-training"
                  onClick={handleStopTraining}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 cursor-pointer transition-all"
                  title="Stop Training Process (Ctrl+Enter)"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>Stop Training Process</span>
                  <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-rose-950 border border-rose-700 text-rose-200 text-[10px] font-mono font-bold">
                    Ctrl+Enter
                  </kbd>
                </button>
              )}
            </div>
          </div>

          {/* Loss Curve & Metrics Card */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <TrendingDown className="w-4 h-4 text-cyan-400" />
                <span>Real-Time Loss Convergence</span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5 font-mono-code text-xs">
                <span className="text-slate-400">
                  Loss: <strong className="text-cyan-300">{progress.currentLoss.toFixed(4)}</strong>
                </span>
                <span className="text-slate-400">
                  Perplexity: <strong className="text-emerald-400">{progress.perplexity.toFixed(3)}</strong>
                </span>
                <span className="text-slate-400">
                  Velocity: <strong className="text-amber-400 font-mono">{(progress.tokensPerSec || defaultNexusNeuralCore.getLastTrainingVelocity()).toLocaleString()} tok/s</strong>
                </span>
              </div>
            </div>

            {/* SVG Loss Graph */}
            <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
              {renderLossChart()}
            </div>
          </div>
        </div>

        {/* Right Column: Training Live Terminal (5 cols) */}
        <div className="lg:col-span-5 flex flex-col h-full min-h-[380px] p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono-code text-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400">
            <div className="flex items-center gap-2 text-cyan-400">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <span className="font-bold">nexus_trainer.log</span>
            </div>
            {isTraining && (
              <span className="text-[11px] text-amber-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                ETA: ~{progress.etaSeconds}s
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-slate-300 max-h-[300px]">
            <div className="text-slate-500">
              [SYSTEM] Initializing autonomous neural backpropagation pipeline...
            </div>
            <div className="text-slate-500">
              [SYSTEM] Vocabulary size: {defaultNexusNeuralCore.getActiveCheckpoint().weights.vocabSize} tokens.
            </div>
            <div className="text-cyan-400/80">
              [CHECKPOINT] Active model: {checkpoint.name} ({checkpoint.trainedEpochs} total epochs).
            </div>

            {progress.logs.map((log, lIdx) => (
              <div key={lIdx} className="leading-tight">
                <span className="text-slate-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                <span className="text-cyan-300">Ep {log.epoch}/{progress.totalEpochs}</span>{' '}
                <span className="text-slate-400">Step {log.step}</span> |{' '}
                <span className="text-emerald-400">loss: {log.loss.toFixed(4)}</span> |{' '}
                <span className="text-indigo-300">ppl: {log.perplexity.toFixed(2)}</span> |{' '}
                <span className="text-amber-400">{log.tokensPerSec || defaultNexusNeuralCore.getLastTrainingVelocity()} tok/s</span>
              </div>
            ))}

            {isTraining && (
              <div className="text-amber-400 animate-pulse flex items-center gap-1 mt-2">
                <span>&gt; Calculating tensor gradients ({(progress.tokensPerSec || defaultNexusNeuralCore.getLastTrainingVelocity()).toLocaleString()} tok/s)...</span>
              </div>
            )}
            <div ref={terminalEndRef} />
          </div>

          {/* Quick Metrics Bar at bottom of terminal */}
          <div className="mt-3 pt-2 border-t border-slate-800 grid grid-cols-4 gap-2 text-center text-[10px]">
            <div className="p-1.5 rounded bg-slate-900 border border-slate-800/80">
              <span className="text-slate-500 block">STATUS</span>
              <span className={isTraining ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                {isTraining ? 'TRAINING...' : 'STANDBY'}
              </span>
            </div>
            <div className="p-1.5 rounded bg-slate-900 border border-slate-800/80">
              <span className="text-slate-500 block">VELOCITY</span>
              <span className="text-amber-400 font-bold">
                {(progress.tokensPerSec || defaultNexusNeuralCore.getLastTrainingVelocity()).toLocaleString()} <span className="text-[9px] text-slate-400">tok/s</span>
              </span>
            </div>
            <div className="p-1.5 rounded bg-slate-900 border border-slate-800/80">
              <span className="text-slate-500 block">DATASETS</span>
              <span className="text-cyan-300 font-bold">{datasets.length}</span>
            </div>
            <div className="p-1.5 rounded bg-slate-900 border border-slate-800/80">
              <span className="text-slate-500 block">EPOCHS</span>
              <span className="text-slate-200 font-bold">{checkpoint.trainedEpochs}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dataset Management Section */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-bold text-slate-100">Dataset Knowledge Repository</h3>
              <p className="text-xs text-slate-400">
                Add, edit, or customize Q&A pairs to specialize Nexus's autonomous behavior.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {selectedPairIds.size > 0 && (
              <>
                <button
                  id="btn-bulk-weight-top"
                  onClick={() => setIsBulkWeightModalOpen(true)}
                  className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 border border-cyan-500/50 text-cyan-300 hover:text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-cyan-950/40"
                  title={`Apply weight multiplier to ${selectedPairIds.size} selected training pairs (W)`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Set Weights ({selectedPairIds.size})</span>
                  <kbd className="hidden sm:inline px-1 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-200 text-[10px] font-mono font-bold">
                    W
                  </kbd>
                </button>
                <button
                  id="btn-delete-selected-top"
                  onClick={handleDeleteSelected}
                  className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-600 border border-rose-500/50 text-rose-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-rose-950/40"
                  title={`Delete ${selectedPairIds.size} selected training pairs (Ctrl+Del or Del)`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete ({selectedPairIds.size})</span>
                  <kbd className="hidden sm:inline px-1 py-0.5 rounded bg-rose-950/80 border border-rose-500/40 text-rose-200 text-[10px] font-mono font-bold">
                    Del
                  </kbd>
                </button>
              </>
            )}

            {onOpenImportDataset && (
              <button
                id="btn-import-dataset-json"
                onClick={onOpenImportDataset}
                className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                title="Import JSON array of training pairs for bulk dataset update"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>Import JSON</span>
              </button>
            )}

            {onOpenExportDataset && (
              <button
                id="btn-export-dataset-json"
                onClick={onOpenExportDataset}
                className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                title="Export all dataset pairs as JSON"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export JSON</span>
              </button>
            )}

            <button
              id="btn-undo-dataset-action"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                undoStack.length > 0
                  ? 'bg-indigo-950/80 hover:bg-indigo-900 border-indigo-500/50 text-indigo-200 hover:text-white shadow-md shadow-indigo-950/40 cursor-pointer'
                  : 'bg-slate-900/40 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
              }`}
              title={
                undoStack.length > 0
                  ? `Undo last action: ${undoStack[0].description} (Ctrl+Z)`
                  : 'No actions to undo (Ctrl+Z)'
              }
            >
              <Undo2 className={`w-3.5 h-3.5 ${undoStack.length > 0 ? 'text-indigo-400' : 'text-slate-600'}`} />
              <span>Undo</span>
              {undoStack.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-900 border border-indigo-500/40 text-indigo-300 text-[10px] font-mono font-bold">
                  {undoStack.length}
                </span>
              )}
              <kbd className="hidden sm:inline px-1 py-0.5 rounded bg-indigo-950/90 border border-indigo-500/30 text-indigo-300 text-[10px] font-mono">
                Ctrl+Z
              </kbd>
            </button>

            <button
              id="btn-batch-auto-categorize"
              onClick={() => setIsAutoCategorizeModalOpen(true)}
              className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-cyan-950/30"
              title="AI-Powered Auto-Categorization & Tagging (Alt+C)"
            >
              <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>AI Auto-Categorize</span>
              <kbd className="hidden sm:inline px-1 py-0.5 rounded bg-cyan-900/60 border border-cyan-500/30 text-cyan-200 text-[10px] font-mono">
                Alt+C
              </kbd>
            </button>

            <button
              id="btn-add-training-pair"
              onClick={onOpenAddModal}
              className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-cyan-500/20"
              title="Add New Training Pair (N or Alt+N)"
            >
              <Plus className="w-4 h-4" />
              <span>Add Training Pair</span>
              <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-cyan-900/70 text-cyan-100 text-[10px] font-mono font-bold">
                N
              </kbd>
            </button>
          </div>
        </div>

        {/* Filters & Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input Field */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              id="input-dataset-search"
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search prompts, responses, intents... (Press / or Ctrl+F to focus)"
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
            />
            {searchQuery && (
              <button
                id="btn-clear-dataset-search"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none" />
              <select
                id="select-dataset-category-filter"
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full appearance-none pl-8 pr-8 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 font-medium focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 cursor-pointer transition-all"
                title="Filter training pairs by category"
              >
                <option value="all">All Categories ({datasets.length})</option>
                <option value="core">Core Identity ({categoryCounts['core'] || 0})</option>
                <option value="coding">Coding & Syntax ({categoryCounts['coding'] || 0})</option>
                <option value="reasoning">Logic & Math ({categoryCounts['reasoning'] || 0})</option>
                <option value="chat">Chat & Personality ({categoryCounts['chat'] || 0})</option>
                <option value="productivity">Productivity & Tools ({categoryCounts['productivity'] || 0})</option>
                <option value="custom">Custom Pairs ({categoryCounts['custom'] || 0})</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Quick Category Chips for quick switching on desktop */}
            <div className="hidden xl:flex items-center gap-1">
              {['all', 'core', 'coding', 'reasoning', 'chat', 'productivity', 'custom'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-1 rounded-lg text-[11px] capitalize transition-all whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-semibold'
                      : 'bg-slate-950/60 border border-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat} {cat !== 'all' && categoryCounts[cat] ? `(${categoryCounts[cat]})` : ''}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results summary when filtered or searched */}
        {(searchQuery || selectedCategory !== 'all') && (
          <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-950/40 border border-slate-800 text-[11px] text-slate-400">
            <span>
              Showing <strong className="text-cyan-400 font-semibold">{filteredDatasets.length}</strong> of {datasets.length} training pairs
              {searchQuery && (
                <span> matching "<span className="text-slate-200">{searchQuery}</span>"</span>
              )}
              {selectedCategory !== 'all' && (
                <span> in category <span className="capitalize text-slate-200 font-medium">{selectedCategory}</span></span>
              )}
            </span>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="text-cyan-400 hover:text-cyan-300 font-medium hover:underline text-[11px]"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Bulk Selection Active Action Banner */}
        {selectedPairIds.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-900/90 border border-cyan-500/40 text-xs animate-in fade-in shadow-lg shadow-cyan-950/20">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <div>
                <span className="font-bold text-slate-100">
                  {selectedPairIds.size} {selectedPairIds.size === 1 ? 'training pair' : 'training pairs'} selected
                </span>
                <span className="hidden sm:inline text-slate-400 ml-2">
                  (Ready for batch weight multiplier or bulk removal)
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                id="btn-open-auto-categorize-banner"
                onClick={() => setIsAutoCategorizeModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 hover:text-white font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-md shadow-cyan-950/40"
                title="Auto-categorize and extract tags for selected pairs"
              >
                <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>AI Auto-Categorize ({selectedPairIds.size})</span>
              </button>
              <button
                id="btn-open-bulk-weight-banner"
                onClick={() => setIsBulkWeightModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-md shadow-cyan-950/40"
                title="Open modal to multiply or set weights on selected pairs"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Apply Weight Multiplier</span>
              </button>
              <button
                id="btn-delete-selected"
                onClick={handleDeleteSelected}
                className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 border border-rose-500/50 text-rose-300 hover:text-white font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-md shadow-rose-950/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedPairIds.size})</span>
              </button>
              <button
                id="btn-deselect-all"
                onClick={handleClearSelection}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 text-[11px] font-medium transition-colors"
              >
                Deselect All
              </button>
            </div>
          </div>
        )}

        {/* Datasets Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-mono-code">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    id="checkbox-select-all"
                    checked={filteredDatasets.length > 0 && filteredDatasets.every(d => selectedPairIds.has(d.id))}
                    onChange={handleSelectAllFiltered}
                    className="rounded border-slate-700 bg-slate-900 text-cyan-500 accent-cyan-500 cursor-pointer w-3.5 h-3.5"
                    title="Select / Deselect all filtered pairs"
                  />
                </th>
                <th className="py-2.5 px-3">Category / Intent & Tags</th>
                <th className="py-2.5 px-3">Weight</th>
                <th className="py-2.5 px-3">User Prompt</th>
                <th className="py-2.5 px-3">Target Model Response</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredDatasets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No dataset pairs found matching the search or category filters.
                  </td>
                </tr>
              ) : (
                filteredDatasets.map(pair => {
                  const isSelected = selectedPairIds.has(pair.id);
                  const currentWeight = pair.weight ?? 1.0;
                  return (
                    <tr
                      key={pair.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-cyan-950/30 hover:bg-cyan-950/40'
                          : 'hover:bg-slate-900/40'
                      }`}
                    >
                      <td className="py-3 px-3 align-top text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectPair(pair.id)}
                          className="rounded border-slate-700 bg-slate-900 text-cyan-500 accent-cyan-500 cursor-pointer w-3.5 h-3.5 mt-1"
                        />
                      </td>
                      <td className="py-3 px-3 align-top whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-cyan-300 font-mono-code mb-1">
                          {pair.category}
                        </span>
                        <span className="block text-[11px] text-slate-400 font-mono-code">
                          {pair.intent}
                        </span>
                        {pair.tags && pair.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1 max-w-[160px]">
                            {pair.tags.slice(0, 3).map(t => (
                              <span
                                key={t}
                                className="px-1 py-0.2 rounded bg-slate-950 border border-slate-800/80 text-[9px] font-mono text-cyan-300/80"
                              >
                                #{t}
                              </span>
                            ))}
                            {pair.tags.length > 3 && (
                              <span className="text-[9px] text-slate-500 font-mono">
                                +{pair.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 align-top whitespace-nowrap">
                        <span 
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold border transition-colors ${
                            currentWeight > 1.2
                              ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300 shadow-sm shadow-cyan-950'
                              : currentWeight < 0.9
                              ? 'bg-amber-950/50 border-amber-500/40 text-amber-300'
                              : 'bg-slate-900 border-slate-700/80 text-slate-300'
                          }`}
                          title={`Weight: ${currentWeight.toFixed(2)}x (impacts neural gradient loss backprop)`}
                        >
                          <Zap className="w-2.5 h-2.5 text-cyan-400" />
                          {currentWeight.toFixed(2)}x
                        </span>
                      </td>
                      <td className="py-3 px-3 align-top font-medium text-slate-200 max-w-xs">
                        {pair.prompt}
                      </td>
                      <td className="py-3 px-3 align-top text-slate-400 max-w-md line-clamp-3">
                        {pair.response}
                      </td>
                      <td className="py-3 px-3 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleQuickAutoTagRow(pair)}
                            className="p-1 rounded-lg hover:bg-cyan-950/70 text-slate-400 hover:text-cyan-300 transition-colors"
                            title="AI Auto-Categorize & Tag this sample"
                          >
                            <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
                          </button>
                          <button
                            onClick={() => onEditPair(pair)}
                            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-cyan-300"
                            title="Edit Pair"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePair(pair.id)}
                            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400"
                            title="Delete Pair"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch AI Auto-Categorize Modal */}
      <BatchAutoCategorizeModal
        isOpen={isAutoCategorizeModalOpen}
        onClose={() => setIsAutoCategorizeModalOpen(false)}
        datasets={datasets}
        selectedPairIds={selectedPairIds}
        onApplyBatchUpdates={handleApplyBatchAutoCategorization}
      />

      {/* Bulk Weight Multiplier Modal */}
      <BulkWeightModal
        isOpen={isBulkWeightModalOpen}
        onClose={() => setIsBulkWeightModalOpen(false)}
        selectedPairs={datasets.filter(d => selectedPairIds.has(d.id))}
        onApplyMultiplier={handleApplyBulkWeightMultiplier}
      />

      {/* Global Keyboard Shortcuts Cheat Sheet Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* Floating HUD Feedback Notification for Shortcuts & Undoable Actions */}
      {toastMessage && (
        <div 
          id="hud-shortcut-toast"
          className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900/95 border border-cyan-500/50 text-slate-100 text-xs font-semibold shadow-2xl shadow-cyan-950/60 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>{toastMessage.text}</span>
            {toastMessage.canUndo && undoStack.length > 0 && (
              <button
                id="btn-toast-quick-undo"
                onClick={() => {
                  handleUndo();
                  setToastMessage(null);
                }}
                className="ml-1.5 px-2 py-0.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-[10px] flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                title="Undo last action (Ctrl+Z)"
              >
                <Undo2 className="w-3 h-3" />
                <span>Undo</span>
                <kbd className="hidden sm:inline px-1 py-0.2 rounded bg-indigo-700/60 text-indigo-100 text-[9px] font-mono">
                  Ctrl+Z
                </kbd>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
