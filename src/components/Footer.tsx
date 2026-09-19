import React from 'react';
import { BrainCircuit, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="nexa-footer w-full shrink-0 z-20">
      <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="nexa-mini-brand" aria-label="NEXA autonomous core">
            <BrainCircuit className="w-3 h-3" />
          </span>
          <span className="text-[11px] tracking-[0.22em] uppercase text-cyan-200">NEXA // AUTONOMOUS CORE</span>
        </div>

        <div className="flex items-center flex-wrap justify-center gap-1.5 text-[11px] text-slate-400">
          <span>Created by</span>
          <span className="text-slate-200">Suraj Jangid</span>
          <span className="text-slate-600">•</span>
          <span>developed by</span>
          <span className="text-cyan-300">KingFX</span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>LOCAL PROCESSING</span>
        </div>
      </div>
    </footer>
  );
};
