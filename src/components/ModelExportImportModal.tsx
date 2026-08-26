import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  Check, 
  Copy, 
  FileCode, 
  Sparkles, 
  Cpu, 
  Layers,
  Database,
  Flame,
  AlertCircle,
  HelpCircle,
  Code2,
  RefreshCw
} from 'lucide-react';
import { ModelCheckpoint, TrainingPair } from '../types/nexus';
import { defaultNexusNeuralCore } from '../engine/nexusNeuralCore';

export type ExportImportMode = 'export' | 'import' | 'presets';
export type ContentType = 'checkpoint' | 'dataset';

interface ModelExportImportModalProps {
  isOpen: boolean;
  mode: ExportImportMode;
  initialContentType?: ContentType;
  onClose: () => void;
  onModelLoaded: (checkpoint: ModelCheckpoint) => void;
  onDatasetsUpdated?: (datasets: TrainingPair[]) => void;
}

export const ModelExportImportModal: React.FC<ModelExportImportModalProps> = ({
  isOpen,
  mode: initialMode,
  initialContentType = 'dataset',
  onClose,
  onModelLoaded,
  onDatasetsUpdated
}) => {
  const [activeTab, setActiveTab] = useState<ExportImportMode>(initialMode);
  const [contentType, setContentType] = useState<ContentType>(initialContentType);
  
  // State for export
  const [copied, setCopied] = useState(false);

  // State for import
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [datasetUpdateMode, setDatasetUpdateMode] = useState<'merge' | 'replace'>('merge');
  const [parsedPreview, setParsedPreview] = useState<{
    detectedType: 'checkpoint' | 'dataset' | 'unknown';
    validCount: number;
    rawCount: number;
    pairs: TrainingPair[];
    checkpointName?: string;
  } | null>(null);

  // Sync tab and content type on reopen
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      if (initialContentType) {
        setContentType(initialContentType);
      }
      setImportError(null);
      setImportSuccess(null);
      setImportJson('');
      setParsedPreview(null);
    }
  }, [isOpen, initialMode, initialContentType]);

  // Real-time analysis of pasted/uploaded JSON
  useEffect(() => {
    if (!importJson.trim()) {
      setParsedPreview(null);
      setImportError(null);
      return;
    }

    try {
      const parsed = JSON.parse(importJson);
      
      // Check if it's a model checkpoint
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.weights && parsed.name) {
        setParsedPreview({
          detectedType: 'checkpoint',
          validCount: 1,
          rawCount: 1,
          pairs: [],
          checkpointName: parsed.name
        });
        setContentType('checkpoint');
        setImportError(null);
        return;
      }

      // Check if it's a dataset array or object with dataset items
      const { validPairs, rawCount, error } = defaultNexusNeuralCore.parseDatasetsFromJson(importJson);
      if (validPairs.length > 0) {
        setParsedPreview({
          detectedType: 'dataset',
          validCount: validPairs.length,
          rawCount,
          pairs: validPairs
        });
        setContentType('dataset');
        setImportError(null);
      } else {
        setParsedPreview({
          detectedType: 'unknown',
          validCount: 0,
          rawCount: rawCount || 0,
          pairs: []
        });
        if (error) {
          setImportError(error);
        }
      }
    } catch (e: any) {
      setParsedPreview(null);
      setImportError(`JSON Syntax Error: ${e.message}`);
    }
  }, [importJson]);

  if (!isOpen) return null;

  const currentCheckpoint = defaultNexusNeuralCore.getActiveCheckpoint();
  const currentDatasets = defaultNexusNeuralCore.getDatasets();

  const checkpointJson = defaultNexusNeuralCore.exportModelJson();
  const datasetJson = defaultNexusNeuralCore.exportDatasetsJson();
  const activeExportJson = contentType === 'checkpoint' ? checkpointJson : datasetJson;

  const sampleDatasetTemplate = JSON.stringify([
    {
      prompt: "How do I optimize React re-renders?",
      response: "Use React.memo for pure components, useCallback for memoizing stable function references, and useMemo for computationally intensive derived values.",
      category: "coding",
      intent: "react_optimization",
      tags: ["react", "performance", "hooks"],
      weight: 1.5
    },
    {
      prompt: "What is the time complexity of quicksort?",
      response: "Quicksort has an average and best-case time complexity of O(N log N). The worst-case is O(N^2) when poor pivots are chosen, which can be mitigated with randomized pivot selection.",
      category: "reasoning",
      intent: "algorithm_complexity",
      tags: ["algorithms", "quicksort", "big_o"]
    }
  ], null, 2);

  const handleCopyJson = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    if (contentType === 'checkpoint') {
      const blob = new Blob([checkpointJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentCheckpoint.name.toLowerCase().replace(/[\s\.]+/g, '_')}_checkpoint.nexus.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      const blob = new Blob([datasetJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexus_training_datasets_${currentDatasets.length}_pairs.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      setImportJson(content);
    };
    reader.readAsText(file);
  };

  const handleApplyImport = () => {
    setImportError(null);
    setImportSuccess(null);

    if (!importJson.trim()) {
      setImportError('Please provide or upload JSON data first.');
      return;
    }

    try {
      // 1. Dataset array import
      if (contentType === 'dataset') {
        const result = defaultNexusNeuralCore.importDatasetsJson(importJson, datasetUpdateMode);
        if (result.success) {
          const actionWord = datasetUpdateMode === 'replace' ? 'Replaced repository with' : 'Successfully merged';
          setImportSuccess(`${actionWord} ${result.importedCount} training pairs! Active dataset count is now ${result.updatedDatasets.length}.`);
          onDatasetsUpdated?.(result.updatedDatasets);
          onModelLoaded(defaultNexusNeuralCore.getActiveCheckpoint());
          setTimeout(() => {
            onClose();
          }, 1400);
        } else {
          setImportError(result.error || 'Failed to parse training pairs from JSON.');
        }
        return;
      }

      // 2. Model checkpoint import
      const ok = defaultNexusNeuralCore.importModelJson(importJson);
      if (ok) {
        const updated = defaultNexusNeuralCore.getActiveCheckpoint();
        setImportSuccess(`Loaded model checkpoint: "${updated.name}" successfully!`);
        onModelLoaded(updated);
        onDatasetsUpdated?.(defaultNexusNeuralCore.getDatasets());
        setTimeout(() => {
          onClose();
        }, 1300);
      } else {
        setImportError('Invalid model JSON format. Missing required neural weights or architecture structure.');
      }
    } catch (e: any) {
      setImportError(`Import processing error: ${e.message}`);
    }
  };

  const handleLoadPreset = (presetName: string, desc: string, epochs: number, loss: number) => {
    const updated = defaultNexusNeuralCore.saveCurrentCheckpoint(presetName, desc);
    updated.trainedEpochs = epochs;
    updated.finalLoss = loss;
    onModelLoaded(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-5 space-y-4 max-h-[90vh] flex flex-col">
        {/* Header & Close */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-500/30 text-cyan-400">
              {contentType === 'dataset' ? <Database className="w-4 h-4" /> : <Cpu className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Nexus Model & Dataset Hub
              </h3>
              <p className="text-[11px] text-slate-400">
                Export weights, import bulk training pairs JSON, or switch architectures.
              </p>
            </div>
          </div>
          <button
            id="btn-close-export-modal"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher: Export | Import | Presets */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <button
            id="tab-export"
            onClick={() => { setActiveTab('export'); setImportError(null); setImportSuccess(null); }}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'export'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
          <button
            id="tab-import"
            onClick={() => { setActiveTab('import'); setImportError(null); setImportSuccess(null); }}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'import'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import</span>
          </button>
          <button
            id="tab-presets"
            onClick={() => { setActiveTab('presets'); setImportError(null); setImportSuccess(null); }}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'presets'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Model Presets</span>
          </button>
        </div>

        {/* Content Type Sub-Selector (Dataset Pairs vs. Checkpoint Weights) */}
        {(activeTab === 'export' || activeTab === 'import') && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
            <span className="text-slate-400 font-medium text-[11px] flex items-center gap-1.5">
              <span>Target Asset:</span>
            </span>
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setContentType('dataset')}
                className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 text-xs font-semibold ${
                  contentType === 'dataset'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Training Pairs ({currentDatasets.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setContentType('checkpoint')}
                className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 text-xs font-semibold ${
                  contentType === 'checkpoint'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Neural Checkpoint</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto space-y-3.5 text-xs pr-1">
          {/* ================= EXPORT TAB ================= */}
          {activeTab === 'export' && (
            <div className="space-y-3">
              {contentType === 'dataset' ? (
                <div>
                  <p className="text-slate-300 font-medium">
                    Export Training Dataset JSON Array
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Download your current repository of <strong className="text-cyan-300">{currentDatasets.length} training Q&A pairs</strong> as an array of JSON objects for bulk backup, sharing, or cross-model fine-tuning.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-slate-300 font-medium">
                    Export Autonomous Model Checkpoint (.nexus.json)
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Includes trained embedding matrices, self-attention parameters ($W_q, W_k, W_v$), intent routing mappings, and optimizer history.
                  </p>
                </div>
              )}

              {/* JSON preview box */}
              <div className="relative">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono-code text-[11px] text-cyan-300/90 max-h-48 overflow-y-auto">
                  {activeExportJson.slice(0, 1600)}
                  {activeExportJson.length > 1600 ? `\n\n... [${activeExportJson.length - 1600} more bytes truncated in preview]` : ''}
                </div>
                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-[10px] text-slate-400 font-mono-code">
                    {(activeExportJson.length / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  id="btn-download-export-json"
                  onClick={handleDownloadFile}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    Download {contentType === 'dataset' ? 'Dataset JSON (.json)' : '.nexus.json Checkpoint'}
                  </span>
                </button>
                <button
                  id="btn-copy-export-json"
                  onClick={() => handleCopyJson(activeExportJson)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center gap-1.5 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied to Clipboard' : 'Copy JSON'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= IMPORT TAB ================= */}
          {activeTab === 'import' && (
            <div className="space-y-3">
              {contentType === 'dataset' ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-medium">
                      Import Bulk Training Pairs (JSON Array)
                    </span>
                    <button
                      type="button"
                      onClick={() => setImportJson(sampleDatasetTemplate)}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1"
                    >
                      <Code2 className="w-3 h-3" />
                      <span>Load Sample Array</span>
                    </button>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Upload a <code>.json</code> file or paste a JSON array containing pairs with <code>prompt</code> and <code>response</code> fields (e.g. <code>[{'{"prompt": "...", "response": "..."}'}]</code>).
                  </p>
                </div>
              ) : (
                <div>
                  <span className="text-slate-300 font-medium block">
                    Import Nexus Neural Checkpoint (.nexus.json)
                  </span>
                  <p className="text-slate-400 text-[11px]">
                    Load a previously saved model file or paste model weights to immediately hot-swap the active neural core.
                  </p>
                </div>
              )}

              {/* File upload input */}
              <div>
                <label className="text-slate-300 text-[11px] font-medium block mb-1">
                  Upload File (.json)
                </label>
                <div className="relative">
                  <input
                    id="file-upload-input"
                    type="file"
                    accept=".json,.nexus"
                    onChange={handleFileUpload}
                    className="w-full text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-950 file:text-cyan-300 hover:file:bg-cyan-900 cursor-pointer border border-slate-800 rounded-xl p-1 bg-slate-950"
                  />
                </div>
              </div>

              {/* Paste JSON text area */}
              <div>
                <label className="text-slate-300 text-[11px] font-medium block mb-1">
                  Or Paste JSON Array / Object Directly
                </label>
                <textarea
                  id="textarea-import-json"
                  value={importJson}
                  onChange={e => setImportJson(e.target.value)}
                  placeholder={
                    contentType === 'dataset'
                      ? '[\n  {\n    "prompt": "How does binary search work?",\n    "response": "Binary search finds an item in a sorted array in O(log N) time...",\n    "category": "coding"\n  }\n]'
                      : 'Paste { "name": "...", "weights": { ... } } checkpoint JSON here...'
                  }
                  rows={5}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono-code text-[11px] text-cyan-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Dataset update mode toggle (Merge vs Replace) */}
              {contentType === 'dataset' && (
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <span className="text-slate-300 text-[11px] font-semibold block">
                    Bulk Update Strategy:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <label
                      onClick={() => setDatasetUpdateMode('merge')}
                      className={`p-2 rounded-lg border cursor-pointer transition-all flex items-start gap-2 ${
                        datasetUpdateMode === 'merge'
                          ? 'bg-cyan-950/60 border-cyan-500/60 text-slate-100'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="datasetMode"
                        checked={datasetUpdateMode === 'merge'}
                        onChange={() => setDatasetUpdateMode('merge')}
                        className="mt-0.5 accent-cyan-500"
                      />
                      <div>
                        <span className="font-semibold text-xs text-cyan-300 block">
                          Merge & Update (Recommended)
                        </span>
                        <span className="text-[10px] text-slate-400 leading-tight block">
                          Appends new training pairs and updates matching IDs / prompts while preserving your existing dataset.
                        </span>
                      </div>
                    </label>

                    <label
                      onClick={() => setDatasetUpdateMode('replace')}
                      className={`p-2 rounded-lg border cursor-pointer transition-all flex items-start gap-2 ${
                        datasetUpdateMode === 'replace'
                          ? 'bg-amber-950/60 border-amber-500/60 text-slate-100'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="datasetMode"
                        checked={datasetUpdateMode === 'replace'}
                        onChange={() => setDatasetUpdateMode('replace')}
                        className="mt-0.5 accent-amber-500"
                      />
                      <div>
                        <span className="font-semibold text-xs text-amber-300 block">
                          Replace Entire Dataset
                        </span>
                        <span className="text-[10px] text-slate-400 leading-tight block">
                          Clears all current training pairs and sets the repository strictly to the imported array.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Real-time Parsed Preview Card */}
              {parsedPreview && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Parsed Data Analysis:</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono-code">
                      {parsedPreview.detectedType === 'dataset'
                        ? `Dataset Array (${parsedPreview.validCount} valid pairs)`
                        : parsedPreview.detectedType === 'checkpoint'
                        ? `Checkpoint (${parsedPreview.checkpointName})`
                        : 'Unknown schema'}
                    </span>
                  </div>

                  {parsedPreview.detectedType === 'dataset' && parsedPreview.pairs.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] text-slate-400">
                        Sample prompts ready for import:
                      </div>
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                        {parsedPreview.pairs.slice(0, 3).map((p, idx) => (
                          <div key={idx} className="p-1.5 rounded bg-slate-900 border border-slate-800 text-[10px] flex items-center justify-between gap-2">
                            <span className="font-medium text-slate-200 truncate flex-1">
                              • {p.prompt}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[9px] font-mono-code whitespace-nowrap">
                              {p.category}
                            </span>
                          </div>
                        ))}
                        {parsedPreview.pairs.length > 3 && (
                          <div className="text-[10px] text-slate-500 pl-2">
                            + {parsedPreview.pairs.length - 3} more pairs...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Error feedback */}
              {importError && (
                <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 text-[11px] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Success feedback */}
              {importSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{importSuccess}</span>
                </div>
              )}

              {/* Submit Import Button */}
              <button
                id="btn-apply-import"
                onClick={handleApplyImport}
                disabled={!importJson.trim()}
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>
                  {contentType === 'dataset'
                    ? parsedPreview?.validCount
                      ? `Import ${parsedPreview.validCount} Training Pairs (${datasetUpdateMode === 'merge' ? 'Merge' : 'Replace'})`
                      : 'Import Dataset Training Pairs'
                    : 'Load Neural Checkpoint'}
                </span>
              </button>
            </div>
          )}

          {/* ================= PRESETS TAB ================= */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <p className="text-slate-400">
                Switch instantly between tuned on-device configurations:
              </p>

              <div className="space-y-2">
                {/* Preset 1 */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 transition-all flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100">Nexus-Autonomous-Core-v1.4</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                        Default
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      General purpose on-device assistant with high factual reasoning and conversational balance.
                    </p>
                  </div>
                  <button
                    onClick={() => handleLoadPreset('Nexus-Autonomous-Core-v1.4', 'General purpose balanced local model.', 42, 0.0428)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300 font-semibold text-xs whitespace-nowrap transition-colors"
                  >
                    Activate
                  </button>
                </div>

                {/* Preset 2 */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 transition-all flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100">Nexus-Coder-Nano</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-500/30">
                        Coding
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      Fine-tuned on TypeScript, React hooks, Python algorithms, and structural code synthesis.
                    </p>
                  </div>
                  <button
                    onClick={() => handleLoadPreset('Nexus-Coder-Nano', 'Specialized on TypeScript, React, and Python coding.', 58, 0.0312)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-purple-600 hover:text-white text-slate-300 font-semibold text-xs whitespace-nowrap transition-colors"
                  >
                    Activate
                  </button>
                </div>

                {/* Preset 3 */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 transition-all flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100">Nexus-Reasoning-v2</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                        Logic / Math
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      Optimized for multi-step algebraic resolution, logical deduction, and step-by-step problem solving.
                    </p>
                  </div>
                  <button
                    onClick={() => handleLoadPreset('Nexus-Reasoning-v2', 'Optimized for step-by-step mathematics and logic.', 64, 0.0275)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 font-semibold text-xs whitespace-nowrap transition-colors"
                  >
                    Activate
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
