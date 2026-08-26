import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sliders, 
  Zap, 
  ArrowRight, 
  Sparkles, 
  Check, 
  Info,
  Layers
} from 'lucide-react';
import { TrainingPair } from '../types/nexus';

interface BulkWeightModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPairs: TrainingPair[];
  onApplyMultiplier: (value: number, mode: 'multiply' | 'fixed') => void;
}

export const BulkWeightModal: React.FC<BulkWeightModalProps> = ({
  isOpen,
  onClose,
  selectedPairs,
  onApplyMultiplier
}) => {
  const [mode, setMode] = useState<'multiply' | 'fixed'>('multiply');
  const [multiplier, setMultiplier] = useState<number>(1.5);
  const [fixedWeight, setFixedWeight] = useState<number>(1.5);

  useEffect(() => {
    if (isOpen) {
      setMultiplier(1.5);
      setFixedWeight(1.5);
      setMode('multiply');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const count = selectedPairs.length;

  // Preset options
  const multiplierPresets = [
    { label: '0.5x', value: 0.5, desc: 'Halve Weight' },
    { label: '0.8x', value: 0.8, desc: '-20% Reduction' },
    { label: '1.2x', value: 1.2, desc: '+20% Boost' },
    { label: '1.5x', value: 1.5, desc: '+50% Boost' },
    { label: '2.0x', value: 2.0, desc: '2x Double' },
    { label: '3.0x', value: 3.0, desc: '3x High Priority' },
  ];

  const fixedPresets = [
    { label: '0.5', value: 0.5, desc: 'Low Priority' },
    { label: '1.0', value: 1.0, desc: 'Standard Default' },
    { label: '1.5', value: 1.5, desc: 'Elevated' },
    { label: '2.0', value: 2.0, desc: 'High Priority' },
    { label: '3.0', value: 3.0, desc: 'Critical Focus' },
  ];

  // Calculation helpers
  const calculateNewWeight = (originalWeight: number = 1.0) => {
    if (mode === 'multiply') {
      const calculated = originalWeight * multiplier;
      return Math.min(10.0, Math.max(0.1, parseFloat(calculated.toFixed(2))));
    } else {
      return Math.min(10.0, Math.max(0.1, parseFloat(fixedWeight.toFixed(2))));
    }
  };

  const avgCurrentWeight = selectedPairs.length > 0
    ? (selectedPairs.reduce((acc, p) => acc + (p.weight ?? 1.0), 0) / selectedPairs.length).toFixed(2)
    : '1.00';

  const avgNewWeight = selectedPairs.length > 0
    ? (selectedPairs.reduce((acc, p) => acc + calculateNewWeight(p.weight ?? 1.0), 0) / selectedPairs.length).toFixed(2)
    : '1.50';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'multiply') {
      onApplyMultiplier(multiplier, 'multiply');
    } else {
      onApplyMultiplier(fixedWeight, 'fixed');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-cyan-500/40 shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Apply Bulk Weight Multiplier</span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
                  {count} {count === 1 ? 'pair' : 'pairs'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Adjust neural training loss and attention weights in bulk
              </p>
            </div>
          </div>
          <button
            id="btn-close-bulk-weight-modal"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => setMode('multiply')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              mode === 'multiply'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Multiply Existing ({multiplier}x)</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('fixed')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              mode === 'fixed'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Set Exact Fixed Weight</span>
          </button>
        </div>

        {/* Value Controls */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'multiply' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="input-multiplier-slider" className="text-xs font-medium text-slate-300">
                  Weight Multiplier Factor
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0.1"
                    max="5.0"
                    step="0.05"
                    value={multiplier}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) setMultiplier(val);
                    }}
                    className="w-16 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-cyan-400 text-right focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-xs text-cyan-400 font-mono font-bold">x</span>
                </div>
              </div>

              {/* Slider */}
              <input
                id="input-multiplier-slider"
                type="range"
                min="0.1"
                max="5.0"
                step="0.05"
                value={multiplier}
                onChange={e => setMultiplier(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />

              {/* Presets */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1">
                {multiplierPresets.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setMultiplier(p.value)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold border transition-all flex flex-col items-center justify-center ${
                      multiplier === p.value
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="input-fixed-weight-slider" className="text-xs font-medium text-slate-300">
                  Target Weight Value
                </label>
                <input
                  type="number"
                  min="0.1"
                  max="10.0"
                  step="0.1"
                  value={fixedWeight}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) setFixedWeight(val);
                  }}
                  className="w-20 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-cyan-400 text-right focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Slider */}
              <input
                id="input-fixed-weight-slider"
                type="range"
                min="0.1"
                max="5.0"
                step="0.1"
                value={fixedWeight}
                onChange={e => setFixedWeight(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />

              {/* Presets */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 pt-1">
                {fixedPresets.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setFixedWeight(p.value)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold border transition-all flex flex-col items-center justify-center ${
                      fixedWeight === p.value
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Impact / Preview Box */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Average Weight Transition:</span>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-slate-400">{avgCurrentWeight}</span>
                <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
                  {avgNewWeight}
                </span>
              </div>
            </div>

            {/* Sample items preview */}
            <div className="space-y-1.5 pt-1 border-t border-slate-900">
              <span className="text-[10px] uppercase font-mono text-slate-500 tracking-wider">
                Sample Selected Pairs Preview:
              </span>
              <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                {selectedPairs.slice(0, 3).map(p => {
                  const oldW = p.weight ?? 1.0;
                  const newW = calculateNewWeight(oldW);
                  return (
                    <div key={p.id} className="flex items-center justify-between text-[11px] py-0.5 text-slate-300">
                      <span className="truncate max-w-[240px] text-slate-400">"{p.prompt}"</span>
                      <span className="font-mono text-[10px] text-slate-400 shrink-0 ml-2">
                        {oldW.toFixed(2)} → <strong className="text-cyan-300">{newW.toFixed(2)}</strong>
                      </span>
                    </div>
                  );
                })}
                {selectedPairs.length > 3 && (
                  <p className="text-[10px] text-slate-500 italic">
                    + {selectedPairs.length - 3} more pairs will be updated
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Neural Info Note */}
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-500/20 text-[11px] text-cyan-300/90 leading-relaxed">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              Higher weights give these pairs proportional priority during backpropagation loss calculations and increase attention query scores in the on-device neural core.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
            <button
              type="button"
              id="btn-cancel-bulk-weight"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-confirm-apply-bulk-weight"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-950 flex items-center gap-1.5 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply to {count} {count === 1 ? 'Pair' : 'Pairs'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
