import React, { useState } from 'react';
import {
  Plus,
  Search,
  FolderKanban,
  Layers,
  Star,
  MessageSquare,
  Trash2,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Edit3,
  Check,
  X,
} from 'lucide-react';
import { ChatThread, ProjectItem } from '../types/claude';
import { filterThreads } from '../utils/claudeLogic';
import { ClaudeSunburstIcon } from './ClaudeIcon';

interface SidebarProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  activeSection: 'chat' | 'projects' | 'artifacts';
  onSelectSection: (section: 'chat' | 'projects' | 'artifacts') => void;
  threads: ChatThread[];
  activeThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onNewChat: () => void;
  onToggleStarThread: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
  onRenameThread: (threadId: string, newTitle: string) => void;
  projects: ProjectItem[];
  activeProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  totalArtifactsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggleOpen,
  activeSection,
  onSelectSection,
  threads,
  activeThreadId,
  onSelectThread,
  onNewChat,
  onToggleStarThread,
  onDeleteThread,
  onRenameThread,
  projects,
  activeProjectId,
  onSelectProject,
  darkMode,
  onToggleDarkMode,
  totalArtifactsCount,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const filteredThreads = filterThreads(threads, { query: searchQuery });
  const starredThreads = filteredThreads.filter((t) => t.starred);
  const recentThreads = filteredThreads.filter((t) => !t.starred);

  const startRename = (thread: ChatThread, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingThreadId(thread.id);
    setEditingTitle(thread.title);
  };

  const commitRename = (threadId: string, e: React.FormEvent | React.MouseEvent) => {
    e.stopPropagation();
    if (editingTitle.trim()) {
      onRenameThread(threadId, editingTitle.trim());
    }
    setEditingThreadId(null);
  };

  if (!isOpen) {
    return (
      <aside
        aria-label="Collapsed Workspace Navigation"
        className="w-14 shrink-0 h-screen flex flex-col items-center justify-between py-3 bg-[#F3F1EA] dark:bg-[#141413] border-r border-[#E5E2D9] dark:border-[#2C2B28] select-none"
      >
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onToggleOpen}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[#5A5955] dark:text-[#A3A19A] hover:bg-[#E7E4DA] dark:hover:bg-[#232220] transition-colors"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onNewChat}
            aria-label="Start new chat"
            title="New chat"
            className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#C96442] text-white hover:bg-[#B55535] transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectSection('projects')}
            aria-label="Projects"
            title="Projects"
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              activeSection === 'projects'
                ? 'bg-[#E5E1D6] dark:bg-[#2A2926] text-[#191918] dark:text-[#ECEAE2]'
                : 'text-[#5A5955] dark:text-[#A3A19A] hover:bg-[#E7E4DA] dark:hover:bg-[#232220]'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectSection('artifacts')}
            aria-label="Artifacts library"
            title="Artifacts library"
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              activeSection === 'artifacts'
                ? 'bg-[#E5E1D6] dark:bg-[#2A2926] text-[#191918] dark:text-[#ECEAE2]'
                : 'text-[#5A5955] dark:text-[#A3A19A] hover:bg-[#E7E4DA] dark:hover:bg-[#232220]'
            }`}
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleDarkMode}
          aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
          title={darkMode ? 'Light mode' : 'Dark mode'}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[#5A5955] dark:text-[#A3A19A] hover:bg-[#E7E4DA] dark:hover:bg-[#232220] transition-colors"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Workspace Navigation"
      className="w-[272px] shrink-0 h-screen flex flex-col bg-[#F3F1EA] dark:bg-[#141413] border-r border-[#E5E2D9] dark:border-[#2C2B28] select-none"
    >
      {/* Top Brand + Collapse Row */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
        <button
          type="button"
          onClick={onNewChat}
          className="flex items-center gap-2 text-left group focus:outline-none"
        >
          <span className="text-[#C96442] transition-transform duration-200 group-hover:rotate-12">
            <ClaudeSunburstIcon className="w-5 h-5" />
          </span>
          <span className="font-claude-serif text-xl font-semibold tracking-tight text-[#191918] dark:text-[#ECEAE2]">
            Claude
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleOpen}
          aria-label="Collapse sidebar"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6E6D68] dark:text-[#9A9890] hover:bg-[#E7E4DA] dark:hover:bg-[#232220] transition-colors"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Action: New Chat */}
      <div className="px-3 mb-2">
        <button
          type="button"
          onClick={onNewChat}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#C96442] hover:bg-[#B55535] text-white font-medium text-sm transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">New chat</span>
        </button>
      </div>

      {/* Primary Workspace Navigation */}
      <nav aria-label="Workspace views" className="px-3 space-y-0.5 mb-3">
        <button
          type="button"
          onClick={() => onSelectSection('projects')}
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors ${
            activeSection === 'projects'
              ? 'bg-[#E5E1D6] dark:bg-[#262522] text-[#191918] dark:text-[#ECEAE2] font-medium'
              : 'text-[#4A4945] dark:text-[#B5B3AA] hover:bg-[#EAE7DD] dark:hover:bg-[#1F1E1C]'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <FolderKanban className="w-4 h-4 text-[#6E6D68] dark:text-[#9A9890]" />
            <span>Projects</span>
          </span>
          <span className="text-xs font-claude-mono text-[#6E6D68] dark:text-[#8E8C84]">
            {projects.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSelectSection('artifacts')}
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors ${
            activeSection === 'artifacts'
              ? 'bg-[#E5E1D6] dark:bg-[#262522] text-[#191918] dark:text-[#ECEAE2] font-medium'
              : 'text-[#4A4945] dark:text-[#B5B3AA] hover:bg-[#EAE7DD] dark:hover:bg-[#1F1E1C]'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-[#6E6D68] dark:text-[#9A9890]" />
            <span>Artifacts</span>
          </span>
          <span className="text-xs font-claude-mono text-[#6E6D68] dark:text-[#8E8C84]">
            {totalArtifactsCount}
          </span>
        </button>
      </nav>

      {/* Search Threads */}
      <div className="px-3 mb-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#7A7872] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            aria-label="Search conversations"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg bg-[#EAE7DD]/80 dark:bg-[#1F1E1C] border border-transparent focus:border-[#C96442] text-[#191918] dark:text-[#ECEAE2] placeholder-[#7A7872] focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Scrollable Threads & Projects List */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-4">
        {/* Starred Projects Quick Access */}
        {projects.length > 0 && (
          <div>
            <div className="px-2 mb-1 text-[11px] font-medium text-[#7A7872] dark:text-[#8A8880]">
              Active Projects
            </div>
            <div className="space-y-0.5">
              {projects.map((proj) => {
                const isSelected = activeSection === 'projects' && activeProjectId === proj.id;
                return (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => {
                      onSelectProject(proj.id);
                      onSelectSection('projects');
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors ${
                      isSelected
                        ? 'bg-[#E5E1D6] dark:bg-[#262522] text-[#191918] dark:text-[#ECEAE2] font-medium'
                        : 'text-[#4A4945] dark:text-[#B5B3AA] hover:bg-[#EAE7DD] dark:hover:bg-[#1F1E1C]'
                    }`}
                  >
                    <span className="truncate">{proj.name}</span>
                    <span className="text-[11px] font-claude-mono text-[#7A7872] shrink-0 ml-2">
                      {proj.knowledgeDocs.length} docs
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Starred Conversations */}
        {starredThreads.length > 0 && (
          <div>
            <div className="px-2 mb-1 text-[11px] font-medium text-[#7A7872] dark:text-[#8A8880]">
              Starred
            </div>
            <div className="space-y-0.5">
              {starredThreads.map((thread) => (
                <ThreadRow
                  key={thread.id}
                  thread={thread}
                  isActive={activeSection === 'chat' && activeThreadId === thread.id}
                  isEditing={editingThreadId === thread.id}
                  editingTitle={editingTitle}
                  onChangeEditingTitle={setEditingTitle}
                  onStartRename={(e) => startRename(thread, e)}
                  onCommitRename={(e) => commitRename(thread.id, e)}
                  onCancelRename={() => setEditingThreadId(null)}
                  onSelect={() => {
                    onSelectThread(thread.id);
                    onSelectSection('chat');
                  }}
                  onToggleStar={() => onToggleStarThread(thread.id)}
                  onDelete={() => onDeleteThread(thread.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recents */}
        <div>
          <div className="px-2 mb-1 text-[11px] font-medium text-[#7A7872] dark:text-[#8A8880]">
            Recents
          </div>
          {recentThreads.length === 0 && starredThreads.length === 0 ? (
            <p className="px-2 py-3 text-xs text-[#7A7872]">No matching conversations found.</p>
          ) : (
            <div className="space-y-0.5">
              {recentThreads.map((thread) => (
                <ThreadRow
                  key={thread.id}
                  thread={thread}
                  isActive={activeSection === 'chat' && activeThreadId === thread.id}
                  isEditing={editingThreadId === thread.id}
                  editingTitle={editingTitle}
                  onChangeEditingTitle={setEditingTitle}
                  onStartRename={(e) => startRename(thread, e)}
                  onCommitRename={(e) => commitRename(thread.id, e)}
                  onCancelRename={() => setEditingThreadId(null)}
                  onSelect={() => {
                    onSelectThread(thread.id);
                    onSelectSection('chat');
                  }}
                  onToggleStar={() => onToggleStarThread(thread.id)}
                  onDelete={() => onDeleteThread(thread.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Profile & Theme Switcher */}
      <div className="p-3 border-t border-[#E5E2D9] dark:border-[#2C2B28] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-[#C96442]/15 text-[#C96442] flex items-center justify-center font-semibold text-xs shrink-0">
            FA
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-[#191918] dark:text-[#ECEAE2] truncate">
              Professional Plan
            </div>
            <div className="text-[11px] text-[#6E6D68] dark:text-[#8E8C84] truncate">
              200K Context · Artifacts
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleDarkMode}
          aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#4A4945] dark:text-[#B5B3AA] hover:bg-[#E7E4DA] dark:hover:bg-[#232220] flex items-center gap-1.5 transition-colors shrink-0"
        >
          {darkMode ? (
            <>
              <Sun className="w-3.5 h-3.5 text-[#D97757]" />
              <span>Light</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-[#5A5955]" />
              <span>Dark</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

interface ThreadRowProps {
  thread: ChatThread;
  isActive: boolean;
  isEditing: boolean;
  editingTitle: string;
  onChangeEditingTitle: (v: string) => void;
  onStartRename: (e: React.MouseEvent) => void;
  onCommitRename: (e: React.FormEvent | React.MouseEvent) => void;
  onCancelRename: () => void;
  onSelect: () => void;
  onToggleStar: () => void;
  onDelete: () => void;
}

const ThreadRow: React.FC<ThreadRowProps> = ({
  thread,
  isActive,
  isEditing,
  editingTitle,
  onChangeEditingTitle,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onSelect,
  onToggleStar,
  onDelete,
}) => {
  if (isEditing) {
    return (
      <form
        onSubmit={onCommitRename}
        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#E5E1D6] dark:bg-[#262522]"
      >
        <input
          type="text"
          value={editingTitle}
          onChange={(e) => onChangeEditingTitle(e.target.value)}
          aria-label="Edit conversation title"
          autoFocus
          className="flex-1 min-w-0 text-xs bg-transparent text-[#191918] dark:text-[#ECEAE2] focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Save conversation title"
          className="p-1 text-[#2D6A4F] hover:opacity-80"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onCancelRename}
          aria-label="Cancel editing title"
          className="p-1 text-[#6E6D68] hover:opacity-80"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </form>
    );
  }

  return (
    <div
      className={`group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
        isActive
          ? 'bg-[#E5E1D6] dark:bg-[#262522] text-[#191918] dark:text-[#ECEAE2] font-medium'
          : 'text-[#4A4945] dark:text-[#B5B3AA] hover:bg-[#EAE7DD] dark:hover:bg-[#1F1E1C]'
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex items-center gap-2 min-w-0 flex-1 text-left focus:outline-none"
      >
        <MessageSquare className="w-3.5 h-3.5 shrink-0 text-[#7A7872]" />
        <span className="truncate">{thread.title}</span>
      </button>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0 ml-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar();
          }}
          aria-label={thread.starred ? `Unstar ${thread.title}` : `Star ${thread.title}`}
          className="p-1 rounded hover:bg-[#DAD5C8] dark:hover:bg-[#33312D] text-[#6E6D68] dark:text-[#9A9890]"
        >
          <Star
            className={`w-3 h-3 ${thread.starred ? 'fill-[#C96442] text-[#C96442]' : ''}`}
          />
        </button>
        <button
          type="button"
          onClick={onStartRename}
          aria-label={`Rename ${thread.title}`}
          className="p-1 rounded hover:bg-[#DAD5C8] dark:hover:bg-[#33312D] text-[#6E6D68] dark:text-[#9A9890]"
        >
          <Edit3 className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label={`Delete ${thread.title}`}
          className="p-1 rounded hover:bg-[#DAD5C8] dark:hover:bg-[#33312D] text-[#6E6D68] hover:text-[#B91C1C]"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
