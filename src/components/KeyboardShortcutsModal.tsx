import React from 'react';
import { 
  X, 
  Keyboard, 
  Save, 
  Trash2, 
  CheckSquare, 
  Plus, 
  Sliders, 
  Search, 
  Play, 
  RotateCcw,
  Sparkles,
  Command,
  Undo2
} from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  category: 'Dataset Management' | 'Training & Checkpoints' | 'Navigation & Selection' | 'Chat & Voice';
  icon: React.ReactNode;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcuts: ShortcutItem[] = [
    {
      keys: ['Alt', 'L'],
      description: 'Toggle voice dictation (Listen) & auto-run response from local model',
      category: 'Chat & Voice',
      icon: <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
    },
    {
      keys: ['Enter'],
      description: 'Send prompt message to Nexus local model',
      category: 'Chat & Voice',
      icon: <Command className="w-3.5 h-3.5 text-blue-400" />
    },
    {
      keys: [`${modKey}`, 'S'],
      description: 'Save active model checkpoint and persist dataset to on-device storage',
      category: 'Training & Checkpoints',
      icon: <Save className="w-3.5 h-3.5 text-cyan-400" />
    },
    {
      keys: [`${modKey}`, 'Enter'],
      description: 'Start / Stop on-device neural backpropagation training loop',
      category: 'Training & Checkpoints',
      icon: <Play className="w-3.5 h-3.5 text-emerald-400" />
    },
    {
      keys: [`${modKey}`, 'Z'],
      description: 'Undo last bulk action (delete, weight adjustment, or category update)',
      category: 'Dataset Management',
      icon: <Undo2 className="w-3.5 h-3.5 text-indigo-400" />
    },
    {
      keys: [`${modKey}`, 'Del / Backspace'],
      description: 'Bulk delete all currently selected training pairs',
      category: 'Dataset Management',
      icon: <Trash2 className="w-3.5 h-3.5 text-rose-400" />
    },
    {
      keys: [`${modKey}`, 'A'],
      description: 'Select all / deselect all currently filtered dataset pairs (outside inputs)',
      category: 'Navigation & Selection',
      icon: <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
    },
    {
      keys: [`${modKey}`, 'W'],
      description: 'Open Bulk Weight Multiplier modal for selected pairs (or press Alt+W)',
      category: 'Dataset Management',
      icon: <Sliders className="w-3.5 h-3.5 text-purple-400" />
    },
    {
      keys: ['Alt', 'C'],
      description: 'Open AI Auto-Categorization & Tagging engine for datasets',
      category: 'Dataset Management',
      icon: <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
    },
    {
      keys: [`${modKey}`, 'F'],
      description: 'Jump to and focus dataset search input field (or press /)',
      category: 'Navigation & Selection',
      icon: <Search className="w-3.5 h-3.5 text-blue-400" />
    },
    {
      keys: [`${modKey}`, 'Alt', 'N'],
      description: 'Open Add New Training Pair modal dialog (or press N when idle)',
      category: 'Dataset Management',
      icon: <Plus className="w-3.5 h-3.5 text-cyan-400" />
    },
    {
      keys: ['Esc'],
      description: 'Deselect all selected pairs, clear search focus, or close active modals',
      category: 'Navigation & Selection',
      icon: <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
    },
    {
      keys: ['?'],
      description: 'Open this keyboard shortcuts quick reference guide',
      category: 'Navigation & Selection',
      icon: <Keyboard className="w-3.5 h-3.5 text-amber-400" />
    },
  ];

  const categories = ['Chat & Voice', 'Training & Checkpoints', 'Dataset Management', 'Navigation & Selection'] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-cyan-500/40 shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Keyboard Shortcuts Reference</span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
                  POWER USER
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Speed up dataset curation and on-device neural training with global hotkeys
              </p>
            </div>
          </div>
          <button
            id="btn-close-shortcuts-modal"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts List by Category */}
        <div className="space-y-4">
          {categories.map(cat => {
            const items = shortcuts.filter(s => s.category === cat);
            if (items.length === 0) return null;

            return (
              <div key={cat} className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  {cat}
                </h4>
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 divide-y divide-slate-800/60 overflow-hidden">
                  {items.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-2.5 sm:p-3 hover:bg-slate-900/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-3">
                        <div className="p-1 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                          {item.icon}
                        </div>
                        <span className="text-xs text-slate-200 font-medium">
                          {item.description}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {item.keys.map((k, kIdx) => (
                          <React.Fragment key={kIdx}>
                            <kbd className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-xs font-bold shadow-sm">
                              {k}
                            </kbd>
                            {kIdx < item.keys.length - 1 && (
                              <span className="text-slate-500 text-xs font-bold">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pro Tip Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tip: Press <kbd className="px-1 py-0.5 rounded bg-slate-800 font-mono text-[10px] text-slate-300">?</kbd> anywhere to open this dialog</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
