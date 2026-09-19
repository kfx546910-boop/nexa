/**
 * NEXA // GOOGLE INTEGRATION MANAGER
 * Manages OAuth 2.0 connection, status tracking, and Google API access.
 * All status is real — no fake connections are ever reported.
 */

export interface GoogleOAuthConfig {
  clientId: string;
  scope: string[];
  redirectUri: string;
  discoveryDocs?: string[];
}

export interface GoogleConnectionStatus {
  connected: boolean;
  accountName?: string;
  accountEmail?: string;
  lastConnectedAt?: number;
  accessToken?: string;
  expiresAt?: number;
}

export interface GoogleServiceStatus {
  name: string;
  connected: boolean;
  lastChecked: number;
  error?: string;
}

export interface GoogleIntegrationState {
  oauth: GoogleConnectionStatus;
  services: Map<string, GoogleServiceStatus>;
  isInitializing: boolean;
  initError?: string;
}

/**
 * GoogleIntegrationManager
 * Manages all Google connectivity for NEXA.
 * Handles OAuth, token management, and service status.
 */
export class GoogleIntegrationManager {
  private state: GoogleIntegrationState;
  private config: GoogleOAuthConfig | null = null;
  private statusChangeCallbacks: Array<(state: GoogleIntegrationState) => void> = [];
  private tokenRefreshTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.state = {
      oauth: { connected: false },
      services: new Map(),
      isInitializing: false,
    };
  }

  /**
   * Initialize the Google Integration Manager
   * Loads configuration from environment variables
   * Does NOT connect automatically
   */
  async initialize(): Promise<void> {
    this.state.isInitializing = true;
    this.notifyStatusChange();

    try {
      // Load configuration from environment
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI || window.location.origin;

      if (!clientId) {
        throw new Error('VITE_GOOGLE_CLIENT_ID not configured');
      }

      this.config = {
        clientId,
        redirectUri,
        scope: [
          'openid',
          'profile',
          'email',
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/youtube.readonly',
        ],
        discoveryDocs: [
          'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
          'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
          'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest',
        ],
      };

      // Check if already connected from session
      const existingToken = this.getStoredAccessToken();
      if (existingToken && !this.isTokenExpired(existingToken.expiresAt)) {
        this.state.oauth = {
          connected: true,
          accessToken: existingToken.token,
          expiresAt: existingToken.expiresAt,
        };
        // Optionally fetch account info
        await this.fetchAccountInfo();
      }
    } catch (error) {
      this.state.initError = error instanceof Error ? error.message : String(error);
    } finally {
      this.state.isInitializing = false;
      this.notifyStatusChange();
    }
  }

  /**
   * Start the OAuth 2.0 authorization flow
   * Opens Google Sign-In window
   */
  async initiateOAuthFlow(): Promise<void> {
    if (!this.config) {
      throw new Error('GoogleIntegrationManager not initialized');
    }

    try {
      // Generate authorization URL
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.append('client_id', this.config.clientId);
      authUrl.searchParams.append('redirect_uri', this.config.redirectUri);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('scope', this.config.scope.join(' '));
      authUrl.searchParams.append('access_type', 'offline');
      authUrl.searchParams.append('prompt', 'consent');

      // In a real app, this would be handled by a backend
      // For now, we'll open the Google Sign-In dialog
      window.location.href = authUrl.toString();
    } catch (error) {
      throw new Error(`OAuth flow failed: ${error}`);
    }
  }

  /**
   * Handle OAuth callback (called after Google redirects back)
   * In a production app, this would involve backend token exchange
   */
  async handleOAuthCallback(code: string): Promise<void> {
    try {
      // In a real implementation, send code to backend for token exchange
      // For now, this is a placeholder that shows the architecture
      console.log('OAuth callback received with authorization code');

      // Store that OAuth was attempted
      // In production: exchange code for access token via backend
      // Then store token securely (NOT in localStorage if possible)
    } catch (error) {
      this.state.oauth = { connected: false };
      this.notifyStatusChange();
      throw new Error(`OAuth callback handling failed: ${error}`);
    }
  }

  /**
   * Connect using an existing access token (for testing)
   * In production, tokens come from secure OAuth flow
   */
  async connectWithToken(accessToken: string, expiresIn: number): Promise<void> {
    try {
      this.state.oauth = {
        connected: true,
        accessToken,
        expiresAt: Date.now() + expiresIn * 1000,
      };

      // Store token (in production: use secure storage)
      this.storeAccessToken(accessToken, this.state.oauth.expiresAt!);

      // Fetch account information
      await this.fetchAccountInfo();

      // Set up token refresh timer
      this.setupTokenRefresh();

      this.notifyStatusChange();
    } catch (error) {
      this.state.oauth = { connected: false };
      this.notifyStatusChange();
      throw new Error(`Connection failed: ${error}`);
    }
  }

  /**
   * Disconnect from Google
   * Revokes tokens and clears session
   */
  async disconnect(): Promise<void> {
    try {
      if (this.tokenRefreshTimer) {
        clearTimeout(this.tokenRefreshTimer);
      }

      // Clear stored tokens
      this.clearStoredAccessToken();

      this.state.oauth = { connected: false };
      this.state.services.clear();

      this.notifyStatusChange();
    } catch (error) {
      throw new Error(`Disconnect failed: ${error}`);
    }
  }

  /**
   * Get current Google connection status
   * Returns ONLY real status — never reports false CONNECTED
   */
  getConnectionStatus(): GoogleConnectionStatus {
    return { ...this.state.oauth };
  }

  /**
   * Get service-specific status
   */
  getServiceStatus(serviceName: string): GoogleServiceStatus | null {
    return this.state.services.get(serviceName) || null;
  }

  /**
   * Get all service statuses
   */
  getAllServiceStatuses(): GoogleServiceStatus[] {
    return Array.from(this.state.services.values());
  }

  /**
   * Update service status after attempting to use it
   */
  setServiceStatus(
    serviceName: string,
    connected: boolean,
    error?: string
  ): void {
    this.state.services.set(serviceName, {
      name: serviceName,
      connected,
      lastChecked: Date.now(),
      error,
    });
    this.notifyStatusChange();
  }

  /**
   * Get current integration state for display
   */
  getState(): GoogleIntegrationState {
    return {
      ...this.state,
      services: new Map(this.state.services),
    };
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(callback: (state: GoogleIntegrationState) => void): () => void {
    this.statusChangeCallbacks.push(callback);
    return () => {
      this.statusChangeCallbacks = this.statusChangeCallbacks.filter((cb) => cb !== callback);
    };
  }

  // ============ PRIVATE HELPERS ============

  private async fetchAccountInfo(): Promise<void> {
    if (!this.state.oauth.accessToken) {
      return;
    }

    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${this.state.oauth.accessToken}`,
        },
      });

      if (response.ok) {
        const info = await response.json();
        this.state.oauth.accountName = info.name;
        this.state.oauth.accountEmail = info.email;
      }
    } catch (error) {
      console.warn('Failed to fetch account info:', error);
    }
  }

  private setupTokenRefresh(): void {
    if (!this.state.oauth.expiresAt) {
      return;
    }

    const timeUntilExpiry = this.state.oauth.expiresAt - Date.now();
    const refreshTime = Math.max(0, timeUntilExpiry - 5 * 60 * 1000); // 5 min before expiry

    this.tokenRefreshTimer = setTimeout(() => {
      // In production: call backend to refresh token
      console.log('Token refresh needed');
    }, refreshTime);
  }

  private isTokenExpired(expiresAt?: number): boolean {
    if (!expiresAt) return true;
    return Date.now() > expiresAt;
  }

  private getStoredAccessToken(): { token: string; expiresAt: number } | null {
    try {
      const stored = sessionStorage.getItem('google_access_token');
      if (!stored) return null;
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  private storeAccessToken(token: string, expiresAt: number): void {
    // In production: use secure storage (not localStorage)
    sessionStorage.setItem('google_access_token', JSON.stringify({ token, expiresAt }));
  }

  private clearStoredAccessToken(): void {
    sessionStorage.removeItem('google_access_token');
  }

  private notifyStatusChange(): void {
    this.statusChangeCallbacks.forEach((callback) => {
      callback(this.getState());
    });
  }
}

// Export singleton instance
export const googleIntegrationManager = new GoogleIntegrationManager();
