/**
 * NEXA // GOOGLE VOICE INTENT ROUTER
 * Routes natural language voice commands to Google services
 * Extends the voice pipeline with Google-aware intent detection
 */

import { VoiceCommandDescriptor } from '../voice/voicePipeline';
import { googleIntegrationManager } from '../google/googleIntegrationManager';
import { googleToolsRegistry } from '../google/googleToolsRegistry';

export type GoogleVoiceIntent =
  | 'google.auth.connect'
  | 'google.auth.disconnect'
  | 'google.auth.status'
  | 'google.gemini.query'
  | 'google.drive.list'
  | 'google.drive.search'
  | 'google.drive.get'
  | 'google.calendar.list'
  | 'google.calendar.create'
  | 'google.gmail.search'
  | 'google.gmail.read'
  | 'google.contacts.search'
  | 'google.youtube.search'
  | 'google.docs.create'
  | 'google.sheets.create'
  | 'unknown';

export interface GoogleVoiceCommand {
  intent: GoogleVoiceIntent;
  service: string;
  action: string;
  params: Record<string, unknown>;
  confidence: number;
  requiresAuth: boolean;
  naturalLanguage: string;
}

/**
 * GoogleVoiceIntentRouter
 * Detects and routes voice commands intended for Google services
 */
export class GoogleVoiceIntentRouter {
  /**
   * Detect if a voice command is intended for Google services
   */
  isGoogleCommand(input: string): boolean {
    const keywords = ['google', 'drive', 'calendar', 'gmail', 'email', 'youtube', 'sheet', 'doc'];
    const lower = input.toLowerCase();
    return keywords.some((kw) => lower.includes(kw));
  }

  /**
   * Route a voice command to a specific Google service
   */
  routeCommand(input: string): GoogleVoiceCommand {
    const lower = input.toLowerCase();
    const isConnected = googleIntegrationManager.getConnectionStatus().connected;

    // Google Account Management
    if (/google\s+(connect|connect karo|link|sign in|login|authenticate)/i.test(input)) {
      return {
        intent: 'google.auth.connect',
        service: 'authentication',
        action: 'connect',
        params: {},
        confidence: 0.95,
        requiresAuth: false,
        naturalLanguage: input,
      };
    }

    if (/google\s+(disconnect|disconnect karo|sign out|logout|remove)/i.test(input)) {
      return {
        intent: 'google.auth.disconnect',
        service: 'authentication',
        action: 'disconnect',
        params: {},
        confidence: 0.95,
        requiresAuth: true,
        naturalLanguage: input,
      };
    }

    if (/google\s+(status|connection status|account status)/i.test(input)) {
      return {
        intent: 'google.auth.status',
        service: 'authentication',
        action: 'status',
        params: {},
        confidence: 0.93,
        requiresAuth: false,
        naturalLanguage: input,
      };
    }

    // Gemini AI
    if (/gemini|google\s+ai|analyze|analyze karo|explain|think about|reason/i.test(input)) {
      const query = input
        .replace(/gemini|google\s+ai|analyze|analyze karo|explain|think about|reason|से/gi, '')
        .trim();
      return {
        intent: 'google.gemini.query',
        service: 'gemini',
        action: 'query',
        params: { query },
        confidence: isConnected ? 0.92 : 0.5,
        requiresAuth: true,
        naturalLanguage: input,
      };
    }

    // Google Drive
    if (
      /drive\s+(list|show|dikhao|display|files|meri files)/i.test(input) ||
      /drive.*me.*files|files.*drive/i.test(input)
    ) {
      return {
        intent: 'google.drive.list',
        service: 'drive',
        action: 'list',
        params: {},
        confidence: isConnected ? 0.93 : 0.5,
        requiresAuth: true,
        naturalLanguage: input,
      };
    }

    if (/drive.*(search|dhundo|find|khoj)/i.test(input) || /search.*drive|drive.*search/i.test(input)) {
      const query = input
        .replace(/drive|search|dhundo|find|khoj|में|पर|से/gi, '')
        .trim();
      return {
        intent: 'google.drive.search',
        service: 'drive',
        action: 'search',
        params: { query },
        confidence: isConnected ? 0.91 : 0.5,
        requiresAuth: true,
        naturalLanguage: input,
      };
    }

    if (/drive.*(get|open|kholo|show)/i.test(input)) {
      const fileId = input.match(/(?:file|id)?\s+([a-zA-Z0-9-_]{20,})/)?.[1];
      return {
        intent: 'google.drive.get',
        service: 'drive',
        action: 'get',
        params: { fileId: fileId || '' },
        confidence: isConnected ? 0.90 : 0.5,
        requiresAuth: true,
        naturalLanguage: input,
      };
    }

    // Google Calendar
    if (/calendar.*(list|show|dikhao|upcoming|events|batao)/i.test(input) || /my.*events|calendar|upcoming/i.test(input)) {
      return {
        intent: 'google.calendar.list',
        service: 'calendar',
        action: 'list',
        params: {},
        confidence: isConnected ? 0.92 : 0.5,
        requiresAuth: true,
        naturalLanguage: input,
      };
    }

    if (
      /calendar.*(create|add|event|meeting|appointment)/i.test(input) ||
      /add.*calendar|schedule.*meeting|meeting.*add/i.test(input)
    ) {
      const eventTitle = input
        .replace(/calendar|create|add|event|meeting|appointment|को|से|में|पर/gi, '')
        .trim();
      return {
        intent: 'google.calendar.create',
        service: 'calendar',
        action: 'create',
        params: { title: eventTitle },
        confidence: isConnected ? 0.85 : 0.5,
        requiresAuth: true,
        naturalLanguage: input,
      };
    }

    // Gmail
    if (
      /gmail.*(search|find|dhundo|show|unread)/i.test(input) ||
      /email.*search|search.*email|unread.*email/i.test(input)
    ) {
      const query = input
        .replace(/gmail|email|search|find|dhundo|unread|से|में|पर/gi, '')
        .trim();
      return {
        intent: 'google.gmail.search',
        service: 'gmail',
        action: 'search',
        params: { query },
        confidence: isConnected ? 0.91 : 0.5,
        requiresAuth: true,
        naturalLanguage: input,
      };
    }

    if (/gmail.*(read|open|kholo|show|batao)/i.test(input)) {
      const messageId = input.match(/(?:message|id)?\s+([a-zA-Z0-9-_]{20,})/)?.[1];
      return {
        intent: 'google.gmail.read',
        service: 'gmail',
        action: 'read',
        params: { messageId: messageId || '' },
        confidence: isConnected ? 0.90 : 0.5,
        requiresAuth: true,
        naturalLanguage: input,
      };
    }

    // Google Contacts
    if (/contacts.*(search|find|dhundo|show)/i.test(input) || /contact.*search|search.*contact/i.test(input)) {
      const query = input
        .replace(/contacts|contact|search|find|dhundo|का|की|के/gi, '')
        .trim();
      return {
        intent: 'google.contacts.search',
        service: 'contacts',
        action: 'search',
        params: { query },
        confidence: isConnected ? 0.91 : 0.5,
        requiresAuth: true,
        naturalLanguage: input,
      };
    }

    // YouTube
    if (/youtube.*(search|find|dhundo|video)/i.test(input) || /youtube\s+par|search.*youtube/i.test(input)) {
      const query = input
        .replace(/youtube|search|find|dhundo|video|par|से|में|पर/gi, '')
        .trim();
      return {
        intent: 'google.youtube.search',
        service: 'youtube',
        action: 'search',
        params: { query },
        confidence: isConnected ? 0.91 : 0.5,
        requiresAuth: true,
        naturalLanguage: input,
      };
    }

    // Google Docs
    if (/docs.*(create|new|banao|naya)/i.test(input) || /google\s+doc|create.*doc/i.test(input)) {
      const title = input
        .replace(/docs|google|create|new|banao|naya|document|को|को/gi, '')
        .trim();
      return {
        intent: 'google.docs.create',
        service: 'docs',
        action: 'create',
        params: { title },
        confidence: isConnected ? 0.85 : 0.5,
        requiresAuth: true,
        naturalLanguage: input,
      };
    }

    // Google Sheets
    if (/sheets.*(create|new|banao|naya)/i.test(input) || /google\s+sheet|create.*sheet/i.test(input)) {
      const title = input
        .replace(/sheets|sheet|google|create|new|banao|naya|को|को/gi, '')
        .trim();
      return {
        intent: 'google.sheets.create',
        service: 'sheets',
        action: 'create',
        params: { title },
        confidence: isConnected ? 0.85 : 0.5,
        requiresAuth: true,
        naturalLanguage: input,
      };
    }

    // Unknown Google command
    return {
      intent: 'unknown',
      service: 'unknown',
      action: 'unknown',
      params: {},
      confidence: 0.0,
      requiresAuth: false,
      naturalLanguage: input,
    };
  }

  /**
   * Execute a routed Google command
   */
  async executeCommand(command: GoogleVoiceCommand): Promise<unknown> {
    if (command.intent === 'unknown') {
      throw new Error('Unknown Google command');
    }

    if (command.requiresAuth && !googleIntegrationManager.getConnectionStatus().connected) {
      throw new Error('Google authentication required');
    }

    // Execute via the tools registry
    return googleToolsRegistry.executeTool(command.intent, command.params);
  }
}

export const googleVoiceIntentRouter = new GoogleVoiceIntentRouter();
