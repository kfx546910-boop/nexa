/**
 * NEXA // PROCESSING VISUALIZATION
 * Shown while the AI is generating a response. Displays a safe status
 * sequence (capability routing) — never private chain-of-thought or hidden
 * reasoning.
 */

import React, { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { useNexaSystem } from '../state/NexaSystemContext';

const STAGES = ['Analyzing request', 'Selecting capability', 'Preparing response', 'Executing tools'];

export const NexaThinkingOverlay: React.FC = () => {
  const { settings } = useNexaSystem();
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStage(current => (current + 1) % STAGES.length);
    }, 640);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="nexa-thinking" role="status" aria-live="polite">
      <div className="nexa-thinking-header">
        <Zap className={`w-3.5 h-3.5 ${settings.animationIntensity === 'minimal' ? '' : 'animate-pulse'}`} />
        <span>NEXA PROCESSING</span>
      </div>
      <div className="nexa-thinking-stages">
        {STAGES.map((label, i) => (
          <div key={label} className={`nexa-thinking-stage ${i === stage ? 'current' : i < stage ? 'done' : ''}`}>
            <span className="nexa-thinking-marker">{i < stage ? '✔' : i === stage ? '▸' : '○'}</span>
            <span>{label}</span>
            {i === stage && <span className="nexa-thinking-loader"><span /></span>}
          </div>
        ))}
      </div>
    </div>
  );
};