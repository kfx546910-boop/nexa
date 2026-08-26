import React, { useState } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Search, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Pin, 
  Download, 
  PanelLeftClose, 
  PanelLeft, 
  Sparkles,
  Bot,
  Layers,
  Flame,
  Clock
} from 'lucide-react';
import { ChatSession } from '../types/nexus';

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onPinSession: (id: string) => void;
  onExportSession: (session: ChatSession, format: 'md' | 'json') => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  onPinSession,
  onExportSession,
  isOpen,
  onToggleOpen
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleStartRename = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const handleSaveRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameSession(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  // Filtered sessions
  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Group by timeframe
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  const pinnedSessions = filteredSessions.filter(s => s.isPinned);
  const unpinnedSessions = filteredSessions.filter(s => !s.isPinned);

  const todaySessions = unpinnedSessions.filter(s => now - s.updatedAt < ONE_DAY);
  const yesterdaySessions = unpinnedSessions.filter(s => now - s.updatedAt >= ONE_DAY && now - s.updatedAt < 2 * ONE_DAY);
  const previous7Days = unpinnedSessions.filter(s => now - s.updatedAt >= 2 * ONE_DAY && now - s.updatedAt < 7 * ONE_DAY);
  const olderSessions = unpinnedSessions.filter(s => now - s.updatedAt >= 7 * ONE_DAY);

  const renderSessionItem = (session: ChatSession) => {
    const isActive = session.id === activeSessionId;
    const isEditing = editingId === session.id;

    return (
      <div
        key={session.id}
        onClick={() => onSelectSession(session.id)}
        className={`group relative flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer text-xs transition-all ${
          isActive
            ? 'bg-cyan-950/70 text-cyan-200 border border-cyan-500/30 font-medium'
            : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {session.isPinned ? (
            <Pin className="w-3.5 h-3.5 text-cyan-400 shrink-0 fill-cyan-400/20" />
          ) : (
            <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
          )}

          {isEditing ? (
            <div className="flex items-center gap-1 flex-1" onClick={e => e.stopPropagation()}>
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                autoFocus
                className="w-full bg-slate-950 border border-cyan-500 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
              />
              <button
                onClick={e => handleSaveRename(session.id, e)}
                className="p-1 hover:text-emerald-400"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={handleCancelRename}
                className="p-1 hover:text-rose-400"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <span className="truncate text-[12px]">{session.title || 'Untitled Chat'}</span>
          )}
        </div>

        {/* Hover Action Menu */}
        {!isEditing && (
          <div className="hidden group-hover:flex items-center gap-1 pl-1 shrink-0">
            {/* Pin */}
            <button
              onClick={e => {
                e.stopPropagation();
                onPinSession(session.id);
              }}
              title={session.isPinned ? 'Unpin chat' : 'Pin chat'}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300"
            >
              <Pin className="w-3 h-3" />
            </button>

            {/* Rename */}
            <button
              onClick={e => handleStartRename(session, e)}
              title="Rename chat"
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
            >
              <Edit2 className="w-3 h-3" />
            </button>

            {/* Export */}
            <button
              onClick={e => {
                e.stopPropagation();
                onExportSession(session, 'md');
              }}
              title="Export as Markdown"
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
            >
              <Download className="w-3 h-3" />
            </button>

            {/* Delete */}
            <button
              onClick={e => {
                e.stopPropagation();
                onDeleteSession(session.id);
              }}
              title="Delete chat"
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggleOpen}
        title="Open Chat Sidebar"
        className="fixed bottom-4 left-4 z-40 p-2.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 shadow-xl transition-all"
      >
        <PanelLeft className="w-5 h-5" />
      </button>
    );
  }

  return (
    <aside className="w-72 h-full flex flex-col bg-slate-950/95 border-r border-slate-800/80 shrink-0 select-none z-30 transition-all">
      {/* Top Header */}
      <div className="p-3 border-b border-slate-800/80 flex items-center justify-between gap-2">
        <button
          onClick={onNewChat}
          className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/40 text-slate-200 hover:text-cyan-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm group"
        >
          <Plus className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          <span>New Chat</span>
        </button>

        <button
          onClick={onToggleOpen}
          title="Close Sidebar"
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-3 pt-2.5 pb-1">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
        {/* Pinned Chats */}
        {pinnedSessions.length > 0 && (
          <div className="space-y-1">
            <div className="px-2 text-[10px] font-bold text-cyan-400/80 uppercase tracking-wider flex items-center gap-1">
              <Pin className="w-2.5 h-2.5" />
              <span>Pinned</span>
            </div>
            {pinnedSessions.map(renderSessionItem)}
          </div>
        )}

        {/* Today */}
        {todaySessions.length > 0 && (
          <div className="space-y-1">
            <div className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Today
            </div>
            {todaySessions.map(renderSessionItem)}
          </div>
        )}

        {/* Yesterday */}
        {yesterdaySessions.length > 0 && (
          <div className="space-y-1">
            <div className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Yesterday
            </div>
            {yesterdaySessions.map(renderSessionItem)}
          </div>
        )}

        {/* Previous 7 Days */}
        {previous7Days.length > 0 && (
          <div className="space-y-1">
            <div className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Previous 7 Days
            </div>
            {previous7Days.map(renderSessionItem)}
          </div>
        )}

        {/* Older */}
        {olderSessions.length > 0 && (
          <div className="space-y-1">
            <div className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Older
            </div>
            {olderSessions.map(renderSessionItem)}
          </div>
        )}

        {filteredSessions.length === 0 && (
          <div className="p-4 text-center text-slate-500 text-xs">
            {searchQuery ? 'No matching conversations' : 'No conversations yet'}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950 flex flex-col gap-1.5 text-xs text-slate-400">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-medium text-slate-300">Local Neural Memory</span>
          </div>
          <span className="text-[10px] font-mono text-cyan-400/80 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-500/20">
            {sessions.length} chats
          </span>
        </div>
        <div className="text-[10px] text-slate-400 pt-1.5 border-t border-slate-900 flex items-center justify-between font-mono">
          <span>Created by <strong className="text-slate-200 font-semibold">Suraj Jangid</strong></span>
          <span>Dev: <strong className="text-cyan-400 font-semibold">KingFX</strong></span>
        </div>
      </div>
    </aside>
  );
};
