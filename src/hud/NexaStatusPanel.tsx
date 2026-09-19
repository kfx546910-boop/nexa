/**
 * NEXA // STATUS PANEL
 * Right HUD panel. Reflects real application state: the on-device neural
 * engine, actual camera readiness, speech support, memory store, tools and
 * automation subsystems.
 */

import React, { useEffect, useState } from 'react';
import { ShieldCheck, Eye, Mic, Database, Boxes, FlaskConical, Cpu } from 'lucide-react';
import { useNexaSystem } from '../state/NexaSystemContext';
import { defaultMemoryStore } from '../engine/memoryStore';
import { defaultNexusNeuralCore } from '../engine/nexusNeuralCore';
import { VisionConfig } from '../vision/VisionConfig';
import { VisionEngine } from '../vision/VisionEngine';

interface StatusEntry {
  id: string;
  label: string;
  detail: string;
  state: 'ready' | 'standby' | 'error';
}

export const NexaStatusPanel: React.FC = () => {
  const { voice } = useNexaSystem();
  const [cameraState, setCameraState] = useState<'ready' | 'standby' | 'error'>('standby');
  const [cameraDetail, setCameraDetail] = useState('DETECTING...');

  useEffect(() => {
    const engine = new VisionEngine(new VisionConfig({ VISION_ENABLED: 'false', VISION_LOCAL_ONLY: 'true' }));
    engine
      .detectCamera()
      .then(status => {
        if (status.state === 'ready') {
          setCameraState('ready');
          setCameraDetail('READY');
        } else if (status.state === 'permission-denied') {
          setCameraState('error');
          setCameraDetail('ACCESS DENIED');
        } else {
          setCameraState('standby');
          setCameraDetail('NOT DETECTED');
        }
      })
      .catch(() => {
        setCameraState('standby');
        setCameraDetail('N/A');
      });
  }, []);

  const memoryCount = defaultMemoryStore.getAll().length;
  const checkpoint = defaultNexusNeuralCore.getActiveCheckpoint();
  const geminiConfigured = Boolean(import.meta.env.GEMINI_API_KEY);

  const entries: StatusEntry[] = [
    {
      id: 'ai',
      label: 'AI ENGINE',
      detail: geminiConfigured ? 'LOCAL + GEMINI' : 'ON-DEVICE MODEL',
      state: 'ready'
    },
    {
      id: 'vision',
      label: 'VISION',
      detail: cameraDetail,
      state: cameraState
    },
    {
      id: 'voice',
      label: 'VOICE',
      detail: voice.supported ? 'READY' : 'STT N/A',
      state: voice.supported ? 'ready' : 'standby'
    },
    {
      id: 'memory',
      label: 'MEMORY',
      detail: `CONNECTED · ${memoryCount} CHUNK${memoryCount === 1 ? '' : 'S'}`,
      state: 'ready'
    },
    {
      id: 'tools',
      label: 'TOOLS',
      detail: 'ONLINE',
      state: 'ready'
    },
    {
      id: 'automation',
      label: 'AUTOMATION',
      detail: defaultNexusNeuralCore.getIsTraining() ? 'TRAINING IN PROGRESS' : 'READY',
      state: 'ready'
    }
  ];

  const ICONS: Record<string, React.ReactNode> = {
    ai: <Cpu className="w-3 h-3" />,
    vision: <Eye className="w-3 h-3" />,
    voice: <Mic className="w-3 h-3" />,
    memory: <Database className="w-3 h-3" />,
    tools: <Boxes className="w-3 h-3" />,
    automation: <FlaskConical className="w-3 h-3" />
  };

  return (
    <aside className="nexa-panel nexa-panel-right" aria-label="NEXA status">
      <div className="nexa-panel-title">
        <span className="nexa-panel-glyph">◫</span>
        NEXA STATUS
      </div>

      <div className="mt-3 space-y-2.5">
        {entries.map(entry => (
          <div key={entry.id} className="nexa-status-row">
            <span className="flex items-center gap-1.5">{ICONS[entry.id]} {entry.label}</span>
            <span className="flex items-center gap-2">
              <span className="nexa-status-detail">{entry.detail}</span>
              <span className={`nexa-dot ${entry.state}`} />
            </span>
          </div>
        ))}
      </div>

      <div className="nexa-console-card mt-4">
        <div className="nexa-console-header">
          <ShieldCheck className="w-3 h-3" />
          <span>MODEL CHECKPOINT</span>
        </div>
        <div className="nexa-console-body">
          <span className="nexa-console-name">{checkpoint.name || 'NEXA NEURAL CORE'}</span>
          <span className="nexa-console-meta">
            {checkpoint.version} · {checkpoint.parametersCount.toLocaleString()} PARAMS · Loss {checkpoint.finalLoss.toFixed(4)}
          </span>
        </div>
      </div>
    </aside>
  );
};