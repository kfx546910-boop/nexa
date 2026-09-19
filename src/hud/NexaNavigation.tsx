/**
 * NEXA // HOLOGRAPHIC NAVIGATION
 * Compact bottom command bar. The active module gets a glowing border,
 * animated indicator and cyan state. Preserves the original nav-tab ids.
 */

import React from 'react';
import {
  Cpu, MessageSquare, Activity, Mic, Database, Boxes, FlaskConical, Flame, Sliders, Link2
} from 'lucide-react';
import type { TabType } from '../components/Header';

interface NexusTabDef {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: NexusTabDef[] = [
  { id: 'core', label: 'CORE', icon: Cpu },
  { id: 'chat', label: 'CHAT', icon: MessageSquare },
  { id: 'vision', label: 'VISION', icon: Activity },
  { id: 'voice', label: 'VOICE', icon: Mic },
  { id: 'memory', label: 'MEMORY', icon: Database },
  { id: 'tools', label: 'TOOLS', icon: Boxes },
  { id: 'automation', label: 'AUTOMATION', icon: FlaskConical },
  { id: 'studio', label: 'STUDIO', icon: Flame },
  { id: 'google', label: 'LINK', icon: Link2 },
  { id: 'settings', label: 'SETTINGS', icon: Sliders }
];

interface NexaNavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isTraining?: boolean;
}

export const NexaNavigation: React.FC<NexaNavigationProps> = ({ activeTab, setActiveTab, isTraining = false }) => {
  return (
    <nav className="nexa-nav nexus-bottom-nav" aria-label="Primary modules" role="tablist">
      <div className="nexa-nav-inner">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          const navId =
            id === 'core' ? 'nav-tab-chat'
              : id === 'studio' ? 'nav-tab-training'
                : id === 'vision' ? 'nav-tab-visualizer'
                  : id === 'memory' ? 'nav-tab-memory'
                    : id === 'tools' ? 'nav-tab-benchmarks'
                      : id === 'settings' ? 'nav-tab-capabilities'
                        : `nav-tab-${id}`;
          return (
            <button
              key={id}
              id={navId}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(id)}
              className={`nexa-nav-btn ${isActive ? 'active' : ''}`}
              title={label}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
              {id === 'studio' && isTraining && <span className="nexa-mini-dot" />}
              {isActive && <span className="nexa-nav-active-mark" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
};