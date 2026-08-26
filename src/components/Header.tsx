import React from 'react';
import { 
  Cpu, 
  MessageSquare, 
  Flame, 
  Activity, 
  Database, 
  Zap, 
  ShieldCheck, 
  Download, 
  Upload, 
  RefreshCw,
  Sparkles,
  Sliders
} from 'lucide-react';
import { ModelCheckpoint } from '../types/nexus';

export type TabType = 'chat' | 'training' | 'visualizer' | 'memory' | 'benchmarks';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  checkpoint: ModelCheckpoint;
  isTraining: boolean;
  onOpenExport: () => void;
  onOpenImport: () => void;
  onToggleParams: () => void;
  showParamsDrawer: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  checkpoint,
  isTraining,
  onOpenExport,
  onOpenImport,
  onToggleParams,
  showParamsDrawer
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Brand & Status */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 text-white shadow-lg shadow-cyan-500/20">
              <Cpu className="w-5 h-5" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-950 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent">
                  NEXUS AI
                </span>
                <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                  AUTONOMOUS CORE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-emerald-400 inline" />
                <span>100% On-Device • Created by Suraj Jangid • Dev: KingFX</span>
              </p>
            </div>
          </div>

          {/* Model info badge on mobile / desktop */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span className="font-mono-code text-[11px] text-cyan-200">{checkpoint.name}</span>
            <span className="text-[10px] text-slate-500">({checkpoint.trainedEpochs} ep)</span>
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        <nav className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/90 border border-slate-800 overflow-x-auto max-w-full">
          <button
            id="nav-tab-chat"
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === 'chat'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Nexus Chat</span>
          </button>

          <button
            id="nav-tab-training"
            onClick={() => setActiveTab('training')}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === 'training'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${isTraining ? 'text-amber-400 animate-bounce' : ''}`} />
            <span>Training Studio</span>
            {isTraining && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute top-1 right-1" />
            )}
          </button>

          <button
            id="nav-tab-visualizer"
            onClick={() => setActiveTab('visualizer')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === 'visualizer'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Neural Visualizer</span>
          </button>

          <button
            id="nav-tab-memory"
            onClick={() => setActiveTab('memory')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === 'memory'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Memory (RAG)</span>
          </button>

          <button
            id="nav-tab-benchmarks"
            onClick={() => setActiveTab('benchmarks')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === 'benchmarks'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Benchmarks</span>
          </button>
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {activeTab === 'chat' && (
            <button
              id="btn-toggle-params"
              onClick={onToggleParams}
              className={`p-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 ${
                showParamsDrawer
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
              title="Tune Model Hyperparameters"
            >
              <Sliders className="w-4 h-4" />
              <span className="hidden sm:inline">Tuning</span>
            </button>
          )}

          <button
            id="btn-export-weights"
            onClick={onOpenExport}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs flex items-center gap-1"
            title="Export / Download Trained Model Checkpoint"
          >
            <Download className="w-4 h-4" />
            <span className="hidden lg:inline">Export</span>
          </button>

          <button
            id="btn-import-weights"
            onClick={onOpenImport}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs flex items-center gap-1"
            title="Import Model Checkpoint JSON"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden lg:inline">Import</span>
          </button>
        </div>
      </div>
    </header>
  );
};
