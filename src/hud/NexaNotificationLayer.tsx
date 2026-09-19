/**
 * NEXA // SYSTEM ALERT NOTIFICATIONS
 * Elegant glass toasts for real system events. Errors never show raw stack
 * traces unless developer mode is enabled.
 */

import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, ShieldAlert, X } from 'lucide-react';
import { useNexaSystem } from '../state/NexaSystemContext';

const LEVEL_META = {
  info: { icon: Info, tone: 'info' },
  success: { icon: CheckCircle2, tone: 'success' },
  warning: { icon: AlertTriangle, tone: 'warning' },
  error: { icon: ShieldAlert, tone: 'error' }
};

export const NexaNotificationLayer: React.FC = () => {
  const { notifications, dismissNotification, settings } = useNexaSystem();

  useEffect(() => {
    if (notifications.length === 0) return;
    const timers = notifications.map(n =>
      window.setTimeout(() => dismissNotification(n.id), n.level === 'error' ? 9000 : 5600)
    );
    return () => timers.forEach(t => window.clearTimeout(t));
  }, [notifications, dismissNotification]);

  return (
    <div className="nexa-notification-layer" aria-live="polite" role="status">
      {notifications.map(n => {
        const meta = LEVEL_META[n.level];
        const Icon = meta.icon;
        const dev = settings.devMode;
        return (
          <div key={n.id} className={`nexa-notification nexa-notification-${meta.tone}`} role={n.level === 'error' ? 'alert' : 'status'}>
            <div className="nexa-notification-header">
              <Icon className="w-4 h-4" />
              <span>{n.title}</span>
              <button type="button" onClick={() => dismissNotification(n.id)} aria-label="Dismiss notification" className="nexa-notification-close">
                <X className="w-3 h-3" />
              </button>
            </div>
            <p className="nexa-notification-message">{n.message}</p>
            {n.detail && dev && <pre className="nexa-notification-detail">{n.detail}</pre>}
          </div>
        );
      })}
    </div>
  );
};