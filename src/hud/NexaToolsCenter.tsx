/**
 * NEXA // TOOLS CENTER
 * Holographic registry of every REAL tool in the system: file import/export,
 * camera, microphone, speech, knowledge, diagnostics and automation. Each
 * entry shows genuine status and executes real actions.
 */

import React, { useEffect, useState } from 'react';
import {
  Boxes, FileText, Eye, Mic, AudioLines, Database, Zap, FlaskConical, Hand, Play
} from 'lucide-react';
import { useNexaSystem } from '../state/NexaSystemContext';
import { runLocalModelBenchmark, type BenchmarkResult } from '../engine/benchmarks';
import { defaultMemoryStore } from '../engine/memoryStore';
import { defaultNexusNeuralCore } from '../engine/nexusNeuralCore';
import { VisionConfig } from '../vision/VisionConfig';
import { VisionEngine } from '../vision/VisionEngine';
import type { TabType } from '../components/Header';

interface ToolsCenterProps {
  onOpenExport: () => void;
  onOpenImport: () => void;
  onNavigate: (tab: TabType) => void;
}

export const NexaToolsCenter: React.FC<ToolsCenterProps> = ({ onOpenExport, onOpenImport, onNavigate }) => {
  const { voice, ttsSupported, pushEvent, telemetry, setUiState } = useNexaSystem();
  const [cameraState, setCameraState] = useState<{ state: string; message: string } | null>(null);
  const [benchRunning, setBenchRunning] = useState(false);
  const [benchStage, setBenchStage] = useState('');
  const [benchPct, setBenchPct] = useState(0);
  const [benchResult, setBenchResult] = useState<BenchmarkResult | null>(null);

  useEffect(() => {
    const engine = new VisionEngine(new VisionConfig({ VISION_ENABLED: 'false', VISION_LOCAL_ONLY: 'true' }));
    void engine.detectCamera().then(setCameraState).catch(() => setCameraState({ state: 'unknown', message: 'N/A' }));
  }, []);

  const runBenchmark = async () => {
    if (benchRunning) return;
    setBenchRunning(true);
    setUiState('EXECUTING', 'COMMAND EXECUTION');
    pushEvent('TOOLS', 'Diagnostic benchmark started (real on-device measurement).', 'tool');
    try {
      const result = await runLocalModelBenchmark((stage, pct) => {
        setBenchStage(stage);
        setBenchPct(pct);
      });
      setBenchResult(result);
      pushEvent('TOOLS', `Benchmark complete · ${result.tokensPerSec} tok/s · ${result.inferenceLatencyMs} ms`, 'success');
    } catch (error) {
      pushEvent('TOOLS', error instanceof Error ? error.message : 'Benchmark failed.', 'error');
    } finally {
      setBenchRunning(false);
      setTimeout(() => setUiState('IDLE', 'READY'), 700);
    }
  };

  const tools = [
    {
      id: 'web',
      name: 'WEB',
      icon: Boxes,
      status: telemetry.online === null ? 'UNKNOWN' : telemetry.online ? 'READY' : 'OFFLINE',
      ok: telemetry.online !== false,
      description: 'Browser network access — live connection state',
      action: null as null | (() => void)
    },
    {
      id: 'files',
      name: 'FILES',
      icon: FileText,
      status: 'READY',
      ok: true,
      description: 'Model checkpoint & dataset import / export (JSON)',
      action: () => onOpenExport()
    },
    {
      id: 'camera',
      name: 'CAMERA',
      icon: Eye,
      status: cameraState ? (cameraState.state === 'ready' ? 'READY' : cameraState.state === 'permission-denied' ? 'ACCESS DENIED' : 'NOT DETECTED') : 'DETECTING',
      ok: cameraState?.state === 'ready',
      description: 'Local camera feed & detection pipeline',
      action: () => onNavigate('vision')
    },
    {
      id: 'microphone',
      name: 'MICROPHONE',
      icon: Mic,
      status: voice.supported ? 'READY' : 'N/A',
      ok: voice.supported,
      description: 'Click-to-talk speech recognition',
      action: () => onNavigate('voice')
    },
    {
      id: 'speech',
      name: 'SPEECH',
      icon: AudioLines,
      status: ttsSupported ? 'READY' : 'N/A',
      ok: ttsSupported,
      description: 'Text-to-speech voice responses',
      action: () => onNavigate('voice')
    },
    {
      id: 'knowledge',
      name: 'KNOWLEDGE',
      icon: Database,
      status: `CONNECTED · ${defaultMemoryStore.getAll().length}`,
      ok: true,
      description: 'On-device vector memory store (RAG)',
      action: () => onNavigate('memory')
    },
    {
      id: 'gesture',
      name: 'INPUT',
      icon: Hand,
      status: 'STANDBY',
      ok: true,
      description: 'Camera gesture control — press G to enable',
      action: null
    },
    {
      id: 'automation',
      name: 'AUTOMATION',
      icon: FlaskConical,
      status: defaultNexusNeuralCore.getIsTraining() ? 'BUSY' : 'READY',
      ok: true,
      description: 'Training loop & workflow execution engine',
      action: () => onNavigate('automation')
    }
  ];

  return (
    <section className="nexa-module-surface">
      <div className="nexa-module-header">
        <div className="nexa-module-title">
          <Boxes className="w-5 h-5" />
          <div>
            <h2>TOOL REGISTRY</h2>
            <p>Real capabilities with live permissions and state</p>
          </div>
        </div>
      </div>

      <div className="nexa-tool-grid">
        {tools.map(tool => {
          const Icon = tool.icon;
          return (
            <div key={tool.id} className={`nexa-tool-card ${tool.ok ? '' : 'warn'}`}>
              <div className="nexa-tool-head">
                <span className="nexa-tool-icon"><Icon className="w-4 h-4" /></span>
                <span className="nexa-tool-name">{tool.name}</span>
                <span className={`nexa-tool-status ${tool.ok ? 'ok' : 'warn'}`}>{tool.status}</span>
              </div>
              <p className="nexa-tool-desc">{tool.description}</p>
              {tool.action && (
                <button type="button" onClick={tool.action} className="nexa-tool-execute">EXECUTE</button>
              )}
            </div>
          );
        })}
      </div>

      <div className="nexa-tool-bench">
        <div className="nexa-tool-bench-head">
          <Zap className="w-4 h-4" />
          <span>ON-DEVICE DIAGNOSTIC BENCHMARK</span>
        </div>
        {benchRunning && (
          <div className="nexa-progress-track">
            <div className="nexa-progress-fill" style={{ width: `${benchPct}%` }} />
            <span className="nexa-progress-stage">{benchStage} · {benchPct}%</span>
          </div>
        )}
        {benchResult && !benchRunning && (
          <div className="nexa-tool-bench-result">
            Latency {benchResult.inferenceLatencyMs} ms · {benchResult.tokensPerSec} tok/s · {benchResult.trainingSpeedStepPerSec} steps/s · {benchResult.memoryEstimateMB} MB
          </div>
        )}
        <button type="button" onClick={runBenchmark} disabled={benchRunning} className="nexa-action-btn">
          <Play className={`w-3.5 h-3.5 ${benchRunning ? 'animate-pulse' : ''}`} />
          <span>{benchRunning ? 'MEASURING...' : 'RUN DIAGNOSTIC BENCHMARK'}</span>
        </button>
      </div>
    </section>
  );
};