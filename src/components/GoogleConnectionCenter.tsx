/**
 * Google Connection Center UI
 * Displays the status of all Google services and OAuth connection
 * Matches NEXA futuristic HUD aesthetic
 */

import React, { useEffect, useState } from 'react';
import { googleIntegrationManager, GoogleIntegrationState } from '../google/googleIntegrationManager';
import { googleToolsRegistry } from '../google/googleToolsRegistry';
import { Wifi, WifiOff, Mail, Calendar, FileText, FileSpreadsheet, Youtube, Contact2, Lock, LogOut } from 'lucide-react';

interface ServiceStatusIndicatorProps {
  name: string;
  status: boolean;
  icon: React.ReactNode;
  description?: string;
}

const ServiceStatusIndicator: React.FC<ServiceStatusIndicatorProps> = ({
  name,
  status,
  icon,
  description,
}) => (
  <div className="flex items-center gap-3 p-3 rounded border border-cyan-500/30 bg-black/40 hover:bg-cyan-500/10 transition">
    <div className="flex items-center gap-2 flex-1">
      <div className="text-cyan-400">{icon}</div>
      <div>
        <div className="text-sm font-mono text-slate-200">{name}</div>
        {description && <div className="text-xs text-slate-400">{description}</div>}
      </div>
    </div>
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${status ? 'bg-green-500' : 'bg-gray-600'}`} />
      <span className="text-xs font-mono text-slate-400">{status ? 'CONNECTED' : 'OFFLINE'}</span>
    </div>
  </div>
);

export const GoogleConnectionCenter: React.FC = () => {
  const [state, setState] = useState<GoogleIntegrationState>(googleIntegrationManager.getState());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Subscribe to status changes
    const unsubscribe = googleIntegrationManager.onStatusChange((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    try {
      await googleIntegrationManager.initiateOAuthFlow();
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await googleIntegrationManager.disconnect();
    } catch (error) {
      console.error('Disconnect failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const isConnected = state.oauth.connected;

  return (
    <div className="w-full max-w-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <div className={isConnected ? 'text-green-500' : 'text-gray-600'}>
          {isConnected ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
        </div>
        <h2 className="text-lg font-mono font-bold text-slate-100">NEXA // GOOGLE ECOSYSTEM</h2>
      </div>

      {/* Main Status Panel */}
      <div className="border border-cyan-500/30 rounded bg-black/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-mono text-slate-300">GOOGLE ACCOUNT</span>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-600'}`} />
        </div>

        {isConnected ? (
          <div className="space-y-2 pl-4 border-l border-cyan-500/20">
            <div className="text-sm text-slate-400">
              <span className="text-slate-300">Name: </span>
              <span>{state.oauth.accountName || 'Unknown'}</span>
            </div>
            <div className="text-sm text-slate-400">
              <span className="text-slate-300">Email: </span>
              <span>{state.oauth.accountEmail || 'Not fetched'}</span>
            </div>
            {state.oauth.expiresAt && (
              <div className="text-xs text-slate-500">
                Token expires: {new Date(state.oauth.expiresAt).toLocaleString()}
              </div>
            )}
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="mt-3 flex items-center gap-2 px-3 py-2 rounded bg-red-900/30 border border-red-500/50 hover:bg-red-900/50 text-red-300 text-sm font-mono transition disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              DISCONNECT
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-slate-400">
              {state.initError ? (
                <div className="text-red-400">Error: {state.initError}</div>
              ) : (
                <div className="text-slate-500">Not connected to Google</div>
              )}
            </div>
            <button
              onClick={handleConnect}
              disabled={loading || state.isInitializing}
              className="flex items-center gap-2 px-4 py-2 rounded bg-cyan-900/30 border border-cyan-500/50 hover:bg-cyan-900/50 text-cyan-300 text-sm font-mono transition disabled:opacity-50"
            >
              {loading ? '◌ Connecting...' : '► CONNECT GOOGLE'}
            </button>
          </div>
        )}
      </div>

      {/* Services Status Grid */}
      {isConnected && (
        <div className="space-y-3">
          <div className="text-xs font-mono text-slate-400 uppercase">Services</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ServiceStatusIndicator
              name="Gemini"
              status={isConnected}
              icon={<Wifi className="w-4 h-4" />}
              description="AI Reasoning Engine"
            />
            <ServiceStatusIndicator
              name="Google Drive"
              status={isConnected}
              icon={<FileText className="w-4 h-4" />}
              description="Cloud Storage"
            />
            <ServiceStatusIndicator
              name="Google Calendar"
              status={isConnected}
              icon={<Calendar className="w-4 h-4" />}
              description="Event Management"
            />
            <ServiceStatusIndicator
              name="Gmail"
              status={isConnected}
              icon={<Mail className="w-4 h-4" />}
              description="Email"
            />
            <ServiceStatusIndicator
              name="Google Contacts"
              status={isConnected}
              icon={<Contact2 className="w-4 h-4" />}
              description="Contact Management"
            />
            <ServiceStatusIndicator
              name="YouTube"
              status={isConnected}
              icon={<Youtube className="w-4 h-4" />}
              description="Video Search"
            />
            <ServiceStatusIndicator
              name="Google Docs"
              status={isConnected}
              icon={<FileText className="w-4 h-4" />}
              description="Document Editor"
            />
            <ServiceStatusIndicator
              name="Google Sheets"
              status={isConnected}
              icon={<FileSpreadsheet className="w-4 h-4" />}
              description="Spreadsheet Editor"
            />
          </div>
        </div>
      )}

      {/* Permissions Info */}
      {isConnected && (
        <div className="border border-cyan-500/20 rounded bg-black/40 p-3">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-2">
            <Lock className="w-3 h-3" />
            PERMISSIONS
          </div>
          <div className="text-xs text-slate-500 space-y-1">
            <div>✓ Profile & Email</div>
            <div>✓ Drive Access</div>
            <div>✓ Calendar Access</div>
            <div>✓ Gmail Read-Only</div>
            <div>✓ YouTube Access</div>
          </div>
        </div>
      )}

      {/* Offline Notice */}
      {!isConnected && (
        <div className="border border-gray-500/30 rounded bg-gray-900/30 p-3">
          <div className="text-xs text-slate-400">
            NEXA core remains fully operational. Google services will be available after connecting.
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleConnectionCenter;
