import React from 'react';
import { BrainCircuit, ShieldCheck, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-md py-2 px-3 sm:px-6 z-20 shrink-0">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        {/* Left: Nexus AI Small Logo & On-device indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 shadow-inner">
            <div className="w-4 h-4 rounded-md bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <BrainCircuit className="w-2.5 h-2.5" />
            </div>
            <span className="font-bold text-[11px] tracking-tight bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Nexus AI
            </span>
          </div>
          <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-slate-500 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
            100% On-Device
          </span>
        </div>

        {/* Center / Right: Creator & Developer Attribution */}
        <div className="flex items-center flex-wrap justify-center gap-1.5 text-[11px] text-slate-400">
          <span>Created by</span>
          <span className="font-semibold text-slate-200 hover:text-cyan-300 transition-colors">
            Suraj Jangid
          </span>
          <span className="text-slate-600">•</span>
          <span>developed by</span>
          <span className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
            KingFX
          </span>
        </div>

        {/* Right: Micro version tag */}
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
          <ShieldCheck className="w-3 h-3 text-emerald-400/70" />
          <span>Zero Cloud Telemetry</span>
        </div>
      </div>
    </footer>
  );
};
