import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  FileText,
  Trash2,
  MessageSquarePlus,
  ArrowLeft,
  Check,
  BookOpen,
  SlidersHorizontal,
} from 'lucide-react';
import { ChatThread, ProjectItem } from '../types/claude';
import { calculateProjectContextUsage, estimateTokens } from '../utils/claudeLogic';

interface ProjectsViewProps {
  projects: ProjectItem[];
  activeProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
  onCreateProject: (project: {
    name: string;
    description: string;
    customInstructions: string;
  }) => void;
  onUpdateProjectInstructions: (projectId: string, customInstructions: string) => void;
  onAddKnowledgeDoc: (projectId: string, doc: { title: string; content: string }) => void;
  onRemoveKnowledgeDoc: (projectId: string, docId: string) => void;
  threads: ChatThread[];
  onStartProjectChat: (projectId: string) => void;
  onOpenThread: (threadId: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onUpdateProjectInstructions,
  onAddKnowledgeDoc,
  onRemoveKnowledgeDoc,
  threads,
  onStartProjectChat,
  onOpenThread,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [createError, setCreateError] = useState('');

  // State for active project detail editing
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [docError, setDocError] = useState('');
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);

  const selectedProject = projects.find((p) => p.id === activeProjectId) || null;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setCreateError('Please enter a project name.');
      return;
    }
    onCreateProject({
      name: newName.trim(),
      description: newDesc.trim() || 'Custom knowledge workspace and instructions.',
      customInstructions: newInstructions.trim(),
    });
    setNewName('');
    setNewDesc('');
    setNewInstructions('');
    setCreateError('');
    setShowCreateForm(false);
  };

  const handleAddDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    if (!docTitle.trim() || !docContent.trim()) {
      setDocError('Both document title and content are required.');
      return;
    }
    onAddKnowledgeDoc(selectedProject.id, {
      title: docTitle.trim(),
      content: docContent.trim(),
    });
    setDocTitle('');
    setDocContent('');
    setDocError('');
    setShowAddDoc(false);
  };

  if (selectedProject) {
    const usage = calculateProjectContextUsage(selectedProject);
    const projectThreads = threads.filter((t) => t.projectId === selectedProject.id);

    return (
      <div className="flex-1 h-screen overflow-y-auto px-6 lg:px-12 py-8 bg-[#FAF9F5] dark:bg-[#191918]">
        <div className="max-w-5xl mx-auto">
          {/* Breadcrumb & Primary Action */}
          <div className="flex items-center justify-between gap-4 pb-6 border-b border-[#E5E2D9] dark:border-[#2C2B28]">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => onSelectProject(null)}
                aria-label="Back to all projects"
                className="p-2 rounded-lg text-[#5A5955] dark:text-[#A3A19A] hover:bg-[#EAE7DD] dark:hover:bg-[#232220] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-[#6E6D68] dark:text-[#9A9890]">
                  <span>Projects</span>
                  <span aria-hidden="true">/</span>
                  <span className="font-claude-mono">200K Context Window</span>
                </div>
                <h1 className="font-claude-serif text-2xl font-semibold text-[#191918] dark:text-[#ECEAE2] truncate">
                  {selectedProject.name}
                </h1>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onStartProjectChat(selectedProject.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C96442] hover:bg-[#B55535] text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0"
            >
              <MessageSquarePlus className="w-4 h-4" />
              <span>New chat in project</span>
            </button>
          </div>

          <p className="mt-4 text-sm text-[#4A4945] dark:text-[#B5B3AA]">
            {selectedProject.description}
          </p>

          {/* Two-Column Split: Left (Conversations + Instructions), Right (Project Knowledge Base) */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Custom Instructions & Project Threads */}
            <div className="lg:col-span-7 space-y-6">
              <div className="p-5 rounded-xl bg-[#F3F1EA] dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2C2B28]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-[#C96442]" />
                    <h2 className="text-sm font-semibold text-[#191918] dark:text-[#ECEAE2]">
                      Project Custom Instructions
                    </h2>
                  </div>
                  {savedBanner && (
                    <span className="flex items-center gap-1 text-xs text-[#2D6A4F] font-medium">
                      <Check className="w-3.5 h-3.5" /> Saved
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#6E6D68] dark:text-[#9A9890] mb-3">
                  Define how Claude should behave, format responses, or prioritize domain standards across all chats in this project.
                </p>
                <textarea
                  aria-label="Project custom instructions"
                  rows={4}
                  value={selectedProject.customInstructions}
                  onChange={(e) => {
                    onUpdateProjectInstructions(selectedProject.id, e.target.value);
                    setSavedBanner(true);
                    setTimeout(() => setSavedBanner(false), 1500);
                  }}
                  placeholder="e.g., Always write TypeScript with strict interfaces and include edge-case complexity analysis..."
                  className="w-full p-3 rounded-lg bg-[#FAF9F5] dark:bg-[#191918] border border-[#DFDBD0] dark:border-[#33312D] text-xs leading-relaxed text-[#191918] dark:text-[#ECEAE2] focus:outline-none focus:border-[#C96442]"
                />
              </div>

              {/* Project Conversations */}
              <div className="p-5 rounded-xl bg-[#F3F1EA] dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2C2B28]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-[#191918] dark:text-[#ECEAE2]">
                    Project Conversations ({projectThreads.length})
                  </h2>
                </div>

                {projectThreads.length === 0 ? (
                  <div className="py-6 text-center">
                    <p className="text-xs text-[#6E6D68] dark:text-[#9A9890] mb-3">
                      No conversations started in this project yet.
                    </p>
                    <button
                      type="button"
                      onClick={() => onStartProjectChat(selectedProject.id)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#C96442] text-white text-xs font-medium hover:bg-[#B55535] transition-colors"
                    >
                      Start first project chat
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-[#E5E2D9] dark:divide-[#2C2B28]">
                    {projectThreads.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onOpenThread(t.id)}
                        className="w-full py-3 flex items-center justify-between text-left hover:opacity-80 transition-opacity"
                      >
                        <div>
                          <div className="text-sm font-medium text-[#191918] dark:text-[#ECEAE2]">
                            {t.title}
                          </div>
                          <div className="text-xs text-[#6E6D68] dark:text-[#9A9890] mt-0.5">
                            {t.messages.length} messages · Updated{' '}
                            {new Date(t.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <span className="text-xs font-medium text-[#C96442]">Open →</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Project Knowledge Base & 200K Context Meter */}
            <div className="lg:col-span-5 p-5 rounded-xl bg-[#F3F1EA] dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2C2B28]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#C96442]" />
                  <h2 className="text-sm font-semibold text-[#191918] dark:text-[#ECEAE2]">
                    Project Knowledge
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddDoc((v) => !v)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EAE7DD] dark:bg-[#2C2B28] text-xs font-medium text-[#191918] dark:text-[#ECEAE2] hover:bg-[#DFDBD0] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add content</span>
                </button>
              </div>

              {/* Context Capacity Bar */}
              <div className="mb-4 p-3 rounded-lg bg-[#FAF9F5] dark:bg-[#191918] border border-[#E5E2D9] dark:border-[#2C2B28]">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[#5A5955] dark:text-[#A3A19A]">Context capacity used</span>
                  <span className="font-claude-mono font-medium text-[#191918] dark:text-[#ECEAE2]">
                    {usage.usedTokens.toLocaleString()} / 200,000 tokens ({usage.percentage}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#E5E2D9] dark:bg-[#2C2B28] overflow-hidden">
                  <div
                    className="h-full bg-[#C96442] transition-all duration-200"
                    style={{ width: `${Math.max(2, usage.percentage)}%` }}
                  />
                </div>
              </div>

              {/* Add Document Form */}
              {showAddDoc && (
                <form
                  onSubmit={handleAddDocSubmit}
                  className="mb-4 p-3.5 rounded-lg bg-[#FAF9F5] dark:bg-[#191918] border border-[#C96442]/50 space-y-2.5"
                >
                  <input
                    type="text"
                    aria-label="Knowledge document title"
                    placeholder="Document filename (e.g. Architecture-Spec.md)"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded bg-[#F3F1EA] dark:bg-[#232220] text-[#191918] dark:text-[#ECEAE2] focus:outline-none"
                  />
                  <textarea
                    rows={4}
                    aria-label="Knowledge document content"
                    placeholder="Paste specification, schema, or reference text..."
                    value={docContent}
                    onChange={(e) => setDocContent(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded bg-[#F3F1EA] dark:bg-[#232220] text-[#191918] dark:text-[#ECEAE2] focus:outline-none"
                  />
                  {docError && <p className="text-xs text-[#B91C1C]">{docError}</p>}
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddDoc(false);
                        setDocError('');
                      }}
                      className="px-2.5 py-1 text-xs text-[#6E6D68]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded bg-[#C96442] text-white text-xs font-medium hover:bg-[#B55535]"
                    >
                      Save Document
                    </button>
                  </div>
                </form>
              )}

              {/* Knowledge Docs List */}
              <div className="space-y-2">
                {selectedProject.knowledgeDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-start justify-between gap-2 p-3 rounded-lg bg-[#FAF9F5] dark:bg-[#191918] border border-[#E5E2D9] dark:border-[#2C2B28]"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-[#C96442] shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[#191918] dark:text-[#ECEAE2] truncate">
                          {doc.title}
                        </div>
                        <div className="text-[11px] font-claude-mono text-[#6E6D68] dark:text-[#9A9890]">
                          {(doc.tokens || estimateTokens(doc.content)).toLocaleString()} tokens
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveKnowledgeDoc(selectedProject.id, doc.id)}
                      aria-label={`Remove ${doc.title}`}
                      className="p-1 text-[#7A7872] hover:text-[#B91C1C] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-screen overflow-y-auto px-6 lg:px-12 py-8 bg-[#FAF9F5] dark:bg-[#191918]">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4 pb-6 border-b border-[#E5E2D9] dark:border-[#2C2B28]">
          <div>
            <h1 className="font-claude-serif text-2xl font-semibold text-[#191918] dark:text-[#ECEAE2]">
              Projects
            </h1>
            <p className="text-sm text-[#5A5955] dark:text-[#A3A19A] mt-1">
              Ground Claude in your internal documentation, codebases, and custom style instructions across a 200K context window.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C96442] hover:bg-[#B55535] text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create project</span>
          </button>
        </div>

        {/* Create Project Modal/Drawer Form */}
        {showCreateForm && (
          <form
            onSubmit={handleCreateSubmit}
            className="mt-6 p-5 rounded-xl bg-[#F3F1EA] dark:bg-[#21201E] border border-[#C96442]/40 space-y-4"
          >
            <h2 className="text-base font-semibold text-[#191918] dark:text-[#ECEAE2]">
              Create a new Claude Project
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#4A4945] dark:text-[#B5B3AA] mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  aria-label="New project name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Q4 Compiler Optimization"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[#FAF9F5] dark:bg-[#191918] border border-[#DFDBD0] dark:border-[#33312D] text-[#191918] dark:text-[#ECEAE2] focus:outline-none focus:border-[#C96442]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A4945] dark:text-[#B5B3AA] mb-1">
                  Short Description
                </label>
                <input
                  type="text"
                  aria-label="New project description"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="What is this workspace focused on?"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[#FAF9F5] dark:bg-[#191918] border border-[#DFDBD0] dark:border-[#33312D] text-[#191918] dark:text-[#ECEAE2] focus:outline-none focus:border-[#C96442]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4A4945] dark:text-[#B5B3AA] mb-1">
                Custom System Instructions
              </label>
              <textarea
                rows={3}
                aria-label="New project custom instructions"
                value={newInstructions}
                onChange={(e) => setNewInstructions(e.target.value)}
                placeholder="Instruct Claude how to respond inside this project..."
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#FAF9F5] dark:bg-[#191918] border border-[#DFDBD0] dark:border-[#33312D] text-[#191918] dark:text-[#ECEAE2] focus:outline-none focus:border-[#C96442]"
              />
            </div>
            {createError && <p className="text-xs text-[#B91C1C]">{createError}</p>}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setCreateError('');
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#5A5955] dark:text-[#A3A19A]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#C96442] text-white text-xs font-medium hover:bg-[#B55535]"
              >
                Save Project
              </button>
            </div>
          </form>
        )}

        {/* Projects Grid */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
          {projects.map((project) => {
            const usage = calculateProjectContextUsage(project);
            return (
              <div
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onSelectProject(project.id);
                }}
                className="p-5 rounded-xl bg-[#F3F1EA] dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2C2B28] hover:border-[#C96442] transition-colors cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <FolderKanban className="w-4 h-4 text-[#C96442]" />
                      <h2 className="text-base font-semibold text-[#191918] dark:text-[#ECEAE2]">
                        {project.name}
                      </h2>
                    </div>
                    <span className="text-xs font-claude-mono text-[#6E6D68] dark:text-[#9A9890]">
                      {project.knowledgeDocs.length} docs
                    </span>
                  </div>
                  <p className="text-xs text-[#5A5955] dark:text-[#A3A19A] leading-relaxed mb-4">
                    {project.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#E5E2D9] dark:border-[#2C2B28] flex items-center justify-between text-xs text-[#6E6D68] dark:text-[#9A9890]">
                  <span className="font-claude-mono">
                    {usage.usedTokens.toLocaleString()} tokens grounded
                  </span>
                  <span className="text-[#C96442] font-medium">Open workspace →</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
