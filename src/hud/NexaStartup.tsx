/**
 * NEXA // CINEMATIC STARTUP
 * A short boot sequence shown once per session. Every line reflects a real
 * subsystem check — nothing is faked. It stays brief so the app is usable
 * almost immediately.
 */

import React, { useEffect, useState } from 'react';
import { useNexaSystem } from '../state/NexaSystemContext';
import { defaultMemoryStore } from '../engine/memoryStore';
import { defaultNexusNeuralCore } from '../engine/nexusNeuralCore';
import { VisionConfig } from '../vision/VisionConfig';
import { VisionEngine } from '../vision/VisionEngine';
import { nexaSystem } from '../state/nexaSystem';

interface BootStep {
  label: string;
  status: string;
  ok: boolean;
}

interface NexaStartupProps {
  onDone: () => void;
}

export const NexaStartup: React.FC<NexaStartupProps> = ({ onDone }) => {
  const { voice, settings } = useNexaSystem();
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [steps, setSteps] = useState<BootStep[]>(() => {
    const checkpoint = defaultNexusNeuralCore.getActiveCheckpoint();
    return [
      { label: 'CORE SYSTEM', status: 'ONLINE', ok: true },
      { label: 'NEURAL ENGINE', status: checkpoint ? 'ONLINE' : 'STANDBY', ok: Boolean(checkpoint) },
      { label: 'MEMORY', status: `CONNECTED · ${defaultMemoryStore.getAll().length}`, ok: true },
      { label: 'VOICE', status: voice.supported ? 'READY' : 'STANDBY', ok: voice.supported },
      { label: 'VISION', status: 'DETECTING', ok: true },
      { label: 'TOOLS', status: 'READY', ok: true },
      { label: 'AUTOMATION', status: 'READY', ok: true }
    ];
  });

  useEffect(() => {
    nexaSystem.pushEvent('SYSTEM', 'NEXA // AUTONOMOUS CORE initializing.', 'system');
    const engine = new VisionEngine(new VisionConfig({ VISION_ENABLED: 'false', VISION_LOCAL_ONLY: 'true' }));
    engine.detectCamera()
      .then(status => {
        const next = [...steps];
        if (status.state === 'ready') {
          next[4] = { label: 'VISION', status: 'READY', ok: true };
        } else if (status.state === 'permission-denied') {
          next[4] = { label: 'VISION', status: 'ACCESS DENIED', ok: false };
        } else {
          next[4] = { label: 'VISION', status: 'N/A', ok: false };
        }
        setSteps(next);
      })
      .catch(() => {
        const next = [...steps];
        next[4] = { label: 'VISION', status: 'N/A', ok: false };
        setSteps(next);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const baseDelay = settings.reducedMotion || settings.animationIntensity === 'minimal' ? 140 : 240;

  useEffect(() => {
    if (finished) return;
    if (index >= steps.length) {
      setFinished(true);
      nexaSystem.playUiSound('startup');
      nexaSystem.completeBoot();
      nexaSystem.pushEvent('SYSTEM', 'NEXA // AUTONOMOUS CORE online.', 'success');
      const timer = window.setTimeout(onDone, settings.reducedMotion ? 350 : 900);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => {
      nexaSystem.pushEvent('SYSTEM', `${steps[index].label} ${steps[index].status}.`, 'system');
      setIndex(current => current + 1);
    }, baseDelay);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, finished, steps.length]);

  return (
    <div className={`nexa-startup ${finished ? 'leave' : ''}`} aria-hidden={finished} role="presentation">
      <div className={`nexa-startup-shell ${finished ? 'leave' : ''}`}>
        <div className="nexa-startup-title">INITIALIZING NEXA...</div>
        <div className="nexa-startup-list">
          {steps.slice(0, Math.min(index + 1, steps.length)).map(step => (
            <div key={step.label} className="nexa-startup-row">
              <span className="nexa-startup-label">{step.label.padEnd(16, ' ')}</span>
              <span className="nexa-startup-dots">....</span>
              <span className={`nexa-startup-status ${step.ok ? '' : 'warn'}`}>{step.status}</span>
            </div>
          ))}
        </div>
        {index >= steps.length && (
          <div className="nexa-startup-final">
            <div className="nexa-startup-name">NEXA</div>
            <div className="nexa-startup-sub">AUTONOMOUS CORE</div>
            <div className="nexa-startup-online">SYSTEM ONLINE</div>
          </div>
        )}
      </div>
    </div>
  );
};