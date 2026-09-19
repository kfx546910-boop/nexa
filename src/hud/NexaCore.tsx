/**
 * NEXA // NEURAL CORE
 * The central visual element of the command center. Six concentric layers
 * (outer HUD ring, rotating geometry, neural particles, energy ring, inner
 * nucleus, identity indicator) all react to the live NEXA system state.
 *
 * Everything is CSS transform/opacity driven for GPU-friendly 60fps motion
 * and collapses to a calm still core when reduced motion is preferred.
 */

import React from 'react';
import { useNexaSystem } from '../state/NexaSystemContext';

const PARTICLE_COUNT = 12;
const WAVE_COUNT = 28;

export const NexaCore: React.FC = () => {
  const { uiState, statusLabel, voice, settings, ttsSupported } = useNexaSystem();
  const reduced = settings.reducedMotion || settings.animationIntensity === 'minimal';

  const coreLabel =
    uiState === 'OFFLINE'
      ? 'AI PROVIDER UNAVAILABLE'
      : uiState === 'ERROR'
        ? 'ATTENTION REQUIRED'
        : uiState === 'EXECUTING'
          ? 'COMMAND EXECUTION'
          : (statusLabel || 'READY');

  const showWaves = !reduced && (uiState === 'LISTENING' || uiState === 'SPEAKING');

  return (
    <div
      className="nexa-core"
      data-state={uiState}
      data-reduced={reduced ? 'true' : 'false'}
      role="status"
      aria-live="polite"
      aria-label={`NEXA ${coreLabel}`}
    >
      {/* Layer 1 — outer HUD ring */}
      <div className="nexa-core-ring-outer" aria-hidden="true">
        <svg viewBox="0 0 220 220" className="nexa-core-ring-svg" aria-hidden="true">
          <circle cx="110" cy="110" r="106" className="nexa-tick-ring" />
          <circle cx="110" cy="110" r="96" className="nexa-core-ring-base" />
          <path d="M 14 110 A 96 96 0 0.9" className="nexa-core-ring-arc" />
        </svg>
        <span className="nexa-core-bracket nexa-core-bracket-tl" />
        <span className="nexa-core-bracket nexa-core-bracket-tr" />
        <span className="nexa-core-bracket nexa-core-bracket-bl" />
        <span className="nexa-core-bracket nexa-core-bracket-br" />
      </div>

      {/* Layer 2 — rotating geometric ring */}
      <div className="nexa-core-gear" aria-hidden="true">
        {Array.from({ length: 36 }, (_, i) => (
          <span key={i} className="nexa-core-gear-segment" style={{ transform: `rotate(${i * 10}deg) translateY(-84px)` }} />
        ))}
      </div>

      {/* Layer 3 — neural particle field */}
      {!reduced && (
        <div className="nexa-core-particles" aria-hidden="true">
          {Array.from({ length: PARTICLE_COUNT }, (_, i) => {
            const angle = (i / PARTICLE_COUNT) * 360;
            const radius = 62 + (i % 3) * 12;
            return (
              <span
                key={i}
                className="nexa-core-particle"
                style={{
                  transform: `rotate(${angle}deg) translateX(${radius}px)`,
                  animationDelay: `${-(i * 0.35)}s`,
                  opacity: 0.45 + (i % 4) * 0.12
                }}
              />
            );
          })}
        </div>
      )}

      {/* Layer 4 — energy ring */}
      <div className="nexa-core-energy" aria-hidden="true" />

      {/* Audio waveform (LISTENING / SPEAKING only) */}
      {showWaves && (
        <div className="nexa-core-waves" aria-hidden="true">
          {Array.from({ length: WAVE_COUNT }, (_, i) => (
            <span
              key={i}
              style={{
                transform: `rotate(${(i / WAVE_COUNT) * 360}deg)`,
                animationDelay: `${(i % 7) * 0.07}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Layer 5 + 6 — inner nucleus + identity */}
      <div className="nexa-core-nucleus">
        <div className="nexa-core-logo" aria-hidden="true">
          <span className="nexa-core-logo-glyph">◉</span>
        </div>
        <div className="nexa-core-wordmark">
          <div className="nexa-core-name">NEXA</div>
          <div className="nexa-core-sub">AUTONOMOUS CORE</div>
        </div>
        <div className="nexa-core-status">
          <span className={`nexa-core-status-dot ${uiState.toLowerCase()}`} />
          <span className="nexa-core-status-label">{coreLabel}</span>
        </div>
        <div className="nexa-core-meta">
          <span>{voice.supported ? 'VOICE LINK' : 'STT N/A'}</span>
          <span className="nexa-core-meta-sep">//</span>
          <span>{ttsSupported ? 'AUDIO LINK' : 'TTS N/A'}</span>
          <span className="nexa-core-meta-sep">//</span>
          <span>CORE-01</span>
        </div>
      </div>

      {/* Scanning beams during active processing */}
      {!reduced && (uiState === 'THINKING' || uiState === 'EXECUTING') && (
        <div className="nexa-core-scan" aria-hidden="true">
          <span />
          <span />
        </div>
      )}
    </div>
  );
};