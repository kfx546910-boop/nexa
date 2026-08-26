import React, { useState, useEffect } from 'react';
import { Header, TabType } from './components/Header';
import { NexusChat } from './components/NexusChat';
import { TrainingStudio } from './components/TrainingStudio';
import { NeuralVisualizer } from './components/NeuralVisualizer';
import { KnowledgeBase } from './components/KnowledgeBase';
import { BenchmarkSuite } from './components/BenchmarkSuite';
import { AddTrainingPairModal } from './components/AddTrainingPairModal';
import { ModelExportImportModal } from './components/ModelExportImportModal';
import { Footer } from './components/Footer';
import { ModelCheckpoint, TrainingPair } from './types/nexus';
import { defaultNexusNeuralCore } from './engine/nexusNeuralCore';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [checkpoint, setCheckpoint] = useState<ModelCheckpoint>(() => defaultNexusNeuralCore.getActiveCheckpoint());
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [showParamsDrawer, setShowParamsDrawer] = useState<boolean>(false);

  // Modals state
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

  // Track training state continuously
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTraining(defaultNexusNeuralCore.getIsTraining());
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const handleCheckpointUpdated = (updated: ModelCheckpoint) => {
    setCheckpoint(updated);
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
  };

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200 overflow-hidden">
      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        checkpoint={checkpoint}
        isTraining={isTraining}
        onOpenExport={() => setExportImportModal({ isOpen: true, mode: 'export', initialContentType: 'dataset' })}
        onOpenImport={() => setExportImportModal({ isOpen: true, mode: 'import', initialContentType: 'dataset' })}
        onToggleParams={() => setShowParamsDrawer(prev => !prev)}
        showParamsDrawer={showParamsDrawer}
      />

      {/* Main Tab Views */}
      <main className="flex-1 min-h-0 flex flex-col overflow-y-auto">
        {activeTab === 'chat' && (
          <NexusChat
            onAddDatasetPrompt={handleAddTrainingPairFromChat}
            onNavigateToTraining={() => setActiveTab('training')}
            showParamsDrawer={showParamsDrawer}
            setShowParamsDrawer={setShowParamsDrawer}
          />
        )}

        {activeTab === 'training' && (
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

        {activeTab === 'visualizer' && <NeuralVisualizer />}

        {activeTab === 'memory' && <KnowledgeBase />}

        {activeTab === 'benchmarks' && <BenchmarkSuite />}
      </main>

      {/* Persistent Subtle App Footer */}
      <Footer />

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
