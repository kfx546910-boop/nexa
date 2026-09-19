/**
 * NEXA // AUTOMATION CENTER
 * Real workflow execution: the on-device training loop can be started here
 * with genuine progress (epoch, loss, throughput), plus a live view of the
 * voice -> intent -> tool -> execution -> result pipeline and the real
 * triggers/events that come from the system.
 */

import React, { useEffect, useState } from 'react';
import { FlaskConical, Play, Square, ArrowDown, Database, Cpu, Flame, Radio } from 'lucide-react';
import { useNexaSystem } from '../state/NexaSystemContext';
import { defaultNexusNeuralCore } from '../engine/nexusNeuralCore';
import type { TrainingProgress } from '../types/nexus';

export const NexaAutomationCenter: React.FC = () => {
  const { pushEvent, setUiState, voice, events, settings } = useNexaSystem();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<TrainingProgress | null>(null);
  const [episode, setEpisode] = useState(0);

  const startTraining = async () => {
    if (running) return;
    setRunning(true);
    setUiState('EXECUTING', 'COMMAND EXECUTION');
    pushEvent('AUTOMATION', `Training episode ${episode + 1} started (on-device).`, 'tool');
    try {
      await defaultNexusNeuralCore.trainModel(3, 0.005, 4, setProgress);
      pushEvent('AUTOMATION', 'Training episode completed and checkpoint saved.', 'success');
      setEpisode(current => current + 1);
    } catch (error) {
      pushEvent('AUTOMATION', error instanceof Error ? error.message : 'Training failed.', 'error');
    } finally {
      setRunning(false);
      setUiState('IDLE', 'READY');
    }
  };

  const stopTraining = () => {
    defaultNexusNeuralCore.stopTraining();
    pushEvent('AUTOMATION', 'Training stop requested.', 'tool');
  };

  const activeTasks = [
    { name: 'Neural training loop', active: running || defaultNexusNeuralCore.getIsTraining() },
    { name: 'Speech recognition', active: voice.active },
    { name: 'Voice synthesis', active: voice.speaking }
  ];

  const pipeline = ['VOICE COMMAND', 'INTENT', 'TOOL', 'EXECUTION', 'RESULT'];

  return (
    <section className="nexa-module-surface">
      <div className="nexa-module-header">
        <div className="nexa-module-title">
          <FlaskConical className="w-5 h-5" />
          <div>
            <h2>AUTOMATION ENGINE</h2>
            <p>Real on-device workflows, triggers and execution state</p>
          </div>
        </div>
      </div>

      <div className="nexa-automation-pipeline">
        {pipeline.map((stage, i) => (
          <React.Fragment key={stage}>
            {i > 0 && <ArrowDown className="nexa-automation-arrow w-4 h-4" />}
            <div className="nexa-automation-node">
              <span className="nexa-automation-node-idx">0{i + 1}</span>
              {stage}
            </div>
          </React.Fragment>
        ))}
      </div>

      <div className="nexa-automation-train">
        <div className="nexa-automation-train-header">
          <Cpu className="w-4 h-4" />
          <span>TRAINING WORKFLOW — ON-DEVICE BACKPROP</span>
        </div>
        {running && progress ? (
          <div className="nexa-automation-progress">
            <div className="nexa-automation-progress-row">
              <span>EPOCH</span><span>{progress.currentEpoch}/{progress.totalEpochs}</span>
            </div>
            <div className="nexa-automation-progress-row">
              <span>LOSS</span><span className="nexa-mono">{progress.currentLoss.toFixed(4)}</span>
            </div>
            <div className="nexa-automation-progress-row">
              <span>PERPLEXITY</span><span className="nexa-mono">{progress.perplexity.toFixed(2)}</span>
            </div>
            <div className="nexa-automation-progress-row">
              <span>THROUGHPUT</span><span className="nexa-mono">{progress.tokensPerSec} tok/s</span>
            </div>
            <div className="nexa-progress-track">
              <div className="nexa-progress-fill" style={{ width: `${(progress.currentStep / Math.max(1, progress.totalSteps)) * 100}%` }} />
            </div>
          </div>
        ) : (
          <p className="nexa-automation-idle">Workflow idle — start a training episode to watch real execution.</p>
        )}
        <div className="nexa-automation-actions">
          {running ? (
            <button type="button" onClick={stopTraining} className="nexa-action-btn danger">
              <Square className="w-3.5 h-3.5" />
              <span>STOP TRAINING</span>
            </button>
          ) : (
            <button type="button" onClick={startTraining} className="nexa-action-btn">
              <Play className="w-3.5 h-3.5" />
              <span>START TRAINING EPISODE</span>
            </button>
          )}
        </div>
      </div>

      <div className="nexa-automation-grid">
        <div className="nexa-automation-card">
          <div className="nexa-automation-card-title"><Flame className="w-3.5 h-3.5" /> ACTIVE TASKS</div>
          {activeTasks.map(task => (
            <div key={task.name} className="nexa-automation-task">
              <span className={`nexa-dot ${task.active ? 'active' : 'standby'}`} />
              <span className="nexa-automation-task-name">{task.name}</span>
              <span className="nexa-automation-task-state">{task.active ? 'RUNNING' : 'IDLE'}</span>
            </div>
          ))}
        </div>

        <div className="nexa-automation-card">
          <div className="nexa-automation-card-title"><Radio className="w-3.5 h-3.5" /> TRIGGERS</div>
          <div className="nexa-automation-trigger">Voice wake word · {settings.wakeWordEnabled ? 'ENABLED' : 'DISABLED'}</div>
          <div className="nexa-automation-trigger">Gesture key · G / E / C</div>
          <div className="nexa-automation-trigger">Camera gesture events · live</div>
        </div>

        <div className="nexa-automation-card">
          <div className="nexa-automation-card-title"><Database className="w-3.5 h-3.5" /> LATEST EVENTS</div>
          <div className="nexa-automation-events">
            {events.slice(0, 4).map(event => (
              <div key={event.id} className="nexa-automation-event">
                <span className="nexa-event-time">{event.source}</span>
                <span>{event.message}</span>
              </div>
            ))}
            {events.length === 0 && <span className="nexa-automation-idle">No events recorded.</span>}
          </div>
        </div>
      </div>
    </section>
  );
};