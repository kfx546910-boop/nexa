/**
 * NEXA // SYSTEM EVENT STREAM
 * Live monospace event terminal fed by real application events (boot, voice,
 * AI requests, tool execution, training, navigation, errors).
 */

import React from 'react';
import { useNexaSystem } from '../state/NexaSystemContext';
import { formatEventTime } from '../state/nexaSystem';

const KIND_CLASS: Record<string, string> = {
  system: 'nexa-event-system',
  voice: 'nexa-event-voice',
  user: 'nexa-event-user',
  ai: 'nexa-event-ai',
  tool: 'nexa-event-tool',
  memory: 'nexa-event-memory',
  vision: 'nexa-event-vision',
  nav: 'nexa-event-nav',
  error: 'nexa-event-error',
  success: 'nexa-event-success'
};

export const NexaEventStream: React.FC<{ limit?: number }> = ({ limit = 14 }) => {
  const { events } = useNexaSystem();
  const visible = events.slice(0, limit);

  return (
    <section className="nexa-event-stream" aria-label="System event stream">
      <div className="nexa-event-stream-header">
        <span className="nexa-event-stream-title">
          <span className="nexa-event-stream-live" /> EVENT STREAM
        </span>
        <span className="nexa-event-stream-count">{events.length} REC</span>
      </div>
      <div className="nexa-event-stream-body" aria-live="polite">
        {visible.length === 0 ? (
          <p className="nexa-event-stream-empty">// AWAITING SYSTEM EVENTS</p>
        ) : (
          visible.map(event => (
            <div key={event.id} className={`nexa-event-line ${KIND_CLASS[event.kind] || 'nexa-event-system'}`}>
              <span className="nexa-event-time">{formatEventTime(event.at)}</span>
              <span className="nexa-event-source">{event.source.padEnd(7, ' ')}</span>
              <span className="nexa-event-message">{event.message}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
};