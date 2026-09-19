/**
 * NEXA // GOOGLE TOOLS REGISTRY
 * Central registry of all Google tools available to NEXA
 * Each tool includes metadata, required scopes, and handlers
 */

import { googleIntegrationManager } from './googleIntegrationManager';

export interface GoogleTool {
  id: string;
  name: string;
  service: string;
  description: string;
  category: 'auth' | 'gemini' | 'drive' | 'calendar' | 'gmail' | 'contacts' | 'youtube' | 'docs' | 'sheets';
  requiredScopes: string[];
  authenticationRequired: boolean;
  handler?: (params: Record<string, unknown>) => Promise<unknown>;
  status: () => boolean; // Returns true if tool is available
}

export class GoogleToolsRegistry {
  private tools: Map<string, GoogleTool> = new Map();

  constructor() {
    this.registerDefaultTools();
  }

  private registerDefaultTools(): void {
    // Authentication tools
    this.registerTool({
      id: 'google.auth.connect',
      name: 'Connect Google Account',
      service: 'authentication',
      description: 'Initiate OAuth 2.0 connection to Google',
      category: 'auth',
      requiredScopes: [],
      authenticationRequired: false,
      handler: async () => {
        await googleIntegrationManager.initiateOAuthFlow();
        return { status: 'oauth_initiated' };
      },
      status: () => true, // Always available
    });

    this.registerTool({
      id: 'google.auth.disconnect',
      name: 'Disconnect Google Account',
      service: 'authentication',
      description: 'Disconnect from Google and clear session',
      category: 'auth',
      requiredScopes: [],
      authenticationRequired: true,
      handler: async () => {
        await googleIntegrationManager.disconnect();
        return { status: 'disconnected' };
      },
      status: () => googleIntegrationManager.getConnectionStatus().connected,
    });

    this.registerTool({
      id: 'google.auth.status',
      name: 'Check Google Account Status',
      service: 'authentication',
      description: 'Get current Google connection status',
      category: 'auth',
      requiredScopes: [],
      authenticationRequired: false,
      handler: async () => {
        return googleIntegrationManager.getConnectionStatus();
      },
      status: () => true,
    });

    // Gemini tools
    this.registerTool({
      id: 'google.gemini.query',
      name: 'Query Gemini',
      service: 'gemini',
      description: 'Send a query to Google Gemini AI model',
      category: 'gemini',
      requiredScopes: [],
      authenticationRequired: true,
      handler: async (params: Record<string, unknown>) => {
        // In production: call Gemini API
        return {
          response: 'Gemini integration pending',
          model: 'gemini-2.0-flash',
        };
      },
      status: () => googleIntegrationManager.getConnectionStatus().connected,
    });

    // Google Drive tools
    this.registerTool({
      id: 'google.drive.list',
      name: 'List Google Drive Files',
      service: 'drive',
      description: 'List files in Google Drive',
      category: 'drive',
      requiredScopes: ['https://www.googleapis.com/auth/drive'],
      authenticationRequired: true,
      handler: async (params: Record<string, unknown>) => {
        // In production: call Drive API with pageSize, query, etc.
        return { files: [], message: 'Drive API integration pending' };
      },
      status: () => googleIntegrationManager.getConnectionStatus().connected,
    });

    this.registerTool({
      id: 'google.drive.search',
      name: 'Search Google Drive',
      service: 'drive',
      description: 'Search for files in Google Drive',
      category: 'drive',
      requiredScopes: ['https://www.googleapis.com/auth/drive'],
      authenticationRequired: true,
      handler: async (params: Record<string, unknown>) => {
        // In production: call Drive API search
        return { results: [], query: params.query };
      },
      status: () => googleIntegrationManager.getConnectionStatus().connected,
    });

    this.registerTool({
      id: 'google.drive.get',
      name: 'Get Google Drive File',
      service: 'drive',
      description: 'Get details about a specific file in Google Drive',
      category: 'drive',
      requiredScopes: ['https://www.googleapis.com/auth/drive'],
      authenticationRequired: true,
      handler: async (params: Record<string, unknown>) => {
        // In production: call Drive API get
        return { file: {}, fileId: params.fileId };
      },
      status: () => googleIntegrationManager.getConnectionStatus().connected,
    });

    // Google Calendar tools
    this.registerTool({
      id: 'google.calendar.list',
      name: 'List Calendar Events',
      service: 'calendar',
      description: 'List upcoming events in Google Calendar',
      category: 'calendar',
      requiredScopes: ['https://www.googleapis.com/auth/calendar'],
      authenticationRequired: true,
      handler: async (params: Record<string, unknown>) => {
        // In production: call Calendar API
        return { events: [], message: 'Calendar API integration pending' };
      },
      status: () => googleIntegrationManager.getConnectionStatus().connected,
    });

    this.registerTool({
      id: 'google.calendar.create',
      name: 'Create Calendar Event',
      service: 'calendar',
      description: 'Create a new event in Google Calendar',
      category: 'calendar',
      requiredScopes: ['https://www.googleapis.com/auth/calendar'],
      authenticationRequired: true,
      handler: async (params: Record<string, unknown>) => {
        // In production: call Calendar API
        return { eventId: null, message: 'Event creation pending' };
      },
      status: () => googleIntegrationManager.getConnectionStatus().connected,
    });

    // Gmail tools
    this.registerTool({
      id: 'google.gmail.search',
      name: 'Search Gmail',
      service: 'gmail',
      description: 'Search emails in Gmail',
      category: 'gmail',
      requiredScopes: ['https://www.googleapis.com/auth/gmail.readonly'],
      authenticationRequired: true,
      handler: async (params: Record<string, unknown>) => {
        // In production: call Gmail API
        return { messages: [], query: params.query };
      },
      status: () => googleIntegrationManager.getConnectionStatus().connected,
    });

    this.registerTool({
      id: 'google.gmail.read',
      name: 'Read Email',
      service: 'gmail',
      description: 'Read a specific email message',
      category: 'gmail',
      requiredScopes: ['https://www.googleapis.com/auth/gmail.readonly'],
      authenticationRequired: true,
      handler: async (params: Record<string, unknown>) => {
        // In production: call Gmail API
        return { message: {}, messageId: params.messageId };
      },
      status: () => googleIntegrationManager.getConnectionStatus().connected,
    });

    // Google Contacts tools
    this.registerTool({
      id: 'google.contacts.search',
      name: 'Search Contacts',
      service: 'contacts',
      description: 'Search for a contact in Google Contacts',
      category: 'contacts',
      requiredScopes: ['https://www.googleapis.com/auth/contacts.readonly'],
      authenticationRequired: true,
      handler: async (params: Record<string, unknown>) => {
        // In production: call Contacts API
        return { contacts: [], query: params.query };
      },
      status: () => googleIntegrationManager.getConnectionStatus().connected,
    });

    // YouTube tools
    this.registerTool({
      id: 'google.youtube.search',
      name: 'Search YouTube',
      service: 'youtube',
      description: 'Search for videos on YouTube',
      category: 'youtube',
      requiredScopes: ['https://www.googleapis.com/auth/youtube.readonly'],
      authenticationRequired: true,
      handler: async (params: Record<string, unknown>) => {
        // In production: call YouTube API
        return { videos: [], query: params.query };
      },
      status: () => googleIntegrationManager.getConnectionStatus().connected,
    });

    // Google Docs tools
    this.registerTool({
      id: 'google.docs.create',
      name: 'Create Google Doc',
      service: 'docs',
      description: 'Create a new Google Doc',
      category: 'docs',
      requiredScopes: ['https://www.googleapis.com/auth/documents'],
      authenticationRequired: true,
      handler: async (params: Record<string, unknown>) => {
        // In production: call Docs API
        return { docId: null, message: 'Doc creation pending' };
      },
      status: () => googleIntegrationManager.getConnectionStatus().connected,
    });

    // Google Sheets tools
    this.registerTool({
      id: 'google.sheets.create',
      name: 'Create Google Sheet',
      service: 'sheets',
      description: 'Create a new Google Sheet',
      category: 'sheets',
      requiredScopes: ['https://www.googleapis.com/auth/spreadsheets'],
      authenticationRequired: true,
      handler: async (params: Record<string, unknown>) => {
        // In production: call Sheets API
        return { sheetId: null, message: 'Sheet creation pending' };
      },
      status: () => googleIntegrationManager.getConnectionStatus().connected,
    });
  }

  private registerTool(tool: GoogleTool): void {
    this.tools.set(tool.id, tool);
  }

  /**
   * Get a specific tool by ID
   */
  getTool(toolId: string): GoogleTool | null {
    return this.tools.get(toolId) || null;
  }

  /**
   * Get all tools
   */
  getAllTools(): GoogleTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: string): GoogleTool[] {
    return Array.from(this.tools.values()).filter((tool) => tool.category === category);
  }

  /**
   * Get available tools (those with status === true)
   */
  getAvailableTools(): GoogleTool[] {
    return Array.from(this.tools.values()).filter((tool) => tool.status());
  }

  /**
   * Check if a tool is available
   */
  isToolAvailable(toolId: string): boolean {
    const tool = this.getTool(toolId);
    return tool ? tool.status() : false;
  }

  /**
   * Execute a tool
   */
  async executeTool(toolId: string, params: Record<string, unknown>): Promise<unknown> {
    const tool = this.getTool(toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    if (!tool.status()) {
      throw new Error(`Tool unavailable: ${toolId}`);
    }

    if (tool.authenticationRequired && !googleIntegrationManager.getConnectionStatus().connected) {
      throw new Error(`Authentication required for tool: ${toolId}`);
    }

    if (!tool.handler) {
      throw new Error(`Tool handler not implemented: ${toolId}`);
    }

    return tool.handler(params);
  }
}

export const googleToolsRegistry = new GoogleToolsRegistry();
