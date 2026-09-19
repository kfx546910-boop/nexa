/**
 * NEXA // SECURITY GATE
 * Confirmation layer for privileged or dangerous actions. The action is only
 * executed after the operator explicitly authorizes it through the gate.
 */

import React from 'react';
import { ShieldCheck, Check, X } from 'lucide-react';
import { useNexaSystem } from '../state/NexaSystemContext';

export const NexaSecurityGate: React.FC = () => {
  const { securityGate, resolveGate, cancelGate } = useNexaSystem();

  if (!securityGate) return null;

  return (
    <div className="nexa-gate-backdrop" role="presentation">
      <div className="nexa-gate" role="dialog" aria-modal="true" aria-labelledby="nexa-gate-title">
        <div className="nexa-gate-topline">
          <span className="nexa-gate-code">NEXA // SECURITY GATE</span>
          <span className="nexa-gate-level">LEVEL 2 · OPERATOR CONFIRMATION</span>
        </div>
        <div className="nexa-gate-icon" aria-hidden="true">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 id="nexa-gate-title" className="nexa-gate-title">{securityGate.title}</h2>
        <p className="nexa-gate-message">{securityGate.message}</p>
        <div className="nexa-gate-actions">
          <button
            type="button"
            onClick={() => cancelGate()}
            className="nexa-gate-cancel"
            autoFocus
          >
            <X className="w-3.5 h-3.5" />
            {securityGate.cancelLabel || 'CANCEL'}
          </button>
          <button
            type="button"
            onClick={() => resolveGate(true)}
            className="nexa-gate-confirm"
          >
            <Check className="w-3.5 h-3.5" />
            {securityGate.confirmLabel || 'AUTHORIZE'}
          </button>
        </div>
        <p className="nexa-gate-footnote">This action is never simulated — it runs only after authorization succeeds.</p>
      </div>
    </div>
  );
};