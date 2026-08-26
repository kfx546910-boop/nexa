import React from 'react';
import { 
  Database, 
  Scale, 
  BarChart3, 
  Layers, 
  Zap, 
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Tag,
  Activity,
  Gauge,
  Flame,
  Cpu
} from 'lucide-react';
import { TrainingPair } from '../types/nexus';

interface DatasetSummaryCardProps {
  datasets: TrainingPair[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  isTraining?: boolean;
  trainingVelocity?: number;
  tokensProcessed?: number;
  currentStep?: number;
  totalSteps?: number;
}

interface CategoryStyle {
  bg: string;
  text: string;
  bar: string;
  border: string;
  label: string;
}

const CATEGORY_META: Record<string, CategoryStyle> = {
  core: { 
    bg: 'bg-cyan-500/10', 
    text: 'text-cyan-400', 
    bar: 'bg-cyan-500', 
    border: 'border-cyan-500/30', 
    label: 'Core Identity' 
  },
  coding: { 
    bg: 'bg-blue-500/10', 
    text: 'text-blue-400', 
    bar: 'bg-blue-500', 
    border: 'border-blue-500/30', 
    label: 'Coding & Syntax' 
  },
  reasoning: { 
    bg: 'bg-purple-500/10', 
    text: 'text-purple-400', 
    bar: 'bg-purple-500', 
    border: 'border-purple-500/30', 
    label: 'Logic & Math' 
  },
  chat: { 
    bg: 'bg-emerald-500/10', 
    text: 'text-emerald-400', 
    bar: 'bg-emerald-500', 
    border: 'border-emerald-500/30', 
    label: 'Chat & Dialogue' 
  },
  productivity: { 
    bg: 'bg-amber-500/10', 
    text: 'text-amber-400', 
    bar: 'bg-amber-500', 
    border: 'border-amber-500/30', 
    label: 'Productivity' 
  },
  custom: { 
    bg: 'bg-rose-500/10', 
    text: 'text-rose-400', 
    bar: 'bg-rose-500', 
    border: 'border-rose-500/30', 
    label: 'Custom User' 
  },
};

const DEFAULT_CATEGORY_STYLE: CategoryStyle = {
  bg: 'bg-slate-800',
  text: 'text-slate-300',
  bar: 'bg-slate-400',
  border: 'border-slate-700',
  label: 'General'
};

export const DatasetSummaryCard: React.FC<DatasetSummaryCardProps> = ({
  datasets,
  selectedCategory,
  onSelectCategory,
  isTraining = false,
  trainingVelocity = 1250,
  tokensProcessed = 0,
  currentStep = 0,
  totalSteps = 0
}) => {
  const totalCount = datasets.length;

  // Weight Statistics
  const weights = datasets.map(d => d.weight ?? 1.0);
  const totalWeightSum = weights.reduce((acc, w) => acc + w, 0);
  const avgWeight = totalCount > 0 ? (totalWeightSum / totalCount) : 1.0;
  const minWeight = totalCount > 0 ? Math.min(...weights) : 1.0;
  const maxWeight = totalCount > 0 ? Math.max(...weights) : 1.0;
  const boostedCount = weights.filter(w => w > 1.05).length;
  const dampenedCount = weights.filter(w => w < 0.95).length;

  // Category counts and distributions
  const categoryCounts = datasets.reduce((acc, d) => {
    const cat = d.category || 'core';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const uniqueCategories = Object.keys(categoryCounts).sort(
    (a, b) => (categoryCounts[b] || 0) - (categoryCounts[a] || 0)
  );

  // Velocity formatting and display
  const displayVelocity = Math.max(1, trainingVelocity);
  const velocityThroughputPct = Math.min(100, Math.round((displayVelocity / 2500) * 100));

  return (
    <div 
      id="card-dataset-summary-stats"
      className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-cyan-950/20 border border-slate-800 shadow-xl space-y-4"
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>Dataset & Neural Training Telemetry</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                isTraining 
                  ? 'bg-amber-950/80 border-amber-500/40 text-amber-300 animate-pulse' 
                  : 'bg-cyan-950/80 border-cyan-500/30 text-cyan-300'
              }`}>
                {isTraining ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    LIVE FINE-TUNING ACTIVE
                  </>
                ) : (
                  'ACTIVE REPOSITORY'
                )}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Live telemetry on token weight dynamics, categorical corpus balance, and parameter update velocity
            </p>
          </div>
        </div>

        {/* Quick filter status */}
        {selectedCategory !== 'all' && (
          <button
            onClick={() => onSelectCategory('all')}
            className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900 transition-colors flex items-center gap-1"
          >
            <span>Showing: <strong className="capitalize">{selectedCategory}</strong></span>
            <span className="text-cyan-400/80 font-bold ml-1">✕ Reset</span>
          </button>
        )}
      </div>

      {/* Primary 4-Metric Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Total QA Pair Count */}
        <div 
          id="stat-total-pairs"
          className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/90 flex items-center justify-between hover:border-slate-700 transition-all group"
        >
          <div>
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-1">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              Total Training Pairs
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-100 font-mono tracking-tight group-hover:text-cyan-300 transition-colors">
                {totalCount}
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                examples
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Across {uniqueCategories.length} distinct domains
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2: Average Loss Weight */}
        <div 
          id="stat-average-weight"
          className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/90 flex items-center justify-between hover:border-slate-700 transition-all group"
        >
          <div>
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-1">
              <Scale className="w-3.5 h-3.5 text-purple-400" />
              Average Loss Weight
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-purple-300 font-mono tracking-tight">
                {avgWeight.toFixed(2)}x
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                (min {minWeight.toFixed(1)}x / max {maxWeight.toFixed(1)}x)
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {boostedCount} boosted ({'>'}1.0x) • {dampenedCount} dampened ({'<'}1.0x)
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3: Dominant Corpus Domain */}
        <div 
          id="stat-dominant-category"
          className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/90 flex items-center justify-between hover:border-slate-700 transition-all group"
        >
          <div>
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Primary Domain
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-emerald-300 capitalize truncate max-w-[140px]">
                {uniqueCategories[0] || 'None'}
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                {totalCount > 0 && uniqueCategories[0] ? (
                  `${Math.round(((categoryCounts[uniqueCategories[0]] || 0) / totalCount) * 100)}%`
                ) : '0%'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {uniqueCategories[0] ? `${categoryCounts[uniqueCategories[0]]} pairs indexed` : 'No items'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Tag className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4: Training Velocity (Tokens Per Second) */}
        <div 
          id="stat-training-velocity"
          className={`p-3.5 rounded-xl border transition-all group flex items-center justify-between ${
            isTraining 
              ? 'bg-gradient-to-br from-slate-950/90 via-amber-950/30 to-amber-900/20 border-amber-500/50 shadow-lg shadow-amber-950/30' 
              : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700'
          }`}
        >
          <div className="min-w-0 flex-1 mr-2">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-1">
              <Activity className={`w-3.5 h-3.5 ${isTraining ? 'text-amber-400 animate-pulse' : 'text-amber-400'}`} />
              <span>Training Velocity</span>
              {isTraining && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              )}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-black font-mono tracking-tight ${
                isTraining ? 'text-amber-300 animate-pulse' : 'text-amber-400/90'
              }`}>
                {displayVelocity.toLocaleString()}
              </span>
              <span className="text-[11px] font-mono text-slate-400 font-semibold">
                tok/s
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
              {isTraining ? (
                <span className="text-amber-300 font-medium font-mono">
                  {tokensProcessed.toLocaleString()} tok updated (Step {currentStep}/{totalSteps})
                </span>
              ) : (
                <span>On-device backprop & weight matrix speed</span>
              )}
            </p>
            {/* Real-time mini throughput bar */}
            <div className="w-full h-1 rounded-full bg-slate-900 mt-1.5 overflow-hidden border border-slate-800/60">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  isTraining 
                    ? 'bg-gradient-to-r from-amber-500 to-amber-300' 
                    : 'bg-slate-700'
                }`}
                style={{ width: `${Math.max(15, velocityThroughputPct)}%` }}
              />
            </div>
          </div>
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
            isTraining 
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-md shadow-amber-950/40' 
              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
          }`}>
            <Gauge className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Distribution Chart of Categories: Stacked Macro Bar & Micro Progress Bars */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <span>Category Distribution Chart</span>
            <span className="text-[10px] text-slate-500 font-mono">(Click bar to filter)</span>
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            {totalCount} Total Samples
          </span>
        </div>

        {/* Stacked Proportional Bar Visualizer */}
        <div 
          id="bar-category-stacked-distribution"
          className="w-full h-3.5 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden flex shadow-inner"
        >
          {totalCount === 0 ? (
            <div className="w-full h-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-500">
              No Data
            </div>
          ) : (
            uniqueCategories.map(cat => {
              const count = categoryCounts[cat] || 0;
              const pct = (count / totalCount) * 100;
              const style = CATEGORY_META[cat] || DEFAULT_CATEGORY_STYLE;
              const isSelected = selectedCategory === cat;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onSelectCategory(isSelected ? 'all' : cat)}
                  style={{ width: `${pct}%` }}
                  title={`${style.label || cat}: ${count} pairs (${pct.toFixed(1)}%)`}
                  className={`h-full transition-all relative group focus:outline-none ${style.bar} ${
                    isSelected ? 'ring-2 ring-white z-10 brightness-125' : 'hover:brightness-110 opacity-90'
                  }`}
                />
              );
            })
          )}
        </div>

        {/* Detailed Horizontal Bar Visualizers per Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
          {uniqueCategories.map(cat => {
            const count = categoryCounts[cat] || 0;
            const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
            const style = CATEGORY_META[cat] || DEFAULT_CATEGORY_STYLE;
            const isSelected = selectedCategory === cat;

            return (
              <button
                key={cat}
                type="button"
                id={`btn-filter-category-bar-${cat}`}
                onClick={() => onSelectCategory(isSelected ? 'all' : cat)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? `${style.bg} ${style.border} ring-1 ring-cyan-500/50 shadow-md shadow-cyan-950/30`
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${style.bar}`} />
                    <span className={`text-xs font-semibold capitalize ${isSelected ? 'text-slate-100' : 'text-slate-300'}`}>
                      {style.label || cat}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-mono">
                    <span className="font-bold text-slate-200">{count}</span>
                    <span className="text-slate-500">({percentage.toFixed(0)}%)</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800/50">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${style.bar}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
