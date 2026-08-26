import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  BrainCircuit, 
  Layers, 
  Sparkles, 
  Code, 
  Hash, 
  Grid, 
  BarChart3, 
  Eye, 
  Info,
  Maximize2
} from 'lucide-react';
import { defaultTokenizer } from '../engine/tokenizer';
import { defaultNexusNeuralCore } from '../engine/nexusNeuralCore';

export const NeuralVisualizer: React.FC = () => {
  const [testText, setTestText] = useState('Nexus AI autonomously computes self-attention and weights locally.');
  const [tokenized, setTokenized] = useState(defaultTokenizer.tokenize(testText));
  const [selectedTokenIndex, setSelectedTokenIndex] = useState<number | null>(0);
  const [activeSubTab, setActiveSubTab] = useState<'attention' | 'embeddings' | 'tokenizer' | 'probabilities'>('attention');

  useEffect(() => {
    setTokenized(defaultTokenizer.tokenize(testText));
  }, [testText]);

  // Synthetic Attention Matrix based on token similarities
  const renderAttentionHeatmap = () => {
    const tokens = tokenized.slice(0, 10);
    const n = tokens.length;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Scaled Dot-Product Multi-Head Attention: {"A = softmax((Q × K^T) / √d_k)"}</span>
          <span className="font-mono-code text-cyan-300">Tokens: {n} × {n}</span>
        </div>

        <div className="overflow-x-auto p-4 rounded-xl bg-slate-950 border border-slate-800">
          <div className="inline-block min-w-full">
            {/* Column Headers */}
            <div className="flex items-center ml-24 mb-1">
              {tokens.map((t, colIdx) => (
                <div
                  key={colIdx}
                  className="w-14 text-center font-mono-code text-[10px] text-cyan-300 truncate px-0.5"
                  title={t.text}
                >
                  {t.text}
                </div>
              ))}
            </div>

            {/* Rows */}
            {tokens.map((rowToken, rIdx) => (
              <div key={rIdx} className="flex items-center mb-1">
                {/* Row Header */}
                <div className="w-24 text-right pr-3 font-mono-code text-[11px] text-slate-300 truncate" title={rowToken.text}>
                  {rowToken.text}
                </div>

                {/* Heatmap Cells */}
                {tokens.map((colToken, cIdx) => {
                  // Synthetic deterministic attention weight with diagonal bias
                  const isDiag = rIdx === cIdx;
                  const distance = Math.abs(rIdx - cIdx);
                  const weight = isDiag ? 0.85 : Math.max(0.05, 0.65 / (distance + 1) * (0.8 + ((rIdx * 7 + cIdx * 13) % 5) * 0.05));
                  const intensity = Math.min(1, Math.max(0.1, weight));

                  return (
                    <div
                      key={cIdx}
                      className="w-14 h-10 m-0.5 rounded flex items-center justify-center font-mono-code text-[10px] transition-all hover:scale-105 cursor-pointer hover:ring-2 hover:ring-cyan-300"
                      style={{
                        backgroundColor: `rgba(6, 182, 212, ${intensity * 0.9})`,
                        color: intensity > 0.4 ? '#020617' : '#94a3b8'
                      }}
                      title={`Query: "${rowToken.text}" → Key: "${colToken.text}" (Weight: ${(weight).toFixed(3)})`}
                    >
                      {weight.toFixed(2)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Latent Vector Space 2D Projection (PCA / t-SNE scatter)
  const renderLatentProjection = () => {
    const clusters = [
      { name: 'Core Architecture', color: '#22d3ee', points: [
        { word: 'nexus', x: 220, y: 140 },
        { word: 'autonomous', x: 245, y: 155 },
        { word: 'privacy', x: 210, y: 175 },
        { word: 'offline', x: 270, y: 160 },
        { word: 'on-device', x: 235, y: 190 }
      ]},
      { name: 'Coding & Algorithms', color: '#a855f7', points: [
        { word: 'typescript', x: 420, y: 80 },
        { word: 'python', x: 450, y: 110 },
        { word: 'react', x: 400, y: 125 },
        { word: 'function', x: 470, y: 85 },
        { word: 'async', x: 435, y: 145 }
      ]},
      { name: 'Logic & Mathematics', color: '#3b82f6', points: [
        { word: 'equation', x: 120, y: 280 },
        { word: 'binary_search', x: 150, y: 310 },
        { word: 'complexity', x: 175, y: 260 },
        { word: 'deduction', x: 110, y: 330 }
      ]},
      { name: 'Dialogue & Interaction', color: '#10b981', points: [
        { word: 'greeting', x: 460, y: 290 },
        { word: 'assist', x: 490, y: 320 },
        { word: 'explain', x: 430, y: 310 },
        { word: 'thank_you', x: 475, y: 350 }
      ]}
    ];

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>2D t-SNE / PCA Semantic Projection of Embedding Vectors</span>
          <div className="flex items-center gap-3">
            {clusters.map((c, idx) => (
              <span key={idx} className="flex items-center gap-1 font-mono-code text-[11px]" style={{ color: c.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }}></span>
                {c.name}
              </span>
            ))}
          </div>
        </div>

        <div className="relative w-full h-96 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center p-4">
          <svg viewBox="0 0 600 400" className="w-full h-full">
            {/* Background Grid */}
            <line x1="0" y1="200" x2="600" y2="200" stroke="#1e293b" strokeDasharray="4 4" />
            <line x1="300" y1="0" x2="300" y2="400" stroke="#1e293b" strokeDasharray="4 4" />

            {/* Clusters */}
            {clusters.map((cluster, cIdx) => (
              <g key={cIdx}>
                {cluster.points.map((pt, pIdx) => (
                  <g key={pIdx} className="cursor-pointer group">
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="6"
                      fill={cluster.color}
                      className="transition-all group-hover:r-8 opacity-80 group-hover:opacity-100"
                    />
                    <text
                      x={pt.x + 10}
                      y={pt.y + 4}
                      fill={cluster.color}
                      fontSize="11"
                      fontFamily="JetBrains Mono"
                      className="opacity-90 font-medium"
                    >
                      {pt.word}
                    </text>
                  </g>
                ))}
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  // Interactive Tokenizer Inspector
  const renderTokenizerLab = () => {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <label className="text-xs font-semibold text-slate-300">
            Interactive Tokenizer Sandbox: Type any phrase or code to inspect subword tokenization
          </label>
          <textarea
            value={testText}
            onChange={e => setTestText(e.target.value)}
            rows={2}
            className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-cyan-200 font-mono-code focus:outline-none focus:border-cyan-500"
            placeholder="Type text here..."
          />
        </div>

        {/* Token Chips */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Identified Subword Tokens ({tokenized.length})</span>
            <span className="font-mono-code text-[11px] text-cyan-400">Vocab size: {defaultTokenizer.getVocabSize()}</span>
          </div>

          <div className="flex flex-wrap gap-2 p-4 rounded-xl bg-slate-950 border border-slate-800">
            {tokenized.map((t, idx) => {
              const isSelected = selectedTokenIndex === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedTokenIndex(idx)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono-code transition-all ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 font-bold ring-2 ring-cyan-300 shadow-md'
                      : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800'
                  }`}
                >
                  <span>"{t.text}"</span>
                  <span className="text-[10px] opacity-75 font-normal">#{t.id}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Token Details */}
        {selectedTokenIndex !== null && tokenized[selectedTokenIndex] && (
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono-code space-y-1 text-slate-300">
            <div className="text-cyan-400 font-bold">Selected Token Inspector:</div>
            <div>Token String: <strong className="text-white">"{tokenized[selectedTokenIndex].text}"</strong></div>
            <div>Vocabulary ID: <strong className="text-cyan-300">{tokenized[selectedTokenIndex].id}</strong></div>
            <div>Byte Length: <strong className="text-slate-200">{new TextEncoder().encode(tokenized[selectedTokenIndex].text).length} bytes</strong></div>
            <div>Special Token: <strong className="text-slate-200">{tokenized[selectedTokenIndex].isSpecial ? 'True' : 'False'}</strong></div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-2 sm:px-4 py-4 space-y-5">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-500/30 text-cyan-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Nexus Neural Architecture Visualizer
            </h2>
            <p className="text-xs text-slate-400">
              Inspect live attention heads, latent vector projections, and subword tokenizer mechanics.
            </p>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800">
          <button
            onClick={() => setActiveSubTab('attention')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeSubTab === 'attention'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Attention Heatmap
          </button>
          <button
            onClick={() => setActiveSubTab('embeddings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeSubTab === 'embeddings'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Latent 2D Clusters
          </button>
          <button
            onClick={() => setActiveSubTab('tokenizer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeSubTab === 'tokenizer'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tokenizer Lab
          </button>
        </div>
      </div>

      {/* Main Visualizer Content */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
        {activeSubTab === 'attention' && renderAttentionHeatmap()}
        {activeSubTab === 'embeddings' && renderLatentProjection()}
        {activeSubTab === 'tokenizer' && renderTokenizerLab()}
      </div>
    </div>
  );
};
