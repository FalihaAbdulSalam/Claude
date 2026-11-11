import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Paperclip,
  ChevronDown,
  ChevronRight,
  Layers,
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  FolderKanban,
  Brain,
  Feather,
  X,
  FileCode,
  Square,
} from 'lucide-react';
import {
  ArtifactItem,
  AttachmentItem,
  ChatThread,
  ClaudeModelId,
  MessageItem,
  ProjectItem,
  WritingStyleId,
} from '../types/claude';
import { CLAUDE_MODELS, STARTER_PROMPTS, WRITING_STYLES } from '../data/seedData';
import { ClaudeSunburstIcon } from './ClaudeIcon';

interface ChatViewProps {
  thread: ChatThread | null;
  projects: ProjectItem[];
  selectedModelId: ClaudeModelId;
  onChangeModelId: (m: ClaudeModelId) => void;
  selectedStyleId: WritingStyleId;
  onChangeStyleId: (s: WritingStyleId) => void;
  extendedThinking: boolean;
  onToggleExtendedThinking: () => void;
  selectedProjectId: string | null;
  onChangeProjectId: (p: string | null) => void;
  isStreaming: boolean;
  onStopStreaming: () => void;
  onSendMessage: (content: string, attachments: AttachmentItem[], overrideThinking?: boolean) => void;
  onRegenerateLast: () => void;
  onFeedbackMessage: (messageId: string, feedback: 'up' | 'down') => void;
  activeArtifact: ArtifactItem | null;
  onOpenArtifact: (artifact: ArtifactItem) => void;
  allThreadArtifacts: ArtifactItem[];
}

export const ChatView: React.FC<ChatViewProps> = ({
  thread,
  projects,
  selectedModelId,
  onChangeModelId,
  selectedStyleId,
  onChangeStyleId,
  extendedThinking,
  onToggleExtendedThinking,
  selectedProjectId,
  onChangeProjectId,
  isStreaming,
  onStopStreaming,
  onSendMessage,
  onRegenerateLast,
  onFeedbackMessage,
  activeArtifact,
  onOpenArtifact,
  allThreadArtifacts,
}) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [showSnippetModal, setShowSnippetModal] = useState(false);
  const [snippetTitle, setSnippetTitle] = useState('');
  const [snippetBody, setSnippetBody] = useState('');
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [expandedThinkingIds, setExpandedThinkingIds] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const prevThreadIdRef = useRef<string | null>(thread?.id || null);

  const activeProject =
    projects.find((p) => p.id === (thread ? thread.projectId : selectedProjectId)) || null;

  useEffect(() => {
    if (thread?.id !== prevThreadIdRef.current) {
      prevThreadIdRef.current = thread?.id || null;
      scrollContainerRef.current?.scrollTo({ top: 0 });
      return;
    }
    if (isStreaming) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [thread?.id, thread?.messages.length, isStreaming]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isStreaming) return;
    onSendMessage(input.trim(), attachments);
    setInput('');
    setAttachments([]);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const isImage = file.type.startsWith('image/');
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        setAttachments((prev) => [
          ...prev,
          {
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            mimeType: file.type || 'text/plain',
            sizeBytes: file.size,
            content: result,
            isImage,
          },
        ]);
      };
      if (isImage) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
    e.target.value = '';
  };

  const handleAddSnippet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!snippetBody.trim()) return;
    const name = snippetTitle.trim() || 'snippet.txt';
    setAttachments((prev) => [
      ...prev,
      {
        id: `att-${Date.now()}`,
        name,
        mimeType: 'text/plain',
        sizeBytes: snippetBody.length,
        content: snippetBody,
        isImage: false,
      },
    ]);
    setSnippetTitle('');
    setSnippetBody('');
    setShowSnippetModal(false);
  };

  const toggleThinking = (msgId: string) => {
    setExpandedThinkingIds((prev) => ({
      ...prev,
      [msgId]: !(prev[msgId] ?? true),
    }));
  };

  const handleCopyMessage = async (msg: MessageItem) => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopiedMsgId(msg.id);
      setTimeout(() => setCopiedMsgId(null), 1600);
    } catch {
      // ignore
    }
  };

  const currentModel =
    CLAUDE_MODELS.find((m) => m.id === (thread?.modelId || selectedModelId)) || CLAUDE_MODELS[0];

  const isHomeEmpty = !thread || thread.messages.length === 0;

  return (
    <main className="flex-1 h-screen flex flex-col min-w-0 bg-[#FAF9F5] dark:bg-[#191918]">
      {/* Top Workspace Header (3-Zone Contract) */}
      <header className="h-13 shrink-0 px-6 border-b border-[#E5E2D9] dark:border-[#2C2B28] flex items-center justify-between gap-4">
        {/* Zone 1: Single-line title / breadcrumb */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-sm font-semibold text-[#191918] dark:text-[#ECEAE2] truncate">
            {thread ? thread.title : 'New conversation'}
          </span>
          {activeProject && (
            <>
              <span className="text-[#8E8C84] shrink-0" aria-hidden="true">
                /
              </span>
              <span className="text-xs text-[#C96442] font-medium truncate max-w-[180px]">
                {activeProject.name}
              </span>
            </>
          )}
        </div>

        {/* Zone 2: Quiet metadata (hidden when split-screen Artifact drawer is open on smaller widths) */}
        <div
          className={`${
            activeArtifact ? 'hidden 2xl:flex' : 'hidden lg:flex'
          } items-center gap-2 text-xs text-[#6E6D68] dark:text-[#9A9890] whitespace-nowrap shrink-0`}
        >
          <span>{currentModel.name}</span>
          <span aria-hidden="true">·</span>
          <span>
            Style: {WRITING_STYLES.find((s) => s.id === (thread?.styleId || selectedStyleId))?.name}
          </span>
          {(thread ? thread.extendedThinking : extendedThinking) && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[#C96442] font-medium">Extended Thinking</span>
            </>
          )}
        </div>

        {/* Zone 3: 1 Primary Action (Toggle Artifacts Drawer if artifacts exist) */}
        <div className="flex items-center shrink-0">
          {allThreadArtifacts.length > 0 ? (
            <button
              type="button"
              onClick={() =>
                onOpenArtifact(activeArtifact || allThreadArtifacts[allThreadArtifacts.length - 1])
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#EAE7DD] dark:bg-[#262522] text-[#191918] dark:text-[#ECEAE2] hover:bg-[#DFDBD0] dark:hover:bg-[#302E2A] transition-colors whitespace-nowrap shrink-0"
            >
              <Layers className="w-3.5 h-3.5 text-[#C96442]" />
              <span>Artifacts ({allThreadArtifacts.length})</span>
            </button>
          ) : (
            <span className="text-xs font-claude-mono text-[#7A7872] whitespace-nowrap shrink-0">
              200K Context
            </span>
          )}
        </div>
      </header>

      {/* Main Content Area: Either Home Greeting + Central Composer OR Conversation Stream */}
      {isHomeEmpty ? (
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-10 flex flex-col items-center justify-center">
          <div className="w-full max-w-[740px] mx-auto">
            {/* Editorial Greeting */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-11 h-11 rounded-2xl bg-[#C96442]/12 text-[#C96442] flex items-center justify-center mb-4">
                <ClaudeSunburstIcon className="w-7 h-7" />
              </div>
              <h1 className="font-claude-serif text-3xl sm:text-4xl font-normal tracking-tight text-[#191918] dark:text-[#ECEAE2] text-balance">
                What can I help you think through today?
              </h1>
              {activeProject && (
                <p className="mt-2 text-xs text-[#6E6D68] dark:text-[#9A9890]">
                  Grounded in project{' '}
                  <strong className="text-[#C96442] font-medium">{activeProject.name}</strong> (
                  {activeProject.knowledgeDocs.length} knowledge documents loaded)
                </p>
              )}
            </div>

            {/* Central Claude Composer */}
            <ComposerBox
              input={input}
              onChangeInput={setInput}
              onKeyDown={handleKeyDown}
              onSubmit={handleSubmit}
              attachments={attachments}
              onRemoveAttachment={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))}
              onTriggerFileUpload={() => fileInputRef.current?.click()}
              onTriggerSnippetModal={() => setShowSnippetModal(true)}
              selectedModelId={selectedModelId}
              onChangeModelId={onChangeModelId}
              selectedStyleId={selectedStyleId}
              onChangeStyleId={onChangeStyleId}
              extendedThinking={extendedThinking}
              onToggleExtendedThinking={onToggleExtendedThinking}
              projects={projects}
              selectedProjectId={selectedProjectId}
              onChangeProjectId={onChangeProjectId}
              isStreaming={isStreaming}
              onStopStreaming={onStopStreaming}
              placeholder="How can Claude help you today? Ask for code, interactive HTML artifacts, SVG diagrams, or deep analysis..."
            />

            {/* Starter Prompts Grid */}
            <div className="mt-7">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-medium text-[#6E6D68] dark:text-[#9A9890]">
                  Explore capabilities &amp; interactive Artifacts
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STARTER_PROMPTS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSendMessage(item.prompt, [], item.extendedThinking)}
                    className="p-3.5 rounded-xl bg-[#F3F1EA] dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2C2B28] hover:border-[#C96442] dark:hover:border-[#C96442] text-left transition-colors group"
                  >
                    <div className="flex items-center justify-between text-[11px] text-[#6E6D68] dark:text-[#9A9890] mb-1">
                      <span>{item.category}</span>
                      {item.extendedThinking && (
                        <span className="text-[#C96442] font-medium">Extended Thinking</span>
                      )}
                    </div>
                    <div className="text-xs font-medium text-[#191918] dark:text-[#ECEAE2] group-hover:text-[#C96442] transition-colors">
                      {item.title}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Conversation Scroll Stream */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
            <div className="max-w-[740px] mx-auto space-y-6">
              {thread.messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                const isThinkingOpen = expandedThinkingIds[msg.id] ?? true;

                if (isUser) {
                  return (
                    <div key={msg.id} className="flex flex-col items-end">
                      <div className="max-w-[88%] rounded-2xl px-4 py-3 bg-[#EDEAE0] dark:bg-[#262522] text-[#191918] dark:text-[#ECEAE2] text-[15px] leading-relaxed">
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2.5">
                            {msg.attachments.map((att) => (
                              <div
                                key={att.id}
                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#FAF9F5] dark:bg-[#191918] border border-[#DFDBD0] dark:border-[#33312D] text-xs"
                              >
                                <FileCode className="w-3.5 h-3.5 text-[#C96442]" />
                                <span className="font-medium truncate max-w-[160px]">
                                  {att.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    </div>
                  );
                }

                return (
                  <article
                    key={msg.id}
                    className="rounded-2xl p-4 sm:p-5 bg-transparent space-y-3"
                  >
                    {/* Assistant Header Row */}
                    <div className="flex items-center gap-2">
                      <span className="text-[#C96442]">
                        <ClaudeSunburstIcon className="w-4 h-4" />
                      </span>
                      <span className="text-xs font-semibold text-[#191918] dark:text-[#ECEAE2]">
                        Claude
                      </span>
                      {msg.thinkingDurationSec && (
                        <span className="text-xs text-[#6E6D68] dark:text-[#9A9890]">
                          · Thought for {msg.thinkingDurationSec}s
                        </span>
                      )}
                    </div>

                    {/* Collapsible Extended Thinking Block */}
                    {msg.thinking && (
                      <div className="rounded-xl bg-[#F3F1EA] dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2C2B28] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleThinking(msg.id)}
                          aria-expanded={isThinkingOpen}
                          className="w-full px-3.5 py-2 flex items-center justify-between text-xs font-medium text-[#5A5955] dark:text-[#A3A19A] hover:bg-[#EAE7DD]/60 dark:hover:bg-[#282724] transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <Brain className="w-3.5 h-3.5 text-[#C96442]" />
                            <span>
                              Extended Thinking process
                              {msg.thinkingDurationSec ? ` (${msg.thinkingDurationSec}s)` : ''}
                            </span>
                          </span>
                          {isThinkingOpen ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {isThinkingOpen && (
                          <div className="px-3.5 pb-3 pt-1 text-xs font-claude-mono leading-relaxed text-[#5A5955] dark:text-[#A3A19A] whitespace-pre-wrap border-t border-[#E5E2D9] dark:border-[#2C2B28]">
                            {msg.thinking}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Editorial Serif Prose Response */}
                    <div className="font-claude-serif text-[16px] leading-[1.7] text-[#191918] dark:text-[#ECEAE2] space-y-3">
                      <FormattedMessageBody content={msg.content} />
                    </div>

                    {/* Attached Interactive Artifact Cards */}
                    {msg.artifacts && msg.artifacts.length > 0 && (
                      <div className="pt-2 space-y-2">
                        {msg.artifacts.map((art) => {
                          const isSelected = activeArtifact?.id === art.id;
                          return (
                            <button
                              key={art.id}
                              type="button"
                              onClick={() => onOpenArtifact(art)}
                              className={`w-full sm:w-auto min-w-[290px] flex items-center justify-between gap-4 p-3.5 rounded-xl border text-left transition-colors ${
                                isSelected
                                  ? 'bg-[#F3F1EA] dark:bg-[#262522] border-[#C96442]'
                                  : 'bg-[#F3F1EA] dark:bg-[#21201E] border-[#E5E2D9] dark:border-[#2C2B28] hover:border-[#C96442]'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-[#C96442]/15 text-[#C96442] flex items-center justify-center shrink-0">
                                  <Layers className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold font-claude-sans text-[#191918] dark:text-[#ECEAE2] truncate">
                                    {art.title}
                                  </div>
                                  <div className="text-[11px] font-claude-sans text-[#6E6D68] dark:text-[#9A9890]">
                                    Click to open {art.type.toUpperCase()} Artifact · v{art.version}
                                  </div>
                                </div>
                              </div>
                              <span className="text-xs font-claude-sans font-medium text-[#C96442] shrink-0">
                                {isSelected ? 'Viewing' : 'Open →'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Message Action Bar */}
                    <div className="pt-1 flex items-center gap-1 text-[#6E6D68] dark:text-[#9A9890]">
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg)}
                        aria-label="Copy response"
                        className="p-1.5 rounded-lg hover:bg-[#EAE7DD] dark:hover:bg-[#262522] transition-colors flex items-center gap-1 text-xs"
                      >
                        {copiedMsgId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#2D6A4F]" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {idx === thread.messages.length - 1 && !isStreaming && (
                        <button
                          type="button"
                          onClick={onRegenerateLast}
                          aria-label="Retry response"
                          title="Retry response"
                          className="p-1.5 rounded-lg hover:bg-[#EAE7DD] dark:hover:bg-[#262522] transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onFeedbackMessage(msg.id, 'up')}
                        aria-label="Helpful response"
                        className={`p-1.5 rounded-lg hover:bg-[#EAE7DD] dark:hover:bg-[#262522] transition-colors ${
                          msg.feedback === 'up' ? 'text-[#2D6A4F]' : ''
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onFeedbackMessage(msg.id, 'down')}
                        aria-label="Unhelpful response"
                        className={`p-1.5 rounded-lg hover:bg-[#EAE7DD] dark:hover:bg-[#262522] transition-colors ${
                          msg.feedback === 'down' ? 'text-[#B91C1C]' : ''
                        }`}
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </article>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Sticky Bottom Composer */}
          <div className="px-4 sm:px-8 pb-4 pt-2 bg-[#FAF9F5] dark:bg-[#191918]">
            <div className="max-w-[740px] mx-auto">
              <ComposerBox
                input={input}
                onChangeInput={setInput}
                onKeyDown={handleKeyDown}
                onSubmit={handleSubmit}
                attachments={attachments}
                onRemoveAttachment={(id) =>
                  setAttachments((prev) => prev.filter((a) => a.id !== id))
                }
                onTriggerFileUpload={() => fileInputRef.current?.click()}
                onTriggerSnippetModal={() => setShowSnippetModal(true)}
                selectedModelId={thread.modelId}
                onChangeModelId={onChangeModelId}
                selectedStyleId={thread.styleId}
                onChangeStyleId={onChangeStyleId}
                extendedThinking={thread.extendedThinking}
                onToggleExtendedThinking={onToggleExtendedThinking}
                projects={projects}
                selectedProjectId={thread.projectId || null}
                onChangeProjectId={onChangeProjectId}
                isStreaming={isStreaming}
                onStopStreaming={onStopStreaming}
                placeholder="Reply to Claude..."
              />
            </div>
          </div>
        </>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload file attachment"
      />

      {/* Paste Code / Text Snippet Modal */}
      {showSnippetModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="snippet-dialog-title"
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleAddSnippet}
            className="w-full max-w-lg rounded-2xl bg-[#FAF9F5] dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2C2B28] p-5 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2
                id="snippet-dialog-title"
                className="text-sm font-semibold text-[#191918] dark:text-[#ECEAE2]"
              >
                Attach Text or Code Content
              </h2>
              <button
                type="button"
                onClick={() => setShowSnippetModal(false)}
                aria-label="Close snippet modal"
                className="p-1 text-[#6E6D68]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              aria-label="Snippet filename"
              placeholder="Filename (e.g. schema.sql or notes.md)"
              value={snippetTitle}
              onChange={(e) => setSnippetTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-[#F3F1EA] dark:bg-[#191918] border border-[#DFDBD0] dark:border-[#33312D] text-[#191918] dark:text-[#ECEAE2] focus:outline-none"
            />
            <textarea
              rows={6}
              aria-label="Snippet content"
              placeholder="Paste code, logs, or markdown context..."
              value={snippetBody}
              onChange={(e) => setSnippetBody(e.target.value)}
              className="w-full px-3 py-2 text-xs font-claude-mono rounded-lg bg-[#F3F1EA] dark:bg-[#191918] border border-[#DFDBD0] dark:border-[#33312D] text-[#191918] dark:text-[#ECEAE2] focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSnippetModal(false)}
                className="px-3 py-1.5 text-xs text-[#6E6D68]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#C96442] text-white text-xs font-medium hover:bg-[#B55535]"
              >
                Attach Content
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
};

interface ComposerBoxProps {
  input: string;
  onChangeInput: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e?: React.FormEvent) => void;
  attachments: AttachmentItem[];
  onRemoveAttachment: (id: string) => void;
  onTriggerFileUpload: () => void;
  onTriggerSnippetModal: () => void;
  selectedModelId: ClaudeModelId;
  onChangeModelId: (m: ClaudeModelId) => void;
  selectedStyleId: WritingStyleId;
  onChangeStyleId: (s: WritingStyleId) => void;
  extendedThinking: boolean;
  onToggleExtendedThinking: () => void;
  projects: ProjectItem[];
  selectedProjectId: string | null;
  onChangeProjectId: (p: string | null) => void;
  isStreaming: boolean;
  onStopStreaming: () => void;
  placeholder: string;
}

const ComposerBox: React.FC<ComposerBoxProps> = ({
  input,
  onChangeInput,
  onKeyDown,
  onSubmit,
  attachments,
  onRemoveAttachment,
  onTriggerFileUpload,
  onTriggerSnippetModal,
  selectedModelId,
  onChangeModelId,
  selectedStyleId,
  onChangeStyleId,
  extendedThinking,
  onToggleExtendedThinking,
  projects,
  selectedProjectId,
  onChangeProjectId,
  isStreaming,
  onStopStreaming,
  placeholder,
}) => {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl bg-[#F3F1EA] dark:bg-[#21201E] border border-[#DFDBD0] dark:border-[#33312D] focus-within:border-[#C96442] transition-colors p-3 shadow-xs"
    >
      {/* Attached Files Tray */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2.5 pb-2 border-b border-[#E5E2D9] dark:border-[#2C2B28]">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#FAF9F5] dark:bg-[#191918] border border-[#DFDBD0] dark:border-[#33312D] text-xs"
            >
              <FileCode className="w-3.5 h-3.5 text-[#C96442]" />
              <span className="truncate max-w-[140px] text-[#191918] dark:text-[#ECEAE2]">
                {att.name}
              </span>
              <button
                type="button"
                onClick={() => onRemoveAttachment(att.id)}
                aria-label={`Remove attachment ${att.name}`}
                className="text-[#7A7872] hover:text-[#B91C1C]"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Textarea */}
      <textarea
        rows={3}
        aria-label="Message Claude"
        value={input}
        onChange={(e) => onChangeInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-[#191918] dark:text-[#ECEAE2] placeholder-[#7A7872] focus:outline-none"
      />

      {/* Bottom Controls Toolbar */}
      <div className="mt-2 pt-2 border-t border-[#E5E2D9]/80 dark:border-[#2C2B28] flex items-center justify-between gap-2">
        {/* Left Controls: Attach, Model Selector, Extended Thinking, Writing Style, Project */}
        <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto py-0.5">
          <button
            type="button"
            onClick={onTriggerFileUpload}
            aria-label="Attach file"
            title="Attach file"
            className="p-1.5 rounded-lg text-[#5A5955] dark:text-[#A3A19A] hover:bg-[#E5E1D6] dark:hover:bg-[#2C2B28] transition-colors shrink-0"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onTriggerSnippetModal}
            aria-label="Paste code snippet"
            title="Paste code snippet"
            className="p-1.5 rounded-lg text-[#5A5955] dark:text-[#A3A19A] hover:bg-[#E5E1D6] dark:hover:bg-[#2C2B28] transition-colors shrink-0"
          >
            <FileCode className="w-4 h-4" />
          </button>

          {/* Model Picker */}
          <select
            aria-label="Select Claude model"
            value={selectedModelId}
            onChange={(e) => onChangeModelId(e.target.value as ClaudeModelId)}
            className="px-2 py-1 rounded-lg text-xs font-medium bg-[#EAE7DD] dark:bg-[#2A2926] text-[#191918] dark:text-[#ECEAE2] focus:outline-none cursor-pointer shrink-0"
          >
            {CLAUDE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Extended Thinking Toggle */}
          <button
            type="button"
            onClick={onToggleExtendedThinking}
            aria-pressed={extendedThinking}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              extendedThinking
                ? 'bg-[#C96442]/15 text-[#C96442] border border-[#C96442]/40'
                : 'bg-[#EAE7DD] dark:bg-[#2A2926] text-[#5A5955] dark:text-[#A3A19A] hover:text-[#191918] dark:hover:text-white'
            }`}
          >
            <Brain className="w-3.5 h-3.5 shrink-0" />
            <span>Thinking</span>
          </button>

          {/* Writing Style Selector */}
          <div className="relative flex items-center shrink-0">
            <Feather className="w-3 h-3 text-[#6E6D68] absolute left-2 pointer-events-none" />
            <select
              aria-label="Select writing style"
              value={selectedStyleId}
              onChange={(e) => onChangeStyleId(e.target.value as WritingStyleId)}
              className="pl-6 pr-2 py-1 rounded-lg text-xs font-medium bg-[#EAE7DD] dark:bg-[#2A2926] text-[#5A5955] dark:text-[#A3A19A] focus:outline-none cursor-pointer"
            >
              {WRITING_STYLES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project Context Selector */}
          <div className="relative flex items-center shrink-0">
            <FolderKanban className="w-3 h-3 text-[#6E6D68] absolute left-2 pointer-events-none" />
            <select
              aria-label="Select project context"
              value={selectedProjectId || ''}
              onChange={(e) => onChangeProjectId(e.target.value ? e.target.value : null)}
              className="pl-6 pr-2 py-1 rounded-lg text-xs font-medium bg-[#EAE7DD] dark:bg-[#2A2926] text-[#5A5955] dark:text-[#A3A19A] focus:outline-none cursor-pointer max-w-[135px] truncate"
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Submit / Stop Button */}
        <div className="shrink-0">
          {isStreaming ? (
            <button
              type="button"
              onClick={onStopStreaming}
              aria-label="Stop generating"
              className="w-8 h-8 rounded-lg bg-[#191918] dark:bg-[#ECEAE2] text-white dark:text-[#191918] flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              aria-label="Send message"
              disabled={!input.trim() && attachments.length === 0}
              className="w-8 h-8 rounded-lg bg-[#C96442] hover:bg-[#B55535] disabled:opacity-40 text-white flex items-center justify-center transition-colors"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </form>
  );
};

/**
 * Renders Claude prose with clean headings, bullet lists, inline code, and code blocks.
 */
const FormattedMessageBody: React.FC<{ content: string }> = ({ content }) => {
  const cleaned = content.replace(/\[Artifact:\s*([^\]]+)\]/g, '').trim();
  const blocks = cleaned.split(/\n\n+/);

  return (
    <>
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith('```')) {
          const lines = trimmed.split('\n');
          const lang = lines[0].replace('```', '').trim() || 'code';
          const code = lines.slice(1, lines[lines.length - 1] === '```' ? -1 : undefined).join('\n');
          return (
            <div
              key={i}
              className="my-3 rounded-xl overflow-hidden border border-[#E5E2D9] dark:border-[#2C2B28] bg-[#F3F1EA] dark:bg-[#141413] font-claude-sans"
            >
              <div className="px-3.5 py-1.5 bg-[#EAE7DD] dark:bg-[#21201E] text-[11px] font-claude-mono text-[#6E6D68] dark:text-[#9A9890] flex justify-between">
                <span>{lang}</span>
              </div>
              <pre className="p-3.5 text-xs font-claude-mono overflow-x-auto text-[#191918] dark:text-[#ECEAE2]">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        if (trimmed.startsWith('### ')) {
          return (
            <h3
              key={i}
              className="font-claude-sans text-base font-semibold text-[#191918] dark:text-[#ECEAE2] pt-2"
            >
              {trimmed.replace('### ', '')}
            </h3>
          );
        }

        if (trimmed.startsWith('## ')) {
          return (
            <h2
              key={i}
              className="font-claude-sans text-lg font-semibold text-[#191918] dark:text-[#ECEAE2] pt-2"
            >
              {trimmed.replace('## ', '')}
            </h2>
          );
        }

        const lines = trimmed.split('\n');
        const isBulletList = lines.every((l) => /^(\s*[-*]|\s*\d+\.)\s+/.test(l));
        if (isBulletList) {
          return (
            <ul key={i} className="space-y-1.5 pl-5 list-disc">
              {lines.map((line, li) => {
                const itemText = line.replace(/^(\s*[-*]|\s*\d+\.)\s+/, '');
                return <li key={li}>{renderInlineFormatting(itemText)}</li>;
              })}
            </ul>
          );
        }

        return <p key={i}>{renderInlineFormatting(trimmed)}</p>;
      })}
    </>
  );
};

function renderInlineFormatting(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-[#191918] dark:text-[#ECEAE2]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-[#EAE7DD] dark:bg-[#282724] font-claude-mono text-[13px] text-[#C96442]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
