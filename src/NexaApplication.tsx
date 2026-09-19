/**
 * NEXA // APPLICATION SHELL
 * The complete command-center layout: ambient background, cinematic startup,
 * top HUD, central CORE view (telemetry / neural core / status), module views
 * (chat, vision, voice, memory, tools, automation, studio, settings), bottom
 * holographic navigation, notifications, security gate and overlays.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Header, TabType } from './components/Header';
import { NexusChat } from './components/NexusChat';
import { TrainingStudio } from './components/TrainingStudio';
import { NeuralVisualizer } from './components/NeuralVisualizer';
import { KnowledgeBase } from './components/KnowledgeBase';
import { AddTrainingPairModal } from './components/AddTrainingPairModal';
import { ModelExportImportModal } from './components/ModelExportImportModal';
import { Footer } from './components/Footer';
import { ModelCheckpoint, TrainingPair } from './types/nexus';
import { defaultNexusNeuralCore } from './engine/nexusNeuralCore';
import { GestureControlPanel } from './components/GestureControlPanel';
import type { GestureEvent } from './gesture/gestureController';
import { VisionConfig } from './vision/VisionConfig';
import { VisionEngine } from './vision/VisionEngine';
import { GoogleConnectionCenter } from './components/GoogleConnectionCenter';
import { googleIntegrationManager } from './google/googleIntegrationManager';

import { useNexaSystem } from './state/NexaSystemContext';
import { dispatchNexaEvent, nexaSystem } from './state/nexaSystem';
import { NexaBackground } from './hud/NexaBackground';
import { NexaStartup } from './hud/NexaStartup';
import { NexaCore } from './hud/NexaCore';
import { NexaVoiceControl } from './hud/NexaVoiceControl';
import { NexaTelemetryPanel } from './hud/NexaTelemetryPanel';
import { NexaStatusPanel } from './hud/NexaStatusPanel';
import { NexaNavigation } from './hud/NexaNavigation';
import { NexaEventStream } from './hud/NexaEventStream';
import { NexaNotificationLayer } from './hud/NexaNotificationLayer';
import { NexaSecurityGate } from './hud/NexaSecurityGate';
import { NexaVoiceCenter } from './hud/NexaVoiceCenter';
import { NexaToolsCenter } from './hud/NexaToolsCenter';
import { NexaAutomationCenter } from './hud/NexaAutomationCenter';
import { NexaSettings } from './hud/NexaSettings';
import { OwnerLockScreen } from './security/OwnerLockScreen';
import { useOwnerLock } from './security/ownerLock';

function NexaApplication() {
  const { settings, booted, setUiState, pushEvent, playUiSound } = useNexaSystem();
  const { state, lock } = useOwnerLock();
  const [activeTab, setActiveTab] = useState<TabType>('core');
  const [checkpoint, setCheckpoint] = useState<ModelCheckpoint>(() => defaultNexusNeuralCore.getActiveCheckpoint());
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [showParamsDrawer, setShowParamsDrawer] = useState<boolean>(false);
  const [visionStatus, setVisionStatus] = useState<string>('VISION OFF');

  const trainingRef = useRef<boolean>(false);

  const handleGestureEvent = (event: GestureEvent) => {
    window.dispatchEvent(new CustomEvent('nexus:gesture', { detail: event }));
    if (event.action === 'custom_action') {
      setActiveTab(current => (current === 'chat' ? 'vision' : 'chat'));
      pushEvent('NAV', 'Gesture custom action executed.', 'nav');
    }
    if (event.action === 'emergency_stop') {
      defaultNexusNeuralCore.stopTraining();
      pushEvent('SYSTEM', 'Emergency stop engaged by open palm.', 'warning');
    }
  };

  const [isAddPairOpen, setIsAddPairOpen] = useState(false);
  const [editingPair, setEditingPair] = useState<TrainingPair | null>(null);
  const [exportImportModal, setExportImportModal] = useState<{
    isOpen: boolean;
    mode: 'export' | 'import' | 'presets';
    initialContentType?: 'checkpoint' | 'dataset';
  }>({
    isOpen: false,
    mode: 'export',
    initialContentType: 'dataset'
  });

  // Track training state & mirror it to the core
  useEffect(() => {
    if (state !== 'UNLOCKED') {
      if (defaultNexusNeuralCore.getIsTraining()) defaultNexusNeuralCore.stopTraining();
      return undefined;
    }
    const interval = setInterval(() => {
      const training = defaultNexusNeuralCore.getIsTraining();
      if (training !== trainingRef.current) {
        trainingRef.current = training;
        setIsTraining(training);
        if (training) {
          setUiState('EXECUTING', 'COMMAND EXECUTION');
          pushEvent('AUTOMATION', 'Neural training loop active.', 'tool');
        } else {
          setUiState('IDLE', 'READY');
          pushEvent('AUTOMATION', 'Training loop ended — checkpoint ready.', 'success');
        }
      }
    }, 400);
    return () => clearInterval(interval);
  }, [state, setUiState, pushEvent]);

  // Vision availability
  useEffect(() => {
    if (state !== 'UNLOCKED') return undefined;
    const engine = new VisionEngine(new VisionConfig({ VISION_ENABLED: 'false', VISION_LOCAL_ONLY: 'true' }));
    engine.detectCamera()
      .then(status => {
        setVisionStatus(
          status.state === 'ready' ? 'VISION READY'
            : status.state === 'permission-denied' ? 'VISION ACCESS DENIED'
              : 'VISION OFF'
        );
      })
      .catch(() => setVisionStatus('VISION OFF'));
  }, [state]);

  // Google integration manager
  useEffect(() => {
    if (state !== 'UNLOCKED') return undefined;
    googleIntegrationManager.initialize().catch((error: unknown) => {
      pushEvent('GOOGLE', error instanceof Error ? `Google init: ${error.message}` : 'Google init failed.', 'error');
    });
  }, [state, pushEvent]);

  useEffect(() => {
    const handleLockRequest = () => lock('manual');
    window.addEventListener('nexa:lock-request', handleLockRequest);
    return () => window.removeEventListener('nexa:lock-request', handleLockRequest);
  }, [lock]);

  // Component bridge events (listening / thinking / speaking)
  useEffect(() => {
    const readActive = (event: Event) => Boolean(((event as CustomEvent).detail as { active?: boolean } | undefined)?.active);
    const handleListening = (event: Event) => (readActive(event) ? setUiState('LISTENING', 'LISTENING...') : nexaSystem.resetToIdle());
    const handleProcessing = (event: Event) => (readActive(event) ? setUiState('THINKING', 'PROCESSING...') : nexaSystem.resetToIdle());
    const handleSpeaking = (event: Event) => (readActive(event) ? setUiState('SPEAKING', 'SPEAKING...') : nexaSystem.resetToIdle());
    const handleVoiceCommand = (event: Event) => {
      const detail = (event as CustomEvent).detail as { text?: string } | undefined;
      if (detail?.text && detail.text.trim()) pushEvent('USER', 'Voice command received.', 'voice');
    };

    window.addEventListener('nexa:listening', handleListening);
    window.addEventListener('nexa:processing', handleProcessing);
    window.addEventListener('nexa:speaking', handleSpeaking);
    window.addEventListener('nexa:voice-command', handleVoiceCommand);
    return () => {
      window.removeEventListener('nexa:listening', handleListening);
      window.removeEventListener('nexa:processing', handleProcessing);
      window.removeEventListener('nexa:speaking', handleSpeaking);
      window.removeEventListener('nexa:voice-command', handleVoiceCommand);
    };
  }, [setUiState, pushEvent]);

  const handleCheckpointUpdated = (updated: ModelCheckpoint) => {
    setCheckpoint(updated);
    pushEvent('SYSTEM', 'Checkpoint loaded into the neural engine.', 'success');
  };

  const handleDatasetsUpdated = (updated: TrainingPair[]) => {
    setCheckpoint({ ...defaultNexusNeuralCore.getActiveCheckpoint() });
  };

  const handleAddTrainingPairFromChat = (prompt: string, response: string) => {
    setEditingPair({
      id: `pair-${Date.now()}`,
      prompt,
      response,
      category: 'custom',
      intent: 'user_fine_tuned',
      weight: 1.2,
      tags: ['chat_feedback', 'fine_tune'],
      createdAt: Date.now()
    });
    setIsAddPairOpen(true);
  };

  const handleSaveTrainingPair = (newPair: TrainingPair) => {
    const current = defaultNexusNeuralCore.getDatasets();
    const existingIdx = current.findIndex(p => p.id === newPair.id);
    let updated: TrainingPair[];
    if (existingIdx >= 0) {
      updated = [...current];
      updated[existingIdx] = newPair;
    } else {
      updated = [newPair, ...current];
    }
    defaultNexusNeuralCore.saveDatasets(updated);
    setCheckpoint({ ...defaultNexusNeuralCore.getActiveCheckpoint() });
    pushEvent('STUDIO', 'Training pair saved to the dataset.', 'success');
  };

  const handleSetTab = (tab: TabType) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    pushEvent('NAV', `OPEN ${String(tab).toUpperCase()}`, 'nav');
    playUiSound('command');
  };

  const openExport = () => setExportImportModal({ isOpen: true, mode: 'export', initialContentType: 'dataset' });
  const openImport = () => setExportImportModal({ isOpen: true, mode: 'import', initialContentType: 'dataset' });

  const handleCoreVoiceCommand = (text: string) => {
    setActiveTab('chat');
    pushEvent('USER', text, 'user');
    dispatchNexaEvent('nexa:voice-command', { text });
  };

  if (state !== 'UNLOCKED') return <OwnerLockScreen />;

  return (
    <div
      className="nexa-shell nexa-app-shell text-slate-100 flex flex-col min-h-screen"
      data-reduced={settings.reducedMotion ? 'true' : 'false'}
    >
      <NexaBackground />

      {!booted && <NexaStartup onDone={() => setUiState('IDLE', 'READY')} />}

      <Header
        activeTab={activeTab}
        setActiveTab={handleSetTab}
        checkpoint={checkpoint}
        isTraining={isTraining}
        onOpenExport={openExport}
        onOpenImport={openImport}
        onToggleParams={() => setShowParamsDrawer(prev => !prev)}
        showParamsDrawer={showParamsDrawer}
      />

      {activeTab === 'core' ? (
        <section className="nexa-core-view" aria-label="NEXA command center">
          <div className="nexa-grid-shell">
            <NexaTelemetryPanel />
            <section className="nexa-core-stage" aria-label="NEXA neural core">
              <NexaCore />
              <NexaVoiceControl onCommand={handleCoreVoiceCommand} />
            </section>
            <NexaStatusPanel />
          </div>
          <NexaEventStream />
        </section>
      ) : (
        <main className="nexa-module-view">
          {activeTab === 'chat' && (
            <NexusChat
              onAddDatasetPrompt={handleAddTrainingPairFromChat}
              onNavigateToTraining={() => handleSetTab('studio')}
              showParamsDrawer={showParamsDrawer}
              setShowParamsDrawer={setShowParamsDrawer}
            />
          )}

          {activeTab !== 'chat' && (
            <div className="nexa-module-scroll">
              {activeTab === 'vision' && <div className="nexa-module-surface"><NeuralVisualizer /></div>}
              {activeTab === 'memory' && <div className="nexa-module-surface"><KnowledgeBase /></div>}
              {activeTab === 'voice' && <NexaVoiceCenter />}
              {activeTab === 'tools' && (
                <NexaToolsCenter
                  onOpenExport={openExport}
                  onOpenImport={openImport}
                  onNavigate={handleSetTab}
                />
              )}
              {activeTab === 'automation' && <NexaAutomationCenter />}
              {activeTab === 'settings' && <NexaSettings />}
              {activeTab === 'google' && <div className="nexa-module-surface"><GoogleConnectionCenter /></div>}
              {activeTab === 'studio' && (
                <TrainingStudio
                  checkpoint={checkpoint}
                  onCheckpointUpdated={handleCheckpointUpdated}
                  onOpenAddModal={() => {
                    setEditingPair(null);
                    setIsAddPairOpen(true);
                  }}
                  onEditPair={pair => {
                    setEditingPair(pair);
                    setIsAddPairOpen(true);
                  }}
                  onOpenImportDataset={() => setExportImportModal({ isOpen: true, mode: 'import', initialContentType: 'dataset' })}
                  onOpenExportDataset={() => setExportImportModal({ isOpen: true, mode: 'export', initialContentType: 'dataset' })}
                />
              )}
            </div>
          )}
        </main>
      )}

      <NexaNavigation activeTab={activeTab} setActiveTab={handleSetTab} isTraining={isTraining} />
      <Footer />

      <NexaNotificationLayer />
      <NexaSecurityGate />

      <div className="nexa-vision-pill">{visionStatus}</div>
      <GestureControlPanel onGestureEvent={handleGestureEvent} />

      {/* Add / Edit Training Pair Modal */}
      <AddTrainingPairModal
        isOpen={isAddPairOpen}
        onClose={() => {
          setIsAddPairOpen(false);
          setEditingPair(null);
        }}
        onSave={handleSaveTrainingPair}
        initialPair={editingPair}
      />

      {/* Model & Dataset Export / Import Modal */}
      <ModelExportImportModal
        isOpen={exportImportModal.isOpen}
        mode={exportImportModal.mode}
        initialContentType={exportImportModal.initialContentType}
        onClose={() => setExportImportModal({ ...exportImportModal, isOpen: false })}
        onModelLoaded={handleCheckpointUpdated}
        onDatasetsUpdated={handleDatasetsUpdated}
      />
    </div>
  );
}

export { NexaApplication };